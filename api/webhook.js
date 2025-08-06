// api/webhook.js
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const { getIataCode } = require('../services/getIataCode');
const { getCheapTickets } = require('../services/getCheapTickets');
const { translateCodesWithGPT } = require('../services/translateCodeWithGPT');
const { redis, saveUser } = require('../services/db');


// --- Проверка обязательных переменных окружения ---
const requiredEnv = ['TELEGRAM_TOKEN', 'UPSTASH_REDIS_REST_TOKEN', 'VERCEL_URL', 'OPENAI_API_KEY'];
for (const key of requiredEnv) {
    if (!process.env[key]) {
        console.warn(`⚠️ ENV ${key} is not set`);
    }
}

// --- Инициализация одного раза (рекомендуется) ---
// try {
//     redis = new Redis({
//         url: process.env.REDIS_URL || 'https://trusted-wombat-9341.upstash.io',
//         token: process.env.UPSTASH_REDIS_REST_TOKEN,
//     });
//     console.log('✅ Upstash Redis client created');
// } catch (e) {
//     console.error('❌ Failed to init Redis client', e);
// }

// Инициализация TelegramBot без polling — webhook mode
let bot;
try {
    if (!process.env.TELEGRAM_TOKEN) throw new Error('TELEGRAM_TOKEN not set');
    bot = new TelegramBot(process.env.TELEGRAM_TOKEN);
    // НЕ вызывать setWebHook на каждый запрос — вызывать отдельно в setWebhook.js
    try {
        const webhookUrl = `https://${process.env.VERCEL_URL}/api/webhook`;
        console.log('ℹ️ Webhook URL:', webhookUrl);
        // Не делаем await тут, чтобы не тормозить cold-start; опционально можно раскомментировать
        // bot.setWebHook(webhookUrl).then(() => console.log('✅ Webhook set')).catch(e => console.warn('Webhook set error', e));
    } catch (e) {
        console.warn('⚠️ skip setWebHook during init:', e && e.message);
    }
    console.log('✅ Telegram bot instance created');
} catch (e) {
    console.error('❌ Failed to init Telegram bot', e);
}

// --- handler ---
module.exports = async (req, res) => {
    const overallStart = Date.now();
    console.log(`\n--- webhook request at ${new Date().toISOString()} ---`);
    console.log('method:', req.method);

    if (req.method !== 'POST') {
        console.log('Not a POST request — returning 200');
        return res.status(200).send('ok');
    }

    const body = req.body || {};
    console.log('body keys:', Object.keys(body));

    // --------- Helper to safe-send messages ----------
    async function safeSend(chatId, text, opts = {}) {
        const start = Date.now();
        try {
            console.log(`→ sending message to ${chatId}: "${(text || '').slice(0, 80)}"`);
            await bot.sendMessage(chatId, text, opts);
            console.log(`← message sent to ${chatId} (took ${Date.now() - start}ms)`);
        } catch (err) {
            console.error(`❌ bot.sendMessage error for ${chatId}:`, err && (err.message || err));
        }
    }

    // --------- Process incoming plain message ----------
    if (body.message) {
        const msg = body.message;
        const chatId = msg.chat?.id;
        const userInput = msg.text?.trim();
        const userInfo = msg.from;

        console.log('💬 incoming message', { chatId, userInput, from: userInfo?.id });

        if (!chatId) {
            console.warn('No chat id in message, returning 200');
            return res.status(200).send('ok');
        }

        if (userInput === '/start') {
            console.log('Handling /start');
            await safeSend(chatId, '🌍 Please enter your departure city:');
            console.log('Finished /start handling');
            return res.status(200).send('ok');
        }

        try {
            console.log('💾 Redis: LPUSH', `user:${userInfo.id}:messages`, userInput);
            const t1 = Date.now();
            await redis.lpush(`user:${userInfo.id}:messages`, userInput);
            await redis.ltrim(`user:${userInfo.id}:messages`, 0, 49);
            console.log(`✅ Redis saved message (took ${Date.now() - t1}ms)`);
        } catch (redisErr) {
            console.error('❌ Redis write error:', redisErr);
            await safeSend(chatId, 'Redis error — try again later.');
            return res.status(500).send('redis error');
        }

        // Получаем IATA
        let iata;
        try {
            console.log('🔎 getIataCode start for:', userInput);
            const tIataStart = Date.now();
            iata = await getIataCode(userInput);
            console.log(`🔎 getIataCode result: ${iata} (took ${Date.now() - tIataStart}ms)`);
        } catch (err) {
            console.error('❌ getIataCode error:', err);
            await safeSend(chatId, 'Error while determining IATA code. Try again later.');
            return res.status(200).send('ok');
        }

        if (!iata) {
            await safeSend(chatId, 'Unable to determine IATA code. Try another city.');
            return res.status(200).send('ok');
        }

        // Сохраняем пользователя
        try {
            console.log('💾 saveUser start for', userInfo?.id, iata);
            const tSaveStart = Date.now();
            await saveUser(userInfo, iata);
            console.log(`✅ saveUser done (took ${Date.now() - tSaveStart}ms)`);
        } catch (err) {
            console.error('❌ saveUser error:', err);
            await safeSend(chatId, 'Error while saving user. Try again later.');
            return res.status(200).send('ok');
        }

        // Отправляем кнопки
        try {
            console.log('🎛️ Sending options to user');
            const options = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✈️ TOP-10 cheapest flights ✨', callback_data: 'get_top_10' }]
                    ]
                }
            };
            await safeSend(chatId, '✅ City saved! Now choose an option:', options);
        } catch (err) {
            console.error('❌ Error sending options:', err);
        }

        console.log(`Message handling finished (total ${Date.now() - overallStart}ms)`);
        return res.status(200).send('ok');
    }

    // --------- Process callback_query (inline buttons) ----------
    if (body.callback_query) {
        const query = body.callback_query;
        const chatId = query.message?.chat?.id;
        const data = query.data;

        console.log('🔘 callback_query', { from: query.from?.id, chatId, data });

        // acknowledge callback asap
        try {
            console.log('→ answerCallbackQuery start');
            await bot.answerCallbackQuery(query.id).catch(e => {
                console.warn('answerCallbackQuery error (non-fatal):', e && e.message);
            });
            console.log('← answerCallbackQuery done');
        } catch (e) {
            console.warn('answerCallbackQuery failed:', e && e.message);
        }

        if (data === 'get_top_10') {
            // get user from redis
            let parsed = null;
            try {
                console.log('💾 Redis: get user:', `user:${chatId}`);
                const tGetStart = Date.now();
                const userData = await redis.get(`user:${chatId}`);
                console.log(`✅ Redis GET took ${Date.now() - tGetStart}ms`);
                parsed = userData ? JSON.parse(userData) : null;
                console.log('user parsed:', parsed);
            } catch (err) {
                console.error('❌ Redis GET error:', err);
                await safeSend(chatId, 'Redis error — try again later.');
                return res.status(500).send('redis error');
            }

            const iata = parsed?.iata_code;
            if (!iata) {
                await safeSend(chatId, 'Departure city is not set. Send /start again.');
                return res.status(200).send('ok');
            }

            // Fetch tickets
            let tickets;
            try {
                console.log('🎫 getCheapTickets start for', iata);
                const tTicketsStart = Date.now();
                tickets = await getCheapTickets(iata);
                console.log(`🎫 getCheapTickets done (count=${tickets?.length || 0}) in ${Date.now() - tTicketsStart}ms`);
            } catch (err) {
                console.error('❌ getCheapTickets error:', err);
                await safeSend(chatId, 'An error occurred while fetching tickets.');
                return res.status(200).send('ok');
            }

            if (!tickets || tickets.length === 0) {
                await safeSend(chatId, '❌ Tickets not found. 🔄 Use /start and try another city.');
                return res.status(200).send('ok');
            }

            // Translate codes with GPT
            let translations = [];
            try {
                console.log('🌐 translateCodesWithGPT start');
                const tGptStart = Date.now();
                translations = await translateCodesWithGPT(tickets);
                console.log(`🌐 translateCodesWithGPT done (items=${translations?.length || 0}) in ${Date.now() - tGptStart}ms`);
            } catch (err) {
                console.error('❌ translateCodesWithGPT error:', err);
                // We don't abort — continue with codes as-is
            }

            // Build message
            try {
                const message = `*TOP-10 cheapest flight*:\n\n` + tickets.map(t => {
                    const match = translations.find(item =>
                        item.iata === t.destination && item.airline === t.airline
                    );
                    const city = match?.city || t.destination;
                    const airline = match?.airline_name || t.airline;
                    return `✈️ → *${city}* from *${t.price}€*`;
                }).join('\n');

                console.log('📨 Sending tickets message to user');
                await safeSend(chatId, message, { parse_mode: 'Markdown' });
            } catch (err) {
                console.error('❌ Error building/sending tickets message:', err);
            }

            console.log(`Callback handling finished (total ${Date.now() - overallStart}ms)`);
            return res.status(200).send('ok');
        }

        // unknown callback
        console.log('Unknown callback data:', data);
        return res.status(200).send('ok');
    }

    // nothing matched
    console.log('No message or callback_query found in body');
    return res.status(200).send('ok');
};

const TelegramBot = require('node-telegram-bot-api');
const { getIataCode } = require('../services/getIataCode');
const { getCheapTickets } = require('../services/getCheapTickets');
const { saveUser } = require('../services/db');
const { translateCodesWithGPT } = require('../services/translateCodeWithGPT');
const { Redis } = require('@upstash/redis')

const redis = new Redis({
    url: 'https://trusted-wombat-9341.upstash.io',
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);
bot.setWebHook(`https://${process.env.VERCEL_URL}/api/webhook`);

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const body = req.body;

        // Обработка команды /start
        if (body.message) {
            const msg = body.message;
            const chatId = msg.chat.id;
            const userInput = msg.text?.trim();
            const userInfo = msg.from;

            if (userInput === '/start') {
                await bot.sendMessage(chatId, '🌍 Please enter your departure city:');
                return res.status(200).send('ok');
            }

            try {
                console.log('💾 Saving message to Redis...', `user:${userInfo.id}:messages`, userInput);
                await redis.lpush(`user:${userInfo.id}:messages`, userInput);
                await redis.ltrim(`user:${userInfo.id}:messages`, 0, 49);
                console.log('✅ Message saved');
            } catch (redisErr) {
                console.error('❌ Redis write error:', redisErr);
                await bot.sendMessage(chatId, 'Redis error — try again later.');
                return res.status(500).send('Redis error');
            }



            try {
                const iata = await getIataCode(userInput);

                if (!iata) {
                    await bot.sendMessage(chatId, 'Unable to determine IATA code. Try another city.');
                    return res.status(200).send('ok');
                }

                await saveUser(userInfo, iata);

                const options = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '✈️ TOP‑10 cheapest flights ✨', callback_data: 'get_top_10' }]
                        ]
                    }
                };

                await bot.sendMessage(chatId, '✅ City saved! Now choose an option: ', options);
            } catch (err) {
                console.error(err);
                await bot.sendMessage(chatId, 'Something went wrong. Please try again.');
            }
        }

        // Обработка кнопок
        if (body.callback_query) {
            const query = body.callback_query;
            const chatId = query.message.chat.id;

            if (query.data === 'get_top_10') {
                const userData = await redis.get(`user:${chatId}`);
                const parsed = userData ? JSON.parse(userData) : null;
                const iata = parsed?.iata_code;

                if (!iata) {
                    await bot.sendMessage(chatId, 'Departure city is not set. Send /start again.');
                    return res.status(200).send('ok');
                }

                try {
                    const tickets = await getCheapTickets(iata);

                    if (!tickets.length) {
                        await bot.sendMessage(chatId, '❌ Tickets not found. 🔄 Use /start and try another city.');
                        return res.status(200).send('ok');
                    }

                    const translations = await translateCodesWithGPT(tickets);

                    const message = `*TOP-10 cheapest flight*:\n\n` + tickets.map(t => {
                        const match = translations.find(item =>
                            item.iata === t.destination && item.airline === t.airline
                        );
                        const city = match?.city || t.destination;
                        const airline = match?.airline_name || t.airline;
                        return `✈️ → *${city}* from *${t.price}€*`;
                    }).join('\n');

                    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                } catch (err) {
                    console.error(err);
                    await bot.sendMessage(chatId, 'An error occurred while fetching tickets.');
                }
            }

            await bot.answerCallbackQuery(query.id);
        }

        return res.status(200).send('ok');
    }

    res.status(404).send('Not found');
};

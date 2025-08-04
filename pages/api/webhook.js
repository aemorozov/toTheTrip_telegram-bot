require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getIataCode } = require('../../services/getIataCode');
const { getCheapTickets } = require('../../services/getCheapTickets');
const { saveUser, redis } = require('../../services/db');
const { translateCodesWithGPT, getNearestFlightableAirport } = require('../../services/translateCodeWithGPT');


const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// 👉 Старт: просим указать город
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '🌍 Please enter your departure city:');
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;

    if (query.data === 'get_top_10') {
        const userData = await redis.get(`user:${chatId}`);
        const parsed = userData ? JSON.parse(userData) : null;
        const iata = parsed?.iata_code;

        if (!iata) {
            return bot.sendMessage(chatId, 'Departure city is not set. Send /start again.');
        }

        try {
            const tickets = await getCheapTickets(iata);
            if (!tickets.length) {
                return bot.sendMessage(chatId, '❌ Tickets not found. 🔄 Use /changeCity and try another city. 🌍✈️');
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
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userInput = msg.text?.trim();
    const userInfo = msg.from;

    if (userInput === '/start') return;

    // Сохраняем последние 50 сообщений пользователя
    await redis.lpush(`user:${userInfo.id}:messages`, userInput);
    await redis.ltrim(`user:${userInfo.id}:messages`, 0, 49);

    // Попытка определить IATA
    try {
        const iata = await getIataCode(userInput);

        if (!iata) {
            return bot.sendMessage(chatId, 'Unable to determine IATA code. Try another city.');
        }

        await saveUser(userInfo, iata);

        // Показываем кнопки после сохранения города
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
});

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);
bot.setWebHook(`https://${process.env.VERCEL_URL}`)
    .then(() => {
        console.log('Webhook установлен успешно!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Ошибка при установке webhook:', err);
        process.exit(1);
    });

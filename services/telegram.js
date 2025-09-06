const TelegramBot = require("node-telegram-bot-api");

let bot;
if (!process.env.TELEGRAM_TOKEN) throw new Error("TELEGRAM_TOKEN not set");
bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

async function safeSend(chatId, text, opts = {}) {
  try {
    await bot.sendMessage(chatId, text, opts);
  } catch (err) {
    console.error(`❌ bot.sendMessage error for ${chatId}:`, err);
  }
}

module.exports = { bot, safeSend };

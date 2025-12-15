const TelegramBot = require("node-telegram-bot-api");
const FormData = require("form-data");
const axios = require("axios");

let bot;
if (!process.env.TELEGRAM_TOKEN) throw new Error("TELEGRAM_TOKEN not set");
bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

async function safeSend(chatId, text, opts = { parse_mode: "HTML" }) {
  try {
    await bot.sendMessage(chatId, text, opts);
  } catch (err) {
    console.error(`❌ bot.sendMessage error for ${chatId}:`, err);
  }
}

async function safeSendPhoto(chatId, imageBuffer, caption = "", opts = {}) {
  try {
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("caption", caption);
    form.append("parse_mode", opts.parse_mode || "HTML");

    // опциональные параметры: disable_preview, reply_markup и т.д.
    if (opts.disable_web_page_preview) {
      form.append("disable_web_page_preview", "true");
    }
    if (opts.reply_markup) {
      form.append("reply_markup", JSON.stringify(opts.reply_markup));
    }

    // 👇 важно: filename третьим аргументом
    form.append("photo", imageBuffer, "image.jpg");

    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendPhoto`;

    await axios.post(url, form, { headers: form.getHeaders() });
  } catch (err) {
    console.error(
      `❌ safeSendPhoto error for ${chatId}:`,
      err.response?.data || err
    );
  }
}

module.exports = { bot, safeSend, safeSendPhoto };

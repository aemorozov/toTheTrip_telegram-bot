const TelegramBot = require("node-telegram-bot-api");
const FormData = require("form-data");
const axios = require("axios");

let bot;
if (!process.env.TELEGRAM_TOKEN) throw new Error("TELEGRAM_TOKEN not set");
bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

const MAX_SEND_ATTEMPTS = 3;
const FALLBACK_TEXT = "Что-то я сегодня не готов работать, приходи завтра";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeSend(chatId, text, opts = { parse_mode: "HTML" }) {
  for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt += 1) {
    try {
      await bot.sendMessage(chatId, text, opts);
      return true;
    } catch (err) {
      console.error(
        `ERROR bot.sendMessage for ${chatId} (attempt ${attempt}/${MAX_SEND_ATTEMPTS}):`,
        err
      );
      if (attempt < MAX_SEND_ATTEMPTS) {
        await delay(250 * attempt);
      }
    }
  }

  try {
    await bot.sendMessage(chatId, FALLBACK_TEXT);
  } catch (fallbackErr) {
    console.error(`ERROR bot.sendMessage fallback for ${chatId}:`, fallbackErr);
  }

  return false;
}

async function safeSendPhoto(chatId, imageBuffer, caption = "", opts = {}) {
  try {
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("caption", caption);
    form.append("parse_mode", opts.parse_mode || "HTML");

    if (opts.disable_web_page_preview) {
      form.append("disable_web_page_preview", "true");
    }
    if (opts.reply_markup) {
      form.append("reply_markup", JSON.stringify(opts.reply_markup));
    }

    form.append("photo", imageBuffer, "image.jpg");

    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendPhoto`;

    await axios.post(url, form, { headers: form.getHeaders() });
  } catch (err) {
    console.error(
      `ERROR safeSendPhoto for ${chatId}:`,
      err.response?.data || err
    );
  }
}

module.exports = { bot, safeSend, safeSendPhoto };

require("dotenv").config();
const { bot, safeSend } = require("../services/telegram");
const { handleCommandStart } = require("../services/commands");
const { handleTextMessage } = require("../services/messages");
const { handleCallbackQuery } = require("../services/callbacks");
const { Redis } = require("@upstash/redis");
const { startMenuButton } = require("../services/callbacks");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).send("ok");

  const body = req.body || {};

  // Реагируем на сообщения
  if (body.message) {
    const chatId = body.message.chat?.id;
    const userInput = body.message.text?.trim();
    const userInfo = body.message.from;

    if (!chatId) return res.status(200).send("ok");

    if (userInput === "/chats") {
      try {
        await safeSend(chatId, "⏳ Подсчитываю активных пользователей...");

        const keys = await redis.keys("user:*");

        const totalUsers = keys?.length || 0;

        await startMenuButton(
          chatId,
          `👥 Активных пользователей: <b>${totalUsers}</b>`
        );

        console.log(`📊 Всего активных пользователей: ${totalUsers}`);
        return res.status(200).send("ok");
      } catch (err) {
        console.error("❌ Ошибка при подсчёте пользователей:", err);
        await safeSend(chatId, "⚠️ Не удалось получить список пользователей.");
        return res.status(500).send(err.message);
      }
    }

    if (userInput === "/start") {
      await handleCommandStart(chatId);
      return res.status(200).send("ok");
    }

    try {
      await handleTextMessage(chatId, userInput, userInfo);
    } catch (e) {
      await safeSend(chatId, e.message);
      return res.status(500).send(e.message);
    }

    return res.status(200).send("ok");
  }

  // Реагируем на нажатия кнопок выбора (колбеков)
  if (body.callback_query) {
    const chatId = body.callback_query.message?.chat?.id;
    const data = body.callback_query.data;

    try {
      await bot.answerCallbackQuery(body.callback_query.id);
      await handleCallbackQuery(chatId, data);
    } catch (e) {
      console.error(e);
    }

    return res.status(200).send("ok");
  }

  return res.status(200).send("ok");
};

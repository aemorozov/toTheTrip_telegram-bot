require("dotenv").config();
const { bot, safeSend } = require("../bot/telegram");
const { handleCommandStart } = require("../bot/commands");
const { handleTextMessage } = require("../bot/messages");
const { handleCallbackQuery } = require("../bot/callbacks");
const { Redis } = require("@upstash/redis");
const { pushMessage, saveUser } = require("../bot/db");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).send("ok");

  const body = req.body || {};

  // Реагируем на базовые команды, они идут как сообщения со слешем /
  if (body.message) {
    const chatId = body.message.chat?.id;
    const userInput = body.message.text?.trim();
    const userInfo = body.message.from;

    console.log("ID:", chatId, ", Message:", userInput);

    if (!chatId) return res.status(200).send("ok");

    if (userInput === "/start") {
      try {
        await saveUser(userInfo, null, null, null); // явно
      } catch (e) {
        console.error("Redis error 1", e);
      }

      await handleCommandStart(chatId, userInfo);
      return res.status(200).send("ok");
    }

    // Реагируем на любые другие сообщения уже через messages
    try {
      await handleTextMessage(chatId, userInput, userInfo);
    } catch (e) {
      await safeSend(chatId, e.message);
      return res.status(500).send(e.message);
    }

    try {
      await pushMessage(chatId, userInput, 10);
    } catch (e) {
      console.log("Redis error 2", e);
    }

    return res.status(200).send("ok");
  }

  // Реагируем на нажатия кнопок выбора (колбеков)
  if (body.callback_query) {
    const chatId = body.callback_query.message?.chat?.id;
    const data = body.callback_query.data;

    console.log("ID:", chatId, ", Callback:", data);

    try {
      await bot.answerCallbackQuery(body.callback_query.id);
      await handleCallbackQuery(chatId, data);
    } catch (e) {
      console.error(e);
    }

    try {
      await pushMessage(chatId, data, 10);
    } catch (e) {
      console.log("Redis error 3", e);
    }

    return res.status(200).send("ok");
  }

  return res.status(200).send("ok");
};

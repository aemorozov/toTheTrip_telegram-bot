// api/webhook.js
require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const { getIataCode } = require("../services/getIataCode");
const { getCheapTickets } = require("../services/getCheapTickets");
const { translateCodesWithGPT } = require("../services/translateCodeWithGPT");
const { pushMessage, getUser, saveUser } = require("../services/db"); // <-- используем функции
const {
  generatePartnerFlightLink,
} = require("../services/generatePartnerFlightLink");
const { extractShortLink } = require("../services/encodeLink");

// Проверка env
const requiredEnv = [
  "TELEGRAM_TOKEN",
  "UPSTASH_REDIS_REST_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "VERCEL_URL",
  "OPENAI_API_KEY",
];
for (const k of requiredEnv)
  if (!process.env[k]) console.warn(`⚠️ ENV ${k} not set`);

let bot;
try {
  if (!process.env.TELEGRAM_TOKEN) throw new Error("TELEGRAM_TOKEN not set");
  bot = new TelegramBot(process.env.TELEGRAM_TOKEN);
} catch (e) {
  console.error("❌ Telegram init error:", e);
  // продолжаем чтобы endpoint возвращал 500, но не крашил процесс на cold-start
}

async function safeSend(chatId, text, opts = {}) {
  try {
    await bot.sendMessage(chatId, text, opts);
  } catch (err) {
    console.error(
      `❌ bot.sendMessage error for ${chatId}:`,
      err && err.message ? err.message : err
    );
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).send("ok");
  }

  const body = req.body || {};

  // ----- plain message -----
  if (body.message) {
    const msg = body.message;
    const chatId = msg.chat?.id;
    const userInput = msg.text?.trim();
    const userInfo = msg.from;

    if (!chatId) return res.status(200).send("ok");

    if (userInput === "/start") {
      await safeSend(chatId, "🌍 Please enter your departure city:");
      return res.status(200).send("ok");
    }

    // push to redis list via helper (которая сама проверит redis)
    try {
      await pushMessage(userInfo.id, userInput, 50);
    } catch (e) {
      console.error("❌ pushMessage error:", e);
      await safeSend(chatId, "Redis error — try again later.");
      return res.status(500).send("redis error");
    }

    // get IATA
    let iata;
    try {
      iata = await getIataCode(userInput);
    } catch (e) {
      console.error("❌ getIataCode error:", e);
      await safeSend(
        chatId,
        "Error while determining IATA code. Try again later."
      );
      return res.status(200).send("ok");
    }

    if (!iata) {
      await safeSend(
        chatId,
        "Unable to determine IATA code. Try another city."
      );
      return res.status(200).send("ok");
    }

    // save user
    try {
      await saveUser(userInfo, iata);
    } catch (e) {
      console.error("❌ saveUser error:", e);
      await safeSend(chatId, "Error while saving user. Try again later.");
      return res.status(200).send("ok");
    }

    // send options
    try {
      const options = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✈️ TOP-10 cheapest flights ✨",
                callback_data: "get_top_10",
              },
            ],
          ],
        },
      };
      await safeSend(
        chatId,
        `✅ Your airport is <b>${iata}</b>. Choose an option:`,
        options
      );
    } catch (e) {
      console.error("❌ Error sending options:", e);
    }

    return res.status(200).send("ok");
  }

  // ----- callback_query -----
  if (body.callback_query) {
    const query = body.callback_query;
    const chatId = query.message?.chat?.id;
    const data = query.data;

    // acknowledge (non-fatal)
    try {
      await bot
        .answerCallbackQuery(query.id)
        .catch((e) =>
          console.warn("answerCallbackQuery non-fatal:", e && e.message)
        );
    } catch (e) {
      console.warn("answerCallbackQuery failed:", e && e.message);
    }

    if (data === "get_top_10") {
      let userObj;
      try {
        userObj = await getUser(chatId);
      } catch (e) {
        console.error("❌ getUser error:", e);
        await safeSend(chatId, "Redis error — try again later.");
        return res.status(500).send("redis error");
      }

      const iata = userObj?.iata_code;
      if (!iata) {
        await safeSend(
          chatId,
          "❌ Departure city is not set. 🔄 Send /start again."
        );
        return res.status(200).send("ok");
      }

      // get tickets
      let tickets;
      try {
        tickets = await getCheapTickets(iata);
        // console.log(tickets[0])
      } catch (e) {
        console.error("❌ getCheapTickets error:", e);
        await safeSend(chatId, "An error occurred while fetching tickets.");
        return res.status(200).send("ok");
      }

      if (!tickets || !tickets.length) {
        await safeSend(
          chatId,
          "❌ Tickets not found. 🔄 Use /start and try another city."
        );
        return res.status(200).send("ok");
      }

      // translate codes
      let translations = [];
      try {
        translations = await translateCodesWithGPT(tickets);
      } catch (e) {
        console.error("❌ translateCodesWithGPT error (will continue):", e);
      }

      // send result
      try {
        const origin = userObj.iata_code;
        const message =
          `<b>🔥 TOP-10</b> cheapest flights from <b>${userObj.iata_code}</b>:\n\n` +
          tickets
            .map((t, index) => {
              const match = translations.find(
                (item) =>
                  item.iata === t.destination && item.airline === t.airline
              );
              const destination = t.destination;
              const depart_date = t.departure;
              const return_date = t.return;
              const city = match?.city || t.destination;
              const link = generatePartnerFlightLink({
                origin,
                destination,
                depart_date,
                return_date,
              });

              return `${index + 1}. ✈️ to <b>${city}</b> ≈ <b>${
                t.price
              }€</b>\n${match?.departure} ⇄ ${
                match?.return
              }\n<a href="${link}">${extractShortLink(
                link
              )}</a>\n------------------------------------------`;
            })
            .join("\n") +
          `\n*cheapest prices for the last 24 hours`;

        await safeSend(chatId, message, {
          parse_mode: "HTML",
          disable_web_page_preview: true,
        });

        const options = {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✈️ TOP-10 cheapest flights ✨",
                  callback_data: "get_top_10",
                },
              ],
            ],
          },
        };
        await safeSend(
          chatId,
          `🌍 Your airport is <b>${origin}</b>. Choose an option:`,
          {
            parse_mode: "HTML",
            ...options,
          }
        );
      } catch (e) {
        console.error("❌ Error building/sending tickets message:", e);
      }

      return res.status(200).send("ok");
    }

    // unknown callback
    return res.status(200).send("ok");
  }

  return res.status(200).send("ok");
};

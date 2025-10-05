const axios = require("axios");
const { askAI } = require("./askAI");
const { generatePartnerFlightLink } = require("../generatePartnerFlightLink");
const { extractShortLink } = require("../encodeLink");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHANNEL_ID = "@CheapFlightsRomania";
const TRAVELPAYOUTS_TOKEN = process.env.TRAVELPAYOUTS_API_TOKEN;
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// === Функция для работы с Redis (через REST API Upstash)
async function redisRequest(method, key, value = null) {
  const url = `${UPSTASH_REDIS_REST_URL}/${method}/${encodeURIComponent(key)}${
    value ? `/${encodeURIComponent(value)}` : ""
  }`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
  });
  return res.json();
}

// === Основная функция
async function postCheapFlights() {
  try {
    // 1️⃣ Получаем спецпредложения из Aviasales
    const { data } = await axios.get(
      "https://api.travelpayouts.com/aviasales/v3/get_special_offers",
      {
        params: {
          origin: "BUH",
          token: TRAVELPAYOUTS_TOKEN,
          locale: "en",
          currency: "eur",
        },
      }
    );

    let flights = data?.data || [];
    if (!flights.length) return console.log("No flights received");

    // 2️⃣ Удаляем ненужные поля
    flights = flights.map(
      ({
        destination,
        destination_name,
        origin_airport,
        departure_at,
        price,
        return_date,
      }) => ({
        destination,
        destination_name,
        origin_airport,
        departure_at,
        return_date,
        price,
      })
    );

    // 3️⃣ Проверяем уникальность
    let selectedFlight = null;
    for (const flight of flights) {
      const key = `flight_${flight.destination}_${flight.departure_at}`;
      const check = await redisRequest("get", key);
      if (!check.result) {
        selectedFlight = flight;
        // 5️⃣ Сохраняем билет в Redis на 7 дней
        await redisRequest("set", key, "posted");
        await redisRequest("expire", key, 60 * 60 * 24 * 7);
        break;
      }
    }

    if (!selectedFlight) return console.log("All flights are duplicates.");

    // 6️⃣ Отправляем краткую инфу в GPT
    const prompt = `Create a short, engaging English message (2-3 sentences) about a cheap flight from Bucharest to ${selectedFlight.destination_name} for ${selectedFlight.price} EUR.`;
    const AItext = await askAI(prompt);

    // 7️⃣ Формируем ссылку
    const link = generatePartnerFlightLink(selectedFlight);

    // 8️⃣ Форматируем дату и время
    const date = new Date(selectedFlight.departure_at);
    const formattedDate = `${String(date.getDate()).padStart(2, "0")}.${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
    const formattedTime = `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;

    // 9️⃣ Формируем сообщение
    const message = `
${AItext}
✈️ Destination: <b>${selectedFlight.destination_name}</b>
💰 Price: <b>${selectedFlight.price}€</b>
📅 ${formattedDate} 🕐 ${formattedTime}
🔗 <a href="${link}">${extractShortLink(link)}</a>


`;

    // 🔟 Отправляем в Telegram
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        chat_id: CHANNEL_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }
    );

    console.log("✅ Flight posted:", selectedFlight.destination_name);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

module.exports = { postCheapFlights };

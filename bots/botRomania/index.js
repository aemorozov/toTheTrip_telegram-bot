const axios = require("axios");
const { askAI } = require("./askAI");
const { generatePartnerFlightLink } = require("../generatePartnerFlightLink");
const { extractShortLink } = require("../encodeLink");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHANNEL_ID = "@CheapFlightsRomania";
const TRAVELPAYOUTS_TOKEN = process.env.TRAVELPAYOUTS_API_TOKEN;
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// === Универсальная функция работы с Redis REST API
async function redisRequest(method, key, value = null) {
  const url = `${UPSTASH_REDIS_REST_URL}/${method}/${encodeURIComponent(key)}${
    value ? `/${encodeURIComponent(value)}` : ""
  }`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
  });
  return res.json();
}

// === Получаем flights JSON из Redis
async function getFlightsDB() {
  const data = await redisRequest("get", "flights");
  try {
    return data.result ? JSON.parse(data.result) : {};
  } catch {
    return {};
  }
}

// === Сохраняем flights JSON в Redis (с TTL = 7 дней)
async function saveFlightsDB(newData) {
  await redisRequest("set", "flights", JSON.stringify(newData));
  await redisRequest("expire", "flights", 60 * 60 * 24 * 7);
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

    // 3️⃣ Получаем данные из Redis
    const flightsDB = await getFlightsDB();

    // 4️⃣ Ищем уникальный билет
    let selectedFlight = null;
    for (const flight of flights) {
      const date = new Date(flight.departure_at);
      const dateCode = `${String(date.getDate()).padStart(2, "0")}${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      const flightCode = `${flight.destination}${dateCode}`;

      // если для origin ещё нет массива — создаём
      if (!flightsDB[flight.origin_airport]) {
        flightsDB[flight.origin_airport] = [];
      }

      // если направление уже есть — пропускаем
      if (flightsDB[flight.origin_airport].includes(flightCode)) continue;

      // иначе сохраняем и прерываем цикл
      flightsDB[flight.origin_airport].push(flightCode);
      selectedFlight = flight;
      break;
    }

    if (!selectedFlight) return console.log("All flights are duplicates.");

    // 5️⃣ Сохраняем обновлённую базу в Redis (TTL 7 дней)
    await saveFlightsDB(flightsDB);

    // 6️⃣ Создаём короткий текст через GPT
    const prompt = `Create a short, engaging Romanian message (2-3 sentences) about a cheap flight from Bucharest to ${selectedFlight.destination_name} for ${selectedFlight.price} EUR.`;
    const AItext = await askAI(prompt);

    // 7️⃣ Формируем партнёрскую ссылку
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
        disable_web_page_preview: true,
      }
    );

    console.log("✅ Flight posted:", selectedFlight.destination_name);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

module.exports = { postCheapFlights };

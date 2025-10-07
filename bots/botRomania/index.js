const axios = require("axios");
const { askAI } = require("./askAI");
const { generatePartnerFlightLink } = require("../generatePartnerFlightLink");
const { extractShortLink } = require("../encodeLink");
const { DateTime } = require("luxon");
const { getCityImage } = require("./getImages");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHANNEL_ID = "@CheapFlightsRomania";
const TRAVELPAYOUTS_TOKEN = process.env.TRAVELPAYOUTS_API_TOKEN;
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// === Сопоставление кодов аэропортов с названиями городов
const airportCities = {
  BBU: "București",
  OTP: "București",
  CLJ: "Cluj-Napoca",
  TSR: "Timișoara",
  SBZ: "Sibiu",
  IAS: "Iași",
  CND: "Constanța",
  BCM: "Bacău",
};

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

// === Сохраняем flights JSON в Redis (TTL = 7 дней)
async function saveFlightsDB(newData) {
  await redisRequest("set", "flights", JSON.stringify(newData));
  await redisRequest("expire", "flights", 60 * 60 * 24 * 7);
}

// === Основная функция
async function postCheapFlights() {
  try {
    // 🌍 Все международные аэропорты Румынии
    const airports = ["BUH", "CLJ", "TSR", "SBZ", "IAS", "CND", "BCM"];
    const allFlights = [];

    // 1️⃣ Получаем данные по каждому аэропорту
    for (const origin of airports) {
      try {
        const { data } = await axios.get(
          "https://api.travelpayouts.com/aviasales/v3/get_special_offers",
          {
            params: {
              origin,
              token: TRAVELPAYOUTS_TOKEN,
              locale: "en",
              currency: "eur",
            },
          }
        );

        const flights = (data?.data || []).map(
          ({
            destination,
            destination_name,
            destination_country_code,
            origin_airport,
            departure_at,
            return_date,
            price,
          }) => ({
            destination,
            destination_name,
            destination_country_code,
            origin_airport,
            departure_at,
            return_date,
            price,
          })
        );

        allFlights.push(...flights);
      } catch (err) {
        console.warn(`⚠️ Error fetching flights for ${origin}:`, err.message);
      }
    }

    if (!allFlights.length) return console.log("No flights received");

    // 2️⃣ Загружаем базу из Redis
    const flightsDB = await getFlightsDB();

    // 3️⃣ Ищем уникальный билет
    let selectedFlight = null;
    for (const flight of allFlights) {
      const date = new Date(flight.departure_at);
      const dateCode = `${String(date.getDate()).padStart(2, "0")}${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      const flightCode = `${flight.destination}${dateCode}`;

      if (!flightsDB[flight.origin_airport]) {
        flightsDB[flight.origin_airport] = [];
      }

      if (flightsDB[flight.origin_airport].includes(flightCode)) continue;

      flightsDB[flight.origin_airport].push(flightCode);
      selectedFlight = flight;
      break;
    }

    if (!selectedFlight) return console.log("All flights are duplicates.");

    // 4️⃣ Сохраняем обновлённую базу в Redis
    await saveFlightsDB(flightsDB);

    // 5️⃣ Определяем города
    const originCity =
      airportCities[selectedFlight.origin_airport] ||
      selectedFlight.origin_airport;

    const destinationCity =
      selectedFlight.destination_name ||
      airportCities[selectedFlight.destination] ||
      selectedFlight.destination;

    // Если destination_country_code есть в ответе — используем
    let destinationCountry = selectedFlight.destination_country_code;

    // Если нет — делаем запрос к Aviasales API, чтобы узнать страну
    if (!destinationCountry) {
      try {
        // 🔹 1. Пробуем найти по IATA-коду
        console.log("selectedFlight.destination: ", selectedFlight.destination);
        let { data } = await axios.get(
          `https://autocomplete.travelpayouts.com/places2?term=${selectedFlight.destination}&locale=en`
        );

        let airportInfo = data.find((p) => p.type === "airport");
        console.log("airportInfo: ", airportInfo);
        destinationCountry = airportInfo?.country_code;
        console.log("destinationCountry: ", destinationCountry);

        // 🔹 2. Если не нашли — пробуем по названию города
        if (!destinationCountry && selectedFlight.destination_name) {
          console.log(
            "selectedFlight.destination_name: ",
            selectedFlight.destination_name
          );
          const { data: cityData } = await axios.get(
            `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(
              selectedFlight.destination_name
            )}&locale=en`
          );
          const cityInfo = cityData.find(
            (p) => p.type === "city" || p.type === "airport"
          );
          console.log("cityInfo: ", cityInfo);
          destinationCountry = cityInfo?.country_code || "??";
        }
      } catch (err) {
        console.warn("⚠️ Country lookup failed:", err.message);
        destinationCountry = "??";
      }
    }

    const destinationFull = `${destinationCity}, ${destinationCountry}`;

    // === Генерация изображения города ===
    const imageUrl = await getCityImage(
      selectedFlight.destination_name,
      destinationCountry
    );

    // 6️⃣ Создаём текст через GPT
    const prompt = `Creează un text scurt și atractiv (1 propoziți) despre un zbor ieftin 
    din ${originCity} spre ${destinationFull} pentru ${selectedFlight.price}$. Scrie prietenos și natural.
    Add a beutiful title with emojies with tags <b></b>. After title use only one "\n" (one new free lines)
    Folosește un singur emoji în titlu - steagul țării de destinație.`;
    const AItext = await askAI(prompt);

    // 7️⃣ Партнёрская ссылка
    const link = generatePartnerFlightLink(selectedFlight);

    // 8️⃣ Формат даты и времени с учётом часового пояса из ISO
    const dt = DateTime.fromISO(selectedFlight.departure_at, { setZone: true });

    const formattedDate = dt.toFormat("dd.MM");
    const formattedTime = dt.toFormat("HH:mm");

    // 9️⃣ Финальное сообщение
    const message = `
${AItext}

✈️ <b>#${originCity}  →  ${destinationFull}</b>
💰 Preț de la:  <b>${selectedFlight.price}$</b>
📅 ${formattedDate}   🕐 ${formattedTime}
🔗 <a href="${link}">https://${extractShortLink(link)}</a>

🤖 <b>Our Bot: <a href="https://t.me/CheapFlightsToTheTripBot">Cheap Flights Bot</a></b>
`;

    // 🔟 Отправляем в Telegram
    if (imageUrl) {
      await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
        {
          chat_id: CHANNEL_ID,
          photo: imageUrl,
          caption: message,
          parse_mode: "HTML",
        }
      );
    } else {
      await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
        {
          chat_id: CHANNEL_ID,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: false,
        }
      );
    }

    console.log(
      `✅ Posted flight: ${originCity} → ${destinationFull} (${selectedFlight.price}€)`
    );
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

module.exports = { postCheapFlights };

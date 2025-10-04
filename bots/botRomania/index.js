const axios = require("axios");
const { askAI } = require("./askAI");
const { generatePartnerFlightLink } = require("../generatePartnerFlightLink");
const { extractShortLink } = require("../encodeLink");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHANNEL_ID = "@CheapFlightsRomania"; // или -100123456789
const TRAVELPAYOUTS_TOKEN = process.env.TRAVELPAYOUTS_API_TOKEN;

async function postCheapFlights() {
  try {
    // Получаем спецпредложения из Aviasales
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

    const flights = data?.data || [];
    if (!flights.length) return;

    // Берём топ-3 самых дешёвых билета
    const topFlights = flights.slice(0, 3);

    const AItext = await askAI();

    // 🔧 Функция форматирования даты и времени
    function formatDate(dateStr) {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return { date: `${day}.${month}`, time: `${hours}:${minutes}` };
    }

    // 🌍 Базовый URL для твоих реферальных ссылок
    const REF_URL = "https://avia.se";

    // 🧩 Формируем сообщение
    const text = [
      `${AItext}\n`,
      ...topFlights.map((flight) => {
        const { date, time } = formatDate(flight.departure_at);
        const origin_airport = flight.origin_airport;
        const destination = flight.destination;
        const departure_at = flight.departure_at;
        const link = generatePartnerFlightLink({
          origin_airport,
          destination,
          departure_at,
        });
        return (
          `✈️ to <b>${flight.destination_name}</b> from <b>${flight.price}$</b>\n` +
          `📅 ${date}  🕐 ${time}\n` +
          `🔗 <u><a href="${link}">https://${extractShortLink(link)}</a></u>\n`
        );
      }),
    ].join("\n");

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        chat_id: CHANNEL_ID,
        text: text,
        disable_web_page_preview: true,
        parse_mode: "HTML",
      }
    );
  } catch (err) {
    console.error("Error:", err.message);
  }
}

module.exports = { postCheapFlights };

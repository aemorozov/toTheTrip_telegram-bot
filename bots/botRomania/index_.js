const axios = require("axios");
const { askAI } = require("./askAI_");
const { generatePartnerFlightLink } = require("../generatePartnerFlightLink");
const { extractShortLink } = require("../encodeLink");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHANNEL_ID = "@CheapFlightsRomania";
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

// 1. Получаем json от TP API
// 2. Удаляем лишние строки airline_title, color, origin_name_declined, destination_name_declined,link, flight_number, search_id, signature, mini_title, airline, duration
// 3. Берём 1 билет
// 4. Проверяем его в БД используя UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, если это повтор по направлению и дате, берём следующий билет
// 5. Сохраняем его в БД
// 6. Отправляем его в GPT API
// 7. Получаем текст и картинку
// 8. Формируем ссылку
// 9. Формируем сообщение для пользователя

// flights:

// {EVN: [BUH2510, AYT1812],
//   BUH: [BUD2311, PAR1311]
// }

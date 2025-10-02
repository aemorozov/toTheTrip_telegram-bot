const axios = require("axios");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHANNEL_ID = "@CheapFlightsRomania"; // или -100123456789
const TRAVELPAYOUTS_TOKEN = process.env.TRAVELPAYOUTS_TOKEN;
const MARKER = process.env.TRAVELPAYOUTS_MARKER;

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

    for (let f of topFlights) {
      const link = `https://www.aviasales.com/search/${
        f.origin
      }${f.departure_date.replace(/-/g, "").slice(0, 4)}${
        f.destination
      }?marker=${MARKER}`;

      const text = `Bilet ieftin din ${f.origin} către ${f.destination} doar pentru ${f.price}€\nData: ${f.departure_date}\nCumpără: ${link}`;

      await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
        {
          chat_id: CHANNEL_ID,
          text: text,
          disable_web_page_preview: false,
        }
      );
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

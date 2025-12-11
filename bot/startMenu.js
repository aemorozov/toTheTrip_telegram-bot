const { safeSend, safeSendPhoto } = require("./telegram");
const { getCityImage } = require("./getCityImage");

async function startMenu(chatId, city, country) {
  try {
    // 1️⃣ Получаем фотографию города
    const photo = await getCityImage(city, country);

    console.log("getCityImage");

    const caption = `
📍 Your city is <strong>${city.toUpperCase()}</strong>!

✈️ You can choose from several types of options and you’ll get a list of the cheapest tickets!

🔄 If you want to change your departure city, tap /start and write a new one.

<b>Get special offers every day!</b>
🇫🇷 <b><a href="https://t.me/CheapFlightsFrance">Cheap Flights France</a></b>
🇮🇹 <b><a href="https://t.me/CheapFlightsItaly">Cheap Flights Italy</a></b>
🇪🇸 <b><a href="https://t.me/CheapFlightsSpain">Cheap Flights Spain</a></b>
🇩🇪 <b><a href="https://t.me/CheapFlightsGermany">Cheap Flights Germany</a></b>
🇷🇴 <b><a href="https://t.me/CheapFlightsRomania">Cheap Flights Romania</a></b>

👇 👇 👇 👇 👇 👇 👇 👇 👇
    `;

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✈️      CHEAPEST FLIGHTS      🌎",
              callback_data: "get_top_10_round_trip",
            },
          ],
          [
            {
              text: "📅           SELECT DATE            🛫",
              callback_data: "price_for_date",
            },
          ],
          [
            {
              text: "🔎    SELECT DESTINATION    🧭",
              callback_data: "cheapest_flights_to_destination",
            },
          ],
          [
            {
              text: "🔥       SPECIAL OFFERS        💸",
              callback_data: "special_offers",
            },
          ],
        ],
      },
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };

    // 2️⃣ Если фото есть — отправляем фото с подписью
    if (photo) {
      console.log("safeSendPhoto");
      return await safeSendPhoto(chatId, photo, caption, options);
    }
    // 3️⃣ Если фото нет — отправляем только текст
    return await safeSend(chatId, caption, options);
  } catch (e) {
    console.error("❌ Error sending start menu:", e);
  }
}

module.exports = { startMenu };

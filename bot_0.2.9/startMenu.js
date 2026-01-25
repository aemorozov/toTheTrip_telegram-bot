const { safeSend, safeSendPhoto } = require("./telegram");
const { getCityImage } = require("./getCityImage");

async function startMenu(chatId, city, country) {
  try {
    // 1️⃣ Получаем фотографию города
    const photo = await getCityImage(city, country);

    const caption = `
📍 <strong>Departure city is ${city.toUpperCase().replace(/\.$/, "")}!</strong>

🔄 Change departure city via /start.

🔥 <b>Get special offers</b> every day for:\n<b><a href="https://t.me/CheapFlightsArmenia">🇦🇲\u00A0Armenia</a></b> <b><a href="https://t.me/CheapFlightsFrance">🇫🇷\u00A0France</a></b> <b><a href="https://t.me/CheapFlightsGeorgia">🇬🇪\u00A0Georgia</a></b> <b><a href="https://t.me/CheapFlightsGermany">🇩🇪\u00A0Germany</a></b> <b><a href="https://t.me/CheapFlightsItaly">🇮🇹\u00A0Italy</a></b> <b><a href="https://t.me/CheapFlightsKazakhstan">🇰🇿\u00A0Kazakhstan</a></b> <b><a href="https://t.me/CheapFlightsRomania">🇷🇴\u00A0Romania</a></b> <b><a href="https://t.me/cheapflightsserbia">🇷🇸\u00A0Serbia</a></b> <b><a href="https://t.me/CheapFlightsSpain">🇪🇸\u00A0Spain</a></b> <b><a href="https://t.me/CheapFlightsTurkey">🇹🇷\u00A0Turkey</a></b> <b><a href="https://t.me/CheapFlightsUzbekistan">🇺🇿\u00A0Uzbekistan</a></b>

👉 <b>Select an option:</b>`;

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✈️      CHEAPEST FLIGHTS       🌎",
              callback_data: "get_top_10_round_trip",
            },
          ],
          [
            {
              text: "🔥         SPECIAL OFFERS          💸",
              callback_data: "special_offers",
            },
          ],
          [
            {
              text: "⭐        WEEKENDS ONLY         💡",
              callback_data: "weekend_flights",
            },
          ],
          [
            {
              text: "📅                ON DATE                 🎯",
              callback_data: "price_for_date",
            },
          ],
          [
            {
              text: "🔎         TO DESTINATION        🧭",
              callback_data: "cheapest_flights_to_destination",
            },
          ],
        ],
      },

      parse_mode: "HTML",
      disable_web_page_preview: true,
    };

    // 2️⃣ Если фото есть — отправляем фото с подписью
    if (photo) {
      return await safeSendPhoto(chatId, photo, caption, options);
    }
    // 3️⃣ Если фото нет — отправляем только текст
    return await safeSend(chatId, caption, options);
  } catch (e) {
    console.error("❌ Error sending start menu:", e);
  }
}

module.exports = { startMenu };

const { safeSend, safeSendPhoto } = require("./telegram");
const { getCityImage } = require("./getCityImage");

async function startMenu(chatId, city, country) {
  try {
    // 1️⃣ Получаем фотографию города
    const photo = await getCityImage(city, country);

    const caption = `
📍 <strong>Your city is ${city.toUpperCase().replace(/\.$/, "")}!</strong>

🔄 You can change your city via /start.

🔥 <b>Get special offers</b> every day for:\n<b><a href="https://t.me/CheapFlightsArmenia">🇦🇲 Armenia</a></b>  <b><a href="https://t.me/CheapFlightsFrance">🇫🇷 France</a></b>  <b><a href="https://t.me/CheapFlightsGeorgia">🇬🇪 Georgia</a></b>  <b><a href="https://t.me/CheapFlightsGermany">🇩🇪 Germany</a></b> <b><a href="https://t.me/CheapFlightsItaly">🇮🇹 Italy</a></b> <b><a href="https://t.me/CheapFlightsKazakhstan">🇰🇿 Kazakhstan</a></b>  <b><a href="https://t.me/CheapFlightsRomania">🇷🇴 Romania</a></b>  <b><a href="https://t.me/cheapflightsserbia">🇷🇸 Serbia</a></b>  <b><a href="https://t.me/CheapFlightsSpain">🇪🇸 Spain</a></b>  <b><a href="https://t.me/CheapFlightsTurkey">🇹🇷 Turkey</a></b>  <b><a href="https://t.me/CheapFlightsUzbekistan">🇺🇿 Uzbekistan</a></b>

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

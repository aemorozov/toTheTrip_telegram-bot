const { safeSend, safeSendPhoto } = require("./telegram");
const { getCityImage } = require("./getCityImage"); // если уже есть функция загрузки фото

async function startMenu(chatId, city, country) {
  try {
    // 1️⃣ Получаем фотографию города
    const photo = await getCityImage(city, country);
    console.log("country: ", country);

    const caption = `
📍 Your city is <strong>${city.toUpperCase()}</strong>!

🔄 Want to update the city? Write it.

<b>You can join our channels:</b>
🇷🇴 <b><a href="https://t.me/CheapFlightsRomania">Cheap Flights Romania</a></b>

👇 👇 <b>Choose an option:</b> 👇 👇
    `;

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✈️        TOP round trip flights        🔄",
              callback_data: "get_top_10_round_trip",
            },
          ],
          [
            {
              text: "✈️          TOP one way flights         ➡️",
              callback_data: "get_top_10_one_way",
            },
          ],
          [
            {
              text: "💰           Best price for date          📆",
              callback_data: "price_for_date",
            },
          ],
          [
            {
              text: "💸    Best flights to destination    🌍",
              callback_data: "cheapest_flights_to_destination",
            },
          ],
          [
            {
              text: "🔥              Special offers                🤑",
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
      return await safeSendPhoto(chatId, photo, caption, options);
    }

    // 3️⃣ Если фото нет — отправляем только текст
    return await safeSend(chatId, caption, options);
  } catch (e) {
    console.error("❌ Error sending start menu:", e);
  }
}

module.exports = { startMenu };

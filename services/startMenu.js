const { safeSend } = require("./telegram");

async function startMenu(chatId, city) {
  try {
    const options = {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✈️ Cheapest flights to destination 🌍",
              callback_data: "cheapest_flights_to_destination",
            },
          ],
          [
            {
              text: "✈️ TOP cheapest flights round trip 🔄",
              callback_data: "get_top_10_round_trip",
            },
          ],
          [
            {
              text: "✈️  TOP cheapest flights one way   ➡️",
              callback_data: "get_top_10_one_way",
            },
          ],
        ],
      },
      disable_web_page_preview: true,
    };

    await safeSend(
      chatId,
      `-------------  START MENU  -------------

📍 Your city is <strong>${city}</strong>! ✈️

🔄 For update the city, write it.

<b>Join to our channels:</b>
🇷🇴 <b><a href="https://t.me/CheapFlightsRomania">Cheap Flights Romania</a></b>

 👇 👇    Let's go ToTheTrip!    👇 👇`,
      options
    );
  } catch (e) {
    console.error("❌ Error sending options:", e);
  }
}

module.exports = { startMenu };

const { safeSend } = require("./telegram");

async function startMenu(chatId, city) {
  try {
    const options = {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✈️ TOP-10 cheap flights round trip ✨",
              callback_data: "get_top_10_round_trip",
            },
          ],
          [
            {
              text: "✈️  TOP-10 cheap flights one way   💰",
              callback_data: "get_top_10_one_way",
            },
          ],
          // [
          //   {
          //     text: "🌍 Cheapest flyghts for destination 📅",
          //     callback_data: "cheapest_flights_for_destination",
          //   },
          // ],
        ],
      },
    };

    await safeSend(
      chatId,
      `-------------  START MENU  -------------\n\n📍 Your city is <strong>${city}</strong>, great! ✈️\n\n🔄 For update the city, write it.\n\n👉 Choose what to explore:\n\n 👇 👇 👇 👇 👇 👇 👇 👇 👇 👇 👇`,
      options
    );
  } catch (e) {
    console.error("❌ Error sending options:", e);
  }
}

module.exports = { startMenu };

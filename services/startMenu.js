const { safeSend } = require("./telegram");

async function startMenu(chatId, city) {
  try {
    const options = {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✈️         TOP  round trip flights         🔄",
              callback_data: "get_top_10_round_trip",
            },
          ],
          [
            {
              text: "✈️          TOP one way flights           ➡️",
              callback_data: "get_top_10_one_way",
            },
          ],
          [
            {
              text: `💰            Best price for date             📆`,
              callback_data: "price_for_date",
            },
          ],
          [
            {
              text: "💸 Cheapest flights to destination 🌍",
              callback_data: "cheapest_flights_to_destination",
            },
          ],
          [
            {
              text: `🔥                 Special offers                  🤑`,
              callback_data: "special_offers",
            },
          ],
        ],
      },
      disable_web_page_preview: true,
    };

    await safeSend(
      chatId,
      `
📍 Your city is <strong>${city.toUpperCase()}</strong>! ✈️ Let's trip!

🔄 For update the city, write it.

<b>You can join our channels:</b>
🇷🇴 <b><a href="https://t.me/CheapFlightsRomania">Cheap Flights Romania</a></b>

 👇 👇    <b>Choose an option:</b>    👇 👇`,
      options
    );
  } catch (e) {
    console.error("❌ Error sending options:", e);
  }
}

module.exports = { startMenu };

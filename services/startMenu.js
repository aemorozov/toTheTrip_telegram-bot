const { safeSend } = require("./telegram");
const { DateTime } = require("luxon");

async function startMenu(chatId, city) {
  const currentDate = new Date();
  const dateAndMonth = DateTime.fromJSDate(currentDate).toFormat("dd.MM.yyyy");
  try {
    const options = {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `🔥       Special offers for today!       🤑`,
              callback_data: "special_offers",
            },
          ],
          [
            {
              text: `💰       Best price for your date        📆`,
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
              text: "✈️ TOP round trip cheapest flights 🔄",
              callback_data: "get_top_10_round_trip",
            },
          ],
          [
            {
              text: "✈️  TOP one way cheapest flights   ➡️",
              callback_data: "get_top_10_one_way",
            },
          ],
        ],
      },
      disable_web_page_preview: true,
    };

    await safeSend(
      chatId,
      `
📍 Your city is <strong>${city}</strong>! ✈️ Let's trip!

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

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
              text: `🔥  Special offers for ${dateAndMonth}!  🤑`,
              callback_data: "special_offers",
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
      `📍 Your city is <strong>${city}</strong>! ✈️ Let's trip!

<b>Special offers</b> — <i>hot deals and price drops from ${city}, only today!</i>

<b>Cheapest flights to destination</b> — <i>pick a destination to get the best price from ${city}.</i>

<b>TOP round trip cheapest flights</b> — <i>top cheap return flights from ${city} anywhere!</i>

<b>TOP one way cheapest flights</b> — <i>top one-way flights from ${city} to any city.</i>

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

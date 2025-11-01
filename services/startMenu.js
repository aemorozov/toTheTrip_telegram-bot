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
      `📍 Your city is <strong>${city}</strong>! ✈️ Let's trip!

<b>Cheapest flights to destination</b> - <i>select your destination and get the best price on flights from ${city} to the selected city</i>

<b>TOP cheapest flights round trip</b> - <i>the answer will contain the best ticket deals for round-trip tickets from ${city} in any direction and on any dates</i>

<b>TOP cheapest flights one way</b> - <i>the answer will contain the best ticket deals for one way tickets from ${city} in any direction and on any dates</i>

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

const { safeSend } = require("./telegram");
const { getIataCode } = require("./getIataCode");
const {
  saveUser,
  pushMessage,
  getUserStep,
  getUser,
  saveUserDestination,
} = require("./db");
const { startMenu } = require("./startMenu");

async function handleTextMessage(chatId, userInput, userInfo) {
  // push to Redis
  try {
    await pushMessage(userInfo.id, userInput, 50);
  } catch (e) {
    throw new Error("Redis error");
  }

  // Проверяем, находится ли пользователь на каком-то шаге сценария
  const step = await getUserStep(chatId);
  if (step === "waiting_for_destination") {
    try {
      const destinationIATA = await getIataCode(userInput);
      console.log("messages.js ", destinationIATA);
      saveUserDestination(chatId, destinationIATA[0], destinationIATA[1]);

      const options = {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "➡️   One way    ✨",
                callback_data: "to_destination_one_way",
              },
            ],
            [
              {
                text: "🔄  Round trip  💰",
                callback_data: "to_destination_round_trip",
              },
            ],
          ],
        },
      };
      await safeSend(chatId, "👌 Ok! One way ➡️ or round trip 🔄 ?.", options);
    } catch (err) {
      console.error("❌ handleTextMessage error:", err);
      await safeSend(chatId, "⚠️ Error processing data. Try again later. ");
    }
  } else {
    // Пытаемся записать сообщение как город для вылета
    // get IATA
    const iataAndCity = await getIataCode(userInput);
    const iata = iataAndCity[0];
    const city = iataAndCity[1];
    if (!iata) throw new Error("Unable to determine IATA code");

    // save user
    await saveUser(userInfo, iata, city);

    // send options
    await startMenu(chatId, city);
  }
}

module.exports = { handleTextMessage };

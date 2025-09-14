const { safeSend } = require("./telegram");
const { getIataCode } = require("./getIataCode");
const { saveUser, pushMessage, getUserStep, getUser } = require("./db");
const { startMenu } = require("./startMenu");
const {
  getObjectForAPI,
} = require("./getFlightsWithDestinationAndDates/askAI");
const {
  getTicketsForDestination,
} = require("./getFlightsWithDestinationAndDates/getTicketsForDestination");

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
      const userObj = await getUser(chatId);
      const city = userObj?.city;
      const jsonForGetTicketsDestination = await getObjectForAPI(
        userInput,
        city
      );
      const jsonFromTPAPI = await getTicketsForDestination(
        jsonForGetTicketsDestination
      );
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

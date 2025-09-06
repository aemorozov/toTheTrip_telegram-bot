const { getIataCode } = require("./getIataCode");
const { saveUser, pushMessage } = require("./db");
const { sendOptions } = require("./sendOptions");

async function handleTextMessage(chatId, userInput, userInfo) {
  // push to Redis
  try {
    await pushMessage(userInfo.id, userInput, 50);
  } catch (e) {
    throw new Error("Redis error");
  }

  // get IATA
  const iataAndCity = await getIataCode(userInput);
  const iata = iataAndCity[0];
  const city = iataAndCity[1];
  if (!iata) throw new Error("Unable to determine IATA code");

  // save user
  await saveUser(userInfo, iata, city);

  // send options
  await sendOptions(chatId, city);
}

module.exports = { handleTextMessage };

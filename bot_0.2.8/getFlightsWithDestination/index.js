const { safeSend } = require("../telegram");
const { getUser } = require("../db");

/**
 * handleAddDestination
 * Отправляет пользователю инструкцию
 */
async function handleAddDestination(chatId) {
  const userObj = await getUser(chatId);
  const message = `✈️ <b>Where would you like to go?</b>\n\nI can show you the best flights from <b>${userObj.city.toUpperCase()}</b> to that city.\n\n🌎 <b>Enter destination city, please.</b>`;
  await safeSend(chatId, message, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

module.exports = {
  handleAddDestination,
};

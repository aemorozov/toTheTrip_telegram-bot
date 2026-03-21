const { safeSend } = require("../telegram");
const { getUser } = require("../db");

/**
 * handleAddDestination
 * Отправляет пользователю инструкцию
 */
async function addDate(chatId) {
  const userObj = await getUser(chatId);
  const message = `✈️ <b>When are you ready to start your trip?</b>\n\nI can show you the cheapest flights from <b>${userObj.city}</b> for that day!\n\n📅 <b>Enter date, please</b>.`;
  await safeSend(chatId, message, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

module.exports = {
  addDate,
};

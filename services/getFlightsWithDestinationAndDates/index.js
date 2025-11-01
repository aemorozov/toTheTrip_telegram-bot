const { safeSend } = require("../telegram");
const { getUser, saveUserStep } = require("../db");
const { startMenu } = require("../startMenu");

/**
 * handleAddDestinationAndDates
 * Отправляет пользователю инструкцию
 */
async function handleAddDestinationAndDates(chatId) {
  const message = `✈️ Add destination city, please.\nExample: Vienna.`;
  await safeSend(chatId, message, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

module.exports = {
  handleAddDestinationAndDates,
};

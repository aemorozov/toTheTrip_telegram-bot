const { safeSend } = require("../telegram");

/**
 * handleAddDestination
 * Отправляет пользователю инструкцию
 */
async function addDate(chatId) {
  const message = `✈️ Add date to start your trip, please.\nExample: 21.02.2026.`;
  await safeSend(chatId, message, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

module.exports = {
  addDate,
};

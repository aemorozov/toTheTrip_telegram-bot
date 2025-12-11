const { safeSend } = require("../telegram");

/**
 * handleAddDestination
 * Отправляет пользователю инструкцию
 */
async function handleAddDestination(chatId) {
  const message = `✈️ Add destination city, please.\nExample: Vienna.`;
  await safeSend(chatId, message, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

module.exports = {
  handleAddDestination,
};

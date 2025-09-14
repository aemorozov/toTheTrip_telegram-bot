const { safeSend } = require("../telegram");
const { getUser, saveUserStep } = require("../db");
const { startMenu } = require("../startMenu");

/**
 * handleAddDestinationAndDates
 * Отправляет пользователю инструкцию и отмечает шаг ввода данных
 */
async function handleAddDestinationAndDates(chatId) {
  // Получаем пользователя из БД
  const userObj = await getUser(chatId);
  const city = userObj?.city;

  if (!userObj?.iata_code) {
    await safeSend(
      chatId,
      "❌ Departure city is not set. 🔄 Send /start again."
    );
    await startMenu(chatId, city);
    return;
  }

  // Сохраняем шаг пользователя в Redis/БД
  await saveUserStep(chatId, "waiting_for_destination");

  // Сообщение с инструкцией
  const message =
    "✈️ Add destination and dates, please.\nExamples: 'To Antalya on September 20th there and September 30th back' or 'To Bucharest on October 24'";

  await safeSend(chatId, message, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

module.exports = {
  handleAddDestinationAndDates,
};

const { startMenuButton } = require("./callbacks");
const { safeSend } = require("./telegram");
const { languages } = require("./languages");
const { Redis } = require("@upstash/redis");
const { getUser, saveUser, saveUserStep } = require("./db");

// Обрабатываем команду старт
async function handleCommandStart(chatId, userInfo) {
  let userObj = await getUser(chatId);

  // 🆕 если пользователя нет — создаём
  if (!userObj) {
    await saveUser(userInfo); // ⬅️ ОБЯЗАТЕЛЬНО
  } else {
    // если пользователь есть — сбрасываем step
    await saveUserStep(chatId, "no_step");
  }
  await safeSend(
    chatId,
    `<b>Hi ${
      userObj.first_name || ""
    }! I can show you the cheapest tickets from your city!</b>
    
📍 First, <b>enter your departure city</b>.

After you can enter your departure date and see all the cheapest flights on that day, or you can choose a destination and find the cheapest options for that destination.

<b>So, what is your departure city?</b>`
  );
}

module.exports = { handleCommandStart };

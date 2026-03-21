const { safeSend } = require("./telegram");
const { languages } = require("./languages");
const { getUser } = require("./db");

// Обрабатываем команду старт
async function handleCommandStart(chatId) {
  let userObj = await getUser(chatId);

  await safeSend(
    chatId,
    `<b>Hi ${
      userObj.first_name || ""
    }! I can show you the cheapest tickets from your city!</b>
    
📍 First, <b>enter your departure city</b>.

After you can enter your departure date and see all the cheapest flights on that day, or you can choose a destination and find the cheapest options for that destination.

<b>So, what is your departure city?</b>`,
  );
}

module.exports = { handleCommandStart };

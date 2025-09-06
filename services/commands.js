const { safeSend } = require("./telegram");

async function handleCommandStart(chatId) {
  await safeSend(chatId, "🌍 Please enter your departure city:");
}

module.exports = { handleCommandStart };

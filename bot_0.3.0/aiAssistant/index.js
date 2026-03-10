const { safeSend } = require("../telegram");

async function aiAssistant(chatId) {
  const message = `🤖 Hi, I am you AI travel assistant! Tell me what the plan do you have?`;
  await safeSend(chatId, message, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

module.exports = { aiAssistant };

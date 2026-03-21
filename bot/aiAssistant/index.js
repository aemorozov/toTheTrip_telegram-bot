const { safeSend } = require("../telegram");
const { aiAssistant: askChatGpt } = require("./aiAssistant");

async function aiAssistant(chatId) {
  try {
    const prompt = `Hi, I am you AI travel assistant! Tell me what the plan do you have?`;
    const reply = await askChatGpt(prompt);
    await safeSend(chatId, reply, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error("❌ aiAssistant index error:", err);
    await safeSend(
      chatId,
      "Sorry, I couldn't reach the AI assistant. Please try again.",
      { parse_mode: "HTML" },
    );
  }
}

module.exports = { aiAssistant };

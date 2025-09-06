const { safeSend } = require("./telegram");

async function sendOptions(chatId, city) {
  try {
    const options = {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✈️ TOP-10 cheapest flights ✨",
              callback_data: "get_top_10",
            },
          ],
        ],
      },
    };

    await safeSend(
      chatId,
      `🌍 Your city is <strong>${city}</strong>:`,
      options
    );
  } catch (e) {
    console.error("❌ Error sending options:", e);
  }
}

module.exports = { sendOptions };

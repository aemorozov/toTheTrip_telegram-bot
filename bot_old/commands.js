const { startMenuButton } = require("./callbacks");
const { safeSend } = require("./telegram");
const { languages } = require("./languages");
const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function handleCommandStart(chatId, userInfo) {
  // const languageCode = userInfo.language_code || "en";
  // await safeSend(chatId, `🌍 ${languages[languageCode].helloMessage}:`);
  await safeSend(
    chatId,
    `🌍 Enter only your departure city and I’ll give you a menu where you can choose the cheapest tickets ✈️💸:`
  );
}

async function chats(chatId) {
  try {
    await safeSend(chatId, "⏳ Count users...");

    const keys = await redis.keys("user:*");

    const totalUsers = keys?.length || 0;

    await startMenuButton(chatId, `👥 Count users: <b>${totalUsers}</b>`);

    console.log(`📊 Count users: ${totalUsers}`);
  } catch (err) {
    console.error("❌ Error counting users:", err);
    await safeSend(chatId, "⚠️ Failed to get user list.");
    return res.status(500).send(err.message);
  }
}

module.exports = { handleCommandStart, chats };

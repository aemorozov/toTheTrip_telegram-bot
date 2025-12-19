const { startMenuButton } = require("./callbacks");
const { safeSend } = require("./telegram");
const { languages } = require("./languages");
const { Redis } = require("@upstash/redis");
const { getUser } = require("./db");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function handleCommandStart(chatId, userInfo) {
  // const languageCode = userInfo.language_code || "en";
  // await safeSend(chatId, `🌍 ${languages[languageCode].helloMessage}:`);
  const userObj = await getUser(chatId);
  await safeSend(
    chatId,
    `<b>Hi ${userObj.first_name}! I can show you the cheapest tickets from your city!</b>
    
📍 First, <b>enter your departure city</b>.

After you can enter your departure date and see all the cheapest flights on that day, or you can choose a destination and find the cheapest options for that destination.

I can show you:
✈️ Cheapest tickets from your city
🔥 Special daily unique offers
🧭 Weekends best price offers
📅 Lowest prices for a specific date
📍 Best prices for a specific destination

<b>So, what is your departure city?</b>`
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

const { startMenuButton } = require("./callbacks");
const { safeSend } = require("./telegram");
const { languages } = require("./languages");
const { Redis } = require("@upstash/redis");
const { getUser, saveUser, saveUserStep } = require("./db");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function handleCommandStart(chatId, userInfo) {
  let userObj = await getUser(chatId);

  // 🆕 если пользователя нет — создаём
  if (!userObj) {
    userObj = {
      chat_id: chatId,
      first_name: userInfo?.first_name || "",
      username: userInfo?.username || null,
      language_code: userInfo?.language_code || "en",
      step: "no_step",
      page: 0,
      created_at: new Date().toISOString(),
    };

    await saveUser(userInfo); // ⬅️ ОБЯЗАТЕЛЬНО
    console.log("🆕 New user created:", userObj);
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

const { Redis } = require("@upstash/redis");
let redis = null;

try {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "⚠️ Upstash env vars missing. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN"
    );
  } else {
    redis = new Redis({ url, token });
  }
} catch (err) {
  console.error("❌ Error initializing Upstash Redis client:", err);
  redis = null;
}

// безопасная парсилка
function safeParseMaybeJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      return trimmed;
    }
  }
  return value;
}

/**
 * Вспомогательная функция для обновления полей пользователя
 */
async function updateUser(chatId, updates) {
  if (!redis) return null;
  const key = `user:${chatId}`;
  const existing = safeParseMaybeJson(await redis.get(key)) || {};
  const updated = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  await redis.set(key, JSON.stringify(updated));
  return updated;
}

/**
 * Сохранить пользователя (нового или обновить старого)
 */
async function saveUser(userInfo, iata, city) {
  if (!redis) return;
  const userKey = `user:${userInfo.id}`;
  const existing = safeParseMaybeJson(await redis.get(userKey)) || {};

  const data = {
    ...existing,
    id: userInfo.id,
    is_bot: userInfo.is_bot,
    first_name: userInfo.first_name,
    last_name: userInfo.last_name,
    username: userInfo.username,
    language_code: userInfo.language_code,
    is_premium: userInfo.is_premium,
    iata_code: iata,
    city: city,
    destination_iata: existing.destination_iata || "",
    destination_city: existing.destination_city || "",
    one_way: existing.one_way ?? null,
    step: existing.step || null,
    messages: existing.messages || [],
    updated_at: new Date().toISOString(),
  };

  await redis.set(userKey, JSON.stringify(data));
  return data;
}

/**
 * Добавить/обновить destination
 */
async function saveUserDestination(chatId, iata, city) {
  return await updateUser(chatId, {
    destination_iata: iata,
    destination_city: city,
  });
}

/**
 * Добавить/обновить one_way
 */
async function saveUserOneWay(chatId, isOneWay) {
  return await updateUser(chatId, {
    one_way: !!isOneWay,
  });
}

/**
 * Получить one_way
 */
async function getUserOneWay(chatId) {
  const user = (await getUser(chatId)) || {};
  return user.one_way ?? null;
}

/**
 * Получить сохранённого пользователя
 */
async function getUser(chatId) {
  if (!redis) return null;
  const key = `user:${chatId}`;
  const raw = await redis.get(key);
  return safeParseMaybeJson(raw);
}

/**
 * Сохранить шаг сценария
 */
async function saveUserStep(chatId, step) {
  if (!chatId || !step || !redis) return;
  return await updateUser(chatId, { step });
}

/**
 * Получить шаг сценария
 */
async function getUserStep(chatId) {
  if (!chatId || !redis) return null;
  const user = await getUser(chatId);
  return user?.step || null;
}

/**
 * Сохранить сообщение в массив messages
 */
async function pushMessage(userId, text, max = 50) {
  if (!redis) return;
  const user = (await getUser(userId)) || {};
  if (!Array.isArray(user.messages)) user.messages = [];
  user.messages.unshift(text || "");
  if (user.messages.length > max) {
    user.messages = user.messages.slice(0, max);
  }
  await redis.set(`user:${userId}`, JSON.stringify(user));
  return user;
}

/**
 * Получить последние N сообщений
 */
async function getMessages(userId, count = 50) {
  if (!redis) return [];
  const user = await getUser(userId);
  if (!user?.messages) return [];
  return user.messages.slice(0, count);
}

module.exports = {
  saveUser,
  getUser,
  saveUserStep,
  getUserStep,
  pushMessage,
  getMessages,
  saveUserDestination,
  saveUserOneWay,
  getUserOneWay,
};

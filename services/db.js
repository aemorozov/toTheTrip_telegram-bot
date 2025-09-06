// services/db.js
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

// Вспомогательная безопасная парсилка
function safeParseMaybeJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value; // уже объект
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      // не JSON — возвращаем строку как есть
      return trimmed;
    }
  }
  return value;
}

/**
 * Сохранить пользователя (строка ключа: user:<id>) — всегда сохраняем JSON
 * @param {Object} userInfo - объект msg.from
 * @param {string} iata - iata код
 */
async function saveUser(userInfo, iata, city) {
  if (!redis) {
    console.warn("saveUser: redis not initialized, skipping save");
    return;
  }
  const userKey = `user:${userInfo.id}`;
  const data = {
    id: userInfo.id,
    is_bot: userInfo.is_bot,
    first_name: userInfo.first_name,
    last_name: userInfo.last_name,
    username: userInfo.username,
    language_code: userInfo.language_code,
    is_premium: userInfo.is_premium,
    iata_code: iata,
    city: city,
    updated_at: new Date().toISOString(),
  };
  try {
    await redis.set(userKey, JSON.stringify(data));
  } catch (err) {
    console.error("❌ saveUser: redis.set error", err);
    throw err;
  }
}

/**
 * Получить сохранённого пользователя (парсит JSON если нужно)
 * @param {string|number} chatId
 * @returns {Object|null|string}
 */
async function getUser(chatId) {
  if (!redis) {
    console.warn("getUser: redis not initialized");
    return null;
  }
  const key = `user:${chatId}`;
  try {
    const raw = await redis.get(key);
    const parsed = safeParseMaybeJson(raw);
    return parsed;
  } catch (err) {
    console.error("❌ getUser: redis.get error", err);
    throw err;
  }
}

/**
 * Сохранить текст сообщения в список последних сообщений пользователя.
 * Храним максимум `max` элементов (по умолчанию 50).
 * @param {string|number} userId
 * @param {string} text
 * @param {number} max
 */
async function pushMessage(userId, text, max = 50) {
  if (!redis) {
    console.warn("pushMessage: redis not initialized, skipping");
    return;
  }
  if (text === undefined || text === null) text = "";
  const listKey = `user:${userId}:messages`;
  try {
    await redis.lpush(listKey, text);
    await redis.ltrim(listKey, 0, max - 1);
    // Не логируем каждый пуш в продакшне, но при необходимости можно
  } catch (err) {
    console.error("❌ pushMessage: redis error", err);
    throw err;
  }
}

/**
 * Получить N последних сообщений пользователя (по умолчанию 50)
 * @param {string|number} userId
 * @param {number} count
 * @returns {Array}
 */
async function getMessages(userId, count = 50) {
  if (!redis) {
    console.warn("getMessages: redis not initialized");
    return [];
  }
  const listKey = `user:${userId}:messages`;
  try {
    // LRANGE 0..count-1
    const items = await redis.lrange(listKey, 0, count - 1);
    return Array.isArray(items) ? items : [];
  } catch (err) {
    console.error("❌ getMessages: redis error", err);
    throw err;
  }
}

module.exports = {
  redis,
  saveUser,
  getUser,
  pushMessage,
  getMessages,
};

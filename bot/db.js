const { Redis } = require("@upstash/redis");
const axios = require("axios");
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
async function saveUser(userInfo, iata, city, country) {
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
    country: country,
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

// === Основная функция для поиска названия города по iata коду ===

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// === Универсальная функция для Redis REST API ===
async function redisRequest(method, key, value = null) {
  const url = `${UPSTASH_REDIS_REST_URL}/${method}/${encodeURIComponent(key)}${
    value ? `/${encodeURIComponent(value)}` : ""
  }`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
  });
  return res.json();
}

async function getCityName(iataCode) {
  if (!iataCode) return null;

  const code = iataCode.trim().toUpperCase();
  console.log(`\n🟢 Looking for city name by IATA: "${code}"`);

  // 1️⃣ Проверяем Redis (таблица airports)
  try {
    const json = await redisRequest("get", "airports");
    const airportsData = json?.result ? JSON.parse(json.result) : {};

    const foundCity = Object.keys(airportsData).find(
      (city) => airportsData[city].toUpperCase() === code
    );

    if (foundCity) {
      console.log(`✅ Found in Redis: ${code} → ${foundCity}`);
      return foundCity;
    } else {
      console.log("⚠️ Not found in Redis, requesting Travelpayouts...");
    }
  } catch (err) {
    console.warn("❌ Redis error:", err.message);
  }

  // 2️⃣ Поиск в Travelpayouts
  try {
    const { data } = await axios.get(
      "https://autocomplete.travelpayouts.com/places2",
      {
        params: { term: code, locale: "en" },
      }
    );

    // Ищем город, связанный с этим кодом
    const match = data.find((p) => p.code === code && p.type === "city");
    const found = match || data.find((p) => p.code === code);

    if (found) {
      console.log(`✅ Found via Travelpayouts: ${found.code} → ${found.name}`);

      // 💾 Сохраняем в Redis
      try {
        const json = await redisRequest("get", "airports");
        const airportsData = json?.result ? JSON.parse(json.result) : {};
        airportsData[found.name] = found.code;
        await redisRequest("set", "airports", JSON.stringify(airportsData));
        console.log(`💾 Saved to Redis: ${found.name} → ${found.code}`);
      } catch (err) {
        console.warn("⚠️ Could not save to Redis:", err.message);
      }

      return found.name;
    } else {
      console.log("⚠️ Travelpayouts did not return a matching city.");
    }
  } catch (err) {
    console.warn("❌ Travelpayouts error:", err.message);
  }

  console.log("❌ Could not find city for IATA:", code);
  return null;
}

function getPostedKey() {
  const d = new Date();
  return `postedFlights:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function getPostedKeyByDate(date) {
  return `postedFlights:${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function wasPosted(uid) {
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000); // минус 24 часа

  const keyToday = getPostedKeyByDate(today);
  const keyYesterday = getPostedKeyByDate(yesterday);

  const postedToday = await redis.sismember(keyToday, uid);
  const postedYesterday = await redis.sismember(keyYesterday, uid);

  return postedToday || postedYesterday; // true, если найден в любом дне
}

async function addPosted(uid) {
  const today = new Date();
  const key = getPostedKeyByDate(today);

  await redis.sadd(key, uid);

  // хранить 48 часов
  await redis.expire(key, 48 * 3600);
}

module.exports = {
  getCityName,
  saveUser,
  getUser,
  saveUserStep,
  getUserStep,
  pushMessage,
  getMessages,
  saveUserDestination,
  saveUserOneWay,
  getUserOneWay,
  wasPosted,
  addPosted,
  updateUser,
};

const { Redis } = require("@upstash/redis");
const { updateUser, getUser } = require("../db");

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = new Redis({ url, token });

const SUBSCRIBERS_KEY = "subscribers";

export async function subscribe(chatId) {
  const idStr = String(chatId);

  await updateUser(chatId, { subscribe: true });

  const userObj = await getUser(chatId);
  const iata = (userObj?.iata_code || "").trim().toUpperCase();
  if (!iata) return;

  const raw = await redis.get(SUBSCRIBERS_KEY);

  let map = {};
  if (raw && typeof raw === "object") map = raw;
  else if (typeof raw === "string") {
    try {
      map = JSON.parse(raw);
    } catch {
      map = {};
    }
  }

  // 1) удалить пользователя из всех других городов
  for (const key of Object.keys(map)) {
    const arr = map[key];
    if (!Array.isArray(arr)) continue;

    if (key === iata) continue; // текущий город не трогаем

    const next = arr.filter((x) => String(x) !== idStr);

    if (next.length === 0) delete map[key];
    else map[key] = next;
  }

  // 2) добавить пользователя в текущий город
  const list = Array.isArray(map[iata]) ? map[iata] : [];
  if (!list.includes(idStr)) list.push(idStr);
  map[iata] = list;

  // (опционально, но полезно) запомнить, на какой город подписан
  await updateUser(chatId, {
    subscribe: true,
    subscribed_iata: iata,
    subscribed_at: new Date().toISOString(),
  });

  // 3) сохранить
  await redis.set(SUBSCRIBERS_KEY, JSON.stringify(map));
}

export async function unsubscribe(chatId) {
  await updateUser(chatId, {
    subscribe: false,
    subscribed_iata: "",
    subscribed_at: new Date().toISOString(),
  });

  const userObj = await getUser(chatId);
  const iata = (userObj?.iata_code || "").trim().toUpperCase();
  if (!iata) return;

  const raw = await redis.get(SUBSCRIBERS_KEY);
  if (!raw) return;

  let map = raw;

  const list = Array.isArray(map[iata]) ? map[iata] : [];
  const idStr = String(chatId);

  const next = list.filter((x) => x !== idStr);

  if (next.length === 0) {
    delete map[iata];
  } else {
    map[iata] = next;
  }

  await redis.set(SUBSCRIBERS_KEY, JSON.stringify(map));
}

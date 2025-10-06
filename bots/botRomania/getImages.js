// getImages.js
const axios = require("axios");
const OpenAI = require("openai");

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || null;

/**
 * Возвращает URL изображения для города.
 * Сначала пробует OpenAI DALL·E (если доступен), затем Unsplash API (если ключ есть),
 * затем source.unsplash.com (без ключа), затем Pexels (если ключ есть).
 *
 * @param {string} city
 * @param {string} country - country code or name (optional)
 * @returns {Promise<string|null>}
 */
async function getCityImage(city, country = "") {
  if (!city || !city.trim()) return null;

  const queryBase = `${city}${country ? ", " + country : ""}`.trim();

  // 1) OpenAI DALL·E (если доступен)
  if (openai) {
    try {
      const prompt = `High-quality realistic travel photo of ${queryBase}. Daylight, cityscape, no text, no people, photographic style, high resolution.`;
      const resp = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
      });
      // new OpenAI returns URL in resp.data[0].url (may vary), handle safely
      const imageUrl = resp?.data?.[0]?.url || resp?.data;
      if (imageUrl) {
        console.log("getCityImage: used OpenAI for", queryBase);
        return imageUrl;
      }
    } catch (err) {
      // если это ошибка верификации — логируем и идём дальше
      console.warn("getCityImage: OpenAI failed:", err?.message || err);
      // не прерываем, переходим к следующему источнику
    }
  }

  // Helper: safe encoded query
  const encodedQuery = encodeURIComponent(`${city} ${country}`.trim());

  // 2) Unsplash API (если есть ключ)
  if (UNSPLASH_KEY) {
    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodedQuery}&per_page=1&orientation=landscape`;
      const res = await axios.get(url, {
        headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
        timeout: 8000,
      });
      const first = res.data?.results?.[0];
      if (
        first &&
        (first.urls?.regular || first.urls?.raw || first.urls?.full)
      ) {
        console.log("getCityImage: used Unsplash API for", queryBase);
        return first.urls.regular || first.urls.full || first.urls.raw;
      }
    } catch (err) {
      console.warn("getCityImage: Unsplash API failed:", err?.message || err);
    }
  }

  // 3) Unsplash Source (no API key) — возвращаем URL (Telegram сам подтянет картинку)
  try {
    // используем формат 1200x628 (хорош для превью)
    const sourceUrl = `https://source.unsplash.com/1200x628/?${encodedQuery}`;
    console.log(
      "getCityImage: using Unsplash Source fallback for",
      queryBase,
      "->",
      sourceUrl
    );
    return sourceUrl;
  } catch (err) {
    console.warn(
      "getCityImage: Unsplash Source fallback failed:",
      err?.message || err
    );
  }

  // ничего не получилось
  return null;
}

module.exports = { getCityImage };

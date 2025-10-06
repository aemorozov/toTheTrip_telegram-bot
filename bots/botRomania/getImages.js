// getImages.js
const axios = require("axios");

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

/**
 * Получает фото города назначения.
 * Возвращает URL изображения (jpg).
 */
async function getCityImage(city, country) {
  const query = `${city} ${country}`;
  console.log(`🔍 Searching image for: ${query}`);

  try {
    // 1️⃣ Пытаемся найти город через официальный API Unsplash
    const response = await axios.get("https://api.unsplash.com/search/photos", {
      params: {
        query,
        per_page: 1,
        orientation: "landscape",
      },
      headers: {
        Authorization: `Client-ID ${UNSPLASH_KEY}`,
      },
    });

    const results = response.data.results;
    if (results && results.length > 0) {
      const img = results[0].urls.regular || results[0].urls.full;
      console.log(`✅ Found Unsplash image for ${query}`);
      return img;
    } else {
      console.warn(`⚠️ No Unsplash results for ${query}`);
      // fallback: просто пробуем Source API
      return `https://source.unsplash.com/1200x628/?${encodeURIComponent(
        query
      )}`;
    }
  } catch (err) {
    console.error("❌ Unsplash API error:", err.message);
    return `https://source.unsplash.com/1200x628/?${encodeURIComponent(query)}`;
  }
}

module.exports = { getCityImage };

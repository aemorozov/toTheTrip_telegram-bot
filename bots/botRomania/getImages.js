const axios = require("axios");

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_KEY;

async function getCityImage(city, country = "") {
  try {
    // случайный номер страницы от 1 до 5
    const randomPage = Math.floor(Math.random() * 5) + 1;

    // случайный стиль запроса (чтобы были разные сцены)
    const queryVariants = [
      `${city}, ${country} city center street`,
      `${city}, ${country} skyline`,
      `${city}, ${country} aerial view cityscape`,
    ];
    const query =
      queryVariants[Math.floor(Math.random() * queryVariants.length)];

    console.log(`🔍 Searching image for: "${query}" (page ${randomPage})`);

    const { data } = await axios.get("https://api.unsplash.com/search/photos", {
      params: {
        query,
        per_page: 1,
        page: randomPage,
        orientation: "landscape",
        order_by: "latest", // иногда даёт более свежие и разнообразные фото
        content_filter: "high",
      },
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    const imageUrl = data?.results?.[0]?.urls?.regular;
    if (!imageUrl) throw new Error("No image found");

    console.log("🖼️ Found image:", imageUrl);
    return imageUrl;
  } catch (err) {
    console.warn("⚠️ Unsplash API error:", err.message);
    // fallback — случайное фото
    return `https://source.unsplash.com/1200x628/?${encodeURIComponent(
      city + " city landscape"
    )}&sig=${Math.floor(Math.random() * 10000)}`; // уникализатор
  }
}

module.exports = { getCityImage };

// const axios = require("axios");

// const XAI_API_KEY = process.env.XAI_API_KEY;

// async function getCityImage(city, country) {
//   const query = `${city} ${country}`;
//   console.log(`🔍 Generating image for: ${query}`);

//   try {
//     // 1️⃣ Проверка ключа
//     if (!XAI_API_KEY) {
//       throw new Error("❌ XAI_API_KEY is missing");
//     }

//     // 2️⃣ Запрос к xAI API
//     const response = await axios.post(
//       "https://api.x.ai/v1/images/generations", // Проверь актуальный эндпоинт в доках
//       {
//         model: "grok-2-image-1212",
//         prompt: `Copy real street photo of ${query} in cinematic style, 1024x1024px`, // Промпт для генерации
//         n: 1, // Количество изображений
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${XAI_API_KEY}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     if (response.status !== 200) {
//       console.error("❌ xAI API returned non-200:", response.status);
//       throw new Error(`xAI API error ${response.status}`);
//     }

//     const results = response.data.data;
//     if (results && results.length > 0) {
//       const imgUrl = results[0].url; // URL сгенерированного изображения
//       console.log(`✅ Generated xAI image for ${query}`);
//       return imgUrl;
//     } else {
//       console.warn(`⚠️ No xAI image results for ${query}`);
//       // Fallback на случай отсутствия результата
//       return `https://source.unsplash.com/1200x628/?${encodeURIComponent(
//         query
//       )}`;
//     }
//   } catch (err) {
//     console.error("❌ xAI API error:", err.message);
//     // Fallback к Unsplash, как в твоём коде
//     const fallback = `https://source.unsplash.com/1200x628/?${encodeURIComponent(
//       query
//     )}`;
//     console.log("🖼️ Using fallback image:", fallback);
//     return fallback;
//   }
// }

// module.exports = { getCityImage };

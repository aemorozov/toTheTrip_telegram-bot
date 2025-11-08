const axios = require("axios");
const PEXELS_API_KEY = process.env.PEXEL_KEY;

async function getCityImage(cityName) {
  const queries = [
    `${cityName} cityscape panorama`,
    `${cityName} skyline panorama`,
    `${cityName} old town panorama`,
    `${cityName} streets panorama`,
    `${cityName} architecture panorama`,
  ];
  const query = queries[Math.floor(Math.random() * queries.length)];
  try {
    const res = await axios.get("https://api.pexels.com/v1/search", {
      headers: { Authorization: PEXELS_API_KEY },
      params: {
        query,
        per_page: 1,
        orientation: "square",
      },
    });

    const imageUrl = res.data.photos?.[0]?.src?.landscape;
    return imageUrl || null;
  } catch (err) {
    console.error("Pexels error:", err.message);
    return null;
  }
}

// const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_KEY;

// async function getCityImage(city, country = "") {
//   try {
//     if (!GOOGLE_PLACES_KEY) throw new Error("❌ GOOGLE_PLACES_KEY is missing");

//     // 🔍 Формируем запрос (уточнение повышает релевантность)
//     const query = `${city} ${country}`;

//     console.log(`🔍 Searching city photo via Google Places: "${query}"`);

//     // 1️⃣ Получаем place_id
//     const findPlaceUrl =
//       "https://maps.googleapis.com/maps/api/place/findplacefromtext/json";
//     const findRes = await axios.get(findPlaceUrl, {
//       params: {
//         input: query,
//         inputtype: "textquery",
//         fields: "place_id",
//         key: GOOGLE_PLACES_KEY,
//       },
//     });

//     const placeId = findRes.data?.candidates?.[0]?.place_id;
//     if (!placeId) throw new Error("❌ City not found in Google Places");

//     // 2️⃣ Получаем список фотографий
//     const detailsUrl =
//       "https://maps.googleapis.com/maps/api/place/details/json";
//     const detailsRes = await axios.get(detailsUrl, {
//       params: {
//         place_id: placeId,
//         fields: "photos",
//         key: GOOGLE_PLACES_KEY,
//       },
//     });

//     const photos = detailsRes.data?.result?.photos;
//     if (!photos || photos.length === 0)
//       throw new Error("⚠️ No photos found for this city");

//     // 3️⃣ Берём случайное фото
//     const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
//     const photoRef = randomPhoto.photo_reference;

//     // 4️⃣ Формируем ссылку на изображение
//     const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photo_reference=${photoRef}&key=${GOOGLE_PLACES_KEY}`;

//     console.log("🖼️ Found Google Places photo:", photoUrl);
//     return photoUrl;
//   } catch (err) {
//     console.warn("⚠️ Google Places API error:", err.message);

//     // 🔄 Fallback — случайное фото с Unsplash (без ключа)
//     return `https://source.unsplash.com/1200x628/?${encodeURIComponent(
//       city + " city landscape"
//     )}&sig=${Math.floor(Math.random() * 10000)}`;
//   }
// }

module.exports = { getCityImage };

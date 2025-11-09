const axios = require("axios");
const sharp = require("sharp");

const PEXELS_API_KEY = process.env.PEXEL_KEY;

async function getCityImage(cityName) {
  const queries = [
    `${cityName} cityscape`,
    `${cityName} skyline`,
    `${cityName} old town`,
    `${cityName} streets`,
    `${cityName} panorama`,
  ];

  const query = queries[Math.floor(Math.random() * queries.length)];

  try {
    // 1️⃣ Получаем изображения с Pexels
    const res = await axios.get("https://api.pexels.com/v1/search", {
      headers: { Authorization: PEXELS_API_KEY },
      params: {
        query,
        per_page: 5,
        orientation: "landscape", // берем побольше пространства для кропа
      },
    });

    const photos = res.data.photos;
    if (!photos.length) return null;

    const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
    const imageUrl = randomPhoto?.src?.large2x;

    if (!imageUrl) return null;

    // 2️⃣ Скачиваем само изображение как массив байтов
    const { data } = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const inputBuffer = Buffer.from(data);

    // 3️⃣ Кадрируем квадратом в памяти
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();
    const size = Math.min(metadata.width, metadata.height);

    const squareBuffer = await image
      .extract({
        left: Math.floor((metadata.width - size) / 2),
        top: Math.floor((metadata.height - size) / 2),
        width: size,
        height: size,
      })
      .resize(1080, 1080)
      .jpeg({ quality: 90 })
      .toBuffer();

    // 4️⃣ Возвращаем квадратный буфер
    return squareBuffer;
  } catch (err) {
    console.error("Pexels image error:", err.message);
    return null;
  }
}

module.exports = { getCityImage };

// const axios = require("axios");
// const PEXELS_API_KEY = process.env.PEXEL_KEY;

// async function getCityImage(cityName) {
//   const queries = [
//     `${cityName} cityscape`,
//     `${cityName} skyline`,
//     `${cityName} old town`,
//     `${cityName} streets`,
//     `${cityName} panorama`,
//   ];

//   const query = queries[Math.floor(Math.random() * queries.length)];
//   try {
//     const res = await axios.get("https://api.pexels.com/v1/search", {
//       headers: { Authorization: PEXELS_API_KEY },
//       params: {
//         query,
//         per_page: 5, // берем сразу несколько фото
//         orientation: "portrait",
//       },
//     });

//     const photos = res.data.photos;
//     const imageUrl =
//       photos[Math.floor(Math.random() * photos.length)]?.src?.large2x;
//     return imageUrl || null;
//   } catch (err) {
//     console.error("Pexels error:", err.message);
//     return null;
//   }
// }

// module.exports = { getCityImage };

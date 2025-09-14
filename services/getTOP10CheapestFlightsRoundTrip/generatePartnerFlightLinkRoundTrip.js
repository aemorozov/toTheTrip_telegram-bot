function generatePartnerFlightLinkRoundTrip({
  origin,
  destination,
  depart_date,
  return_date,
  adults = 1,
  marker = "59890", // твой партнёрский маркер
  trs = "443711", // твой trs
  p = "4114", // твой p
  campaign_id = "100", // Aviasales campaign_id
}) {
  // 🔹 Преобразуем дату "YYYY-MM-DD" → "DDMM"
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return dd + mm;
  };

  const depart = formatDate(depart_date);
  const ret = formatDate(return_date);

  // 🔹 Составляем путь Aviasales
  let searchPath = `${origin}${depart}${destination}${ret}`;

  searchPath += adults; // количество пассажиров

  // 🔹 Формируем URL поиска
  const baseUrl = `https://www.aviasales.com/search/${searchPath}`;
  const encodedUrl = encodeURIComponent(baseUrl);

  // 🔹 Собираем партнёрскую ссылку
  return `https://tp.media/r?marker=${marker}&trs=${trs}&p=${p}&u=${encodedUrl}&campaign_id=${campaign_id}`;
}

module.exports = { generatePartnerFlightLinkRoundTrip };

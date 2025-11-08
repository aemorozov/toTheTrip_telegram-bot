function generatePartnerFlightLinkRU({
  origin_airport,
  destination,
  departure_at,
  return_at = null, // если есть обратный рейс
  adults = 1,
  marker = "59890",
  trs = "443711",
  p = "4114",
  campaign_id = "100",
}) {
  // 🔹 Преобразуем дату "YYYY-MM-DD" → "DDMM"
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return dd + mm;
  };

  const depart = formatDate(departure_at);

  // 🔹 Если есть обратная дата — форматируем её
  const returnDate = return_at ? formatDate(return_at) : "";

  // 🔹 Составляем путь Aviasales
  // для одного конца → SVO2305DME1
  // для туда-обратно → SVO2305DME30051
  let searchPath = `${origin_airport}${depart}${destination}${returnDate}${adults}`;

  // 🔹 Формируем базовый URL поиска
  const baseUrl = `https://www.aviasales.ru/search/${searchPath}?currency=EUR`;
  const encodedUrl = encodeURIComponent(baseUrl);

  // 🔹 Собираем партнёрскую ссылку
  return `https://tp.media/r?marker=${marker}&trs=${trs}&p=${p}&u=${encodedUrl}&campaign_id=${campaign_id}`;
}

module.exports = { generatePartnerFlightLinkRU };

const axios = require("axios");

// функция для сдвига даты в будущее
function ensureFutureDateFlexible(dateStr, hasReturnAt) {
  if (!dateStr) return null;

  const inputDate = new Date(dateStr);
  const now = new Date();

  if (isNaN(inputDate)) return null;

  // если дата в прошлом — переносим на следующий год
  if (inputDate < now) {
    inputDate.setFullYear(now.getFullYear() + 1);
  }

  const year = inputDate.getFullYear();
  const month = String(inputDate.getMonth() + 1).padStart(2, "0");
  const day = String(inputDate.getDate()).padStart(2, "0");

  // если возврат не указан → YYYY-MM
  return hasReturnAt ? `${year}-${month}-${day}` : `${year}-${month}`;
}

async function getTicketsForDestination(parsed) {
  try {
    // гарантируем все ключи на месте
    const params = {
      currency: parsed.currency || "USD",
      origin: parsed.origin,
      destination: parsed.destination,
      departure_at: ensureFutureDateFlexible(
        parsed.departure_at,
        !!parsed.return_at
      ),
      return_at: ensureFutureDateFlexible(parsed.return_at, true) || "",
      one_way: parsed.one_way ?? true,
      direct: parsed.direct ?? false,
      market: parsed.market || "ru",
      limit: parsed.limit || 10,
      page: parsed.page || 1,
      sorting: parsed.sorting || "price",
      unique: parsed.unique ?? false,
      token: process.env.TRAVELPAYOUTS_API_TOKEN,
    };

    const url = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";
    const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
    console.log("👉 Full request URL:", fullUrl);

    const res = await axios.get(
      "https://api.travelpayouts.com/aviasales/v3/prices_for_dates",
      { params }
    );

    return (
      res.data?.data ||
      "Sorry, we can't find cheap flights on that days, try again please."
    );
  } catch (err) {
    console.error(
      "[getTicketsForDestination ERROR]",
      err.response?.data || err.message
    );
    return [];
  }
}

module.exports = { getTicketsForDestination };

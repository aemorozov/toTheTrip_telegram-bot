const axios = require("axios");

async function getTicketsForDestination(parsed) {
  try {
    // гарантируем все ключи на месте
    const params = {
      currency: parsed.currency || "USD",
      origin: parsed.origin,
      destination: parsed.destination,
      one_way: parsed.one_way ?? true,
      direct: parsed.direct ?? false,
      market: parsed.market || "ro",
      limit: parsed.limit || 10,
      page: parsed.page || 1,
      sorting: parsed.sorting || "price",
      unique: parsed.unique ?? false,
      token: process.env.TRAVELPAYOUTS_API_TOKEN,
    };

    const url = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";
    const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
    console.log("👉 getTicketsForDestination: ", fullUrl);

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

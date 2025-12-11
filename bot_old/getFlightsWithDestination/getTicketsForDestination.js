const axios = require("axios");

async function getTicketsForDestinationOneWay(originIATA, destinationIATA) {
  try {
    // гарантируем все ключи на месте
    const paramsOneWay = {
      currency: "eur",
      origin: originIATA,
      destination: destinationIATA,
      one_way: true,
      direct: false,

      limit: 7,
      page: 1,
      sorting: "price",
      unique: false,
      token: process.env.TRAVELPAYOUTS_API_TOKEN,
    };

    const url = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";
    const fullUrl = `${url}?${new URLSearchParams(paramsOneWay).toString()}`;
    console.log("👉 getTicketsForDestination: ", fullUrl);

    const res = await axios.get(url, { params: paramsOneWay });

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

async function getTicketsForDestinationRoundTrip(originIATA, destinationIATA) {
  try {
    // гарантируем все ключи на месте
    const paramsRoundTrip = {
      currency: "eur",
      origin: originIATA,
      destination: destinationIATA,
      one_way: false,
      direct: false,

      limit: 7,
      page: 1,
      sorting: "price",
      unique: false,
      token: process.env.TRAVELPAYOUTS_API_TOKEN,
    };

    const url = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";
    const fullUrl = `${url}?${new URLSearchParams(paramsRoundTrip).toString()}`;
    console.log("👉 getTicketsForDestination: ", fullUrl);

    const res = await axios.get(url, { params: paramsRoundTrip });

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

module.exports = {
  getTicketsForDestinationOneWay,
  getTicketsForDestinationRoundTrip,
};

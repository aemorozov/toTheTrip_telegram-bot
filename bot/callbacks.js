const { getUser, saveUserStep, getCityName, saveUserPage } = require("./db");
const {
  getCheapTicketsRoundTrip,
} = require("./getTOP10CheapestFlightsRoundTrip/getCheapTicketsRoundTrip");
const { extractShortLink } = require("./encodeLink");
const { safeSend, safeSendPhoto } = require("./telegram");
const { startMenu } = require("./startMenu");
const { handleAddDestination } = require("./getFlightsWithDestination");
const { DateTime } = require("luxon");
const { specialOffersRoundTrip } = require("./specialOffers/specialOffers");
const { addDate } = require("./priceForDate");
const { aiAssistant } = require("./aiAssistant");
const { getCityImage } = require("./getCityImage");
const { getWeekendTickets } = require("./weekendFlights/");
const { subscribe, unsubscribe } = require("./subscribe");

async function get_top_10_round_trip(chatId) {
  await saveUserStep(chatId, "no_step");

  const userObj = await getUser(chatId);
  if (!userObj?.iata_code) {
    await safeSend(
      chatId,
      "❌ Departure city is not set. 🔄 Send /start again.",
    );
    return;
  }

  const originIATA = userObj.iata_code;
  const tickets = (await getCheapTicketsRoundTrip(originIATA)).slice(0, 6); // запрашиваем 7 билетов

  if (tickets.length === 0) {
    const message = `😢💔 Sorry, I can't find the best results for ${userObj.city}, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`;
    return await startMenuButton(chatId, message);
  }

  for (const t of tickets) {
    try {
      const info = await getCityName(t.destination);
      t.destination_city = info?.[0] || null;
      t.destination_country = info?.[1] || null;
      t.destination_country_code = info?.[2] || null;
    } catch (e) {
      console.log("getCityName ERROR:", e);
    }
  }

  const message =
    tickets.length > 0
      ? `<b>🔥 Cheapest round trip flights from ${userObj.city.toUpperCase()}</b>:\n\n` +
        tickets
          .map((t) => {
            const destination_iata = t.destination;
            const destination = t.destination_city;
            const destinationCountry = t.destination_country_code;
            const departure_date = DateTime.fromISO(t.departure_at, {
              setZone: true,
            })
              .setLocale("en")
              .toFormat("ccc dd LLL");
            const departure_time = DateTime.fromISO(t.departure_at, {
              setZone: true,
            }).toFormat("HH:mm");

            const depart_transfers = t.transfers;

            const return_date = DateTime.fromISO(t.return_at, {
              setZone: true,
            })
              .setLocale("en")
              .toFormat("ccc dd LLL");
            const return_time = DateTime.fromISO(t.return_at, {
              setZone: true,
            }).toFormat("HH:mm");

            const return_transfers = t.return_transfers;

            const searchPath = `${originIATA}${DateTime.fromISO(
              t.departure_at,
              {
                setZone: true,
              },
            ).toFormat("ddMM")}${destination_iata}${DateTime.fromISO(
              t.return_at,
              {
                setZone: true,
              },
            ).toFormat("ddMM")}1`;
            const baseUrl = `https://www.aviasales.com/search/${searchPath}?currency=EUR`;
            const encodedUrl = encodeURIComponent(baseUrl);
            const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

            const depart_transfers_text =
              depart_transfers == "0" ? "" : `🔃 ${depart_transfers}`;
            const return_transfers_text =
              return_transfers == "0" ? "" : `🔃 ${return_transfers}`;

            return `✈️ to <b>${destination}, ${destinationCountry}</b> about <b>${
              t.price
            }€</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  ${depart_transfers_text}\n📅 <b>${return_date}</b>  🕐 ${return_time}  ${return_transfers_text}\n🔗 <u><a href="${link}">https://${extractShortLink(
              link,
            )}</a></u>\n`;
          })
          .join("\n") +
        `\n📢 Share it to your travel friend!`
      : `<b>🔥 TOP cheapest round trip flights from ${userObj.city} for you</b>:\n\n😢💔 Sorry, I can't find the best results for ${userObj.city}, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`;

  const city = tickets[0].destination_city;
  const photo = await getCityImage(city);
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "👉        START MENU        👈",
            callback_data: "start_menu",
          },
        ],
      ],
    },
  };
  if (photo) {
    return await safeSendPhoto(chatId, photo, message, options);
  } else {
    return await startMenuButton(chatId, message);
  }
}

async function cheapest_flights_to_destination(chatId) {
  await saveUserStep(chatId, "waiting_for_destination");
  return handleAddDestination(chatId);
}

async function price_for_date(chatId) {
  await saveUserStep(chatId, "waiting_for_date");
  return addDate(chatId);
}

async function special_offers(chatId) {
  await saveUserStep(chatId, "no_step");

  const userObj = await getUser(chatId);
  if (!userObj?.iata_code) {
    await safeSend(
      chatId,
      "❌ Departure city is not set. 🔄 Send /start again.",
    );
    return;
  }

  const originIATA = userObj.iata_code;
  const originCity = userObj.city;
  const ticketsRoundTrip = (await specialOffersRoundTrip(originIATA)).slice(
    0,
    6,
  );

  if (ticketsRoundTrip.length === 0) {
    const message = `😢💔 Sorry, I can't find the best results for ${userObj.city}, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`;
    return await startMenuButton(chatId, message);
  }

  for (const t of ticketsRoundTrip) {
    try {
      const info = await getCityName(t.destination);

      t.destination_city = info?.[0] || null;
      t.destination_country = info?.[1] || null;
      t.destination_country_code = info?.[2] || null;
    } catch (e) {
      console.log("getCityName ERROR:", e);
      t.destination_city = null;
      t.destination_country = null;
    }
  }

  const message =
    `<b>🔥 Special round trip offers from ${originCity.toUpperCase()}!</b>\n\n` +
    (ticketsRoundTrip.length > 0
      ? ticketsRoundTrip
          .map((t) => {
            const destination_iata = t.destination;
            const destinationCity = t.destination_city;
            const destinationCountryCode = t.destination_country_code;
            const departure_date = DateTime.fromISO(t.departure_at, {
              setZone: true,
            })
              .setLocale("en")
              .toFormat("ccc dd LLL");
            const departure_time = DateTime.fromISO(t.departure_at, {
              setZone: true,
            }).toFormat("HH:mm");

            const depart_transfers = t.transfers;

            const return_date = DateTime.fromISO(t.return_at, {
              setZone: true,
            })
              .setLocale("en")
              .toFormat("ccc dd LLL");
            const return_time = DateTime.fromISO(t.return_at, {
              setZone: true,
            }).toFormat("HH:mm");

            const return_transfers = t.return_transfers;

            const searchPath = `${originIATA}${DateTime.fromISO(
              t.departure_at,
              {
                setZone: true,
              },
            ).toFormat("ddMM")}${destination_iata}${DateTime.fromISO(
              t.return_at,
              {
                setZone: true,
              },
            ).toFormat("ddMM")}1`;
            const baseUrl = `https://www.aviasales.com/search/${searchPath}?currency=EUR`;
            const encodedUrl = encodeURIComponent(baseUrl);
            const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

            const depart_transfers_text =
              depart_transfers == "0" ? "" : `🔃 ${depart_transfers}`;
            const return_transfers_text =
              return_transfers == "0" ? "" : `🔃 ${return_transfers}`;

            return `💸 to <b>${destinationCity}, ${destinationCountryCode}</b> about <b>${
              t.price
            }€</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  ${depart_transfers_text}\n📅 <b>${return_date}</b>  🕐 ${return_time}  ${return_transfers_text}\n🔗 <u><a href="${link}">https://${extractShortLink(
              link,
            )}</a></u>\n`;
          })
          .join("\n") + `\n📢 Share it to your travel friend!`
      : `😢💔 Sorry, I can't find the best results for ${userObj.city}, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`);

  const city = ticketsRoundTrip[0].destination_city;
  const photo = await getCityImage(city);
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "👉        START MENU        👈",
            callback_data: "start_menu",
          },
        ],
      ],
    },
  };
  if (photo) {
    return await safeSendPhoto(chatId, photo, message, options);
  } else {
    return await startMenuButton(chatId, message);
  }
}

async function weekendFlights(chatId) {
  await saveUserStep(chatId, "no_step");

  const userObj = await getUser(chatId);
  if (!userObj?.iata_code) {
    await safeSend(
      chatId,
      "❌ Departure city is not set. 🔄 Send /start again.",
    );
    return;
  }

  const originIATA = userObj.iata_code;
  const originCity = userObj.city;
  const tickets = (await getWeekendTickets(originIATA))
    .sort(
      (a, b) =>
        DateTime.fromISO(a.departure_at).toMillis() -
        DateTime.fromISO(b.departure_at).toMillis(),
    )
    .slice(0, 6);

  if (tickets.length === 0) {
    const message = `😢💔 Sorry, I can't find the best results for ${userObj.city}, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`;
    return await startMenuButton(chatId, message);
  }

  for (const t of tickets) {
    try {
      const info = await getCityName(t.destination);

      t.destination_city = info?.[0] || null;
      t.destination_country = info?.[1] || null;
      t.destination_country_code = info?.[2] || null;
    } catch (e) {
      console.log("getCityName ERROR:", e);
      t.destination_city = null;
      t.destination_country = null;
    }
  }

  const message =
    `<b>⭐ Weekend round trip flights from ${originCity.toUpperCase()}!</b>\n\n` +
    (tickets.length > 0
      ? tickets
          .map((t) => {
            const destination_iata = t.destination;
            const destinationCity = t.destination_city;
            const destinationCountryCode = t.destination_country_code;
            const departure_date = DateTime.fromISO(t.departure_at, {
              setZone: true,
            })
              .setLocale("en")
              .toFormat("ccc dd LLL");
            const departure_time = DateTime.fromISO(t.departure_at, {
              setZone: true,
            }).toFormat("HH:mm");

            const depart_transfers = t.transfers;

            const return_date = DateTime.fromISO(t.return_at, {
              setZone: true,
            })
              .setLocale("en")
              .toFormat("ccc dd LLL");
            const return_time = DateTime.fromISO(t.return_at, {
              setZone: true,
            }).toFormat("HH:mm");

            const return_transfers = t.return_transfers;

            const searchPath = `${originIATA}${DateTime.fromISO(
              t.departure_at,
              {
                setZone: true,
              },
            ).toFormat("ddMM")}${destination_iata}${DateTime.fromISO(
              t.return_at,
              {
                setZone: true,
              },
            ).toFormat("ddMM")}1`;
            const baseUrl = `https://www.aviasales.com/search/${searchPath}?currency=EUR`;
            const encodedUrl = encodeURIComponent(baseUrl);
            const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

            const depart_transfers_text =
              depart_transfers == "0" ? "" : `🔃 ${depart_transfers}`;
            const return_transfers_text =
              return_transfers == "0" ? "" : `🔃 ${return_transfers}`;

            return `💸 to <b>${destinationCity}, ${destinationCountryCode}</b> about <b>${
              t.price
            }€</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  ${depart_transfers_text}\n📅 <b>${return_date}</b>  🕐 ${return_time}  ${return_transfers_text}\n🔗 <u><a href="${link}">https://${extractShortLink(
              link,
            )}</a></u>\n`;
          })
          .join("\n") + `\n📢 Share it to your travel friend!`
      : `😢💔 Sorry, I can't find the best results for ${userObj.city}, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`);

  const city = tickets[0].destination_city;
  const photo = await getCityImage(city);
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "👉        START MENU        👈",
            callback_data: "start_menu",
          },
        ],
      ],
    },
  };
  if (photo) {
    return await safeSendPhoto(chatId, photo, message, options);
  } else {
    return await startMenuButton(chatId, message);
  }
}

// Функция добавления кнопки со ссылкой на основное меню
async function startMenuButton(chatId, message = "") {
  await saveUserPage(chatId, "1");
  await saveUserStep(chatId, "no_step");
  await safeSend(chatId, message, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "👉        START MENU        👈",
            callback_data: "start_menu",
          },
        ],
      ],
    },
  });
}

async function handleCallbackQuery(chatId, data) {
  // При нажатии на кнопку возврата к основному меню
  if (data === "start_menu") {
    await saveUserStep(chatId, "no_step");
    const userObj = await getUser(chatId);
    const city = userObj?.city;
    const country = userObj?.country;
    await startMenu(chatId, city, country);
  }

  if (data === "get_top_10_round_trip") {
    await saveUserStep(chatId, "no_step");
    await get_top_10_round_trip(chatId);
  }

  // if (data === "cheapest_flights_to_destination") {
  //   await saveUserStep(chatId, "no_step");
  //   await cheapest_flights_to_destination(chatId);
  // }

  if (data === "special_offers") {
    await saveUserStep(chatId, "no_step");
    await special_offers(chatId);
  }

  // if (data === "price_for_date") {
  //   await saveUserStep(chatId, "no_step");
  //   await price_for_date(chatId);
  // }

  // if (data === "ai_assistant") {
  //   await saveUserStep(chatId, "no_step");
  //   await saveUserStep(chatId, "ai_mode");
  //   aiAssistant(chatId);
  // }

  if (data === "weekend_flights") {
    await saveUserStep(chatId, "no_step");
    await weekendFlights(chatId);
  }

  if (data === "subscribe") {
    await saveUserStep(chatId, "no_step");
    await subscribe(chatId);
    const userObj = await getUser(chatId);
    const message = `
✈️ <b>You’re subscribed to cheap flights from ${userObj.city}</b>!

I’ll send you the best deals every day.

To change the city — just select a new one and subscribe again.  
To unsubscribe — open the start menu and tap “Unsubscribe”.
`;
    await startMenuButton(chatId, message);
  }

  if (data === "unsubscribe") {
    await unsubscribe(chatId);
    const userObj = await getUser(chatId);
    const message = `
❌ <b>You’ve unsubscribed from flight deals from ${userObj.city}</b>.

You won’t receive daily offers anymore.  
You can subscribe again anytime from the start menu ✈️
`;
    await startMenuButton(chatId, message);
  }
}

module.exports = {
  handleCallbackQuery,
  startMenuButton,
  get_top_10_round_trip,
  cheapest_flights_to_destination,
  special_offers,
  price_for_date,
  weekendFlights,
};

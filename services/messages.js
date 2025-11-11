const { safeSend } = require("./telegram");
const { getIataCode } = require("./getIataCode");
const {
  saveUser,
  pushMessage,
  getUserStep,
  getUser,
  saveUserDestination,
  saveUserStep,
  getCityName,
} = require("./db");
const { startMenu } = require("./startMenu");
const {
  getTicketsForDestinationOneWay,
  getTicketsForDestinationRoundTrip,
} = require("./getFlightsWithDestination/getTicketsForDestination");
const { DateTime } = require("luxon");
const { extractShortLink } = require("./encodeLink");
const { startMenuButton } = require("./callbacks");
const {
  getTicketsForDateOneWay,
  getTicketsForDateRoundTrip,
} = require("./priceForDate/getTicketsForDate");

async function handleTextMessage(chatId, userInput, userInfo) {
  // push to Redis
  try {
    await pushMessage(userInfo.id, userInput, 50);
  } catch (e) {
    throw new Error("Redis error");
  }

  // Проверяем, находится ли пользователь на каком-то шаге сценария
  const step = await getUserStep(chatId);
  if (step === "waiting_for_destination") {
    try {
      await saveUserStep(chatId, "no_step");
      const userObj = await getUser(chatId);
      const originIATA = userObj.iata_code;
      const originCity = userObj.city;
      const destinationFull = await getIataCode(userInput);
      const destinationIATA = destinationFull[0];
      const destinationCity = destinationFull[1];
      saveUserDestination(chatId, destinationIATA, destinationCity);

      const ticketsOneWay = await getTicketsForDestinationOneWay(
        originIATA,
        destinationIATA
      );

      const ticketsRoundTrip = await getTicketsForDestinationRoundTrip(
        originIATA,
        destinationIATA
      );

      await Promise.all(
        ticketsOneWay.map(async (t) => {
          t.desination_city = await getCityName(t.destination);
        })
      );

      await Promise.all(
        ticketsRoundTrip.map(async (t) => {
          t.desination_city = await getCityName(t.destination);
        })
      );

      const message =
        `<b>🔥 Cheapest flights from ${originCity} to ${destinationCity} for you</b>\n\n` +
        `<b>➡️✈️ One way tickets:</b>\n\n` +
        (ticketsOneWay.length > 0
          ? ticketsOneWay
              .map((t) => {
                const destination_iata = t.destination;
                const departure_date = DateTime.fromISO(t.departure_at, {
                  setZone: true,
                })
                  .setLocale("en")
                  .toFormat("dd LLL yyyy");
                const departure_time = DateTime.fromISO(t.departure_at, {
                  setZone: true,
                }).toFormat("HH:mm");

                const searchPath = `${originIATA}${DateTime.fromISO(
                  t.departure_at,
                  {
                    setZone: true,
                  }
                ).toFormat("ddMM")}${destination_iata}1`;
                const baseUrl = `https://www.aviasales.com/search/${searchPath}?currency=EUR`;
                const encodedUrl = encodeURIComponent(baseUrl);
                const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

                const transfers = t.transfers;
                const textForTransfers =
                  transfers == "0" ? "" : `🔃 ${transfers}`;

                return `💸 about <b>${
                  t.price
                }€</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  ${textForTransfers}\n🔗 <u><a href="${link}">https://${extractShortLink(
                  link
                )}</a></u>\n`;
              })
              .join("\n")
          : `😢💔 Sorry, I can't find the best results for ${userObj.city}, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`) +
        `\n\n<b>🔁🛬 Round trip tickets:</b>\n\n` +
        (ticketsOneWay.length > 0
          ? ticketsRoundTrip
              .map((t) => {
                const destination_iata = t.destination;
                const departure_date = DateTime.fromISO(t.departure_at, {
                  setZone: true,
                })
                  .setLocale("en")
                  .toFormat("dd LLL yyyy");
                const departure_time = DateTime.fromISO(t.departure_at, {
                  setZone: true,
                }).toFormat("HH:mm");

                const depart_transfers = t.transfers;

                const return_date = DateTime.fromISO(t.return_at, {
                  setZone: true,
                })
                  .setLocale("en")
                  .toFormat("dd LLL yyyy");
                const return_time = DateTime.fromISO(t.return_at, {
                  setZone: true,
                }).toFormat("HH:mm");

                const return_transfers = t.return_transfers;

                const searchPath = `${originIATA}${DateTime.fromISO(
                  t.departure_at,
                  {
                    setZone: true,
                  }
                ).toFormat("ddMM")}${destination_iata}${DateTime.fromISO(
                  t.return_at,
                  {
                    setZone: true,
                  }
                ).toFormat("ddMM")}1`;
                const baseUrl = `https://www.aviasales.com/search/${searchPath}?currency=EUR`;
                const encodedUrl = encodeURIComponent(baseUrl);
                const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

                const depart_transfers_text =
                  depart_transfers == "0" ? "" : `🔃 ${depart_transfers}`;
                const return_transfers_text =
                  return_transfers == "0" ? "" : `🔃 ${return_transfers}`;

                return `💸 about <b>${
                  t.price
                }€</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  ${depart_transfers_text}\n📅 <b>${return_date}</b>  🕐 ${return_time}  ${return_transfers_text}\n🔗 <u><a href="${link}">https://${extractShortLink(
                  link
                )}</a></u>\n`;
              })
              .join("\n")
          : `😢💔 Sorry, I can't find the best results for ${userObj.city}, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`);
      startMenuButton(chatId, message);
    } catch (err) {
      console.error("❌ handleTextMessage error:", err);
      await safeSend(chatId, "⚠️ Error processing data. Try again later. ");
    }
  } else if (step === "waiting_for_date") {
    try {
      await saveUserStep(chatId, "no_step");
      const userObj = await getUser(chatId);
      const originIATA = userObj.iata_code;
      const originCity = userObj.city;
      const [day, month, year] = userInput.split(".");
      const date = `${year}-${month}-${day}`;

      const ticketsOneWay = await getTicketsForDateOneWay(originIATA, date);

      const ticketsRoundTrip = await getTicketsForDateRoundTrip(
        originIATA,
        date
      );

      ticketsOneWay.length > 0
        ? await Promise.all(
            ticketsOneWay.map(async (t) => {
              t.desination_city = await getCityName(t.destination);
            })
          )
        : "";

      ticketsRoundTrip.length > 0
        ? await Promise.all(
            ticketsRoundTrip.map(async (t) => {
              t.desination_city = await getCityName(t.destination);
            })
          )
        : "";

      const message =
        `<b>🔥 Best deals from ${originCity} on ${userInput} for you</b>\n\n` +
        `<b>➡️✈️ One way tickets:</b>\n\n` +
        (ticketsOneWay.length > 0
          ? ticketsOneWay
              .map((t) => {
                const destination_iata = t.destination;
                const destinationCity = t.desination_city;
                const departure_date = DateTime.fromISO(t.departure_at, {
                  setZone: true,
                })
                  .setLocale("en")
                  .toFormat("dd LLL yyyy");
                const departure_time = DateTime.fromISO(t.departure_at, {
                  setZone: true,
                }).toFormat("HH:mm");

                const searchPath = `${originIATA}${DateTime.fromISO(
                  t.departure_at,
                  {
                    setZone: true,
                  }
                ).toFormat("ddMM")}${destination_iata}1`;
                const baseUrl = `https://www.aviasales.com/search/${searchPath}?currency=EUR`;
                const encodedUrl = encodeURIComponent(baseUrl);
                const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

                const transfers = t.transfers;
                const textForTransfers =
                  transfers == "0" ? "" : `🔃 ${transfers}`;

                return `💸 to <b>${destinationCity}</b> about <b>${
                  t.price
                }€</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  ${textForTransfers}\n🔗 <u><a href="${link}">https://${extractShortLink(
                  link
                )}</a></u>\n`;
              })
              .join("\n")
          : `😢💔 Sorry, I can't find the best results, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`) +
        `\n\n<b>🔁🛬 Round trip tickets:</b>\n\n` +
        (ticketsRoundTrip.length > 0
          ? ticketsRoundTrip
              .map((t) => {
                const destination_iata = t.destination;
                const destinationCity = t.desination_city;
                const departure_date = DateTime.fromISO(t.departure_at, {
                  setZone: true,
                })
                  .setLocale("en")
                  .toFormat("dd LLL yyyy");
                const departure_time = DateTime.fromISO(t.departure_at, {
                  setZone: true,
                }).toFormat("HH:mm");

                const depart_transfers = t.transfers;

                const return_date = DateTime.fromISO(t.return_at, {
                  setZone: true,
                })
                  .setLocale("en")
                  .toFormat("dd LLL yyyy");
                const return_time = DateTime.fromISO(t.return_at, {
                  setZone: true,
                }).toFormat("HH:mm");

                const return_transfers = t.return_transfers;

                const searchPath = `${originIATA}${DateTime.fromISO(
                  t.departure_at,
                  {
                    setZone: true,
                  }
                ).toFormat("ddMM")}${destination_iata}${DateTime.fromISO(
                  t.return_at,
                  {
                    setZone: true,
                  }
                ).toFormat("ddMM")}1`;
                const baseUrl = `https://www.aviasales.com/search/${searchPath}?currency=EUR`;
                const encodedUrl = encodeURIComponent(baseUrl);
                const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

                const depart_transfers_text =
                  depart_transfers == "0" ? "" : `🔃 ${depart_transfers}`;
                const return_transfers_text =
                  return_transfers == "0" ? "" : `🔃 ${return_transfers}`;

                return `💸 to <b>${destinationCity}</b> about <b>${
                  t.price
                }€</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  ${depart_transfers_text}\n📅 <b>${return_date}</b>  🕐 ${return_time}  ${return_transfers_text}\n🔗 <u><a href="${link}">https://${extractShortLink(
                  link
                )}</a></u>\n`;
              })
              .join("\n")
          : `😢💔 Sorry, I can't find the best results, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`);

      await startMenuButton(chatId, message);
    } catch (err) {
      console.error("❌ handleTextMessage error:", err);
      await safeSend(chatId, "⚠️ Error processing data. Try again later. ");
    }
  } else {
    // Если нет, то пытаемся записать сообщение как город для вылета (origin)
    // get IATA code
    const iataAndCity = await getIataCode(userInput);
    const iata = iataAndCity[0];
    const city = iataAndCity[1];
    console.log("iata: ", iata, "city: ", city);
    if (!iata) throw new Error("Unable to determine IATA code");

    // save user
    await saveUser(userInfo, iata, city);

    // send options
    await startMenu(chatId, city);
  }
}

module.exports = { handleTextMessage };

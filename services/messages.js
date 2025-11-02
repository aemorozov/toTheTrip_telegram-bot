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
        ticketsOneWay > 0
          ? `<b>🔥 Cheapest flights from ${originCity} to ${destinationCity} for you</b>\n\n` +
            `<b>➡️✈️ One way tickets:</b>\n\n` +
            ticketsOneWay
              .map((t) => {
                const destination_iata = t.destination;
                const departure_date = DateTime.fromISO(t.departure_at, {
                  setZone: true,
                }).toFormat("dd.MM");
                const departure_time = DateTime.fromISO(t.departure_at, {
                  setZone: true,
                }).toFormat("HH:mm");

                const searchPath = `${originIATA}${DateTime.fromISO(
                  t.departure_at,
                  {
                    setZone: true,
                  }
                ).toFormat("ddMM")}${destination_iata}1`;
                const baseUrl = `https://www.aviasales.com/search/${searchPath}`;
                const encodedUrl = encodeURIComponent(baseUrl);
                const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

                const transfers = t.transfers;
                const textForTransfers =
                  transfers == "0" ? "Direct" : transfers;

                return `💸 about <b>${
                  t.price
                }$</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  🔃 ${textForTransfers}\n🔗 <u><a href="${link}">https://${extractShortLink(
                  link
                )}</a></u>\n`;
              })
              .join("\n") +
            `\n\n<b>🔁🛬 Round trip tickets:</b>\n\n` +
            ticketsRoundTrip
              .map((t) => {
                const destination_iata = t.destination;
                const departure_date = DateTime.fromISO(t.departure_at, {
                  setZone: true,
                }).toFormat("dd.MM");
                const departure_time = DateTime.fromISO(t.departure_at, {
                  setZone: true,
                }).toFormat("HH:mm");

                const depart_transfers = t.transfers;

                const return_date = DateTime.fromISO(t.return_at, {
                  setZone: true,
                }).toFormat("dd.MM");
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
                const baseUrl = `https://www.aviasales.com/search/${searchPath}`;
                const encodedUrl = encodeURIComponent(baseUrl);
                const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

                const depart_transfers_text =
                  depart_transfers == "0" ? "Direct" : depart_transfers;
                const return_transfers_text =
                  return_transfers == "0" ? "Direct" : return_transfers;

                return `💸 about <b>${
                  t.price
                }$</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  🔃 ${depart_transfers_text}\n📅 <b>${return_date}</b>  🕐 ${return_time}  🔃 ${return_transfers_text}\n🔗 <u><a href="${link}">https://${extractShortLink(
                  link
                )}</a></u>\n`;
              })
              .join("\n")
          : `<b>🔥 Cheapest flights from ${originCity} to ${destinationCity} for you</b>\n\n😢💔 Sorry, I didn't find the best results for ${userObj.city}, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`;
      startMenuButton(chatId, message);
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

const { getUser, saveUserStep, getCityName } = require("./db");
const {
  getCheapTicketsRoundTrip,
} = require("./getTOP10CheapestFlightsRoundTrip/getCheapTicketsRoundTrip");
const {
  extractShortLinkRoundTrip,
} = require("./getTOP10CheapestFlightsRoundTrip/encodeLinkRoundTrip");
const {
  getCheapTicketsOneWay,
} = require("./getTOP10CheapestFlightsOneWay/getCheapTicketsOneWay");
const {
  translateCodesWithGPTOneWay,
} = require("./getTOP10CheapestFlightsOneWay/translateCodeWithGPTOneWay");
const {
  generatePartnerFlightLinkOneWay,
} = require("./getTOP10CheapestFlightsOneWay/generatePartnerFlightLinkOneWay");
const {
  extractShortLinkOneWay,
} = require("./getTOP10CheapestFlightsOneWay/encodeLinkOneWay");
const {
  formatDateOneWay,
} = require("./getTOP10CheapestFlightsOneWay/formatDateOneWay");
const { safeSend } = require("./telegram");
const { startMenu } = require("./startMenu");
const {
  handleAddDestinationAndDates,
} = require("./getFlightsWithDestinationAndDates/");
const {
  getObjectForAPI,
} = require("./getFlightsWithDestinationAndDates/askAI");
const {
  getTicketsForDestination,
} = require("./getFlightsWithDestinationAndDates/getTicketsForDestination");
const { DateTime } = require("luxon");

// Функция добавления кнопки со ссылкой на основное меню
async function startMenuButton(chatId, message) {
  await safeSend(chatId, message, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "** START MENU **",
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
    await startMenu(chatId, city);
  }

  // При нажатии на кнопку ТОП билетов
  if (data === "get_top_10_one_way") {
    await saveUserStep(chatId, "no_step");

    const userObj = await getUser(chatId);
    if (!userObj?.iata_code) {
      await safeSend(
        chatId,
        "❌ Departure city is not set. 🔄 Send /start again."
      );
      return;
    }

    const originIATA = userObj.iata_code;
    const tickets = await getCheapTicketsOneWay(originIATA);

    await Promise.all(
      tickets.map(async (t) => {
        t.desination_city = await getCityName(t.destination);
      })
    );

    const message =
      `<b>🔥 TOP cheapest one way flights from ${userObj.city} for you</b>:\n\n` +
      tickets
        .map((t) => {
          const destination_iata = t.destination;
          const destination = t.desination_city;
          const departure_date = DateTime.fromISO(t.departure_at, {
            setZone: true,
          }).toFormat("dd.MM");
          const departure_time = DateTime.fromISO(t.departure_at, {
            setZone: true,
          }).toFormat("HH:mm");

          const searchPath = `${originIATA}${DateTime.fromISO(t.departure_at, {
            setZone: true,
          }).toFormat("ddMM")}${destination_iata}1`;
          const baseUrl = `https://www.aviasales.com/search/${searchPath}`;
          const encodedUrl = encodeURIComponent(baseUrl);
          const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

          const transfers = t.transfers;
          const textForTransfers = transfers == "0" ? "Direct" : transfers;

          return `✈️ to <b>${destination}</b> about <b>${
            t.price
          }$</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  🔃 ${textForTransfers}\n🔗 <u><a href="${link}">https://${extractShortLinkOneWay(
            link
          )}</a></u>\n`;
        })
        .join("\n");
    startMenuButton(chatId, message);
  }

  if (data === "get_top_10_round_trip") {
    await saveUserStep(chatId, "no_step");

    const userObj = await getUser(chatId);
    if (!userObj?.iata_code) {
      await safeSend(
        chatId,
        "❌ Departure city is not set. 🔄 Send /start again."
      );
      return;
    }

    const originIATA = userObj.iata_code;
    const tickets = await getCheapTicketsRoundTrip(originIATA);

    console.log(tickets);

    await Promise.all(
      tickets.map(async (t) => {
        t.desination_city = await getCityName(t.destination);
      })
    );

    const message =
      `<b>🔥 TOP cheapest round trip flights from ${userObj.city} for you</b>:\n\n` +
      tickets
        .map((t) => {
          const destination_iata = t.destination;
          const destination = t.desination_city;
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

          const searchPath = `${originIATA}${DateTime.fromISO(t.departure_at, {
            setZone: true,
          }).toFormat("ddMM")}${destination_iata}${DateTime.fromISO(
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

          return `✈️ to <b>${destination}</b> about <b>${
            t.price
          }$</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  🔃 ${depart_transfers_text}\n📅 <b>${return_date}</b>  🕐 ${return_time}  🔃 ${return_transfers_text}\n🔗 <u><a href="${link}">https://${extractShortLinkRoundTrip(
            link
          )}</a></u>\n`;
        })
        .join("\n");

    startMenuButton(chatId, message);
  }

  // При нажатии на кнопку добавить пункт прибытия
  if (data === "cheapest_flights_to_destination") {
    await saveUserStep(chatId, "waiting_for_destination");
    handleAddDestinationAndDates(chatId);
  }

  if (data === "to_destination_one_way") {
    const oneWay = true;
    await saveUserStep(chatId, "no_step");

    const userObj = await getUser(chatId);
    const originIATA = userObj.iata_code;
    const jsonForAPI = await getObjectForAPI(
      userObj.iata_code,
      userObj.destination_iata,
      oneWay
    );

    console.log("callback.js: ", jsonForAPI);

    const tickets = await getTicketsForDestination(jsonForAPI);

    console.log("callbacks.js: ", tickets);

    const sortingTickets = await sortAndLimitTickets(tickets);

    let translations = [];
    try {
      translations = await translateCodesWithGPTOneWay(sortingTickets);
    } catch (e) {}

    const message =
      `<b>🔥 Cheapest one way flights\nfrom ${userObj.city} to ${userObj.destination_city}</b>:\n\n` +
      translations
        .map((t) => {
          const depart_date = t.departure;
          const destination_iata = t.destination_iata;
          const link = generatePartnerFlightLinkOneWay({
            originIATA,
            destination_iata,
            depart_date,
          });
          const transfers = t.transfers;
          const textForTransfers = transfers === "0" ? "Direct" : transfers;

          return `💸 Price about <b>${t.price}$</b>\n📅 <b>${formatDateOneWay(
            t?.departure
          )}</b>  🕐 ${
            t.departure_time
          }  🔃 ${textForTransfers}\n🔗 <u><a href="${link}">https://${extractShortLinkOneWay(
            link
          )}</a></u>\n`;
        })
        .join("\n");

    startMenuButton(chatId, message);
  }

  if (data === "to_destination_round_trip") {
    const oneWay = false;
    await saveUserStep(chatId, "no_step");

    const userObj = await getUser(chatId);
    const originIATA = userObj.iata_code;
    const jsonForAPI = await getObjectForAPI(
      userObj.iata_code,
      userObj.destination_iata,
      oneWay
    );

    console.log("callback.js: ", jsonForAPI);

    const tickets = await getTicketsForDestination(jsonForAPI);

    console.log("callbacks.js: ", tickets);

    const sortingTickets = await sortAndLimitTickets(tickets);

    let translations = [];
    try {
      translations = await translateCodesWithGPTOneWay(sortingTickets);
    } catch (e) {}

    const message =
      `<b>🔥 Cheapest round trip flights from ${userObj.city} to ${userObj.destination_city}</b>:\n\n` +
      translations
        .map((t) => {
          const depart_date = t.departure;
          const depart_time = t.departure_time;
          const depart_transfers = t.transfers;
          const return_date = t.return_date;
          const return_time = t.return_time;
          const return_transfers = t.return_transfers;
          const destination_iata = t.destination_iata;
          const link = generatePartnerFlightLinkOneWay({
            originIATA,
            destination_iata,
            depart_date,
            return_date,
          });
          const depart_transfers_text =
            depart_transfers === "0" ? "Direct" : depart_transfers;
          const return_transfers_text =
            return_transfers === "0" ? "Direct" : return_transfers;

          return `💸 Price about <b>${t.price}$</b>\n📅 <b>${formatDateOneWay(
            depart_date
          )}</b>  🕐 ${depart_time}  🔃 ${depart_transfers_text}\n📅 <b>${formatDateOneWay(
            return_date
          )}</b>  🕐 ${return_time}  🔃 ${return_transfers_text}\n🔗 <u><a href="${link}">https://${extractShortLinkOneWay(
            link
          )}</a></u>\n`;
        })
        .join("\n");

    startMenuButton(chatId, message);
  }
}

function sortAndLimitTickets(tickets, limit = 10) {
  if (!Array.isArray(tickets)) return [];

  return tickets
    .sort((a, b) => a.price - b.price) // сортировка по  цене (от дешёвого к дорогому)
    .slice(0, limit); // берём только первые N
}

module.exports = { handleCallbackQuery, startMenuButton };

const { getUser, saveUserStep } = require("./db");
const {
  getCheapTicketsRoundTrip,
} = require("./getTOP10CheapestFlightsRoundTrip/getCheapTicketsRoundTrip");
const {
  translateCodesWithGPTRoundTrip,
} = require("./getTOP10CheapestFlightsRoundTrip/translateCodeWithGPTRoundTrip");
const {
  generatePartnerFlightLinkRoundTrip,
} = require("./getTOP10CheapestFlightsRoundTrip/generatePartnerFlightLinkRoundTrip");
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
  formatDateRoundTrip,
} = require("./getTOP10CheapestFlightsRoundTrip/formatDateRoundTrip");
const {
  handleAddDestinationAndDates,
} = require("./getFlightsWithDestinationAndDates/");
const {
  getObjectForAPI,
} = require("./getFlightsWithDestinationAndDates/askAI");
const {
  getTicketsForDestination,
} = require("./getFlightsWithDestinationAndDates/getTicketsForDestination");

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

function getRandomThinkingMessage() {
  const messages = [
    "I am looking hard, few sec 👀 ...",
    "Few sec, checking deals fast ⏳ ...",
    "Moment, scanning routes now 🌍 ...",
    "Sec, searching flights 🛫 ...",
    "One moment, almost ready 🔎 ...",
    "Few sec, wait a sec ⏱️ ...",
    "Sec, loading offers 📡 ...",
    "Moment, crunching data 📊 ...",
    "One moment, my friend 🔥 ...",
    "Hold tight, searching 💼 ...",
  ];

  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

async function handleCallbackQuery(chatId, data) {
  // При нажатии на кнопку возврата к основному меню
  if (data === "start_menu") {
    await saveUserStep(chatId, "no_step");
    const userObj = await getUser(chatId);
    const city = userObj?.city;
    await startMenu(chatId, city);
  }

  // При нажатии на кнопку ТОП-10 билетов
  if (data === "get_top_10_round_trip") {
    await saveUserStep(chatId, "no_step");
    await safeSend(chatId, getRandomThinkingMessage());
    const userObj = await getUser(chatId);
    if (!userObj?.iata_code) {
      await safeSend(
        chatId,
        "❌ Departure city is not set. 🔄 Send /start again."
      );
      return;
    }

    const tickets = await getCheapTicketsRoundTrip(userObj.iata_code);
    let translations = [];
    try {
      translations = await translateCodesWithGPTRoundTrip(tickets);
    } catch (e) {}

    const origin = userObj.iata_code;
    const message =
      `<b>🔥 TOP cheapest round trip flights from ${userObj.city} for you</b>:\n\n` +
      translations
        .map((t) => {
          const destination = t.destination;
          const destination_iata = t.destination_iata;
          const depart_date = t.departure;
          const depart_time = t.departure_time;
          const depart_transfers = t.transfers;
          const return_date = t.return_date;
          const return_time = t.return_time;
          const return_transfers = t.return_transfers;
          const link = generatePartnerFlightLinkRoundTrip({
            origin,
            destination_iata,
            depart_date,
            return_date,
          });

          const depart_transfers_text =
            depart_transfers === "0" ? "Direct" : depart_transfers;
          const return_transfers_text =
            return_transfers === "0" ? "Direct" : return_transfers;

          return `✈️ to <b>${destination}</b> from <b>${
            t.price
          }$</b>\n📅 ${formatDateRoundTrip(
            depart_date
          )}  🕐 ${depart_time}  🔃 ${depart_transfers_text}\n📅 ${formatDateRoundTrip(
            return_date
          )}  🕐 ${return_time}  🔃 ${return_transfers_text}\n🔗 <u><a href="${link}">https://${extractShortLinkRoundTrip(
            link
          )}</a></u>\n`;
        })
        .join("\n");

    startMenuButton(chatId, message);
  }

  if (data === "get_top_10_one_way") {
    await saveUserStep(chatId, "no_step");
    await safeSend(chatId, getRandomThinkingMessage());
    const userObj = await getUser(chatId);
    if (!userObj?.iata_code) {
      await safeSend(
        chatId,
        "❌ Departure city is not set. 🔄 Send /start again."
      );
      return;
    }

    const tickets = await getCheapTicketsOneWay(userObj.iata_code);
    let translations = [];
    try {
      translations = await translateCodesWithGPTOneWay(tickets);
    } catch (e) {}

    const originIATA = userObj.iata_code;
    const message =
      `<b>🔥 TOP cheapest one way flights from ${userObj.city} for you</b>:\n\n` +
      translations
        .map((t) => {
          const destination = t.destination;
          const depart_date = t.departure;
          const destination_iata = t.destination_iata;
          const link = generatePartnerFlightLinkOneWay({
            originIATA,
            destination_iata,
            depart_date,
          });
          const transfers = t.transfers;
          const textForTransfers = transfers === "0" ? "Direct" : transfers;

          return `✈️ to <b>${destination}</b> from <b>${
            t.price
          }$</b>\n📅 <b>${formatDateOneWay(t?.departure)}</b>  🕐 ${
            t.departure_time
          }  🔃 ${textForTransfers}\n🔗 <u><a href="${link}">https://${extractShortLinkOneWay(
            link
          )}</a></u>\n`;
        })
        .join("\n");

    startMenuButton(chatId, message);
  }

  if (data === "cheapest_flights_to_destination") {
    await saveUserStep(chatId, "waiting_for_destination");
    handleAddDestinationAndDates(chatId);
  }

  // При нажатии на кнопку добавить пункт прибытия
  if (data === "to_destination_one_way") {
    const oneWay = true;
    await saveUserStep(chatId, "no_step");
    await safeSend(chatId, getRandomThinkingMessage());
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

          return `💸 Price from <b>${t.price}$</b>\n📅 <b>${formatDateOneWay(
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
    await safeSend(chatId, getRandomThinkingMessage());
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
      `<b>🔥 Cheapest round trip flights\nfrom ${userObj.city} to ${userObj.destination_city}</b>:\n\n` +
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

          return `💸 Price from <b>${t.price}$</b>\n📅 <b>${formatDateOneWay(
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

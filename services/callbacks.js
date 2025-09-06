const { getUser } = require("./db");
const { getCheapTickets } = require("./getCheapTickets");
const { translateCodesWithGPT } = require("./translateCodeWithGPT");
const { generatePartnerFlightLink } = require("./generatePartnerFlightLink");
const { extractShortLink } = require("./encodeLink");
const { safeSend } = require("./telegram");
const { sendOptions } = require("./sendOptions");
const { formatDate } = require("./formatDate");

async function handleCallbackQuery(chatId, data) {
  // Назад к основному меню
  if (data === "start_menu") {
    const userObj = await getUser(chatId);
    const city = userObj?.city;
    await sendOptions(chatId, city);
  }
  // ТОП-10 билетов
  if (data === "get_top_10") {
    const userObj = await getUser(chatId);
    if (!userObj?.iata_code) {
      await safeSend(
        chatId,
        "❌ Departure city is not set. 🔄 Send /start again."
      );
      return;
    }

    const tickets = await getCheapTickets(userObj.iata_code);
    let translations = [];
    try {
      translations = await translateCodesWithGPT(tickets);
    } catch (e) {}

    const origin = userObj.iata_code;
    const message =
      `<b>🔥 TOP-10</b> cheapest flights from <b>${userObj.iata_code}</b>:\n\n` +
      tickets
        .map((t, index) => {
          const match = translations.find(
            (item) => item.iata === t.destination && item.airline === t.airline
          );
          const destination = t.destination;
          const depart_date = t.departure;
          const return_date = t.return;
          const city = match?.city || t.destination;
          const link = generatePartnerFlightLink({
            origin,
            destination,
            depart_date,
            return_date,
          });

          return `✈️ to <b>${city}</b> | from <b>${t.price}€</b>\n${formatDate(
            match?.departure
          )} ⇄ ${formatDate(
            match?.return
          )} | <u><a href="${link}">https://${extractShortLink(link)}</a></u>`;
        })
        .join("\n") +
      `\n\n*update every 24 hours`;

    await safeSend(chatId, message, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Start menu",
              callback_data: "start_menu",
            },
          ],
        ],
      },
    });
  }
}

module.exports = { handleCallbackQuery };

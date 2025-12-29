import { main } from "../mainFunction";

const CHANNEL_ID = "@CheapFlightsTurkey";
const airports = [
  "IST",
  "ESB",
  "ADB",
  "AYT",
  "DLM",
  "BJV",
  "GZT",
  "TZX",
  "SZF",
  "ASR",
  "KYA",
  "DIY",
  "VAN",
];
const locale = "tr"; // for getCityName and depDate = dtDeparture.setLocale("ro")
const rateFlight = (f) => {
  const price = f.price;
  const dist = f.distance;
  const transfers = Math.max(f.transfers, f.return_transfers);

  // Проверяем билет

  if (price < 50) {
    if (transfers === 0) {
      console.log(
        `TRUE, price < 50 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist < 2000) {
    if (transfers === 0 && price <= 60) {
      console.log(
        `TRUE, price < 60, dist < 2000 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist < 3500) {
    if (transfers === 0 && price <= 70) {
      console.log(
        `TRUE, price <= 70, dist < 3500 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist < 5000) {
    if (transfers === 0 && price <= 100) {
      console.log(
        `TRUE, price < 100, dist < 5000 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist < 8000) {
    if (transfers === 0 && price <= 400) {
      console.log(
        `TRUE, price < 400, dist < 8000 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist < 10000) {
    if (transfers === 0 && price <= 500) {
      console.log(
        `TRUE, price < 500, dist < 10000 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    if (transfers === 1 && price <= 300) {
      console.log(
        `TRUE, price < 300, dist < 10000 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist >= 10000) {
    if (price <= 500 && transfers <= 1) {
      console.log(
        `TRUE, price < 500, dist >= 10000 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    } // супер-финды!
    return false;
  }

  return false;
};
const REDIS_KEY = "Turkey:last_titles";
const language = "tr";
const shareText = "Arkadaşlarınla paylaş!";
const linkText = "Ucuz uçuş botu";
const preMessage = {
  flightItem({
    originName,
    destinationName,
    price,
    depDate,
    depTime,
    depTransfers,
    retDate,
    retTime,
    retTransfers,
    link,
    short,
  }) {
    return `
✈️ <b>${originName}</b> ⇄ <b>${destinationName}</b>
💶 yaklaşık <b>${price}€</b>
📅 <b>${depDate}  🕓 ${depTime}</b>${
      depTransfers == 0 ? "" : `  🔃 ${depTransfers}`
    }
📅 <b>${retDate}  🕓 ${retTime}</b>${
      retTransfers == 0 ? "" : `  🔃 ${retTransfers}`
    }
🔗 Link: <a href="${link}"><b>https://${short}</b></a>\n`;
  },

  footer() {
    return `\n📢 ${shareText}!\n\n🤖 <b><a href="https://t.me/CheapFlightsToTheTripBot">${linkText}</a></b>`;
  },
};
async function TopForToday() {
  await main(
    CHANNEL_ID,
    airports,
    rateFlight,
    locale,
    REDIS_KEY,
    language,
    preMessage
  );
}

module.exports = { TopForToday };

import { main } from "../mainFunction";

const CHANNEL_ID = "@cheapflightsserbia";
const airports = [
  "BEG", // Belgrade – Nikola Tesla Airport
  "INI", // Niš – Constantine the Great Airport
  "KVO", // Morava Airport (Kraljevo)
];
const locale = "sr"; // for getCityName and depDate = dtDeparture.setLocale("ro")
const rateFlight = (f) => {
  const price = f.price;
  const dist = f.distance;
  const transfers = Math.max(f.transfers, f.return_transfers);

  // Проверяем билет

  if (price < 100) {
    if (transfers === 0) {
      console.log(
        `TRUE, price < 100 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist > 1000 && dist < 3500) {
    if (transfers === 0 && price <= 150) {
      console.log(
        `TRUE, price <= 150, dist < 3500 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist < 5000) {
    if (transfers === 0 && price <= 200) {
      console.log(
        `TRUE, price < 200, dist < 5000 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist < 7500) {
    if (transfers === 0 && price <= 500) {
      console.log(
        `TRUE, price < 500, dist < 7500 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist < 10000) {
    if (transfers === 0 && price <= 600) {
      console.log(
        `TRUE, price < 600, dist < 10000 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    if (transfers === 1 && price <= 400) {
      console.log(
        `TRUE, price < 400, dist < 10000 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist >= 10000) {
    if (price <= 600 && transfers <= 1) {
      console.log(
        `TRUE, price < 600, dist >= 10000 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    } // супер-финды!
    return false;
  }

  return false;
};
const REDIS_KEY = "Serbia:last_titles";
const language = "sr";
const shareText = "Podeli sa prijateljima";
const linkText = "Tvoj bot za jeftine letove";
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
💶 oko <b>${price}€</b>
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

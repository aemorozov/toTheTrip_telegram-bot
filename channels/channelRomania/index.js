import { main } from "../mainFunction";

const CHANNEL_ID = "@CheapFlightsRomania";
const airports = ["BUH", "CLJ", "CRA", "IAS", "OMR", "SBZ", "TSR"];
const locale = "ro"; // for getCityName and depDate = dtDeparture.setLocale("ro")
function rateFlight(f) {
  const price = f.price;
  const dist = f.distance;
  const transfers = Math.max(f.transfers, f.return_transfers);

  // Проверяем билет
  console.log();

  if (price < 50) {
    if (transfers === 0) {
      console.log(
        `TRUE, price < 50` +
          ` Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist < 2000) {
    if (transfers === 0 && price <= 70) {
      console.log(
        `TRUE, price < 70, dist < 2000` +
          ` Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist < 3500) {
    if (transfers === 0 && price <= 150) {
      console.log(
        `TRUE, price < 150, dist < 3500` +
          ` Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist < 5000) {
    if (transfers === 0 && price <= 350) {
      console.log(
        `TRUE, price < 350, dist < 5000` +
          ` Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    } // было 400 → 350
    if (transfers === 1 && price <= 200) {
      console.log(
        `TRUE, price < 200, dist < 5000` +
          ` Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    } // было 300 → 220
    return false;
  }

  if (dist < 8000) {
    if (transfers === 0 && price <= 400) {
      console.log(
        `TRUE, price < 400, dist < 8000` +
          ` Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    if (transfers === 1 && price <= 250) {
      console.log(
        `TRUE, price < 250, dist < 8000` +
          ` Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    } // было 500 → 350
    return false;
  }

  if (dist < 10000) {
    if (price <= 450 && transfers <= 1) {
      console.log(
        `TRUE, price < 450, dist < 10000` +
          ` Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    } // супер-финды!
    return false;
  }

  if (dist >= 10000) {
    if (price <= 700 && transfers <= 2) {
      console.log(
        `TRUE, price < 700, dist >= 10000` +
          ` Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    } // супер-финды!
    return false;
  }
  return false;
}
const REDIS_KEY = "Romania:last_titles";
const language = "ro";
const footerText = `\n📢 Distribuie prietenilor!\n\n🤖 <b><a href="https://t.me/CheapFlightsToTheTripBot">Botul tău de zboruri ieftine</a></b>`;
const exchange = 5;
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
💶 aprox. <b>${price * exchange} RON</b> (${price}€)
📅 <b>${depDate}  🕓 ${depTime}</b>${
      depTransfers == 0 ? "" : `  🔃 ${depTransfers}`
    }
📅 <b>${retDate}  🕓 ${retTime}</b>${
      retTransfers == 0 ? "" : `  🔃 ${retTransfers}`
    }
🔗 Link: <a href="${link}"><b>https://${short}</b></a>\n`;
  },

  footer() {
    return footerText;
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

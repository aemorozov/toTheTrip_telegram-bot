const { DateTime } = require("luxon");
const axios = require("axios");

export async function filterWeekendTrips(tickets, originIATA) {
  console.log("🚀 filterWeekendTrips with holidays + bridge days");

  /* ───────────── 1. COUNTRY BY ORIGIN (places2) ───────────── */
  const placesRes = await axios.get(
    "https://autocomplete.travelpayouts.com/places2",
    {
      params: {
        term: originIATA,
        locale: "en",
        types: "city",
      },
    }
  );

  const countryCode =
    placesRes.data?.[0]?.country_code || placesRes.data?.[0]?.country;

  if (!countryCode) {
    console.warn("❌ Cannot determine country for origin:", originIATA);
    return [];
  }

  console.log("🌍 Origin country:", countryCode);

  /* ───────────── 2. HOLIDAYS (Nager.Date) ───────────── */
  const yearSet = new Set();
  tickets.forEach((t) => {
    yearSet.add(DateTime.fromISO(t.departure_at).year);
    yearSet.add(DateTime.fromISO(t.return_at).year);
  });

  const holidays = [];

  for (const year of yearSet) {
    const res = await axios.get(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`
    );
    holidays.push(...res.data);
  }

  /* ───────────── 3. HOLIDAY + BRIDGE DAYS SET ───────────── */
  const holidaySet = new Set();

  for (const h of holidays) {
    const dt = DateTime.fromISO(h.date);
    holidaySet.add(dt.toISODate());

    // bridge days: ±1 day
    holidaySet.add(dt.minus({ days: 1 }).toISODate());
    holidaySet.add(dt.plus({ days: 1 }).toISODate());
  }

  console.log("🎉 Holiday + bridge days loaded:", holidaySet.size);

  /* ───────────── 4. HELPERS ───────────── */
  const isDepartInWeekendWindow = (d) =>
    (d.weekday === 4 && d.hour >= 20) ||
    d.weekday === 5 ||
    (d.weekday === 6 && d.hour < 12);

  const isReturnInWeekendWindow = (r) =>
    (r.weekday === 7 && r.hour > 6) ||
    r.weekday === 1 ||
    (r.weekday === 2 && r.hour < 2);

  const isHolidayTrip = (d, r) =>
    holidaySet.has(d.toISODate()) || holidaySet.has(r.toISODate());

  const isWeekRelationOk = (d, r) => {
    const sameWeek = d.weekYear === r.weekYear && d.weekNumber === r.weekNumber;

    const nextWeek = (() => {
      const plus1 = d.plus({ weeks: 1 });
      return plus1.weekYear === r.weekYear && plus1.weekNumber === r.weekNumber;
    })();

    if (r.weekday === 7) return sameWeek;
    if (r.weekday === 1 || r.weekday === 2) return nextWeek;
    return false;
  };

  /* ───────────── 5. FILTER ───────────── */
  const result = [];

  for (const t of tickets) {
    const depart = DateTime.fromISO(t.departure_at, { setZone: true });
    const ret = DateTime.fromISO(t.return_at, { setZone: true });

    if (!depart.isValid || !ret.isValid) continue;

    const durationHours = ret.diff(depart, "hours").hours;
    const durationOk = durationHours >= 26;

    const weekendTrip =
      isDepartInWeekendWindow(depart) &&
      isReturnInWeekendWindow(ret) &&
      isWeekRelationOk(depart, ret);

    const holidayTrip = isHolidayTrip(depart, ret);

    const pass = durationOk && (weekendTrip || holidayTrip);

    if (pass) {
      result.push(t);
    }
  }

  console.log(`🎯 RESULT: ${result.length} / ${tickets.length} tickets passed`);

  return result;
}

export async function getWeekendTickets(originIATA) {
  console.log("start getWeekendTickets");

  const params = {
    currency: "eur",
    origin: originIATA,
    one_way: false,
    direct: true,
    limit: 300,
    page: 1,
    sorting: "price",
    unique: true,
    token: process.env.TRAVELPAYOUTS_API_TOKEN,
  };

  const res = await axios.get(
    "https://api.travelpayouts.com/aviasales/v3/prices_for_dates",
    { params }
  );

  const tickets = res.data?.data || [];

  // 🔥 ФИЛЬТРАЦИЯ ТУТ
  return await filterWeekendTrips(tickets, originIATA);
}

module.exports = {
  getWeekendTickets,
  filterWeekendTrips,
};

// helper: извлекает дату в формате "YYYY-MM-DD" из link (search_date=DDMMYYYY)
function extractSearchDateISO(link) {
  const m = link && link.match(/search_date=(\d{8})/);
  if (!m) return null;
  const s = m[1]; // DDMMYYYY
  return `${s.slice(4)}-${s.slice(2, 4)}-${s.slice(0, 2)}`; // YYYY-MM-DD
}

module.exports = { extractSearchDateISO };

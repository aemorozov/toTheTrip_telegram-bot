// Присваиваем уникальный ID для записи в БД
function getFlightUID(f) {
  const dep =
    f.departure_at.slice(0, 10).replace(/-/g, "").slice(6, 10) +
    f.departure_at.slice(5, 7);
  const ret =
    f.return_at.slice(0, 10).replace(/-/g, "").slice(6, 10) +
    f.return_at.slice(5, 7);

  return `${f.originName}-${f.destinationName}-${dep}-${ret}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // убираем диакритику
    .replace(/\s+/g, ""); // убираем пробелы
}

module.exports = { getFlightUID };

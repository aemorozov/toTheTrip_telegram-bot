function extractShortLink(link) {
  const base = "avia.se/";
  const letters =
    "ABCDq0weEFG1yuiHIdfg3JKLsh2jM4Nkl6zO5PQpax6cRSTU7ovb8VWX9YZrtnm";
  let randomPart = "";

  for (let i = 0; i < 4; i++) {
    randomPart += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  return base + randomPart;
}

module.exports = { extractShortLink };

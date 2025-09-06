function extractShortLink(link) {
  const base = "avia.se/";
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let randomPart = "";

  for (let i = 0; i < 4; i++) {
    randomPart += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  return base + randomPart;
}

module.exports = { extractShortLink };

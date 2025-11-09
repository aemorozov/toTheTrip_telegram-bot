const { OpenAI } = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function translateToRomanian(text) {
  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      {
        role: "user",
        content: `Translate the following text to Romanian without using any diacritics (i.e., characters should be standard ASCII, like in English) and keep all formatting (HTML tags, emojis) intact. 
Return only the translated text, without any explanations or additional commentary. Don't translate Cheap Flights Bot. Translate "Link" like "Legatura". Don't use abbreviations.

Text to translate:
${text}
`,
      },
    ],
  });

  return response.choices[0].message.content;
}

module.exports = { translateToRomanian };

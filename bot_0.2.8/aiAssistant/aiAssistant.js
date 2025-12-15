const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function aiAssistant(userMessage) {
  const res = await client.responses.create({
    model: "gpt-5.1",
    input: userMessage,
  });

  return res.output_text.trim();
}

module.exports = { aiAssistant };

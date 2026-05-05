import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export const extractExpenseDetails = async (input: string, categories: string[]) => {
  const today = new Date().toISOString().slice(0, 10);

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `You are an expense extractor. Extract expense details from the user's input and return ONLY a JSON object with no extra text, no markdown, no backticks.

Return this exact shape:
{
  "amount": number or null if not found,
  "description": a short 3-5 word summary of the expense,
  "date": date in YYYY-MM-DD format or "${today}" if not mentioned,
  "category": one of: ${categories.join(", ")}
}`,
      },
      {
        role: "user",
        content: input,
      },
    ],
    temperature: 0,
  });

  const raw = response.choices[0]?.message.content?.trim();
  return JSON.parse(raw!);
};
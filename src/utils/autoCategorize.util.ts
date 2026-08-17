import Groq from "groq-sdk";
import { createError } from "./error.util";

const MODEL = "openai/gpt-oss-20b";
const REQUEST_TIMEOUT_MS = 30_000;

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const stripCodeFences = (raw: string): string => {
  const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced && fenced[1] ? fenced[1] : raw;
};

const extractJsonObject = (raw: string): string => {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return raw;
  return raw.slice(start, end + 1);
};

export const parseExtractedExpenseJson = (raw: string) => {
  if (!raw || !raw.trim()) {
    throw createError(
      "The AI returned an empty response. Please try again.",
      502,
    );
  }

  const cleaned = stripCodeFences(extractJsonObject(raw));
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw createError(
      "Could not parse the AI response. Please try again.",
      422,
    );
  }

  const amount = Number(parsed.amount);
  const today = new Date().toISOString().slice(0, 10);
  const date =
    typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
      ? parsed.date
      : today;

  return {
    amount: Number.isFinite(amount) ? amount : null,
    description:
      typeof parsed.description === "string" ? parsed.description : "",
    date,
    category: typeof parsed.category === "string" ? parsed.category : "",
  };
};

export const extractExpenseDetails = async (
  input: string,
  categories: string[],
) => {
  const today = new Date().toISOString().slice(0, 10);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await groq.chat.completions.create(
      {
        model: MODEL,
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
      },
      { signal: controller.signal },
    );

    const raw = response.choices[0]?.message.content;
    return parseExtractedExpenseJson(raw ?? "");
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw createError(
        "Auto-categorization timed out. Please try again.",
        504,
      );
    }
    throw createError(
      "Auto-categorization service error. Please try again.",
      502,
    );
  } finally {
    clearTimeout(timeout);
  }
};

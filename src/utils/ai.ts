import { GoogleGenerativeAI } from "@google/generative-ai";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-pro";

function extractJSON(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found");
  return JSON.parse(match[0]);
}

export async function predictProbabilities(
  question: string,
  options: string[],
): Promise<Record<string, number>> {
  const prompt = `
You are a prediction market forecaster.

Question:
"${question}"

Options (use these exact strings as keys):
${options.map((o) => `- "${o}"`).join("\n")}

Return ONLY a JSON object mapping each option string
to a probability between 0 and 1. The probabilities
must sum to exactly 1.
`;

  let text: string;

  try {
    const model = client.getGenerativeModel({ model: PRIMARY_MODEL });
    const res = await model.generateContent(prompt);
    text = res.response.text();
  } catch {
    const model = client.getGenerativeModel({ model: FALLBACK_MODEL });
    const res = await model.generateContent(prompt);
    text = res.response.text();
  }

  const probabilities = extractJSON(text);

  // 🔒 Hard validation (important for settlement)
  validateProbabilities(probabilities, options);

  return probabilities;
}

function validateProbabilities(probs: any, options: string[]) {
  const keys = Object.keys(probs);

  if (keys.length !== options.length) {
    throw new Error("Oracle returned wrong number of options");
  }

  for (const opt of options) {
    if (!(opt in probs)) {
      throw new Error(`Missing probability for option: ${opt}`);
    }
    if (typeof probs[opt] !== "number" || probs[opt] < 0) {
      throw new Error(`Invalid probability for option: ${opt}`);
    }
  }

  const sum = Object.values(probs).reduce((a: number, b: any) => a + b, 0);
  if (Math.abs(sum - 1) > 1e-6) {
    throw new Error("Probabilities do not sum to 1");
  }
}

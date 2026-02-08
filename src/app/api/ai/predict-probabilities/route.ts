import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const FALLBACK_MODEL = "gemini-2.5-pro";
const PRIMARY_MODEL = "gemini-2.5-flash";

function extractJSON(text: string) {
  const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  if (!match) {
    throw new Error("No JSON found in model output");
  }
  return JSON.parse(match[0]);
}

async function generateWithFallback(prompt: string): Promise<string> {
  try {
    const model = client.getGenerativeModel({ model: PRIMARY_MODEL });
    const response = await model.generateContent(prompt);
    return response.response.text();
  } catch (error) {
    console.log(error);
    // Fallback to flash if pro not available
    const model = client.getGenerativeModel({ model: FALLBACK_MODEL });
    const response = await model.generateContent(prompt);
    return response.response.text();
  }
}

export async function POST(req: NextRequest) {
  const { question, options } = await req.json();

  if (!question || !options || !Array.isArray(options)) {
    return NextResponse.json(
      { error: "Question and options array are required" },
      { status: 400 }
    );
  }

  const prompt = `
You are a prediction market forecaster.

Question:
"${question}"

Options:
${options}

Return a JSON object where:
- keys are options
- values are probabilities between 0 and 1
- they must sum to 1

Example:
{"Yes": 0.65, "No": 0.35}
`;

  try {
    const text = await generateWithFallback(prompt);
    const probabilities = extractJSON(text);
    return NextResponse.json({ probabilities });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

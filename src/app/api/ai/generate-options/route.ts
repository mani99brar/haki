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
    // Fallback to flash if pro not available
    const model = client.getGenerativeModel({ model: FALLBACK_MODEL });
    const response = await model.generateContent(prompt);
    return response.response.text();
  }
}

export async function POST(req: NextRequest) {
  const { question } = await req.json();

  if (!question) {
    return NextResponse.json(
      { error: "Question is required" },
      { status: 400 }
    );
  }

  const prompt = `
You are a prediction market oracle.

Given this question:
"${question}"

Generate 2 to 5 mutually exclusive market options.
Return ONLY a JSON array of strings.
Example:
["Yes", "No"]
`;

  try {
    const text = await generateWithFallback(prompt);
    const options = extractJSON(text);
    return NextResponse.json({ options });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

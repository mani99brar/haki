import os
import json
import re
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google import genai

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI(title="Polymarket AI")

# Try best model first, fallback if needed
FALLBACK_MODEL = "gemini-2.5-pro"
PRIMARY_MODEL = "gemini-2.5-flash"


# --------- Utils ---------

def extract_json(text: str):
    """
    Extract first JSON object/array from LLM output.
    Prevents demo-breaking formatting issues.
    """
    match = re.search(r"\{.*\}|\[.*\]", text, re.S)
    if not match:
        raise ValueError("No JSON found in model output")
    return json.loads(match.group())


def generate_with_fallback(prompt: str):
    try:
        response = client.models.generate_content(
            model=PRIMARY_MODEL,
            contents=prompt
        )
        return response.text
    except Exception:
        # Fallback to flash if pro not available
        response = client.models.generate_content(
            model=FALLBACK_MODEL,
            contents=prompt
        )
        return response.text


# --------- Schemas ---------

class QuestionRequest(BaseModel):
    question: str

class ProbabilityRequest(BaseModel):
    question: str
    options: list[str]


# --------- API 1: Generate market options ---------

@app.post("/generate-options")
async def generate_options(req: QuestionRequest):
    prompt = f"""
You are a prediction market oracle.

Given this question:
"{req.question}"

Generate 2 to 5 mutually exclusive market options.
Return ONLY a JSON array of strings.
Example:
["Yes", "No"]
"""

    try:
        text = generate_with_fallback(prompt)
        options = extract_json(text)
        return {"options": options}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --------- API 2: Predict probabilities ---------

@app.post("/predict-probabilities")
async def predict_probabilities(req: ProbabilityRequest):
    prompt = f"""
You are a prediction market forecaster.

Question:
"{req.question}"

Options:
{req.options}

Return a JSON object where:
- keys are options
- values are probabilities between 0 and 1
- they must sum to 1

Example:
{{"Yes": 0.65, "No": 0.35}}
"""

    try:
        text = generate_with_fallback(prompt)
        probs = extract_json(text)
        return {"probabilities": probs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
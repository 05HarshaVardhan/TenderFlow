const { GoogleGenAI } = require("@google/genai");

const DEFAULT_MODEL = process.env.AI_MODEL || "gemini-2.5-flash-lite";

function extractJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

function normalizeNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num);
}

function sanitizeDraft(raw) {
  const tags = Array.isArray(raw?.tags)
    ? raw.tags
        .map((tag) => String(tag || "").trim())
        .filter(Boolean)
        .slice(0, 10)
    : [];

  return {
    title: String(raw?.title || "").trim(),
    description: String(raw?.description || "").trim(),
    category: String(raw?.category || "").trim(),
    tags,
    estimatedValue: normalizeNumber(raw?.estimatedValue),
    emdAmount: normalizeNumber(raw?.emdAmount)
  };
}

async function generateTenderDraft({ prompt }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const instruction = `
You are generating a public procurement tender draft.
Use only the user prompt. Do not include markdown or prose outside JSON.

Return ONLY JSON with schema:
{
  "title": "string",
  "description": "string",
  "category": "string",
  "tags": ["string"],
  "estimatedValue": 0,
  "emdAmount": 0
}

Rules:
- Keep title concise and specific (5-12 words).
- Description should be practical and clear for vendors.
- category must be one short label.
- tags should include 4-8 relevant searchable terms.
- estimatedValue and emdAmount must be non-negative numbers.
- If unsure for numbers, provide conservative placeholders.

User prompt:
${prompt}
`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: instruction,
    config: { responseMimeType: "application/json" }
  });

  const rawText = response.text || "";
  const jsonText = extractJsonObject(rawText) || rawText;
  const parsed = JSON.parse(jsonText);
  const draft = sanitizeDraft(parsed);

  if (!draft.title || !draft.description || !draft.category) {
    throw new Error("AI returned an incomplete tender draft");
  }

  return {
    model: DEFAULT_MODEL,
    draft
  };
}

module.exports = {
  generateTenderDraft
};

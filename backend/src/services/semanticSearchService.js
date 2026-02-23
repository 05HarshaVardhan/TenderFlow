const { GoogleGenAI } = require("@google/genai");
const Tender = require("../models/Tender");

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
const VECTOR_INDEX_NAME = process.env.MONGODB_VECTOR_INDEX || "tender_embedding_index";
const SEARCH_LIMIT = 100;
const EMBEDDING_DIMENSION = Number(process.env.EMBEDDING_DIMENSION || 0);

let aiClient = null;

function getAiClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

function normalizeString(value) {
  return String(value || "").trim();
}

function buildTenderSearchText(source) {
  const title = normalizeString(source?.title);
  const description = normalizeString(source?.description);
  const category = normalizeString(source?.category);
  const department = normalizeString(source?.department);
  const tags = Array.isArray(source?.tags)
    ? source.tags.map((tag) => normalizeString(tag)).filter(Boolean).join(", ")
    : "";

  return [title, description, category, department, tags].filter(Boolean).join("\n");
}

async function generateEmbedding(text) {
  const cleanText = normalizeString(text);
  if (!cleanText) return null;

  const ai = getAiClient();
  if (!ai) return null;

  const config =
    Number.isFinite(EMBEDDING_DIMENSION) && EMBEDDING_DIMENSION > 0
      ? { outputDimensionality: EMBEDDING_DIMENSION }
      : undefined;

  const candidates = [EMBEDDING_MODEL, "gemini-embedding-001"]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index);

  let response = null;
  let lastError = null;

  for (const model of candidates) {
    try {
      response = await ai.models.embedContent({
        model,
        contents: [cleanText],
        config
      });
      break;
    } catch (err) {
      lastError = err;
      const message = String(err?.message || "");
      const unsupported =
        message.includes("NOT_FOUND") ||
        message.includes("not found") ||
        message.includes("not supported for embedContent");

      if (!unsupported) {
        throw err;
      }
    }
  }

  if (!response) {
    throw lastError || new Error("Embedding request failed");
  }

  const vector = response?.embeddings?.[0]?.values;
  if (!Array.isArray(vector) || vector.length === 0) return null;
  return vector;
}

function getSortOption(sortBy) {
  switch (sortBy) {
    case "oldest":
      return { createdAt: 1 };
    case "value_high":
      return { estimatedValue: -1 };
    case "value_low":
      return { estimatedValue: 1 };
    case "deadline":
      return { endDate: 1 };
    default:
      return null;
  }
}

async function semanticSearchTenders({
  search,
  baseMatch = {},
  sortBy,
  limit = SEARCH_LIMIT
}) {
  const queryVector = await generateEmbedding(search);
  if (!queryVector) return null;

  const requestedLimit = Number(limit);
  const finalLimit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(requestedLimit, SEARCH_LIMIT))
    : SEARCH_LIMIT;

  const pipeline = [
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: "embedding",
        queryVector,
        numCandidates: Math.max(150, finalLimit * 5),
        limit: finalLimit
      }
    },
    {
      $addFields: {
        semanticScore: { $meta: "vectorSearchScore" }
      }
    }
  ];

  if (baseMatch && Object.keys(baseMatch).length > 0) {
    pipeline.push({ $match: baseMatch });
  }

  const sortOption = getSortOption(sortBy);
  pipeline.push({ $sort: sortOption || { semanticScore: -1, createdAt: -1 } });

  const docs = await Tender.aggregate(pipeline);
  return docs;
}

module.exports = {
  buildTenderSearchText,
  generateEmbedding,
  semanticSearchTenders,
  getSortOption
};

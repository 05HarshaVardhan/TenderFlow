const { GoogleGenAI } = require("@google/genai");

const DEFAULT_MODEL = process.env.AI_MODEL || "gemini-2.5-flash-lite";

function round(value, decimals = 2) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(decimals));
}

function buildDeterministicScores(tender, bids) {
  const submittedBids = bids.filter((bid) => bid.status === "SUBMITTED");
  if (submittedBids.length === 0) {
    return [];
  }

  const minAmount = Math.min(...submittedBids.map((bid) => bid.amount || 0));
  const thresholdPct = Number(tender.abnormallyLowBidThreshold || 20);

  return submittedBids
    .map((bid) => {
      const amount = Number(bid.amount || 0);
      const deliveryDays = Number(bid.deliveryDays || 0);

      const priceScore =
        minAmount > 0 && amount > 0 ? Math.min((minAmount / amount) * 100, 100) : 0;
      const deliveryScore =
        deliveryDays > 0 ? Math.max(100 - Math.min(deliveryDays, 100), 0) : 0;

      const technicalDocsCount = Array.isArray(bid.technicalDocs) ? bid.technicalDocs.length : 0;
      const financialDocsCount = Array.isArray(bid.financialDocs) ? bid.financialDocs.length : 0;
      const docsScore = technicalDocsCount > 0 && financialDocsCount > 0 ? 100 : 40;

      const weightedScore = Number(
        (priceScore * 0.5 + deliveryScore * 0.2 + docsScore * 0.3).toFixed(2)
      );

      const riskFlags = [];
      if (amount > 0 && Number(tender.estimatedValue || 0) > 0) {
        const estimatedValue = Number(tender.estimatedValue);
        const belowPct = ((estimatedValue - amount) / estimatedValue) * 100;
        if (belowPct >= thresholdPct) {
          riskFlags.push(`Abnormally low bid (${belowPct.toFixed(1)}% below estimate)`);
        }
      }
      if (technicalDocsCount === 0) riskFlags.push("Missing technical documents");
      if (financialDocsCount === 0) riskFlags.push("Missing financial documents");

      return {
        bidId: String(bid._id),
        bidderCompany: bid.bidderCompany?.name || "Unknown",
        amount,
        deliveryDays,
        status: bid.status,
        technicalDocsCount,
        financialDocsCount,
        priceScore: Number(priceScore.toFixed(2)),
        deliveryScore: Number(deliveryScore.toFixed(2)),
        docsScore,
        weightedScore,
        riskFlags
      };
    })
    .sort((a, b) => b.weightedScore - a.weightedScore);
}

function buildStatistics({ tender, scores }) {
  const amounts = scores.map((item) => Number(item.amount || 0)).filter((n) => Number.isFinite(n));
  const deliveryDays = scores
    .map((item) => Number(item.deliveryDays || 0))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (amounts.length === 0) {
    return {
      bidsCount: 0,
      minBid: 0,
      maxBid: 0,
      averageBid: 0,
      medianBid: 0,
      rangeBid: 0,
      stdDeviationBid: 0,
      coefficientOfVariationPct: 0,
      averageDeliveryDays: 0,
      minDeliveryDays: 0,
      maxDeliveryDays: 0,
      estimatedValue: Number(tender?.estimatedValue || 0),
      averageVsEstimatePct: 0
    };
  }

  const sortedAmounts = [...amounts].sort((a, b) => a - b);
  const count = sortedAmounts.length;
  const minBid = sortedAmounts[0];
  const maxBid = sortedAmounts[count - 1];
  const averageBid = sortedAmounts.reduce((sum, value) => sum + value, 0) / count;

  const medianBid =
    count % 2 === 0
      ? (sortedAmounts[count / 2 - 1] + sortedAmounts[count / 2]) / 2
      : sortedAmounts[Math.floor(count / 2)];

  const variance =
    sortedAmounts.reduce((sum, value) => sum + (value - averageBid) ** 2, 0) / count;
  const stdDeviationBid = Math.sqrt(variance);
  const rangeBid = maxBid - minBid;

  const estimatedValue = Number(tender?.estimatedValue || 0);
  const averageVsEstimatePct =
    estimatedValue > 0 ? ((averageBid - estimatedValue) / estimatedValue) * 100 : 0;

  const averageDeliveryDays =
    deliveryDays.length > 0
      ? deliveryDays.reduce((sum, value) => sum + value, 0) / deliveryDays.length
      : 0;

  return {
    bidsCount: count,
    minBid: round(minBid),
    maxBid: round(maxBid),
    averageBid: round(averageBid),
    medianBid: round(medianBid),
    rangeBid: round(rangeBid),
    stdDeviationBid: round(stdDeviationBid),
    coefficientOfVariationPct: averageBid > 0 ? round((stdDeviationBid / averageBid) * 100) : 0,
    averageDeliveryDays: round(averageDeliveryDays),
    minDeliveryDays: deliveryDays.length > 0 ? Math.min(...deliveryDays) : 0,
    maxDeliveryDays: deliveryDays.length > 0 ? Math.max(...deliveryDays) : 0,
    estimatedValue: round(estimatedValue),
    averageVsEstimatePct: round(averageVsEstimatePct)
  };
}

function fallbackFromScores(scores, statistics) {
  const topBid = scores[0] || null;
  return {
    summary: "Deterministic evaluation generated without AI narrative.",
    ranking: scores,
    risks: scores.flatMap((item) =>
      item.riskFlags.map((flag) => ({
        bidId: item.bidId,
        bidderCompany: item.bidderCompany,
        risk: flag
      }))
    ),
    recommendation: topBid
      ? `Top recommendation is ${topBid.bidderCompany} with weighted score ${topBid.weightedScore}.`
      : "No recommendation available.",
    statistics
  };
}

function extractJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

async function runGeminiAnalysis({ tender, scores }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `
You are assisting a tender poster with bid comparison.
Use only the provided data and do not invent facts.

Return ONLY JSON with this schema:
{
  "summary": "string",
  "ranking": [
    {
      "bidId": "string",
      "bidderCompany": "string",
      "position": 1,
      "reason": "string"
    }
  ],
  "risks": [
    {
      "bidId": "string",
      "bidderCompany": "string",
      "risk": "string",
      "severity": "LOW|MEDIUM|HIGH"
    }
  ],
  "recommendation": "string"
}

Tender:
${JSON.stringify(
  {
    id: tender._id,
    title: tender.title,
    estimatedValue: tender.estimatedValue,
    currency: tender.currency,
    category: tender.category,
    abnormallyLowBidThreshold: tender.abnormallyLowBidThreshold
  },
  null,
  2
)}

Deterministic scores (already computed):
${JSON.stringify(scores, null, 2)}
`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  const rawText = response.text || "";
  const jsonText = extractJsonObject(rawText) || rawText;
  return JSON.parse(jsonText);
}

async function analyzeTenderBids({ tender, bids }) {
  const scores = buildDeterministicScores(tender, bids);
  const statistics = buildStatistics({ tender, scores });
  if (scores.length === 0) {
    return {
      model: null,
      generatedAt: new Date(),
      summary: "No submitted bids available for analysis.",
      ranking: [],
      risks: [],
      recommendation: "No recommendation available.",
      deterministicScores: [],
      statistics
    };
  }

  const fallback = fallbackFromScores(scores, statistics);
  try {
    const aiResult = await runGeminiAnalysis({ tender, scores });
    return {
      model: DEFAULT_MODEL,
      generatedAt: new Date(),
      summary: aiResult.summary || fallback.summary,
      ranking: Array.isArray(aiResult.ranking) && aiResult.ranking.length > 0 ? aiResult.ranking : fallback.ranking,
      risks: Array.isArray(aiResult.risks) ? aiResult.risks : fallback.risks,
      recommendation: aiResult.recommendation || fallback.recommendation,
      deterministicScores: scores,
      statistics: fallback.statistics
    };
  } catch (error) {
    return {
      model: null,
      generatedAt: new Date(),
      summary: fallback.summary,
      ranking: fallback.ranking,
      risks: fallback.risks,
      recommendation: fallback.recommendation,
      deterministicScores: scores,
      statistics: fallback.statistics,
      fallbackReason: error.message
    };
  }
}

module.exports = {
  analyzeTenderBids
};

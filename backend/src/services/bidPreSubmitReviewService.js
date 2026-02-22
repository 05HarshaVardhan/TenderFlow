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

function buildDeterministicReview({ bid, tender }) {
  const technicalDocsCount = Array.isArray(bid.technicalDocs) ? bid.technicalDocs.length : 0;
  const financialDocsCount = Array.isArray(bid.financialDocs) ? bid.financialDocs.length : 0;
  const hasEmdReceipt = Boolean(bid.emdPaymentProof?.receiptDoc?.url);
  const amount = Number(bid.amount || 0);
  const deliveryDays = Number(bid.deliveryDays || 0);
  const estimatedValue = Number(tender?.estimatedValue || 0);

  const checklist = [
    { key: "amount", label: "Quoted amount", completed: amount > 0, weight: 20 },
    { key: "deliveryDays", label: "Delivery timeline", completed: deliveryDays > 0, weight: 20 },
    { key: "technicalDocs", label: "Technical envelope", completed: technicalDocsCount > 0, weight: 20 },
    { key: "financialDocs", label: "Financial envelope", completed: financialDocsCount > 0, weight: 20 },
    { key: "emdReceipt", label: "EMD receipt", completed: hasEmdReceipt, weight: 20 }
  ];

  const readinessScore = checklist.reduce(
    (sum, item) => sum + (item.completed ? item.weight : 0),
    0
  );

  const warnings = [];
  if (technicalDocsCount === 0) warnings.push("Technical envelope is missing.");
  if (financialDocsCount === 0) warnings.push("Financial envelope is missing.");
  if (!hasEmdReceipt) warnings.push("EMD receipt is missing.");

  if (estimatedValue > 0 && amount > 0) {
    if (amount < estimatedValue * 0.7) {
      warnings.push("Quoted amount is significantly below tender estimate and may be flagged.");
    } else if (amount > estimatedValue * 1.25) {
      warnings.push("Quoted amount is much higher than tender estimate.");
    }
  }

  if (deliveryDays > 180) {
    warnings.push("Delivery timeline is very long; this may reduce competitiveness.");
  }

  if (!bid.emdPaymentProof?.transactionId) {
    warnings.push("EMD transaction ID is not provided.");
  }

  if (!bid.emdPaymentProof?.paymentMode) {
    warnings.push("EMD payment mode is not specified.");
  }

  const nextActions = checklist
    .filter((item) => !item.completed)
    .map((item) => `Complete ${item.label.toLowerCase()}.`);

  return {
    readinessScore,
    checklist: checklist.map(({ weight, ...item }) => item),
    warnings,
    nextActions,
    stats: {
      technicalDocsCount,
      financialDocsCount,
      hasEmdReceipt
    },
    summary:
      readinessScore === 100
        ? "Bid is ready for submission based on required checks."
        : "Bid needs fixes before successful submission."
  };
}

async function runAiNarrative({ tender, bid, deterministicReview }) {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `
You are reviewing a bid before submission.
Use only the provided data.

Return ONLY JSON:
{
  "summary": "string",
  "topActions": ["string", "string", "string"]
}

Tender:
${JSON.stringify(
  {
    title: tender?.title,
    category: tender?.category,
    estimatedValue: tender?.estimatedValue,
    emdAmount: tender?.emdAmount
  },
  null,
  2
)}

Bid:
${JSON.stringify(
  {
    amount: bid?.amount,
    deliveryDays: bid?.deliveryDays,
    technicalDocsCount: deterministicReview.stats.technicalDocsCount,
    financialDocsCount: deterministicReview.stats.financialDocsCount,
    hasEmdReceipt: deterministicReview.stats.hasEmdReceipt
  },
  null,
  2
)}

Deterministic review:
${JSON.stringify(
  {
    readinessScore: deterministicReview.readinessScore,
    warnings: deterministicReview.warnings,
    nextActions: deterministicReview.nextActions
  },
  null,
  2
)}
`;

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  const rawText = response.text || "";
  const jsonText = extractJsonObject(rawText) || rawText;
  const parsed = JSON.parse(jsonText);

  return {
    summary: String(parsed?.summary || "").trim(),
    topActions: Array.isArray(parsed?.topActions)
      ? parsed.topActions.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3)
      : []
  };
}

async function generateBidPreSubmitReview({ bid, tender }) {
  const deterministicReview = buildDeterministicReview({ bid, tender });

  try {
    const aiNarrative = await runAiNarrative({ tender, bid, deterministicReview });
    if (aiNarrative) {
      return {
        model: DEFAULT_MODEL,
        generatedAt: new Date(),
        ...deterministicReview,
        summary: aiNarrative.summary || deterministicReview.summary,
        nextActions:
          aiNarrative.topActions.length > 0
            ? aiNarrative.topActions
            : deterministicReview.nextActions
      };
    }
  } catch (error) {
    return {
      model: null,
      generatedAt: new Date(),
      ...deterministicReview,
      fallbackReason: error.message
    };
  }

  return {
    model: null,
    generatedAt: new Date(),
    ...deterministicReview
  };
}

module.exports = {
  generateBidPreSubmitReview
};

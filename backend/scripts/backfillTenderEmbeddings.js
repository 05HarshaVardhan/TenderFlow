require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const Tender = require("../src/models/Tender");
const {
  buildTenderSearchText,
  generateEmbedding
} = require("../src/services/semanticSearchService");

function parseArgs(argv) {
  const options = {
    batch: 20,
    limit: 0,
    skip: 0,
    force: false,
    dryRun: false
  };

  argv.forEach((arg) => {
    if (arg === "--force") options.force = true;
    if (arg === "--dry-run") options.dryRun = true;
    if (arg.startsWith("--batch=")) options.batch = Number(arg.split("=")[1] || 20);
    if (arg.startsWith("--limit=")) options.limit = Number(arg.split("=")[1] || 0);
    if (arg.startsWith("--skip=")) options.skip = Number(arg.split("=")[1] || 0);
  });

  options.batch = Number.isFinite(options.batch) && options.batch > 0 ? options.batch : 20;
  options.limit = Number.isFinite(options.limit) && options.limit >= 0 ? options.limit : 0;
  options.skip = Number.isFinite(options.skip) && options.skip >= 0 ? options.skip : 0;

  return options;
}

function buildBaseQuery(force) {
  if (force) return {};

  return {
    $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }]
  };
}

async function run() {
  const options = parseArgs(process.argv.slice(2));

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  await connectDB();

  const baseQuery = buildBaseQuery(options.force);
  const totalCandidates = await Tender.countDocuments(baseQuery);

  console.log("Embedding backfill started");
  console.log(
    JSON.stringify(
      {
        totalCandidates,
        batch: options.batch,
        limit: options.limit,
        skip: options.skip,
        force: options.force,
        dryRun: options.dryRun
      },
      null,
      2
    )
  );

  if (totalCandidates === 0) {
    console.log("No tenders to process.");
    process.exit(0);
  }

  let processed = 0;
  let updated = 0;
  let failed = 0;
  let offset = options.skip;
  let abortReason = "";

  const hardStop = options.limit > 0 ? options.limit : Number.POSITIVE_INFINITY;

  while (processed < hardStop) {
    const remaining = hardStop - processed;
    const chunkSize = Math.min(options.batch, remaining);

    const tenders = await Tender.find(baseQuery)
      .sort({ _id: 1 })
      .skip(offset)
      .limit(chunkSize)
      .select("_id title description category department tags embedding")
      .lean();

    if (!tenders.length) break;

    for (const tender of tenders) {
      processed += 1;
      offset += 1;

      const content = buildTenderSearchText(tender);
      if (!content) {
        failed += 1;
        console.warn(`[skip] ${tender._id}: empty searchable content`);
        continue;
      }

      try {
        const embedding = await generateEmbedding(content);
        if (!Array.isArray(embedding) || embedding.length === 0) {
          failed += 1;
          console.warn(`[skip] ${tender._id}: empty embedding response`);
          continue;
        }

        if (!options.dryRun) {
          await Tender.updateOne(
            { _id: tender._id },
            { $set: { embedding } }
          );
        }

        updated += 1;
        console.log(
          `[ok] ${tender._id} dim=${embedding.length}${options.dryRun ? " (dry-run)" : ""}`
        );
      } catch (err) {
        failed += 1;
        const message = String(err?.message || "");
        console.error(`[error] ${tender._id}: ${message}`);

        const leakedKeyError =
          message.includes("PERMISSION_DENIED") &&
          message.toLowerCase().includes("reported as leaked");

        if (leakedKeyError) {
          abortReason = "API key reported as leaked by provider";
          break;
        }
      }

      if (processed >= hardStop) break;
    }

    if (abortReason) break;
  }

  console.log("Embedding backfill completed");
  console.log(
    JSON.stringify(
      {
        processed,
        updated,
        failed,
        ...(abortReason ? { aborted: true, reason: abortReason } : {})
      },
      null,
      2
    )
  );
  return 0;
}

(async () => {
  let exitCode = 0;
  try {
    exitCode = await run();
  } catch (err) {
    console.error("Backfill failed:", err.message);
    exitCode = 1;
  } finally {
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      console.warn("Failed to close MongoDB connection cleanly:", closeError.message);
    }
    process.exitCode = exitCode;
  }
})();

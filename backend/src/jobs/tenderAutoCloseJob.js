const Tender = require('../models/Tender');

const DEFAULT_INTERVAL_MS = Number(process.env.TENDER_AUTO_CLOSE_INTERVAL_MS || 60 * 1000);

async function closeExpiredTenders() {
  const now = new Date();

  try {
    const result = await Tender.updateMany(
      {
        status: 'PUBLISHED',
        endDate: { $lte: now }
      },
      {
        $set: { status: 'CLOSED' }
      }
    );

    const closedCount = result.modifiedCount || 0;
    if (closedCount > 0) {
      console.log(`[TenderAutoCloseJob] Closed ${closedCount} expired tender(s) at ${now.toISOString()}`);
    }
  } catch (error) {
    console.error('[TenderAutoCloseJob] Failed to close expired tenders:', error.message);
  }
}

function startTenderAutoCloseJob() {
  const intervalMs = Number.isFinite(DEFAULT_INTERVAL_MS) && DEFAULT_INTERVAL_MS > 0
    ? DEFAULT_INTERVAL_MS
    : 60 * 1000;

  // Run once on startup so already-expired tenders are handled immediately.
  closeExpiredTenders();

  const timer = setInterval(closeExpiredTenders, intervalMs);

  console.log(`[TenderAutoCloseJob] Running every ${intervalMs}ms`);
  return timer;
}

module.exports = {
  startTenderAutoCloseJob,
  closeExpiredTenders
};

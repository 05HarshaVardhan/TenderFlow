const os = require('os');
const express = require('express');
const { auth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Tender = require('../models/Tender');
const Bid = require('../models/Bid');
const User = require('../models/User');
const Team = require('../models/Team');
const Notification = require('../models/Notification');
const { isMonitoringEnabled, getMonitoringProvider } = require('../services/monitoringService');

const router = express.Router();

const buildCompanyFilter = (req) => {
  if (req.user.role === 'SUPER_ADMIN') {
    return {};
  }
  return { ownerCompany: req.user.companyId };
};

const buildBidderCompanyFilter = (req) => {
  if (req.user.role === 'SUPER_ADMIN') {
    return {};
  }
  return { bidderCompany: req.user.companyId };
};

router.get('/monitor', auth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const next7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const tenderFilter = buildCompanyFilter(req);
    const bidderFilter = buildBidderCompanyFilter(req);

    const [
      totalTenders,
      totalBidsPlaced,
      totalUsers,
      totalTeams,
      unreadNotifications,
      tendersByStatus,
      bidsByStatus,
      activeUsers,
      newUsers24h,
      newTenders24h,
      newBids24h,
      expiringSoon,
      recentTenders,
      recentBids
    ] = await Promise.all([
      Tender.countDocuments(tenderFilter),
      Bid.countDocuments(bidderFilter),
      User.countDocuments(req.user.role === 'SUPER_ADMIN' ? {} : { company: req.user.companyId }),
      Team.countDocuments(req.user.role === 'SUPER_ADMIN' ? {} : { company: req.user.companyId }),
      Notification.countDocuments({ user: req.user.id, isRead: false }),
      Tender.aggregate([
        { $match: tenderFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Bid.aggregate([
        { $match: bidderFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      User.countDocuments({
        ...(req.user.role === 'SUPER_ADMIN' ? {} : { company: req.user.companyId }),
        isActive: true
      }),
      User.countDocuments({
        ...(req.user.role === 'SUPER_ADMIN' ? {} : { company: req.user.companyId }),
        createdAt: { $gte: last24h }
      }),
      Tender.countDocuments({
        ...tenderFilter,
        createdAt: { $gte: last24h }
      }),
      Bid.countDocuments({
        ...bidderFilter,
        createdAt: { $gte: last24h }
      }),
      Tender.countDocuments({
        ...tenderFilter,
        status: 'PUBLISHED',
        endDate: { $gte: now, $lte: next7d }
      }),
      Tender.find(tenderFilter)
        .select('title status endDate createdAt updatedAt referenceNumber')
        .sort({ updatedAt: -1 })
        .limit(6)
        .lean(),
      Bid.find(bidderFilter)
        .select('status amount createdAt updatedAt tender')
        .populate('tender', 'title referenceNumber')
        .sort({ updatedAt: -1 })
        .limit(6)
        .lean()
    ]);

    const memory = process.memoryUsage();
    const cpuLoads = os.loadavg();

    const mapAggregate = (items) => {
      return (items || []).reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {});
    };

    res.json({
      generatedAt: now.toISOString(),
      scope: req.user.role === 'SUPER_ADMIN' ? 'GLOBAL' : 'COMPANY',
      runtime: {
        env: process.env.NODE_ENV || 'development',
        monitoring: {
          enabled: isMonitoringEnabled(),
          provider: getMonitoringProvider()
        },
        nodeVersion: process.version,
        uptimeSec: Math.floor(process.uptime()),
        memory: {
          rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
          heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100
        },
        cpuLoadAvg: {
          oneMin: Number(cpuLoads[0]?.toFixed(2) || 0),
          fiveMin: Number(cpuLoads[1]?.toFixed(2) || 0),
          fifteenMin: Number(cpuLoads[2]?.toFixed(2) || 0)
        }
      },
      entities: {
        totalTenders,
        totalBidsPlaced,
        totalUsers,
        activeUsers,
        totalTeams,
        unreadNotifications
      },
      trends24h: {
        newUsers24h,
        newTenders24h,
        newBids24h
      },
      tenderInsights: {
        expiringSoon,
        statusBreakdown: mapAggregate(tendersByStatus)
      },
      bidInsights: {
        statusBreakdown: mapAggregate(bidsByStatus)
      },
      recent: {
        tenders: recentTenders,
        bids: recentBids
      }
    });
  } catch (error) {
    console.error('Developer monitor route error:', error);
    res.status(500).json({ message: 'Failed to load developer monitor data' });
  }
});

module.exports = router;

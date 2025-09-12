const { User, Tender, Application, Company, GoodsServices, Sequelize } = require("../models");
const { Op, fn, col, literal } = Sequelize;

function generateMonthRange(start, end) {
  const dateArray = [];
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (current <= last) {
    dateArray.push(current.toISOString().slice(0, 7)); // "YYYY-MM"
    current.setMonth(current.getMonth() + 1);
  }
  return dateArray;
}

function generateYearRange(start, end) {
  const years = [];
  let year = start.getFullYear();
  const endYear = end.getFullYear();
  while (year <= endYear) {
    years.push(String(year));
    year++;
  }
  return years;
}

exports.getDashboardData = async (req, res) => {
  try {
    console.log("dashboard controller");
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    console.log("🔐 User from token:", req.user);

    const { startDate, endDate, status, groupBy = "month" } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const dateFilter = {
      [Op.between]: [start, end],
    };

    const statusFilter = status ? { status } : {};

    // Fetch user
    const user = await User.findByPk(userId);

    // Fetch company with goodsServices
    let company = null;
    if (companyId) {
      company = await Company.findByPk(companyId, {
        attributes: ["id", "name", "industry", "description", "logoUrl"],
        include: [
          {
            model: GoodsServices,
            as: "goodsServices",
            attributes: ["id", "name", "category", "description"],
            through: { attributes: [] },
          },
        ],
      });
    }

    // Stats with filters
    const [tenders, submitted, received, accepted] = await Promise.all([
      Tender.count({
        where: {
          createdBy: userId,
          createdAt: dateFilter,
        },
      }),
      Application.count({
        where: {
          companyId,
          ...statusFilter,
          createdAt: dateFilter,
        },
      }),
      Application.count({
        where: {
          ...statusFilter,
          createdAt: dateFilter,
        },
        include: [
          {
            model: Tender,
            as: "tender",
            where: { companyId },
          },
        ],
      }),
      Application.count({
        where: {
          status: "accepted",
          createdAt: dateFilter,
        },
        include: [
          {
            model: Tender,
            as: "tender",
            where: { companyId },
          },
        ],
      }),
    ]);

    // Tenders over time aggregation
    const timeUnit = groupBy === "year" ? "year" : "month";

    const tenderTimeRaw = await Tender.findAll({
      where: {
        createdBy: userId,
        createdAt: dateFilter,
      },
      attributes: [
        [fn("DATE_TRUNC", timeUnit, col("createdAt")), "date"],
        [fn("COUNT", "*"), "count"],
      ],
      group: [literal("date")],
      order: [[literal("date"), "ASC"]],
      raw: true,
    });

    // Prepare zero-filled timeline keys
    let timelineKeys = [];
    if (timeUnit === "year") {
      timelineKeys = generateYearRange(start, end); // e.g. ["2021", "2022", "2023"]
    } else {
      timelineKeys = generateMonthRange(start, end); // e.g. ["2025-01", "2025-02", ...]
    }

    // Map raw database results to a lookup keyed by formatted date string
    const countsMap = {};
    tenderTimeRaw.forEach((item) => {
      if (timeUnit === "year") {
        const yearStr = new Date(item.date).getFullYear().toString();
        countsMap[yearStr] = parseInt(item.count);
      } else {
        const monthStr = new Date(item.date).toISOString().slice(0, 7);
        countsMap[monthStr] = parseInt(item.count);
      }
    });

    // Zero-fill all missing time keys
    const tendersOverTime = timelineKeys.map((key) => ({
      date: key,
      count: countsMap[key] || 0,
    }));

    // Application status distribution
    const statusRaw = await Application.findAll({
      where: {
        companyId,
        createdAt: dateFilter,
      },
      attributes: ["status", [fn("COUNT", "*"), "count"]],
      group: ["status"],
      raw: true,
    });

    const appStatusData = statusRaw.map((row) => ({
      status: row.status,
      count: parseInt(row.count),
    }));

    return res.json({
      user: { name: user?.fullName || user?.name || "User" },
      company: company, // Includes industry and goodsServices
      stats: { tenders, submitted, received, accepted },
      tendersOverTime,
      appStatusData,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return res.status(500).json({ message: "Failed to load dashboard data" });
  }
};

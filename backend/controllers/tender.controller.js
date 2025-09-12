const { Tender, Company, Application } = require('../models'); // Adjust path as per your project structure
const { Op, Sequelize } = require('sequelize');

// Make sure your authentication middleware populates req.user with userId AND companyId.
// Example: req.user = { userId: 1, companyId: 101, ... }

// ✅ 1. Get tenders with filtering, pagination, and sorting (Refactored)
// ... (rest of your getAllTenders code)

exports.getAllTenders = async (req, res) => {
  try {
    const {
      limit = 10, // Default limit
      page = 1,   // Default page
      title,
      minBudget,
      maxBudget,
      deadlineBefore,
      deadlineAfter,
      companyName,
      // Removed companyId and excludeCompanyId from req.query destructuring
      // as the exclusion logic is now handled automatically for logged-in companies.
    } = req.query;

    // IMPORTANT: Get the logged-in company's ID from the request object.
    // This assumes your authentication middleware has attached it to req.user.companyId.
    const loggedInCompanyId = req.user && req.user.companyId;

    let whereClause = {
      status: 'Active', // Default: Only show active tenders
    };

    // Automatically exclude tenders from the logged-in company
    if (loggedInCompanyId) {
      whereClause.companyId = { [Op.ne]: loggedInCompanyId }; // Op.ne means "not equal"
    }
    // If there's no loggedInCompanyId (e.g., an unauthenticated public user,
    // or an admin without a specific companyId), this condition will not be applied,
    // and the query will return ALL active tenders (unless further conditions are added).

    // Apply other filters from query parameters
    if (title) {
      whereClause.title = { [Op.iLike]: `%${title}%` }; // Case-insensitive search for title
    }

    if (minBudget || maxBudget) {
      whereClause.budget = {}; // Initialize budget filter object
      if (minBudget) whereClause.budget[Op.gte] = parseFloat(minBudget); // Greater than or equal to
      if (maxBudget) whereClause.budget[Op.lte] = parseFloat(maxBudget); // Less than or equal to
    }

    if (deadlineBefore || deadlineAfter) {
      whereClause.deadline = {}; // Initialize deadline filter object
      if (deadlineBefore) whereClause.deadline[Op.lte] = new Date(deadlineBefore); // Less than or equal to
      if (deadlineAfter) whereClause.deadline[Op.gte] = new Date(deadlineAfter); // Greater than or equal to
    }

    // Configure company inclusion and filtering if companyName is provided
    const companyFilter = companyName
      ? {
          model: Company,
          as: 'company', // Ensure 'as' matches your association alias in Sequelize
          where: {
            name: { [Op.iLike]: `%${companyName}%` } // Case-insensitive search for company name
          }
        }
      : { model: Company, as: 'company' }; // Always include Company model for data enrichment

    // Execute the database query using Sequelize's findAndCountAll
    const tenders = await Tender.findAndCountAll({
      where: whereClause,
      include: [companyFilter], // Include the associated Company model
      order: [['createdAt', 'DESC']], // Order results by creation date, newest first
      limit: parseInt(limit), // Apply pagination limit
      offset: (parseInt(page) - 1) * parseInt(limit) // Calculate offset for pagination
    });

    // Send the successful JSON response
    console.log("****Tenders expet my company:******",tenders.rows);
    res.status(200).json({
      success: true,
      message: 'Tenders fetched successfully',
      totalTenders: tenders.count, // Total count of tenders matching filters (before limit/offset)
      currentPage: parseInt(page), // Current page number
      totalPages: Math.ceil(tenders.count / parseInt(limit)), // Total number of pages
      tenders: tenders.rows // The array of tender objects for the current page
    });
  } catch (err) {
    // Log the error for debugging purposes
    console.error("Error fetching tenders:", err);
    // Send an error JSON response
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tenders',
      error: err.message // Send the specific error message for more details
    });
  }
};

// ✅ 2. Get tender by ID (No changes needed)
exports.getTenderById = async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.id, {
      include: [{ model: Company, as: 'company' }]
    });

    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Tender fetched successfully',
      tender
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tender',
      error: err.message
    });
  }
};

// ✅ 3. Create a new tender (Ensure req.user.companyId and req.user.userId are set by middleware)
exports.createTender = async (req, res) => {
  try {
    const { title, description, deadline, budget } = req.validatedData;
    const companyId = req.user.companyId; // From authenticated user
    const createdBy = req.user.userId;   // From authenticated user

    if (!companyId || !createdBy) {
      return res.status(400).json({ success: false, message: 'Company ID or User ID missing for tender creation. Please ensure you are logged in and associated with a company.' });
    }

    const tender = await Tender.create({
      title,
      description,
      deadline,
      budget,
      companyId,
      createdBy
    });

    res.status(201).json({
      success: true,
      message: 'Tender created successfully',
      tender
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to create tender',
      error: err.message
    });
  }
};

// ✅ 4. Update a tender (No changes needed - already includes authorization)
exports.updateTender = async (req, res) => {
  try {
    const tenderId = req.params.id;
    // req.validatedData contains the fields sent from the frontend (e.g., title, description, status, etc.)
    const updateData = req.validatedData;
    const loggedInUserCompanyId = req.user.companyId; // From authenticated user

    // Find the tender first
    const tender = await Tender.findByPk(tenderId);

    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found.' });
    }

    // Authorization check: Only owner company can update
    if (tender.companyId !== loggedInUserCompanyId) {
      return res.status(403).json({ success: false, message: 'You are not allowed to update this tender.' });
    }
    console.log("tender updated data : ",updateData);

    // Update the tender in the database
    await tender.update(updateData); // Use the validated data directly

    // IMPORTANT: Re-fetch the tender with its associations AFTER the update
    // This ensures the frontend receives the latest data including the associated company
    const updatedTenderWithAssociations = await Tender.findByPk(tenderId, {
      include: [{
        model: Company,
        as: 'company', // This MUST match the alias in your Tender model association
        attributes: ['id', 'name', 'industry', 'description', 'logoUrl'] // Explicitly request attributes
      }]
    });

    res.status(200).json({
      success: true,
      message: 'Tender updated successfully',
      tender: updatedTenderWithAssociations // Send the complete, fully updated tender object
    });

  } catch (err) {
    console.error("Error updating tender:", err);
    res.status(500).json({
      success: false,
      message: 'Failed to update tender',
      error: err.message
    });
  }
};

// ✅ 5. Delete a tender (No changes needed - already includes authorization)
exports.deleteTender = async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.id);

    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' });
    }

    // Authorization check: Only owner company can delete
    if (tender.companyId !== req.user.companyId) {
      return res.status(403).json({ success: false, message: 'You are not allowed to delete this tender' });
    }

    await tender.destroy();

    res.status(200).json({
      success: true,
      message: 'Tender deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete tender',
      error: err.message
    });
  }
};

// ✅ 6. Manually close a tender and reject all pending applications (No changes needed - already includes authorization)
exports.closeTenderManually = async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.id);

    if (!tender) {
      return res.status(404).json({ success: false, message: 'Tender not found' });
    }

    // Authorization check: Only owner company can close
    if (tender.companyId !== req.user.companyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to close this tender' });
    }

    if (tender.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Tender is already closed or expired' });
    }

    await tender.update({ status: 'Application Closed' });

    // Update all pending applications for this tender to 'rejected'
    await Application.update(
      { status: 'rejected' },
      {
        where: {
          tenderId: tender.id,
          status: 'pending'
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Tender closed and all pending applications rejected successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to close tender',
      error: err.message
    });
  }
};



// ... (existing getAllTenders function - keep it as simplified as possible, no 'createdBy' filter here) ...

// ✅ Get Tenders Created by the Logged-in User (Fully featured & ensures company data)
exports.getMyTenders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Company ID not found for the logged-in user. Please ensure your user is associated with a company." });
    }

    const {
      page = 1,
      limit = 10,
      search,
      status,
      minBudget,
      maxBudget,
      startDate,
      endDate
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {
      companyId: companyId,
    };

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status && status !== 'All') {
      whereClause.status = status;
    }
    if (minBudget) {
      whereClause.budget = {
        ...(whereClause.budget || {}),
        [Op.gte]: parseFloat(minBudget)
      };
    }
    if (maxBudget) {
      whereClause.budget = {
        ...(whereClause.budget || {}),
        [Op.lte]: parseFloat(maxBudget)
      };
    }
    if (startDate) {
      whereClause.deadline = {
        ...(whereClause.deadline || {}),
        [Op.gte]: new Date(startDate)
      };
    }
    if (endDate) {
      whereClause.deadline = {
        ...(whereClause.deadline || {}),
        [Op.lte]: new Date(endDate)
      };
    }

    const { count, rows: tenders } = await Tender.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'industry', 'description', 'logoUrl']
        },
        {
          model: Application,
          as: 'applications',
          attributes: [],
          duplicating: false, // ensures it's a LEFT JOIN even if required is false
          required: false,    // Use LEFT JOIN
        }
      ],
      attributes: {
        include: [
          [Sequelize.fn('COUNT', Sequelize.col('applications.id')), 'applicationCount']
        ]
      },
      group: ['Tender.id', 'company.id'], // This groups by unique tenders and their associated companies
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset,
      
    });

    // When 'group' is used with findAndCountAll, 'count' is an array of objects.
    // The actual total number of unique tenders (for pagination) is the length of this array.
    const totalTenders = tenders.length > 0 ? count.length : 0; // Better way to get total count with group

    res.status(200).json({
      success: true,
      message: 'My tenders fetched successfully',
      totalTenders: totalTenders,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalTenders / parseInt(limit)),
      tenders: tenders.map(tender => ({
        ...tender.toJSON(),
        // Ensure applicationCount is correctly pulled from the aggregated attribute
        applicationCount: tender.get('applicationCount') ? parseInt(tender.get('applicationCount')) : 0
      }))
    });

  } catch (error) {
    console.error("Error fetching my tenders:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
// ✅ 7. Get tenders of a company by status (No changes needed - useful for specific status filtering for 'My Tenders')
exports.getCompanyTendersByStatus = async (req, res) => {
  try {
    const { status } = req.query;
    const companyId = req.user.companyId; // From authenticated user

    if (!companyId) {
      return res.status(401).json({ success: false, message: 'Company ID not found for user.' });
    }

    const whereClause = { companyId };
    if (status) {
      whereClause.status = status;
    }

    const tenders = await Tender.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      message: 'Tenders fetched successfully',
      tenders
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tenders by status',
      error: err.message
    });
  }
};
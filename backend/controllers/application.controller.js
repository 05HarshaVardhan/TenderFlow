const { Application, Company, Tender } = require('../models');
const { Op } = require('sequelize');

// 1. Create an application (Zod validated)
exports.createApplication = async (req, res) => {
  try {
    const { tenderId, quotationAmount, proposalText } = req.validatedData;
    const companyId = req.user.companyId;

    const application = await Application.create({
      tenderId,
      companyId,
      quotationAmount,
      proposalText,
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to create application',
      error: err.message,
    });
  }
};

// 2. Get all applications (admin or general listing)
exports.getAllApplications = async (req, res) => {
  try {
    const {
      companyId,
      minQuotation,
      maxQuotation,
      fromDate,
      toDate,
      tenderId,
      page = 1,
      limit = 10,
    } = req.query;

    const whereClause = {};

    if (companyId) whereClause.companyId = companyId;
    if (tenderId) whereClause.tenderId = tenderId;

    if (minQuotation || maxQuotation) {
      whereClause.quotationAmount = {};
      if (minQuotation) whereClause.quotationAmount[Op.gte] = parseFloat(minQuotation);
      if (maxQuotation) whereClause.quotationAmount[Op.lte] = parseFloat(maxQuotation);
    }

    if (fromDate || toDate) {
      whereClause.createdAt = {};
      if (fromDate) whereClause.createdAt[Op.gte] = new Date(fromDate);
      if (toDate) whereClause.createdAt[Op.lte] = new Date(toDate);
    }

    const applications = await Application.findAndCountAll({
      where: whereClause,
      include: [
        { model: Company, as: 'company' },
        { model: Tender, as: 'tender' },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.status(200).json({
      success: true,
      total: applications.count,
      page: parseInt(page),
      pages: Math.ceil(applications.count / limit),
      applications: applications.rows,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: err.message,
    });
  }
};

// 3. Get applications for a specific tender owned by the company
exports.getApplicationsForTender = async (req, res) => {
  try {
    console.log("****applications comming");
    const tenderId = req.params.tenderId;
    const loggedInCompanyId = req.user.companyId;

    const tender = await Tender.findOne({ where: { id: tenderId, companyId: loggedInCompanyId } });
    if (!tender) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view applications for this tender',
      });
    }

    const applications = await Application.findAll({
      where: { tenderId },
      include: [
        { model: Company, as: 'company' },
        { model: Tender, as: 'tender' },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      message: 'Applications for this tender fetched successfully',
      applications,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications for tender',
      error: err.message,
    });
  }
};

// 4. Get application by ID (restricted to logged-in company)
exports.getApplicationById = async (req, res) => {
  try {
    const application = await Application.findByPk(req.params.id, {
      include: [
        { model: Company, as: 'company' },
        { model: Tender, as: 'tender' },
      ],
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    if (application.companyId !== req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this application',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application fetched successfully',
      application,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error fetching application',
      error: err.message,
    });
  }
};

// 5. Delete an application
exports.deleteApplication = async (req, res) => {
  try {
    const application = await Application.findByPk(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    if (application.companyId !== req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to delete this application',
      });
    }

    await application.destroy();

    res.status(200).json({
      success: true,
      message: 'Application deleted successfully',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete application',
      error: err.message,
    });
  }
};

// 6. Accept an application (by company that owns the tender)
exports.acceptApplication = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const loggedInCompanyId = req.user.companyId;

    const application = await Application.findByPk(applicationId, {
      include: { model: Tender, as: 'tender' }
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const tender = application.tender;
    console.log("**tender.company id : ",tender.companyId);
    console.log("***loggedInComapny id : ",loggedInCompanyId);
    if (!tender || tender.companyId !== loggedInCompanyId) {

      return res.status(403).json({ success: false, message: 'Unauthorized to accept this application' });
    }

    if (tender.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Tender is not accepting applications' });
    }

    // Accept this application
    await application.update({ status: 'accepted' });

    // Reject all others
    await Application.update(
      { status: 'rejected' },
      {
        where: {
          tenderId: tender.id,
          id: { [Op.ne]: application.id },
          status: 'pending'
        }
      }
    );

    // Close the tender
    await tender.update({ status: 'Application Closed' });

    res.status(200).json({ success: true, message: 'Application accepted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to accept application', error: err.message });
  }
};

// 7. Get applications by status for logged-in company


exports.getMyApplicationsByStatus = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const {
      status,
      search,
      minQuotation,
      maxQuotation,
      fromDate,
      toDate
    } = req.query;

    if (!companyId) {
      return res.status(401).json({ success: false, message: 'Company ID not found for user.' });
    }

    const whereClause = { companyId };

    if (status && status !== 'All') {
      whereClause.status = status;
    }

    if (minQuotation || maxQuotation) {
      whereClause.quotationAmount = {};
      if (minQuotation) whereClause.quotationAmount[Op.gte] = parseFloat(minQuotation);
      if (maxQuotation) whereClause.quotationAmount[Op.lte] = parseFloat(maxQuotation);
    }

    if (fromDate || toDate) {
      whereClause.createdAt = {};
      if (fromDate) whereClause.createdAt[Op.gte] = new Date(fromDate);
      if (toDate) whereClause.createdAt[Op.lte] = new Date(toDate);
    }

    // For search in proposalText OR tender.title
    const applicationWhere = whereClause;
    let tenderWhere = null;
    if (search) {
      tenderWhere = {
        title: { [Op.like]: `%${search}%` }
      };
    }

    const applications = await Application.findAll({
      where: applicationWhere,
      include: [
        {
          model: Tender,
          as: 'tender',
          where: tenderWhere,
          required: search ? true : false // Only INNER JOIN if searching
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      applications
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const { Company, GoodsServices, User, Tender, Application } = require('../models');
const { Op } = require('sequelize');
const cloudinary = require('../utils/CloudinaryClient'); // Updated to Cloudinary client
const jwt = require('jsonwebtoken');
const streamifier = require('streamifier');

// 1. Create a company with optional logo upload
exports.createCompany = async (req, res) => {
  try {
    const { name, industry, description, goodsServices: goodsServicesString } = req.body;
    let logoUrl = null;

    // 🧠 Get user
    const user = await User.findByPk(req.user.userId);
    if (user.companyId) {
      return res.status(403).json({
        success: false,
        message: "You are already part of a company. You cannot create another."
      });
    }

    // 🔽 Upload logo to Cloudinary if exists
    const streamifier = require('streamifier');

if (req.file) {
  const streamUpload = (buffer) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'company_logos',
          transformation: [{ width: 500, height: 500, crop: "limit" }],
          use_filename: true,
          unique_filename: false,
          overwrite: true,
        },
        (error, result) => {
          if (result) resolve(result);
          else reject(error);
        }
      );
      streamifier.createReadStream(buffer).pipe(stream);
    });
  };

  const uploadResult = await streamUpload(req.file.buffer);
  logoUrl = uploadResult.secure_url;
}


    // 🏗️ Create the company
    const company = await Company.create({ name, industry, description, logoUrl });

    // 🔁 Link user to company
    user.companyId = company.id;
    await user.save();

    // Handle Goods and Services
    const goodsServicesArray = JSON.parse(goodsServicesString || '[]');
    const servicesToAssociate = [];

    for (const serviceName of goodsServicesArray) {
      const trimmedServiceName = serviceName.trim();
      if (!trimmedServiceName) continue;

      const [goodsServiceInstance, created] = await GoodsServices.findOrCreate({
        where: { name: trimmedServiceName },
        defaults: {
          category: 'General',
          description: `Services provided: ${trimmedServiceName}`
        }
      });
      servicesToAssociate.push(goodsServiceInstance);
    }

    await company.setGoodsServices(servicesToAssociate);

    // 🔐 Regenerate JWT with updated companyId
    const token = jwt.sign(
      {
        userId: user.id,
        companyId: user.companyId
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '7d' }
    );

    // Set the updated token in an httpOnly cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'Lax',
      path: '/',
    });

    res.status(201).json({
      success: true,
      message: 'Company created and joined successfully!',
      company: { id: company.id, name: company.name },
    });

  } catch (err) {
    console.error("Error creating company:", err);
    res.status(500).json({
      success: false,
      message: 'Failed to create company',
      error: err.message
    });
  }
};

// 2. Get all companies with relations
exports.getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({
      include: [
        { model: GoodsServices, as: 'goodsServices', through: { attributes: [] } },
        { model: User, as: 'users' },
        { model: Tender, as: 'tenders' },
        { model: Application, as: 'applications' }
      ]
    });

    res.status(200).json({ success: true, message: 'Companies fetched', companies });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch companies', error: err.message });
  }
};

// 3. Get company by ID
exports.getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findByPk(id, {
      include: [
        { model: GoodsServices, as: 'goodsServices', through: { attributes: [] } },
        { model: User, as: 'users' },
        { model: Tender, as: 'tenders' },
        { model: Application, as: 'applications' }
      ]
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    res.status(200).json({ success: true, message: 'Company fetched', company });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch company', error: err.message });
  }
};

// 4. Update company (with optional logo replacement)
exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, industry, description } = req.validatedData;

    const company = await Company.findByPk(id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    let logoUrl = company.logoUrl;
    if (req.file) {
      const streamUpload = (buffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'company_logos',
              transformation: [{ width: 500, height: 500, crop: "limit" }],
              use_filename: true,
              unique_filename: false,
              overwrite: true,
            },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(buffer).pipe(stream);
        });
      };
    
      const uploadResult = await streamUpload(req.file.buffer);
      logoUrl = uploadResult.secure_url;
    }

    await company.update({ name, industry, description, logoUrl });

    res.status(200).json({ success: true, message: 'Company updated', company });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update company', error: err.message });
  }
};

// 5. Delete company
exports.deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findByPk(id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    await company.destroy();
    res.status(200).json({ success: true, message: 'Company deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete company', error: err.message });
  }
};

// 6. Filter companies
exports.filterCompanies = async (req, res) => {
  try {
    const { name, industry, goodsServices, page = 1, limit = 10, sortBy = "createdAt", order = "desc" } = req.query;

    const whereClause = {};
    if (name) whereClause.name = { [Op.iLike]: `%${name}%` };
    if (industry) whereClause.industry = { [Op.iLike]: `%${industry}%` };

    const include = [];
    if (goodsServices) {
      const productList = goodsServices.split(',').map(p => p.trim());
      include.push({
        model: GoodsServices,
        as: "goodsServices",
        where: { name: { [Op.in]: productList } },
        through: { attributes: [] }
      });
    } else {
      include.push({ model: GoodsServices, as: "goodsServices", through: { attributes: [] } });
    }

    const companies = await Company.findAndCountAll({
      where: whereClause,
      include,
      order: [[sortBy, order]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.status(200).json({
      success: true,
      total: companies.count,
      page: parseInt(page),
      pages: Math.ceil(companies.count / limit),
      data: companies.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to filter companies", error: err.message });
  }
};

// 7. Dropdown for companies
exports.getCompaniesForSelection = async (req, res) => {
  try {
    const companies = await Company.findAll({
      attributes: ['id', 'name']
    });

    res.status(200).json({ success: true, companies });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch companies", error: err.message });
  }
};

// 8. Add goods/services to company (dynamic create or attach)
exports.addGoodsServicesToCompany = async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    const { services } = req.body;

    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ success: false, message: 'Provide at least one service name' });
    }

    const serviceInstances = await Promise.all(
      services.map(async (serviceName) => {
        const [service] = await GoodsServices.findOrCreate({
          where: { name: serviceName },
          defaults: { category: null, description: null }
        });
        return service;
      })
    );

    const company = await Company.findByPk(companyId);
    await company.addGoodsServices(serviceInstances);

    res.status(200).json({
      success: true,
      message: 'Goods/services linked successfully',
      services: serviceInstances
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to add goods/services',
      error: err.message
    });
  }
};

// 9. Get companies by a single goods/service
exports.getCompaniesByGoodsService = async (req, res) => {
  try {
    const { goodsServiceId } = req.params;

    const companies = await Company.findAll({
      include: [{
        model: GoodsServices,
        as: 'goodsServices',
        where: { id: goodsServiceId },
        through: { attributes: [] }
      }]
    });

    res.status(200).json({ success: true, companies });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch companies by goods/service', error: err.message });
  }
};
  
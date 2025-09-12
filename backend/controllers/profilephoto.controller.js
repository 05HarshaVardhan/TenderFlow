const { Company, User } = require('../models'); // Needed to get the user's companyId
const cloudinary = require('../utils/CloudinaryClient'); // Your configured Cloudinary instance

/**
 * @desc    Update a company's logo
 * @route   PUT /api/companies/:id/logo
 * @access  Private (Company members, possibly only admins/owners)
 * @param   {object} req - Express request object (expects req.file for logo)
 * @param   {object} res - Express response object
 */
exports.updateCompanyLogo = async (req, res) => {
  try {
    const companyId = req.params.id; // Get company ID from URL parameter
    const userId = req.user.userId;  // Get user ID from authenticated request

    // 1. Verify User's Association and Permissions with the Company
    const user = await User.findByPk(userId);
    if (!user || user.companyId !== parseInt(companyId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You do not have permission to update this company's logo."
      });
    }

    // Optional: More permission checks (role etc.)

    // 2. Find the Company
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found."
      });
    }

    // 3. Ensure file is provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No logo file provided."
      });
    }

    const file = req.file;
    const oldLogoUrl = company.logoUrl; // Current logo URL to delete later

    // Convert buffer to base64 data URI for Cloudinary upload
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    // 4. Upload the new file to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: `company_logos/${companyId}`,
      transformation: [{ width: 500, height: 500, crop: "limit" }],
      use_filename: true,
      unique_filename: false,
      overwrite: true,
    });

    // 5. Optionally delete old logo from Cloudinary
    if (oldLogoUrl) {
      const publicIdMatch = oldLogoUrl.match(/company_logos\/\d+\/([^\.]+)/);
      if (publicIdMatch) {
        const publicId = `company_logos/${companyId}/${publicIdMatch[1]}`;
        await cloudinary.uploader.destroy(publicId);
      }
    }

    // 6. Update logoUrl in DB
    company.logoUrl = uploadResult.secure_url;
    await company.save();

    // 7. Send success response
    res.status(200).json({
      success: true,
      message: 'Company logo updated successfully!',
      company: {
        id: company.id,
        name: company.name,
        logoUrl: company.logoUrl,
      }
    });

  } catch (err) {
    console.error("Error updating company logo:", err);
    res.status(500).json({
      success: false,
      message: 'Failed to update company logo',
      error: err.message
    });
  }
};

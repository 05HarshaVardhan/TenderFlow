const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Company } = require("../models");

// ✅ Signup controller
exports.signup = async (req, res) => {
  try {
    const { fullName, email, password, companyId } = req.validatedData;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // If companyId is provided, validate it
    let company = null;
    if (companyId) {
      company = await Company.findByPk(companyId);
      if (!company) {
        return res.status(400).json({ message: "Invalid company ID" });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      fullName,
      email,
      passwordHash: hashedPassword,
      companyId: company ? company.id : null,
    });

    
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        companyId: user.companyId,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Signup failed", error: err.message });
  }
};

// ✅ Login controller
  exports.login = async (req, res) => {
    try {
      const { email, password, rememberMe } = req.validatedData;

      const user = await User.findOne({ where: { email } });
      if (!user)
        return res.status(404).json({ message: "User not found" });

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch)
        return res.status(401).json({ message: "Invalid credentials" });

      const token = jwt.sign(
        {
          userId: user.id,
          companyId: user.companyId,
          email: user.email,
        },
        process.env.JWT_SECRET_KEY,
        {
          expiresIn: rememberMe ? "30d" : "1d",
        }
      );

      // Set cookie
      res.cookie("jwt", token, {
        httpOnly: true,
        secure: false, // true in production only
        sameSite: "Lax",
        maxAge: rememberMe
          ? 30 * 24 * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000,
        path: "/", // ✅ must match logout
      });

      res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user.id,
          name: user.fullName,
          companyId: user.companyId,
        },
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Login failed", error: err.message });
    }
  };

// ✅ Join Company
 // Adjust path if needed

exports.joinCompany = async (req, res) => {
  try {
    // 1. Get userId from the authenticated user (assuming req.user is populated by your auth middleware)
    // If your auth middleware sets req.user to the full user object, you can use req.user.id directly.
    // If it only sets { userId: someId }, then req.user.userId is correct.
    const userId = req.user.userId; // Or req.user.id if middleware fetches full user

    // 2. Get companyId from the request body
    const { companyId } = req.body; // Destructure companyId from req.body

    // 3. Find the company to ensure it exists
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    // 4. Find the user from the database to update their record
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // 5. (Optional but Recommended) Prevent user from joining multiple companies
    if (user.companyId && user.companyId !== companyId) { // Check if user already has a companyId and it's different
        return res.status(400).json({ success: false, message: "You are already part of a company. Please leave current company first to join a new one." });
    }
    // If user.companyId is null or the same as companyId, proceed.

    // 6. Update the user's companyId and save to the database
    user.companyId = companyId;
    await user.save(); // This persists the change in the database

    // 7. Generate a NEW JWT with the UPDATED companyId in its payload
    const newToken = jwt.sign(
      {
        userId: user.id, // Use user.id from the fetched user object (it's more reliable)
        companyId: user.companyId, // This is the newly assigned companyId
        email: user.email,
      },
      process.env.JWT_SECRET_KEY, // Ensure this environment variable is correctly loaded
      { expiresIn: "7d" } // Token expiration (e.g., 7 days)
    );

    // ⭐⭐⭐ 8. SET THE NEW JWT AS AN HTTPONLY COOKIE ⭐⭐⭐
    res.cookie("jwt", newToken, {
      httpOnly: true, // Makes the cookie inaccessible to client-side JavaScript (security)
      secure: process.env.NODE_ENV === 'production', // Set to `true` only when your app is served over HTTPS
                                                   // For local development (http://localhost), keep it `false`
      sameSite: "Lax", // Recommended for most scenarios: protects against some CSRF attacks while allowing
                        // the browser to send the cookie for valid cross-site requests (like your fetch call from Next.js)
                        // If "Lax" still causes issues in local dev, try "None" (but requires `secure: true`)
      maxAge: 7 * 24 * 60 * 60 * 1000, // Cookie expiration in milliseconds (7 days)
                                       // Must match or be longer than JWT expiresIn
      path: "/", // Ensures the cookie is sent for all paths on your domain (e.g., /dashboard, /tenders, etc.)
    });

    // 9. Send the success response to the client
    res.status(200).json({
      success: true,
      message: "Joined company successfully",
      // You can remove `token` from here if you are fully relying on httpOnly cookies
      // and your client-side JavaScript doesn't need direct access to the token string.
      // token: newToken, // Optional to send in response body
    });
  } catch (err) {
    console.error("Error joining company:", err); // Log the actual error for debugging
    res.status(500).json({
      success: false,
      message: "Failed to join company",
      error: err.message,
    });
  }
};
// ✅ Logout controller
exports.logout = async (req, res) => {
  console.log("🔐 Clearing JWT cookie...");

  res.clearCookie("jwt", {
    httpOnly: true,
    secure: false, // true in production
    sameSite: "Strict",
    path: "/", // ✅ must match cookie path
  });

  res.status(200).json({
    success: true,
    message: "Logout successful. JWT cleared.",
  });
};

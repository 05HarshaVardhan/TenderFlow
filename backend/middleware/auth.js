const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  let token;
  console.log("this is auth middleware");
  // ✅ Try extracting from cookie first
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
    console.log("puki",token);

  }
  // 🟡 Or fallback to Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
    console.log("puki",token);
  }

  if (!token) {
    console.log("puku ledu");
    return res.status(401).json({ message: "Authorization token missing or malformed" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decoded;
    console.log("🔥 Decoded JWT Payload (Auth Middleware):", decoded);
    console.log("🔥 companyId from decoded payload:", decoded.companyId);
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;

const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../lib/errors"); // errorclass
const SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  // check whether header starts with "Bearer"
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("No token provided"); // throw error
  }

  const token = authHeader.split(" ")[1];

  try {
    // verify the token
    const decoded = jwt.verify(token, SECRET);

    // saving the information
    req.user = decoded; 
    next();
  } catch (err) {
    throw new UnauthorizedError("Invalid or expired token"); // throw error
  }
}

module.exports = authenticate;
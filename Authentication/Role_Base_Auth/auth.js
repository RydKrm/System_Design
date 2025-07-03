/**
 * Authentication Middleware with Role-based Authorization
 *
 * This middleware is used to protect routes by ensuring the user has a valid JWT token
 * and checking whether the user's role is allowed to access the specific route.
 *
 * How it works:
 *  - The middleware takes an optional `roles` array as input, specifying which roles
 *    are authorized to access the route.
 *  - It reads the `Authorization` token from the request headers.
 *  - It verifies the token using `jsonwebtoken` and extracts the user's information (ID, role).
 *  - If the user's role matches any of the roles in the `roles` array, the middleware adds
 *    the user's information (`_id`, `role`, etc.) to the `req` object for downstream use.
 *  - If the token is invalid or the role is not allowed, it returns an unauthorized error.
 *
 * @param {Array} roles - Array of authorized roles (e.g., ['admin', 'user', 'seller']).
 *                        If empty, the route is accessible to any authenticated user.
 * @returns {Function} Express middleware function to handle authorization.
 */

const jwt = require("jsonwebtoken");

function auth(roles = []) {
  return async (req, res, next) => {
    // Check if the authorization header is provided
    if (!req.headers.authorization) {
      return res.status(403).json({
        success: false,
        message: "Please provide authorization token",
      });
    }

    // Extract token from the Authorization header (format: 'Bearer token')
    const token = req.headers.authorization.replace("Bearer ", "");

    try {
      // Verify the token using the secret key
      const isVerify = await jwt.verify(token, process.env.TOKEN_SECRET);

      // If token verification fails, return an error
      if (!isVerify) {
        return res.status(403).json({
          success: false,
          message: "Invalid token",
        });
      }

      // Check if the user's role is in the allowed roles array
      if (roles.includes(isVerify.role)) {
        // Add user information (ID and role) to the request object
        req[isVerify.role] = { _id: isVerify.id, role: isVerify.role };
        req["role"] = isVerify.role;
        req["user"] = { _id: isVerify.id, role: isVerify.role };

        // Proceed to the next middleware or route handler
        next();
      } else {
        // Return an error if the user does not have the required role
        return res.status(403).json({
          success: false,
          message: "You don't have permission to access this resource",
        });
      }
    } catch (error) {
      // Handle any errors during token verification
      return next(error);
    }
  };
}

module.exports = auth;

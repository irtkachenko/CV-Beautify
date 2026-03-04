import rateLimit from "express-rate-limit";

// Rate limiter for static scripts (more restrictive than API)
export const scriptsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many script requests, please try again later." },
  keyGenerator: (req) => {
    // Use IP for rate limiting
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
});

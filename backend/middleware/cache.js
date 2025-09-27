const cache = new Map();

// Simple in-memory cache middleware
const cacheMiddleware = (duration = 30000) => { // Default 30 seconds
  return (req, res, next) => {
    // Create cache key from request
    const key = `${req.method}:${req.originalUrl}:${req.user?.id || 'anonymous'}`;

    // Check if we have cached response
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < duration) {
      console.log(`🚀 Cache hit for ${key}`);
      return res.status(cached.status).json(cached.data);
    }

    // Store original res.json
    const originalJson = res.json;

    // Override res.json to cache the response
    res.json = function(data) {
      // Cache successful responses only
      if (res.statusCode >= 200 && res.statusCode < 400) {
        cache.set(key, {
          status: res.statusCode,
          data: data,
          timestamp: Date.now()
        });

        // Clean up old cache entries periodically
        if (cache.size > 100) {
          const cutoff = Date.now() - duration * 2;
          for (const [k, v] of cache.entries()) {
            if (v.timestamp < cutoff) {
              cache.delete(k);
            }
          }
        }
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

// Cache specifically for stats endpoints (longer duration)
const statsCache = cacheMiddleware(60000); // 1 minute

// Cache for notification counts (shorter duration)
const notificationCache = cacheMiddleware(15000); // 15 seconds

module.exports = {
  cacheMiddleware,
  statsCache,
  notificationCache
};
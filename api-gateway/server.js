const express = require("express");
const proxy = require("express-http-proxy");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 8000;

// Upstream service URLs configured via environment variables
const PACKAGE_SERVICE_URL = process.env.PACKAGE_SERVICE_URL || "http://package-service:3001";
const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || "http://booking-service:3002";
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || "http://analytics-service:5000";
const REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL || "http://review-service:8003";

// Use morgan for HTTP request logging
app.use(morgan("dev"));

// 1. Welcome and Information Endpoint
app.get("/", (req, res) => {
  res.json({
    gateway: "API Gateway - Travel and Tourism Microservices System",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      health_all: "/health/services",
      packages: "/packages",
      bookings: "/bookings",
      analytics: "/analytics/summary",
      reviews: "/reviews"
    }
  });
});

// 2. Self Health Check
app.get("/health", (req, res) => {
  res.json({
    service: "api-gateway",
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// 3. Upstream Services Health Check Aggregate
app.get("/health/services", async (req, res) => {
  const services = [
    { name: "package-service", url: `${PACKAGE_SERVICE_URL}/health` },
    { name: "booking-service", url: `${BOOKING_SERVICE_URL}/health` },
    { name: "analytics-service", url: `${ANALYTICS_SERVICE_URL}/health` },
    { name: "review-service", url: `${REVIEW_SERVICE_URL}/health` }
  ];

  const statusResults = {};

  for (const service of services) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(service.url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        statusResults[service.name] = await response.json();
      } else {
        statusResults[service.name] = {
          status: "error",
          statusCode: response.status,
          message: `Service returned HTTP ${response.status}`
        };
      }
    } catch (error) {
      statusResults[service.name] = {
        status: "offline",
        error: error.name === "AbortError" ? "Timeout (3s)" : error.message
      };
    }
  }

  res.json({
    service: "api-gateway",
    status: "running",
    timestamp: new Date().toISOString(),
    upstreams: statusResults
  });
});

// Helpers for proxy path resolution
const resolvePath = (prefix) => (req) => {
  const parts = req.url.split("?");
  const path = (prefix + parts[0]).replace(/\/+/g, "/");
  return parts.length > 1 ? path + "?" + parts[1] : path;
};

// 4. Reverse Proxy Routes to Microservices
app.use(
  "/packages",
  proxy(PACKAGE_SERVICE_URL, {
    proxyReqPathResolver: resolvePath("/packages")
  })
);

app.use(
  "/bookings",
  proxy(BOOKING_SERVICE_URL, {
    proxyReqPathResolver: resolvePath("/bookings")
  })
);

app.use(
  "/analytics",
  proxy(ANALYTICS_SERVICE_URL, {
    proxyReqPathResolver: resolvePath("/analytics")
  })
);

app.use(
  "/reviews",
  proxy(REVIEW_SERVICE_URL, {
    proxyReqPathResolver: resolvePath("/reviews")
  })
);

// Fallback for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    message: "Rute tidak ditemukan di API Gateway"
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`API Gateway berjalan pada port ${PORT}`);
});

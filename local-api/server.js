const http = require("http");
const url = require("url");
const { loadEnvConfig } = require("@next/env");
const { executeQuery, closeConnection } = require("../lib/db");

// Load .env.local/.env files so DB config mirrors the current app behavior.
loadEnvConfig(process.cwd());

const API_PORT = parseInt(process.env.LOCAL_API_PORT || "3333", 10);

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

async function handleDbPing(res) {
  try {
    const result = await executeQuery("SELECT 1 AS ok");
    sendJson(res, 200, {
      success: true,
      service: "overwatch-local-api",
      endpoint: "db-ping",
      result: result.recordset?.[0] || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    sendJson(res, 500, {
      success: false,
      service: "overwatch-local-api",
      endpoint: "db-ping",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

function handleHealth(res) {
  sendJson(res, 200, {
    success: true,
    service: "overwatch-local-api",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, { success: true });
    return;
  }

  const parsed = url.parse(req.url, true);

  if (req.method === "GET" && parsed.pathname === "/health") {
    handleHealth(res);
    return;
  }

  if (req.method === "GET" && parsed.pathname === "/db/ping") {
    await handleDbPing(res);
    return;
  }

  sendJson(res, 404, {
    success: false,
    message: `Route not found: ${req.method} ${parsed.pathname}`,
  });
});

server.listen(API_PORT, "127.0.0.1", () => {
  console.log(`[local-api] listening on http://127.0.0.1:${API_PORT}`);
});

async function shutdown() {
  console.log("[local-api] shutting down...");
  server.close(async () => {
    await closeConnection();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

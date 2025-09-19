// Test API endpoint to verify database connection
import { executeQuery, getConnection } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Test the connection
    const pool = await getConnection();

    // Simple test query
    const result = await executeQuery(
      "SELECT 1 as test, GETDATE() as currentTime"
    );

    res.status(200).json({
      success: true,
      message: "Database connection successful",
      data: result.recordset[0],
      serverInfo: {
        connected: pool.connected,
        connecting: pool.connecting,
      },
    });
  } catch (error) {
    console.error("Database connection test failed:", error);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
}

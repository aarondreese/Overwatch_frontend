// Simple endpoint to discover the actual table structure
import { executeQuery } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // First, let's see what tables exist in the pow schema
    const tablesQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'pow'
      ORDER BY TABLE_NAME
    `;

    const tablesResult = await executeQuery(tablesQuery);

    // Let's also try a simple SELECT to see what happens
    const simpleQuery = `SELECT TOP 1 * FROM pow.SourceSystem`;
    let simpleResult;
    let simpleError;

    try {
      simpleResult = await executeQuery(simpleQuery);
    } catch (error) {
      simpleError = error.message;
    }

    res.status(200).json({
      success: true,
      message: "Database discovery results",
      data: {
        tables_in_pow_schema: tablesResult.recordset,
        simple_select_result: simpleResult ? simpleResult.recordset : null,
        simple_select_error: simpleError,
        columns_info: simpleResult
          ? Object.keys(simpleResult.recordset[0] || {})
          : null,
      },
    });
  } catch (error) {
    console.error("Database discovery failed:", error);
    res.status(500).json({
      success: false,
      message: "Database discovery failed",
      error: error.message,
    });
  }
}

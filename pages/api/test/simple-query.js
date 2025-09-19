// Simple test to verify database connection and check actual column names
import { getConnection } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Testing database connection...");
    const pool = await getConnection();

    // First, let's check what tables exist in the pow schema
    console.log("Checking tables in pow schema...");
    const tablesResult = await pool.request().query(`
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'pow'
      ORDER BY TABLE_NAME
    `);

    console.log("Tables found:", tablesResult.recordset);

    // Now let's check the columns in the SourceSystem table
    console.log("Checking columns in pow.SourceSystem...");
    const columnsResult = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'pow' 
        AND TABLE_NAME = 'SourceSystem'
      ORDER BY ORDINAL_POSITION
    `);

    console.log("Columns found:", columnsResult.recordset);

    // Try to get a sample record to see the actual data
    console.log("Getting sample data...");
    const sampleResult = await pool.request().query(`
      SELECT TOP 1 * FROM pow.SourceSystem
    `);

    console.log("Sample record:", sampleResult.recordset[0]);

    return res.status(200).json({
      success: true,
      tables: tablesResult.recordset,
      columns: columnsResult.recordset,
      sampleRecord: sampleResult.recordset[0] || null,
      message: "Database connection successful",
    });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({
      error: "Database connection failed",
      details: error.message,
      code: error.code || "UNKNOWN",
    });
  }
}

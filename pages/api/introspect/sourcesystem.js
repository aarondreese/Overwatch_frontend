// Database introspection endpoint to examine table structure
import { executeQuery } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Get table structure for pow.SourceSystem
    const tableStructureQuery = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        CHARACTER_MAXIMUM_LENGTH,
        COLUMN_DEFAULT,
        ORDINAL_POSITION
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'pow' 
        AND TABLE_NAME = 'SourceSystem'
      ORDER BY ORDINAL_POSITION
    `;

    const structureResult = await executeQuery(tableStructureQuery);

    // Get sample data from the table (limit to avoid large responses)
    const sampleDataQuery = `
      SELECT TOP 5 * FROM pow.SourceSystem ORDER BY SourceSystemID
    `;

    const sampleResult = await executeQuery(sampleDataQuery);

    // Get row count
    const countQuery = `SELECT COUNT(*) as total_count FROM pow.SourceSystem`;
    const countResult = await executeQuery(countQuery);

    res.status(200).json({
      success: true,
      message: "Table introspection successful",
      data: {
        table_structure: structureResult.recordset,
        sample_data: sampleResult.recordset,
        total_rows: countResult.recordset[0].total_count,
        schema: "pow",
        table: "SourceSystem",
      },
    });
  } catch (error) {
    console.error("Database introspection failed:", error);
    res.status(500).json({
      success: false,
      message: "Database introspection failed",
      error: error.message,
      details:
        "Make sure the pow.SourceSystem table exists and you have access to it",
    });
  }
}

import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  try {
    // First, get the schema information
    const schemaQuery = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'pow' AND TABLE_NAME = 'Config'
      ORDER BY ORDINAL_POSITION
    `;

    const schemaResult = await executeQuery(schemaQuery, {});

    // Then get sample data
    const dataQuery = `
      SELECT TOP 5 * FROM pow.Config
    `;

    const dataResult = await executeQuery(dataQuery, {});

    // Get column names from actual data
    const columns =
      dataResult.recordset.length > 0
        ? Object.keys(dataResult.recordset[0])
        : [];

    res.status(200).json({
      success: true,
      schema: schemaResult.recordset,
      columns: columns,
      sampleData: dataResult.recordset,
    });
  } catch (error) {
    console.error("Discover config error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to discover config table",
      error: error.message,
      stack: error.stack,
    });
  }
}

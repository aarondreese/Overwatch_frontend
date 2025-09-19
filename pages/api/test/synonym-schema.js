// Database introspection for synonyms table
import { getConnection } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Testing database connection for synonyms...");
    const pool = await getConnection();

    // Check the columns in the Synonym table
    console.log("Checking columns in pow.Synonym...");
    const columnsResult = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'pow' 
        AND TABLE_NAME = 'Synonym'
      ORDER BY ORDINAL_POSITION
    `);

    console.log("Synonym columns found:", columnsResult.recordset);

    // Try to get sample synonym data with relationship to source systems
    console.log("Getting sample synonym data...");
    const sampleResult = await pool.request().query(`
      SELECT TOP 5 * FROM pow.Synonym
    `);

    console.log("Sample synonym records:", sampleResult.recordset);

    // Check if there's a relationship between Synonym and SourceSystem tables
    console.log("Checking foreign key relationships for Synonym...");
    const fkResult = await pool.request().query(`
      SELECT 
        fk.name AS FK_NAME,
        tp.name AS PARENT_TABLE,
        cp.name AS PARENT_COLUMN,
        tr.name AS REFERENCED_TABLE,
        cr.name AS REFERENCED_COLUMN
      FROM sys.foreign_keys fk
      INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
      INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
      INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      INNER JOIN sys.columns cp ON fkc.parent_column_id = cp.column_id AND fkc.parent_object_id = cp.object_id
      INNER JOIN sys.columns cr ON fkc.referenced_column_id = cr.column_id AND fkc.referenced_object_id = cr.object_id
      WHERE tp.name = 'Synonym' OR tr.name = 'Synonym'
    `);

    console.log("Synonym foreign key relationships:", fkResult.recordset);

    return res.status(200).json({
      success: true,
      synonymColumns: columnsResult.recordset,
      sampleSynonyms: sampleResult.recordset,
      foreignKeys: fkResult.recordset,
      message: "Synonym table introspection successful",
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

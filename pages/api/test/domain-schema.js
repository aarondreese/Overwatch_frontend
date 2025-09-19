// Database introspection for domains table
import { getConnection } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Testing database connection for domains...");
    const pool = await getConnection();

    // Check the columns in the Domain table
    console.log("Checking columns in pow.Domain...");
    const columnsResult = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'pow' 
        AND TABLE_NAME = 'Domain'
      ORDER BY ORDINAL_POSITION
    `);

    console.log("Domain columns found:", columnsResult.recordset);

    // Try to get sample domain data with relationship to source systems
    console.log("Getting sample domain data...");
    const sampleResult = await pool.request().query(`
      SELECT TOP 5 * FROM pow.Domain
    `);

    console.log("Sample domain records:", sampleResult.recordset);

    // Check if there's a relationship between Domain and SourceSystem tables
    console.log("Checking foreign key relationships...");
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
      WHERE tp.name = 'Domain' OR tr.name = 'Domain'
    `);

    console.log("Foreign key relationships:", fkResult.recordset);

    return res.status(200).json({
      success: true,
      domainColumns: columnsResult.recordset,
      sampleDomains: sampleResult.recordset,
      foreignKeys: fkResult.recordset,
      message: "Domain table introspection successful",
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

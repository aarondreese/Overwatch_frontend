import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  try {
    // Get schema information for pow.Config table
    const schemaQuery = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'pow' 
        AND TABLE_NAME = 'Config'
      ORDER BY ORDINAL_POSITION
    `;
    
    const schemaResult = await executeQuery(schemaQuery, {});
    
    // Get sample data
    const dataQuery = `
      SELECT TOP 10 * FROM pow.Config
    `;
    
    const dataResult = await executeQuery(dataQuery, {});
    
    res.status(200).json({
      success: true,
      schema: schemaResult.recordset,
      sampleData: dataResult.recordset
    });
  } catch (error) {
    console.error('Config schema test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get config schema',
      error: error.message
    });
  }
}

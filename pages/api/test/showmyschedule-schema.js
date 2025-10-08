import { executeQuery } from '../../../lib/db';

export default async function handler(req, res) {
  try {
    console.log('Testing ShowMySchedule view...');
    
    // Check if ShowMySchedule exists and get its structure
    const schemaQuery = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'ShowMySchedule' 
        AND TABLE_SCHEMA = 'pow'
      ORDER BY ORDINAL_POSITION
    `;
    
    const schemaResult = await executeQuery(schemaQuery);
    console.log('ShowMySchedule schema:', schemaResult.recordset);
    
    // Get sample data
    const dataQuery = `SELECT TOP 5 * FROM pow.ShowMySchedule`;
    const dataResult = await executeQuery(dataQuery);
    console.log('ShowMySchedule sample data:', dataResult.recordset);
    
    res.status(200).json({
      schema: schemaResult.recordset,
      sampleData: dataResult.recordset
    });
    
  } catch (error) {
    console.error('ShowMySchedule schema error:', error);
    res.status(500).json({ error: error.message });
  }
}
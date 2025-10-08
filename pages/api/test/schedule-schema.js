import { executeQuery } from '../../../lib/db';

export default async function handler(req, res) {
  try {
    console.log('Testing database connection for schedules...');
    
    // Check for schedule-related tables
    console.log('Checking for schedule tables...');
    const scheduleTablesCheck = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'pow' AND TABLE_NAME LIKE '%Schedule%'
    `);
    
    console.log('Schedule tables found:', scheduleTablesCheck.recordset);
    
    // Get column information for any schedule tables found
    for (const table of scheduleTablesCheck.recordset) {
      console.log(`Checking columns in pow.${table.TABLE_NAME}...`);
      const columns = await executeQuery(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'pow' AND TABLE_NAME = @tableName
        ORDER BY ORDINAL_POSITION
      `, { tableName: table.TABLE_NAME });
      console.log(`${table.TABLE_NAME} columns:`, columns.recordset);
      
      // Get sample data if table exists
      try {
        const sampleData = await executeQuery(`
          SELECT TOP 5 * FROM pow.${table.TABLE_NAME}
        `);
        console.log(`Sample ${table.TABLE_NAME} records:`, sampleData.recordset);
      } catch (sampleError) {
        console.log(`Could not get sample data for ${table.TABLE_NAME}:`, sampleError.message);
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Schedule schema check completed',
      data: {
        scheduleTables: scheduleTablesCheck.recordset,
        tablesFound: scheduleTablesCheck.recordset.length
      }
    });
  } catch (error) {
    console.error('Schedule schema check error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection or query failed',
      error: error.message
    });
  }
}
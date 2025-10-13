import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Inspecting DQ Check tables...');
    
    // First, let's see what DQ Check related tables exist
    const tablesQuery = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'pow' 
      AND TABLE_NAME LIKE '%Check%' OR TABLE_NAME LIKE '%DQ%'
      ORDER BY TABLE_NAME
    `);
    
    // Get structure of the main DQCheck table
    const dqCheckStructure = await executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'pow' AND TABLE_NAME = 'DQCheck'
      ORDER BY ORDINAL_POSITION
    `);
    
    // Get sample data from DQCheck table (without ORDER BY first to see what columns exist)
    const sampleData = await executeQuery(`
      SELECT TOP 5 * FROM pow.DQCheck
    `);
    
    // Count total records
    const countQuery = await executeQuery(`
      SELECT COUNT(*) as totalCount FROM pow.DQCheck
    `);
    
    res.status(200).json({
      success: true,
      message: 'DQ Check table inspection complete',
      data: {
        relatedTables: tablesQuery.recordset,
        tableStructure: dqCheckStructure.recordset,
        sampleData: sampleData.recordset,
        totalCount: countQuery.recordset[0].totalCount
      }
    });
    
  } catch (error) {
    console.error('DQ Check table inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to inspect DQ Check tables',
      error: error.message
    });
  }
}
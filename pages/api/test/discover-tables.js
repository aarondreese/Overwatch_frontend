import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Finding DQ Check tables...');
    
    // First, let's see what tables exist in the pow schema
    const allTablesQuery = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'pow'
      ORDER BY TABLE_NAME
    `);
    
    // Look for any tables with 'DQ' or 'Check' in the name
    const dqTablesQuery = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'pow' 
      AND (TABLE_NAME LIKE '%DQ%' OR TABLE_NAME LIKE '%Check%')
      ORDER BY TABLE_NAME
    `);
    
    res.status(200).json({
      success: true,
      message: 'Table discovery complete',
      data: {
        allTables: allTablesQuery.recordset,
        dqRelatedTables: dqTablesQuery.recordset
      }
    });
    
  } catch (error) {
    console.error('Table discovery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to discover tables',
      error: error.message
    });
  }
}
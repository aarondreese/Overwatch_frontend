import { executeQuery } from '../../../lib/db';

export default async function handler(req, res) {
  try {
    // Try to select all columns from the first row to see the structure
    const result = await executeQuery(`
      SELECT TOP 1 * FROM pow.DistributionGroup
    `);
    
    console.log('Distribution Group table structure:', result.recordset);
    
    res.status(200).json({
      success: true,
      message: 'Distribution group structure check',
      data: result.recordset
    });
  } catch (error) {
    console.error('Distribution group structure check error:', error);
    res.status(500).json({
      success: false,
      message: 'Database query failed',
      error: error.message
    });
  }
}
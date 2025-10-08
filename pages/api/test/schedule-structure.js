import { executeQuery } from '../../../lib/db';

export default async function handler(req, res) {
  try {
    // Get sample data from Schedule table to understand structure
    const result = await executeQuery(`
      SELECT TOP 5 * FROM pow.Schedule
    `);
    
    console.log('Schedule table structure:', result.recordset);
    
    res.status(200).json({
      success: true,
      message: 'Schedule structure check',
      data: result.recordset
    });
  } catch (error) {
    console.error('Schedule structure check error:', error);
    res.status(500).json({
      success: false,
      message: 'Database query failed',
      error: error.message
    });
  }
}
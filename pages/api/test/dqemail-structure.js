import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Examining DQEmail table structure...');
    
    // Get table structure
    const structureQuery = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'pow' 
        AND TABLE_NAME = 'DQEmail'
      ORDER BY ORDINAL_POSITION
    `;
    
    const structureResult = await executeQuery(structureQuery);
    
    // Get sample data
    const sampleQuery = `SELECT TOP 5 * FROM pow.DQEmail`;
    const sampleResult = await executeQuery(sampleQuery);
    
    // Count total records
    const countQuery = `SELECT COUNT(*) as totalCount FROM pow.DQEmail`;
    const countResult = await executeQuery(countQuery);
    
    res.status(200).json({
      success: true,
      message: 'DQEmail table structure retrieved',
      data: {
        structure: structureResult.recordset,
        sampleRecords: sampleResult.recordset,
        totalCount: countResult.recordset[0].totalCount
      }
    });
    
  } catch (error) {
    console.error('DQEmail structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve DQEmail structure',
      error: error.message
    });
  }
}
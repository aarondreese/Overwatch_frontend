import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Getting Domain table data...');
    
    // Get Domain table structure and data
    const domainData = await executeQuery(`
      SELECT TOP 10 * FROM pow.Domain
      ORDER BY ID
    `);
    
    res.status(200).json({
      success: true,
      message: 'Domain table data retrieved',
      data: {
        domains: domainData.recordset
      }
    });
    
  } catch (error) {
    console.error('Domain table error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get domain data',
      error: error.message
    });
  }
}
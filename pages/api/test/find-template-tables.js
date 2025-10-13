import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const query = `
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME,
        TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME LIKE '%template%'
         OR TABLE_NAME LIKE '%Template%'
         OR TABLE_NAME LIKE '%EMAIL%'
         OR TABLE_NAME LIKE '%email%'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;
    
    const result = await executeQuery(query);
    
    res.status(200).json({
      success: true,
      data: result.recordset
    });
    
  } catch (error) {
    console.error('Template tables search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search for template tables',
      error: error.message
    });
  }
}
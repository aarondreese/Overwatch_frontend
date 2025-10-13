import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const query = `
      SELECT 
        COLUMN_NAME as columnName,
        DATA_TYPE as dataType,
        IS_NULLABLE as isNullable,
        COLUMN_DEFAULT as columnDefault,
        CHARACTER_MAXIMUM_LENGTH as maxLength
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'HtmlTemplate'
        AND TABLE_SCHEMA = 'pow'
      ORDER BY ORDINAL_POSITION
    `;
    
    const result = await executeQuery(query);
    
    res.status(200).json({
      success: true,
      data: result.recordset
    });
    
  } catch (error) {
    console.error('HtmlTemplate structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get HtmlTemplate structure',
      error: error.message
    });
  }
}
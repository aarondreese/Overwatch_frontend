import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get all stored procedures that start with 'email_' but exclude pow schema
    const query = `
      SELECT 
        ROUTINE_NAME as procedureName,
        ROUTINE_SCHEMA as schemaName,
        CONCAT(ROUTINE_SCHEMA, '.', ROUTINE_NAME) as fullProcedureName
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_TYPE = 'PROCEDURE'
        AND ROUTINE_NAME LIKE 'email_%'
        AND ROUTINE_SCHEMA != 'pow'
      ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME
    `;
    
    const result = await executeQuery(query);
    
    const procedures = result.recordset.map(proc => ({
      procedureName: proc.procedureName,
      schemaName: proc.schemaName,
      fullProcedureName: proc.fullProcedureName
    }));
    
    res.status(200).json({
      success: true,
      data: procedures,
      count: procedures.length
    });
    
  } catch (error) {
    console.error('Stored Procedures API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stored procedures',
      error: error.message
    });
  }
}
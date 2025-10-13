import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Testing DQ function discovery SQL...');
    
    // First, let's see what schemas we have available
    const schemasQuery = `
      SELECT name, schema_id 
      FROM sys.schemas 
      WHERE name NOT IN ('sys', 'INFORMATION_SCHEMA')
      ORDER BY name
    `;
    
    const schemasResult = await executeQuery(schemasQuery);
    
    // Next, let's see what table-valued functions exist
    const functionsQuery = `
      SELECT 
        s.name AS SchemaName,
        o.name AS FunctionName,
        o.type_desc,
        o.create_date,
        COUNT(c.column_id) as ColumnCount
      FROM sys.objects o
      INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
      LEFT JOIN sys.columns c ON o.object_id = c.object_id
      WHERE o.type IN ('TF', 'IF') -- Table-valued functions
        AND s.name NOT IN ('pow', 'api', 'sys', 'INFORMATION_SCHEMA')
      GROUP BY s.name, o.name, o.type_desc, o.create_date
      ORDER BY s.name, o.name
    `;
    
    const functionsResult = await executeQuery(functionsQuery);
    
    // Check what existing DQ checks we have
    const existingDQQuery = `
      SELECT FunctionName, COUNT(*) as Count
      FROM pow.DQCheck
      WHERE FunctionName IS NOT NULL
      GROUP BY FunctionName
      ORDER BY FunctionName
    `;
    
    const existingDQResult = await executeQuery(existingDQQuery);
    
    // Sample a few functions to see their column structure
    const sampleFunctionQuery = `
      SELECT TOP 5
        s.name AS SchemaName,
        o.name AS FunctionName,
        c.name AS ColumnName,
        c.column_id,
        t.name AS DataType,
        c.max_length,
        c.is_nullable
      FROM sys.objects o
      INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
      INNER JOIN sys.columns c ON o.object_id = c.object_id
      INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
      WHERE o.type IN ('TF', 'IF')
        AND s.name NOT IN ('pow', 'api', 'sys', 'INFORMATION_SCHEMA')
      ORDER BY s.name, o.name, c.column_id
    `;
    
    const sampleResult = await executeQuery(sampleFunctionQuery);
    
    res.status(200).json({
      success: true,
      message: 'DQ function discovery test complete',
      data: {
        schemas: schemasResult.recordset,
        functions: functionsResult.recordset,
        existingDQChecks: existingDQResult.recordset,
        sampleColumns: sampleResult.recordset
      }
    });
    
  } catch (error) {
    console.error('DQ function test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test DQ function discovery',
      error: error.message
    });
  }
}
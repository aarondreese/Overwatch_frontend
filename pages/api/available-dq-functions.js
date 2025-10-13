import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Finding available DQ check functions...');
    
    // Complex query to find table-valued functions that could be DQ checks
    const query = `
      WITH AvailableFunctions AS (
        -- Find all table-valued functions (not in pow or api schemas)
        SELECT 
          s.name AS SchemaName,
          o.name AS FunctionName,
          SCHEMA_NAME(o.schema_id) + '.' + o.name AS FullFunctionName,
          o.object_id,
          o.create_date,
          o.modify_date
        FROM sys.objects o
        INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
        WHERE o.type IN ('TF', 'IF') -- Table-valued functions (TF = SQL table function, IF = inline table function)
          AND s.name NOT IN ('pow', 'api', 'sys', 'INFORMATION_SCHEMA') -- Exclude system and our main schemas
          AND o.name NOT LIKE 'sp_%' -- Exclude stored procedures that might be misclassified
          AND o.name NOT LIKE 'fn_%' -- Exclude scalar functions with fn_ prefix
      ),
      FunctionColumns AS (
        -- Get the first column of each function to check if it's DomainRef
        SELECT 
          af.SchemaName,
          af.FunctionName,
          af.FullFunctionName,
          af.object_id,
          af.create_date,
          af.modify_date,
          c.name AS FirstColumnName,
          c.column_id,
          ROW_NUMBER() OVER (PARTITION BY af.object_id ORDER BY c.column_id) as rn
        FROM AvailableFunctions af
        LEFT JOIN sys.columns c ON af.object_id = c.object_id
      ),
      FirstColumns AS (
        -- Filter to only the first column of each function
        SELECT 
          SchemaName,
          FunctionName,
          FullFunctionName,
          object_id,
          create_date,
          modify_date,
          FirstColumnName
        FROM FunctionColumns
        WHERE rn = 1
      ),
      ExistingDQChecks AS (
        -- Get existing DQ check function names
        SELECT DISTINCT FunctionName
        FROM pow.DQCheck
        WHERE FunctionName IS NOT NULL
      )
      -- Final result: functions with DomainRef as first column, cross-referenced with existing checks
      SELECT 
        fc.SchemaName,
        fc.FunctionName,
        fc.FullFunctionName,
        fc.FirstColumnName,
        fc.create_date,
        fc.modify_date,
        CASE 
          WHEN edc.FunctionName IS NOT NULL THEN 1 
          ELSE 0 
        END AS AlreadyExists,
        CASE 
          WHEN fc.FirstColumnName = 'DomainRef' THEN 1 
          ELSE 0 
        END AS HasDomainRef
      FROM FirstColumns fc
      LEFT JOIN ExistingDQChecks edc ON fc.FunctionName = edc.FunctionName
      WHERE fc.FirstColumnName = 'DomainRef' -- Only functions with DomainRef as first column
      ORDER BY 
        CASE WHEN edc.FunctionName IS NOT NULL THEN 1 ELSE 0 END, -- Show new functions first
        fc.SchemaName,
        fc.FunctionName
    `;

    const result = await executeQuery(query);
    
    const functions = result.recordset.map(row => ({
      schemaName: row.SchemaName,
      functionName: row.FunctionName,
      fullFunctionName: row.FullFunctionName,
      firstColumnName: row.FirstColumnName,
      createDate: row.create_date,
      modifyDate: row.modify_date,
      alreadyExists: Boolean(row.AlreadyExists),
      hasDomainRef: Boolean(row.HasDomainRef),
      canBeAdded: !Boolean(row.AlreadyExists) && Boolean(row.HasDomainRef)
    }));

    // Separate into categories
    const availableFunctions = functions.filter(f => f.canBeAdded);
    const existingFunctions = functions.filter(f => f.alreadyExists);
    const invalidFunctions = functions.filter(f => !f.hasDomainRef);

    res.status(200).json({
      success: true,
      message: 'Available DQ check functions retrieved successfully',
      data: {
        available: availableFunctions,
        existing: existingFunctions,
        invalid: invalidFunctions,
        summary: {
          totalFound: functions.length,
          availableCount: availableFunctions.length,
          existingCount: existingFunctions.length,
          invalidCount: invalidFunctions.length
        }
      }
    });
    
  } catch (error) {
    console.error('Available DQ functions API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available DQ check functions',
      error: error.message
    });
  }
}
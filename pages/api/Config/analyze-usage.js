import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  try {
    // Get all current parameters from pow.Config
    const configParamsQuery = `
      SELECT DISTINCT Parameter 
      FROM pow.Config 
      WHERE Parameter != 'CurrentEnvironment'
      ORDER BY Parameter
    `;
    const configResult = await executeQuery(configParamsQuery, {});
    const existingParameters = configResult.recordset.map(r => r.Parameter);

    // Search for references to pow.Config in stored procedures and functions
    const proceduresQuery = `
      SELECT 
        OBJECT_SCHEMA_NAME(o.object_id) AS SchemaName,
        o.name AS ObjectName,
        o.type_desc AS ObjectType,
        m.definition AS Definition
      FROM sys.sql_modules m
      INNER JOIN sys.objects o ON m.object_id = o.object_id
      WHERE o.type IN ('P', 'FN', 'IF', 'TF') -- Procedures and Functions
        AND (
          m.definition LIKE '%pow.Config%' 
          OR m.definition LIKE '%pow.config%'
          OR m.definition LIKE '%[Config]%'
        )
      ORDER BY o.type_desc, o.name
    `;
    
    const proceduresResult = await executeQuery(proceduresQuery, {});
    
    // Analyze each procedure/function to extract parameter references
    const referencedParameters = new Set();
    const procedureDetails = [];
    
    for (const proc of proceduresResult.recordset) {
      const definition = proc.Definition;
      const matches = [];
      
      // Common patterns to look for parameter references:
      // 1. WHERE Parameter = 'ParameterName'
      // 2. WHERE Parameter = @ParameterName
      // 3. Parameter IN ('Param1', 'Param2')
      
      // Pattern 1: WHERE Parameter = 'literal'
      const pattern1 = /WHERE\s+Parameter\s*=\s*'([^']+)'/gi;
      let match;
      while ((match = pattern1.exec(definition)) !== null) {
        const paramName = match[1];
        if (paramName !== 'CurrentEnvironment') {
          referencedParameters.add(paramName);
          matches.push({ pattern: 'Direct literal', parameter: paramName });
        }
      }
      
      // Pattern 2: Parameter = 'literal' (without WHERE)
      const pattern2 = /Parameter\s*=\s*'([^']+)'/gi;
      while ((match = pattern2.exec(definition)) !== null) {
        const paramName = match[1];
        if (paramName !== 'CurrentEnvironment') {
          referencedParameters.add(paramName);
          if (!matches.find(m => m.parameter === paramName)) {
            matches.push({ pattern: 'Parameter equals', parameter: paramName });
          }
        }
      }
      
      // Pattern 3: Parameter IN ('param1', 'param2')
      const pattern3 = /Parameter\s+IN\s*\([^)]*'([^']+)'[^)]*\)/gi;
      while ((match = pattern3.exec(definition)) !== null) {
        const paramName = match[1];
        if (paramName !== 'CurrentEnvironment') {
          referencedParameters.add(paramName);
          if (!matches.find(m => m.parameter === paramName)) {
            matches.push({ pattern: 'IN clause', parameter: paramName });
          }
        }
      }
      
      // Pattern 4: Look for function calls like dbo.GetConfigValue('ParameterName')
      const pattern4 = /(?:GetConfig|GetConfigValue|GetParameter|GetSetting)\s*\(\s*'([^']+)'/gi;
      while ((match = pattern4.exec(definition)) !== null) {
        const paramName = match[1];
        if (paramName !== 'CurrentEnvironment') {
          referencedParameters.add(paramName);
          if (!matches.find(m => m.parameter === paramName)) {
            matches.push({ pattern: 'Function call', parameter: paramName });
          }
        }
      }
      
      if (matches.length > 0) {
        procedureDetails.push({
          schema: proc.SchemaName,
          name: proc.ObjectName,
          type: proc.ObjectType,
          fullName: `${proc.SchemaName}.${proc.ObjectName}`,
          referencedParameters: matches
        });
      }
    }
    
    // Convert Set to Array and sort
    const referencedParamsList = Array.from(referencedParameters).sort();
    
    // Analyze which parameters exist and which don't
    const analysis = referencedParamsList.map(param => ({
      parameter: param,
      exists: existingParameters.includes(param),
      usedIn: procedureDetails
        .filter(p => p.referencedParameters.some(rp => rp.parameter === param))
        .map(p => p.fullName)
    }));
    
    // Get missing parameters
    const missingParameters = analysis.filter(a => !a.exists);
    const existingButReferenced = analysis.filter(a => a.exists);
    
    // Get parameters in Config but not referenced
    const unusedParameters = existingParameters.filter(
      param => !referencedParamsList.includes(param)
    );

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProceduresFunctions: proceduresResult.recordset.length,
          totalReferencedParameters: referencedParamsList.length,
          missingParametersCount: missingParameters.length,
          existingParametersCount: existingButReferenced.length,
          unusedParametersCount: unusedParameters.length
        },
        existingParameters,
        referencedParameters: referencedParamsList,
        missingParameters: missingParameters.map(m => ({
          parameter: m.parameter,
          usedIn: m.usedIn
        })),
        existingButReferenced: existingButReferenced.map(e => ({
          parameter: e.parameter,
          usedIn: e.usedIn
        })),
        unusedParameters,
        procedureDetails,
        analysis
      }
    });
  } catch (error) {
    console.error('Config analysis error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to analyze config usage',
      error: error.message
    });
  }
}

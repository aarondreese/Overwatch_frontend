import { executeQuery } from "@/lib/db";
import type { NextApiRequest, NextApiResponse } from "next";
import type {
  ConfigAnalysisResponse,
  ProcedureRecord,
  ProcedureDetail,
  ParameterMatch,
  ParameterAnalysis,
} from "@/types/config-analysis";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConfigAnalysisResponse>
): Promise<void> {
  try {
    // Get all current parameters from pow.Config
    const configParamsQuery = `
      SELECT DISTINCT Parameter 
      FROM pow.Config 
      WHERE Parameter != 'CurrentEnvironment'
      ORDER BY Parameter
    `;
    const configResult = await executeQuery(configParamsQuery, {});
    const existingParameters: string[] = configResult.recordset.map(
      (r: { Parameter: string }) => r.Parameter
    );

    // Search for references to pow.Config table or pow.fn_GetConfigValue function in stored procedures and functions
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
          OR m.definition LIKE '%fn_GetConfigValue%'
          OR m.definition LIKE '%[fn_GetConfigValue]%'
        )
      ORDER BY o.type_desc, o.name
    `;

    const proceduresResult = await executeQuery(proceduresQuery, {});

    // Analyze each procedure/function to extract parameter references
    const referencedParameters = new Set<string>();
    const procedureDetails: ProcedureDetail[] = [];

    for (const proc of proceduresResult.recordset as ProcedureRecord[]) {
      const definition = proc.Definition;
      const matches: ParameterMatch[] = [];

      // Common patterns to look for parameter references:
      // 1. WHERE Parameter = 'ParameterName'
      // 2. WHERE Parameter = @ParameterName
      // 3. Parameter IN ('Param1', 'Param2')
      // 4. Function calls like pow.fn_GetConfigValue('ParameterName')

      // Pattern 1: WHERE Parameter = 'literal'
      const pattern1 = /WHERE\s+Parameter\s*=\s*'([^']+)'/gi;
      let match: RegExpExecArray | null;
      while ((match = pattern1.exec(definition)) !== null) {
        const paramName = match[1];
        if (paramName !== "CurrentEnvironment") {
          referencedParameters.add(paramName);
          matches.push({ pattern: "Direct literal", parameter: paramName });
        }
      }

      // Pattern 2: Parameter = 'literal' (without WHERE)
      const pattern2 = /Parameter\s*=\s*'([^']+)'/gi;
      while ((match = pattern2.exec(definition)) !== null) {
        const paramName = match[1];
        if (paramName !== "CurrentEnvironment") {
          referencedParameters.add(paramName);
          if (!matches.find((m) => m.parameter === paramName)) {
            matches.push({ pattern: "Parameter equals", parameter: paramName });
          }
        }
      }

      // Pattern 3: Parameter IN ('param1', 'param2')
      const pattern3 = /Parameter\s+IN\s*\([^)]*'([^']+)'[^)]*\)/gi;
      while ((match = pattern3.exec(definition)) !== null) {
        const paramName = match[1];
        if (paramName !== "CurrentEnvironment") {
          referencedParameters.add(paramName);
          if (!matches.find((m) => m.parameter === paramName)) {
            matches.push({ pattern: "IN clause", parameter: paramName });
          }
        }
      }

      // Pattern 4: Look for function calls like GetConfigValue('ParameterName') or pow.fn_GetConfigValue('ParameterName')
      const pattern4 =
        /(?:GetConfig|GetConfigValue|GetParameter|GetSetting|fn_GetConfigValue|pow\.fn_GetConfigValue|\[pow\]\.\[fn_GetConfigValue\])\s*\(\s*'([^']+)'/gi;
      while ((match = pattern4.exec(definition)) !== null) {
        const paramName = match[1];
        if (paramName !== "CurrentEnvironment") {
          referencedParameters.add(paramName);
          if (!matches.find((m) => m.parameter === paramName)) {
            matches.push({ pattern: "Function call", parameter: paramName });
          }
        }
      }

      if (matches.length > 0) {
        procedureDetails.push({
          schema: proc.SchemaName,
          name: proc.ObjectName,
          type: proc.ObjectType,
          fullName: `${proc.SchemaName}.${proc.ObjectName}`,
          referencedParameters: matches,
        });
      }
    }

    // Convert Set to Array and sort
    const referencedParamsList = Array.from(referencedParameters).sort();

    // Analyze which parameters exist and which don't
    const analysis: ParameterAnalysis[] = referencedParamsList.map((param) => ({
      parameter: param,
      exists: existingParameters.includes(param),
      usedIn: procedureDetails
        .filter((p) =>
          p.referencedParameters.some((rp) => rp.parameter === param)
        )
        .map((p) => p.fullName),
    }));

    // Get missing parameters
    const missingParameters = analysis.filter((a) => !a.exists);
    const existingButReferenced = analysis.filter((a) => a.exists);

    // Get parameters in Config but not referenced
    const unusedParameters = existingParameters.filter(
      (param) => !referencedParamsList.includes(param)
    );

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProceduresFunctions: proceduresResult.recordset.length,
          totalReferencedParameters: referencedParamsList.length,
          missingParametersCount: missingParameters.length,
          existingParametersCount: existingButReferenced.length,
          unusedParametersCount: unusedParameters.length,
        },
        existingParameters,
        referencedParameters: referencedParamsList,
        missingParameters: missingParameters.map((m) => ({
          parameter: m.parameter,
          usedIn: m.usedIn,
        })),
        existingButReferenced: existingButReferenced.map((e) => ({
          parameter: e.parameter,
          usedIn: e.usedIn,
        })),
        unusedParameters,
        procedureDetails,
        analysis,
      },
    });
  } catch (error) {
    console.error("Config analysis error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to analyze config usage",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { templateName } = req.query;

  if (!templateName) {
    return res.status(400).json({
      success: false,
      message: "Template name is required",
    });
  }

  try {
    // Get all DQ emails that use this template
    const emailQuery = `
      SELECT 
        ID as id,
        EmailName as emailName,
        isActive,
        inDev
      FROM pow.DQEmail 
      WHERE htmlTemplateName = @templateName
      ORDER BY EmailName
    `;

    // Get all stored procedures with 'email' in the name and search their text for the template name
    const storedProcQuery = `
      SELECT 
        ROUTINE_NAME as procedureName,
        ROUTINE_SCHEMA as schemaName,
        CONCAT(ROUTINE_SCHEMA, '.', ROUTINE_NAME) as fullProcedureName,
        OBJECT_DEFINITION(OBJECT_ID(CONCAT(ROUTINE_SCHEMA, '.', ROUTINE_NAME))) as procedureText
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_TYPE = 'PROCEDURE'
        AND ROUTINE_NAME LIKE '%email%'
        AND OBJECT_DEFINITION(OBJECT_ID(CONCAT(ROUTINE_SCHEMA, '.', ROUTINE_NAME))) IS NOT NULL
    `;

    const [emailResult, storedProcResult] = await Promise.all([
      executeQuery(emailQuery, { templateName }),
      executeQuery(storedProcQuery, {})
    ]);

    // Process email results
    const emailUsage = emailResult.recordset.map((email) => ({
      id: email.id,
      emailName: email.emailName,
      isActive: Boolean(email.isActive),
      inDev: Boolean(email.inDev),
    }));

    // Process stored procedure results - search for template name in procedure text
    const storedProcUsage = storedProcResult.recordset
      .filter((proc) => {
        if (!proc.procedureText) return false;
        // Search for the template name in the procedure text (case-insensitive)
        const searchText = proc.procedureText.toLowerCase();
        const templateNameLower = templateName.toLowerCase();
        return searchText.includes(templateNameLower);
      })
      .map((proc) => ({
        procedureName: proc.procedureName,
        schemaName: proc.schemaName,
        fullProcedureName: proc.fullProcedureName,
        // Extract context around the template name (for preview)
        context: extractTemplateContext(proc.procedureText, templateName)
      }));

    const totalUsageCount = emailUsage.length + storedProcUsage.length;

    res.status(200).json({
      success: true,
      data: {
        templateName,
        totalUsageCount,
        emailUsageCount: emailUsage.length,
        storedProcUsageCount: storedProcUsage.length,
        emails: emailUsage,
        storedProcedures: storedProcUsage,
      },
    });
  } catch (error) {
    console.error("HTML Template usage API error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get template usage",
      error: error.message,
    });
  }
}

// Helper function to extract context around template name mentions
function extractTemplateContext(procedureText, templateName) {
  if (!procedureText || !templateName) return [];
  
  const lines = procedureText.split('\n');
  const templateNameLower = templateName.toLowerCase();
  const contexts = [];
  
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes(templateNameLower)) {
      // Get some context around the match (previous and next lines)
      const startLine = Math.max(0, index - 1);
      const endLine = Math.min(lines.length - 1, index + 1);
      const contextLines = lines.slice(startLine, endLine + 1);
      
      contexts.push({
        lineNumber: index + 1,
        context: contextLines.join('\n').trim(),
        matchedLine: line.trim()
      });
    }
  });
  
  // Limit to first 3 matches to avoid overwhelming the UI
  return contexts.slice(0, 3);
}
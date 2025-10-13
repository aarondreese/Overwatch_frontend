import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { templateName, mapViewName } = req.query;

  if (!templateName && !mapViewName) {
    return res.status(400).json({
      success: false,
      message: 'Either templateName or mapViewName is required'
    });
  }

  try {
    const result = { success: true, data: {} };

    // Get HTML template content if requested
    if (templateName) {
      try {
        const templateQuery = `
          SELECT 
            template_name as TemplateName,
            template_text as TemplateText
          FROM pow.HtmlTemplate 
          WHERE template_name = @templateName
        `;
        
        const templateResult = await executeQuery(templateQuery, { templateName });
        
        if (templateResult.recordset.length > 0) {
          result.data.template = {
            name: templateResult.recordset[0].TemplateName,
            text: templateResult.recordset[0].TemplateText,
            description: null, // Not available in this table
            createdDate: null, // Not available in this table
            modifiedDate: null // Not available in this table
          };
        } else {
          result.data.template = null;
          result.templateError = `Template '${templateName}' not found`;
        }
      } catch (templateError) {
        console.error('Template query error:', templateError);
        result.data.template = null;
        result.templateError = `Error fetching template: ${templateError.message}`;
      }
    }

    // Get map view columns if requested
    if (mapViewName) {
      try {
        // First try to get columns from the view
        const columnsQuery = `
          SELECT 
            COLUMN_NAME as columnName,
            DATA_TYPE as dataType,
            IS_NULLABLE as isNullable,
            COLUMN_DEFAULT as columnDefault,
            CHARACTER_MAXIMUM_LENGTH as maxLength
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = @mapViewName
            AND TABLE_SCHEMA IN ('pow', 'dbo', 'oh', 'hms', 'CaRE', 'srv')
          ORDER BY ORDINAL_POSITION
        `;
        
        const columnsResult = await executeQuery(columnsQuery, { mapViewName });
        
        if (columnsResult.recordset.length > 0) {
          result.data.mapViewColumns = columnsResult.recordset.map(col => ({
            columnName: col.columnName,
            dataType: col.dataType,
            isNullable: col.isNullable === 'YES',
            columnDefault: col.columnDefault,
            maxLength: col.maxLength
          }));
        } else {
          // If no columns found, try to check if the view exists in any schema
          const viewExistsQuery = `
            SELECT 
              TABLE_SCHEMA,
              TABLE_NAME,
              TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = @mapViewName
          `;
          
          const viewExistsResult = await executeQuery(viewExistsQuery, { mapViewName });
          
          if (viewExistsResult.recordset.length > 0) {
            result.data.mapViewColumns = [];
            result.mapViewError = `View '${mapViewName}' exists but has no accessible columns`;
            result.data.viewInfo = viewExistsResult.recordset[0];
          } else {
            result.data.mapViewColumns = null;
            result.mapViewError = `Map view '${mapViewName}' not found`;
          }
        }
      } catch (mapViewError) {
        console.error('Map view query error:', mapViewError);
        result.data.mapViewColumns = null;
        result.mapViewError = `Error fetching map view columns: ${mapViewError.message}`;
      }
    }

    res.status(200).json(result);
    
  } catch (error) {
    console.error('DQ Email resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve DQ email resources',
      error: error.message
    });
  }
}
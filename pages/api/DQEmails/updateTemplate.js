import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { templateName, templateText } = req.body;

  if (!templateName || !templateText) {
    return res.status(400).json({
      success: false,
      message: 'templateName and templateText are required'
    });
  }

  try {
    // Update the HTML template in the pow.HtmlTemplate table
    const updateQuery = `
      UPDATE pow.HtmlTemplate 
      SET template_text = @templateText
      WHERE template_name = @templateName
    `;
    
    const result = await executeQuery(updateQuery, { 
      templateName, 
      templateText 
    });
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: `Template '${templateName}' not found`
      });
    }

    res.status(200).json({
      success: true,
      message: 'HTML template updated successfully',
      data: {
        templateName,
        rowsAffected: result.rowsAffected[0]
      }
    });
    
  } catch (error) {
    console.error('Update HTML template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update HTML template',
      error: error.message
    });
  }
}
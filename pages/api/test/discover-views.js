import { executeQuery } from '../../../lib/db';

export default async function handler(req, res) {
  try {
    console.log('Finding all views in pow schema...');
    
    // Check what views exist
    const viewsQuery = `
      SELECT 
        TABLE_NAME,
        TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'pow' 
        AND TABLE_TYPE = 'VIEW'
      ORDER BY TABLE_NAME
    `;
    
    const viewsResult = await executeQuery(viewsQuery);
    console.log('Available views:', viewsResult.recordset);
    
    // Also check for any tables/views with 'Schedule' in the name
    const scheduleRelatedQuery = `
      SELECT 
        TABLE_NAME,
        TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'pow' 
        AND TABLE_NAME LIKE '%Schedule%'
      ORDER BY TABLE_NAME
    `;
    
    const scheduleRelatedResult = await executeQuery(scheduleRelatedQuery);
    console.log('Schedule-related objects:', scheduleRelatedResult.recordset);
    
    res.status(200).json({
      allViews: viewsResult.recordset,
      scheduleRelated: scheduleRelatedResult.recordset
    });
    
  } catch (error) {
    console.error('Views discovery error:', error);
    res.status(500).json({ error: error.message });
  }
}
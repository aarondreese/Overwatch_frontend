import { executeQuery } from '../../../lib/db';

export default async function handler(req, res) {
  try {
    console.log('Testing schedule relationships...');
    
    // Check DQCheck_Schedule structure
    const dqCheckQuery = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'DQCheck_Schedule' 
        AND TABLE_SCHEMA = 'pow'
      ORDER BY ORDINAL_POSITION
    `;
    
    const dqCheckResult = await executeQuery(dqCheckQuery);
    console.log('DQCheck_Schedule schema:', dqCheckResult.recordset);
    
    // Check DQEmail_Schedule structure  
    const dqEmailQuery = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'DQEmail_Schedule' 
        AND TABLE_SCHEMA = 'pow'
      ORDER BY ORDINAL_POSITION
    `;
    
    const dqEmailResult = await executeQuery(dqEmailQuery);
    console.log('DQEmail_Schedule schema:', dqEmailResult.recordset);
    
    // Get sample data for both - just get top 5 rows to see the structure
    const sampleQuery = `
      SELECT TOP 5 * FROM pow.DQCheck_Schedule
    `;
    
    const sampleResult = await executeQuery(sampleQuery);
    console.log('Schedule relationships sample:', sampleResult.recordset);
    
    res.status(200).json({
      dqCheckSchema: dqCheckResult.recordset,
      dqEmailSchema: dqEmailResult.recordset,
      relationships: sampleResult.recordset
    });
    
  } catch (error) {
    console.error('Schedule relationships error:', error);
    res.status(500).json({ error: error.message });
  }
}
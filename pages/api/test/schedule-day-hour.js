import { executeQuery } from '../../../lib/db';

export default async function handler(req, res) {
  try {
    console.log('Testing ScheduleDay and ScheduleHour tables...');
    
    // Check ScheduleDay structure
    const scheduleDayQuery = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'ScheduleDay' 
        AND TABLE_SCHEMA = 'pow'
      ORDER BY ORDINAL_POSITION
    `;
    
    const scheduleDayResult = await executeQuery(scheduleDayQuery);
    console.log('ScheduleDay schema:', scheduleDayResult.recordset);
    
    // Check ScheduleHour structure  
    const scheduleHourQuery = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'ScheduleHour' 
        AND TABLE_SCHEMA = 'pow'
      ORDER BY ORDINAL_POSITION
    `;
    
    const scheduleHourResult = await executeQuery(scheduleHourQuery);
    console.log('ScheduleHour schema:', scheduleHourResult.recordset);
    
    // Get sample data for schedule ID 1
    const sampleDaysQuery = `SELECT * FROM pow.ScheduleDay WHERE Schedule_ID = 1`;
    const sampleHoursQuery = `SELECT * FROM pow.ScheduleHour WHERE Schedule_ID = 1`;
    
    const [sampleDaysResult, sampleHoursResult] = await Promise.all([
      executeQuery(sampleDaysQuery),
      executeQuery(sampleHoursQuery)
    ]);
    
    res.status(200).json({
      scheduleDaySchema: scheduleDayResult.recordset,
      scheduleHourSchema: scheduleHourResult.recordset,
      sampleDays: sampleDaysResult.recordset,
      sampleHours: sampleHoursResult.recordset
    });
    
  } catch (error) {
    console.error('Schedule day/hour schema error:', error);
    res.status(500).json({ error: error.message });
  }
}
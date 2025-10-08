import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Testing pow.ScheduleSummary view...');
    
    // Test if the ScheduleSummary view exists and has data
    const testResult = await executeQuery('SELECT TOP 5 * FROM pow.ScheduleSummary');
    
    if (testResult.recordset && testResult.recordset.length > 0) {
      console.log('ScheduleSummary columns:', Object.keys(testResult.recordset[0]));
      
      res.status(200).json({
        success: true,
        message: 'ScheduleSummary view accessible',
        columns: Object.keys(testResult.recordset[0]),
        sampleData: testResult.recordset,
        count: testResult.recordset.length
      });
    } else {
      res.status(200).json({
        success: true,
        message: 'ScheduleSummary view exists but has no data',
        count: 0
      });
    }
    
  } catch (error) {
    console.error('ScheduleSummary test error:', error);
    
    // Try testing the individual tables
    try {
      const scheduleTest = await executeQuery('SELECT TOP 3 * FROM pow.Schedule');
      const checkScheduleTest = await executeQuery('SELECT TOP 3 * FROM pow.DQ_CheckSchedule');
      
      res.status(200).json({
        success: false,
        message: 'ScheduleSummary view not accessible, but individual tables found',
        error: error.message,
        alternativeData: {
          schedules: scheduleTest.recordset || [],
          checkSchedules: checkScheduleTest.recordset || []
        }
      });
    } catch (tableError) {
      res.status(500).json({
        success: false,
        message: 'Neither ScheduleSummary view nor individual tables accessible',
        error: error.message,
        tableError: tableError.message
      });
    }
  }
}
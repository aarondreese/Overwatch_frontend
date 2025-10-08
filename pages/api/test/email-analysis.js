import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Testing ScheduleSummary for email data...');
    
    // Look for different Type values and any email-related data
    const typeQuery = await executeQuery(`
      SELECT DISTINCT Type, COUNT(*) as count
      FROM pow.ScheduleSummary 
      GROUP BY Type
      ORDER BY Type
    `);
    
    // Look for records with Subject field populated (likely emails)
    const subjectQuery = await executeQuery(`
      SELECT TOP 10 ID, Title, Type, Type_ID, Subject, Action, Details
      FROM pow.ScheduleSummary 
      WHERE Subject IS NOT NULL
      ORDER BY ID
    `);
    
    // Look for any records that might be emails based on different criteria
    const emailQuery = await executeQuery(`
      SELECT TOP 10 ID, Title, Type, Type_ID, Subject, Action, Details
      FROM pow.ScheduleSummary 
      WHERE Type LIKE '%Email%' OR Type LIKE '%email%' OR Subject IS NOT NULL
      ORDER BY ID
    `);
    
    res.status(200).json({
      success: true,
      message: 'Email data analysis complete',
      data: {
        types: typeQuery.recordset,
        recordsWithSubject: subjectQuery.recordset,
        potentialEmails: emailQuery.recordset
      }
    });
    
  } catch (error) {
    console.error('Email analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze email data',
      error: error.message
    });
  }
}
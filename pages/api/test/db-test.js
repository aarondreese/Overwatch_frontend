import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Testing database connection...');
    console.log('Environment variables:');
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_DATABASE:', process.env.DB_DATABASE);
    console.log('DB_SERVER:', process.env.DB_SERVER);
    
    // Test basic connection
    const testResult = await executeQuery('SELECT 1 as test, GETDATE() as currentTime');
    
    if (testResult.recordset && testResult.recordset.length > 0) {
      res.status(200).json({
        success: true,
        message: 'Database connection successful',
        data: testResult.recordset[0],
        environment: {
          DB_USER: process.env.DB_USER,
          DB_DATABASE: process.env.DB_DATABASE,
          DB_SERVER: process.env.DB_SERVER
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Database connection failed - no results returned'
      });
    }
    
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      environment: {
        DB_USER: process.env.DB_USER,
        DB_DATABASE: process.env.DB_DATABASE,
        DB_SERVER: process.env.DB_SERVER
      }
    });
  }
}
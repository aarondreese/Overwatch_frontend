import { executeQuery } from '../../../lib/db';

export default async function handler(req, res) {
  try {
    console.log('Testing database connection for distribution groups...');
    
    // Check if DistributionGroup table exists
    console.log('Checking for pow.DistributionGroup table...');
    const dgTableCheck = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'pow' AND TABLE_NAME = 'DistributionGroup'
    `);
    
    console.log('DistributionGroup table check:', dgTableCheck);
    
    // Check if DistributionGroupMember table exists
    console.log('Checking for pow.DistributionGroupMember table...');
    const dgmTableCheck = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'pow' AND TABLE_NAME = 'DistributionGroupMember'
    `);
    
    console.log('DistributionGroupMember table check:', dgmTableCheck);
    
    // Get column information for DistributionGroup
    if (dgTableCheck.length > 0) {
      console.log('Checking columns in pow.DistributionGroup...');
      const dgColumns = await executeQuery(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'pow' AND TABLE_NAME = 'DistributionGroup'
        ORDER BY ORDINAL_POSITION
      `);
      console.log('DistributionGroup columns found:', dgColumns);
    }
    
    // Get column information for DistributionGroupMember
    if (dgmTableCheck.length > 0) {
      console.log('Checking columns in pow.DistributionGroupMember...');
      const dgmColumns = await executeQuery(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'pow' AND TABLE_NAME = 'DistributionGroupMember'
        ORDER BY ORDINAL_POSITION
      `);
      console.log('DistributionGroupMember columns found:', dgmColumns);
    }
    
    // Try to get sample data if tables exist
    if (dgTableCheck.length > 0) {
      console.log('Getting sample distribution group data...');
      const sampleGroups = await executeQuery(`
        SELECT TOP 5 * FROM pow.DistributionGroup
      `);
      console.log('Sample distribution group records:', sampleGroups);
    }
    
    res.status(200).json({
      success: true,
      message: 'Distribution group schema check completed',
      data: {
        distributionGroupTableExists: dgTableCheck.recordset.length > 0,
        distributionGroupMemberTableExists: dgmTableCheck.recordset.length > 0,
        tableCheck: { dgTableCheck, dgmTableCheck }
      }
    });
  } catch (error) {
    console.error('Distribution group schema check error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection or query failed',
      error: error.message
    });
  }
}
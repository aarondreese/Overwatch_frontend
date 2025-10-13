import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const {
      functionName,
      domainId,
      isActive = 1,
      explain,
      warningLevel,
      lifetime,
      isInTest = 0,
      schedules = [] // Array of schedule IDs to associate with this DQ check
    } = req.body;

    // Validate required fields
    if (!functionName || !domainId || !explain?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'FunctionName, Domain_ID, and Description (Explain) are required'
      });
    }

    // Validate warning level range
    if (warningLevel !== null && warningLevel !== undefined && (warningLevel < 1 || warningLevel > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Warning Level must be between 1 and 100'
      });
    }

    // Validate lifetime range
    if (lifetime !== null && lifetime !== undefined && (lifetime < 1 || lifetime > 9999)) {
      return res.status(400).json({
        success: false,
        message: 'Lifetime must be between 1 and 9999 days'
      });
    }

    console.log('Creating new DQ check:', { functionName, domainId, isActive, explain, warningLevel, lifetime, isInTest });

    // Check if function name already exists
    const existingCheckQuery = `
      SELECT ID FROM pow.DQCheck WHERE FunctionName = @functionName
    `;
    const existingResult = await executeQuery(existingCheckQuery, { functionName });
    
    if (existingResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: `A DQ check with function name '${functionName}' already exists`
      });
    }

    // Insert the new DQCheck record
    const insertQuery = `
      INSERT INTO pow.DQCheck (
        FunctionName,
        Domain_ID,
        isActive,
        Explain,
        WarningLevel,
        Lifetime,
        isInTest
      )
      OUTPUT INSERTED.ID
      VALUES (
        @functionName,
        @domainId,
        @isActive,
        @explain,
        @warningLevel,
        @lifetime,
        @isInTest
      )
    `;

    const insertParams = {
      functionName,
      domainId: parseInt(domainId),
      isActive: parseInt(isActive),
      explain: explain.trim(), // Remove any leading/trailing whitespace
      warningLevel: warningLevel ? parseInt(warningLevel) : null,
      lifetime: lifetime ? parseInt(lifetime) : null,
      isInTest: parseInt(isInTest)
    };

    const insertResult = await executeQuery(insertQuery, insertParams);
    const newDQCheckId = insertResult.recordset[0].ID;

    console.log('Created DQCheck with ID:', newDQCheckId);

    // If schedules are provided, create DQCheck_Schedule relationships
    const scheduleResults = [];
    if (schedules && schedules.length > 0) {
      for (const scheduleId of schedules) {
        try {
          const scheduleInsertQuery = `
            INSERT INTO pow.DQCheck_Schedule (
              DQCheck_ID,
              Schedule_ID,
              IsEnabled
            )
            VALUES (
              @dqCheckId,
              @scheduleId,
              1
            )
          `;

          await executeQuery(scheduleInsertQuery, {
            dqCheckId: newDQCheckId,
            scheduleId: parseInt(scheduleId)
          });

          scheduleResults.push({
            scheduleId: parseInt(scheduleId),
            success: true
          });

          console.log(`Associated DQCheck ${newDQCheckId} with Schedule ${scheduleId}`);
        } catch (scheduleError) {
          console.error(`Failed to associate with schedule ${scheduleId}:`, scheduleError);
          scheduleResults.push({
            scheduleId: parseInt(scheduleId),
            success: false,
            error: scheduleError.message
          });
        }
      }
    }

    // Fetch the created record with domain information
    const selectQuery = `
      SELECT 
        dq.ID,
        dq.FunctionName,
        dq.Domain_ID,
        d.DomainName,
        dq.isActive,
        dq.Explain,
        dq.WarningLevel,
        dq.Lifetime,
        dq.isInTest
      FROM pow.DQCheck dq
      LEFT JOIN pow.Domain d ON dq.Domain_ID = d.ID
      WHERE dq.ID = @dqCheckId
    `;

    const selectResult = await executeQuery(selectQuery, { dqCheckId: newDQCheckId });
    const createdRecord = selectResult.recordset[0];

    res.status(201).json({
      success: true,
      message: 'DQ check created successfully',
      data: {
        dqCheck: {
          id: createdRecord.ID,
          functionName: createdRecord.FunctionName,
          domainId: createdRecord.Domain_ID,
          domainName: createdRecord.DomainName,
          isActive: Boolean(createdRecord.isActive),
          explain: createdRecord.Explain,
          warningLevel: createdRecord.WarningLevel,
          lifetime: createdRecord.Lifetime,
          isInTest: Boolean(createdRecord.isInTest)
        },
        scheduleAssociations: scheduleResults
      }
    });

  } catch (error) {
    console.error('Create DQ check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create DQ check',
      error: error.message
    });
  }
}
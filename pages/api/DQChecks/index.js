import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  const { method } = req;

  try {
    if (method === 'GET') {
      return await handleGet(req, res);
    } else if (method === 'PUT') {
      return await handlePut(req, res);
    } else {
      return res.status(405).json({ 
        success: false, 
        message: 'Method not allowed' 
      });
    }
  } catch (error) {
    console.error('DQChecks API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

async function handleGet(req, res) {
  const { id } = req.query;

  let query, params;
  
  if (id) {
    // Get single DQ check with domain information
    query = `
      SELECT 
        dq.ID as id,
        dq.FunctionName as functionName,
        dq.Domain_ID as domainId,
        d.DomainName as domainName,
        ss.SystemName as systemName,
        dq.isActive,
        dq.Explain as description,
        dq.WarningLevel as warningLevel,
        dq.Lifetime as lifetime,
        dq.isInTest,
        (SELECT COUNT(*) 
         FROM pow.DQCheck_Schedule cs 
         INNER JOIN pow.Schedule s ON cs.Schedule_ID = s.ID 
         WHERE cs.DQCheck_ID = dq.ID AND cs.IsEnabled = 1 AND s.IsEnabled = 1) as activeScheduleCount,
        (SELECT COUNT(*) 
         FROM pow.DQCheck_Schedule cs 
         INNER JOIN pow.Schedule s ON cs.Schedule_ID = s.ID 
         WHERE cs.DQCheck_ID = dq.ID AND (cs.IsEnabled = 0 OR s.IsEnabled = 0)) as inactiveScheduleCount,
        (SELECT COUNT(*) 
         FROM pow.DQResults dr 
         WHERE dr.DQCheck_ID = dq.ID 
           AND dr.LastSeenRun_ID = (
             SELECT MAX(rh.ID) 
             FROM pow.RunHistory rh 
             WHERE rh.DQCheck_ID = dq.ID
           )
        ) as resultCount
      FROM pow.DQCheck dq
      LEFT JOIN pow.Domain d ON dq.Domain_ID = d.ID
      LEFT JOIN pow.SourceSystem ss ON d.SourceSystem_ID = ss.ID
      WHERE dq.ID = @id
    `;
    params = { id: parseInt(id) };
  } else {
    // Get all DQ checks with summary information
    query = `
      SELECT 
        dq.ID as id,
        dq.FunctionName as functionName,
        dq.Domain_ID as domainId,
        d.DomainName as domainName,
        ss.SystemName as systemName,
        dq.isActive,
        dq.Explain as description,
        dq.WarningLevel as warningLevel,
        dq.Lifetime as lifetime,
        dq.isInTest,
        (SELECT COUNT(*) 
         FROM pow.DQCheck_Schedule cs 
         INNER JOIN pow.Schedule s ON cs.Schedule_ID = s.ID 
         WHERE cs.DQCheck_ID = dq.ID AND cs.IsEnabled = 1 AND s.IsEnabled = 1) as activeScheduleCount,
        (SELECT COUNT(*) 
         FROM pow.DQCheck_Schedule cs 
         INNER JOIN pow.Schedule s ON cs.Schedule_ID = s.ID 
         WHERE cs.DQCheck_ID = dq.ID AND (cs.IsEnabled = 0 OR s.IsEnabled = 0)) as inactiveScheduleCount,
        (SELECT COUNT(*) 
         FROM pow.DQResults dr 
         WHERE dr.DQCheck_ID = dq.ID 
           AND dr.LastSeenRun_ID = (
             SELECT MAX(rh.ID) 
             FROM pow.RunHistory rh 
             WHERE rh.DQCheck_ID = dq.ID
           )
        ) as resultCount
      FROM pow.DQCheck dq
      LEFT JOIN pow.Domain d ON dq.Domain_ID = d.ID
      LEFT JOIN pow.SourceSystem ss ON d.SourceSystem_ID = ss.ID
      ORDER BY dq.FunctionName
    `;
    params = {};
  }

  const result = await executeQuery(query, params);
  
  if (id && result.recordset.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'DQ Check not found'
    });
  }

  const dqChecks = result.recordset.map(check => ({
    id: check.id,
    functionName: check.functionName,
    domainId: check.domainId,
    domainName: check.domainName,
    systemName: check.systemName,
    isActive: Boolean(check.isActive),
    explain: check.description,
    warningLevel: check.warningLevel,
    lifetime: check.lifetime,
    isInTest: Boolean(check.isInTest),
    activeScheduleCount: check.activeScheduleCount,
    inactiveScheduleCount: check.inactiveScheduleCount,
    scheduleCount: check.activeScheduleCount, // Keep for backward compatibility
    resultCount: check.resultCount
  }));

  return res.status(200).json({
    success: true,
    message: 'DQ Checks retrieved successfully',
    data: id ? dqChecks[0] : dqChecks,
    count: dqChecks.length
  });
}

async function handlePut(req, res) {
  const { id } = req.query;
  const { isActive, lifetime, warningLevel, explain, isInTest } = req.body;

  if (!id) {
    return res.status(400).json({ 
      success: false, 
      message: 'DQ Check ID is required' 
    });
  }

  // Build dynamic update query based on provided fields
  const updateFields = [];
  const params = { id: parseInt(id) };

  if (typeof isActive === 'boolean') {
    updateFields.push('isActive = @isActive');
    params.isActive = isActive ? 1 : 0;
  }

  if (typeof isInTest === 'boolean') {
    updateFields.push('isInTest = @isInTest');
    params.isInTest = isInTest ? 1 : 0;
  }

  if (lifetime !== undefined) {
    const lifetimeNum = parseInt(lifetime);
    if (isNaN(lifetimeNum) || lifetimeNum < 0 || lifetimeNum > 9999) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lifetime must be a number between 0 and 9999' 
      });
    }
    updateFields.push('Lifetime = @lifetime');
    params.lifetime = lifetimeNum;
  }

  if (warningLevel !== undefined) {
    const warningLevelNum = parseInt(warningLevel);
    if (isNaN(warningLevelNum) || warningLevelNum < 1 || warningLevelNum > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Warning Level must be a number between 1 and 100' 
      });
    }
    updateFields.push('WarningLevel = @warningLevel');
    params.warningLevel = warningLevelNum;
  }

  if (explain !== undefined) {
    updateFields.push('Explain = @explain');
    params.explain = explain;
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'No valid fields provided for update' 
    });
  }

  try {
    const updateQuery = `
      UPDATE pow.DQCheck 
      SET ${updateFields.join(', ')}
      WHERE ID = @id
    `;

    const result = await executeQuery(updateQuery, params);

    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(200).json({
        success: true,
        message: 'DQ Check updated successfully',
        data: {
          id: parseInt(id),
          updatedFields: Object.keys(req.body)
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'DQ Check not found or no changes made'
      });
    }

  } catch (error) {
    console.error('Update DQ Check status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update DQ Check status',
      error: error.message
    });
  }
}
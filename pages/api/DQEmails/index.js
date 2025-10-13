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
    console.error('DQEmails API error:', error);
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
    // Get single DQ email with schedule information
    query = `
      SELECT 
        dqe.ID as id,
        dqe.EmailName as emailName,
        dqe.isActive,
        dqe.Explain as description,
        dqe.DQCheck_ID as dqCheckId,
        dqc.FunctionName as dqCheckFunction,
        dqe.MapView as mapView,
        dqe.MapRules as mapRules,
        dqe.htmlTemplateName,
        dqe.hierarchy,
        dqe.inDev,
        dqe.EmailSubject as emailSubject,
        dqe.DevEmailAddress as devEmailAddress,
        dqe.RunStoredProcedure as runStoredProcedure,
        dqe.FrequencyInMinutes as frequencyInMinutes,
        dqe.LastRunDateTime as lastRunDateTime,
        (SELECT COUNT(*) 
         FROM pow.DQEmail_Schedule es 
         INNER JOIN pow.Schedule s ON es.Schedule_ID = s.ID 
         WHERE es.DQEmail_ID = dqe.ID AND es.IsEnabled = 1 AND s.IsEnabled = 1) as activeScheduleCount,
        (SELECT COUNT(*) 
         FROM pow.DQEmail_Schedule es 
         INNER JOIN pow.Schedule s ON es.Schedule_ID = s.ID 
         WHERE es.DQEmail_ID = dqe.ID AND (es.IsEnabled = 0 OR s.IsEnabled = 0)) as inactiveScheduleCount
      FROM pow.DQEmail dqe
      LEFT JOIN pow.DQCheck dqc ON dqe.DQCheck_ID = dqc.ID
      WHERE dqe.ID = @id
    `;
    params = { id: parseInt(id) };
  } else {
    // Get all DQ emails with summary information
    query = `
      SELECT 
        dqe.ID as id,
        dqe.EmailName as emailName,
        dqe.isActive,
        dqe.Explain as description,
        dqe.DQCheck_ID as dqCheckId,
        dqc.FunctionName as dqCheckFunction,
        dqe.EmailSubject as emailSubject,
        dqe.htmlTemplateName,
        dqe.inDev,
        dqe.FrequencyInMinutes as frequencyInMinutes,
        dqe.LastRunDateTime as lastRunDateTime,
        (SELECT COUNT(*) 
         FROM pow.DQEmail_Schedule es 
         INNER JOIN pow.Schedule s ON es.Schedule_ID = s.ID 
         WHERE es.DQEmail_ID = dqe.ID AND es.IsEnabled = 1 AND s.IsEnabled = 1) as activeScheduleCount,
        (SELECT COUNT(*) 
         FROM pow.DQEmail_Schedule es 
         INNER JOIN pow.Schedule s ON es.Schedule_ID = s.ID 
         WHERE es.DQEmail_ID = dqe.ID AND (es.IsEnabled = 0 OR s.IsEnabled = 0)) as inactiveScheduleCount
      FROM pow.DQEmail dqe
      LEFT JOIN pow.DQCheck dqc ON dqe.DQCheck_ID = dqc.ID
      ORDER BY dqe.EmailName
    `;
    params = {};
  }

  const result = await executeQuery(query, params);
  
  if (id && result.recordset.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'DQ Email not found'
    });
  }

  const dqEmails = result.recordset.map(email => ({
    id: email.id,
    emailName: email.emailName,
    isActive: Boolean(email.isActive),
    description: email.description,
    dqCheckId: email.dqCheckId,
    dqCheckFunction: email.dqCheckFunction,
    mapView: email.mapView,
    mapRules: email.mapRules,
    htmlTemplateName: email.htmlTemplateName,
    hierarchy: email.hierarchy,
    inDev: Boolean(email.inDev),
    emailSubject: email.emailSubject,
    devEmailAddress: email.devEmailAddress,
    runStoredProcedure: email.runStoredProcedure,
    frequencyInMinutes: email.frequencyInMinutes,
    lastRunDateTime: email.lastRunDateTime,
    activeScheduleCount: email.activeScheduleCount,
    inactiveScheduleCount: email.inactiveScheduleCount,
    totalScheduleCount: (email.activeScheduleCount || 0) + (email.inactiveScheduleCount || 0)
  }));

  return res.status(200).json({
    success: true,
    message: 'DQ Emails retrieved successfully',
    data: id ? dqEmails[0] : dqEmails,
    count: dqEmails.length
  });
}

async function handlePut(req, res) {
  const { id } = req.query;
  const { isActive, emailName, description, emailSubject, inDev } = req.body;

  if (!id) {
    return res.status(400).json({ 
      success: false, 
      message: 'DQ Email ID is required' 
    });
  }

  // Build dynamic update query based on provided fields
  const updateFields = [];
  const params = { id: parseInt(id) };

  if (typeof isActive === 'boolean') {
    updateFields.push('isActive = @isActive');
    params.isActive = isActive ? 1 : 0;
  }

  if (typeof inDev === 'boolean') {
    updateFields.push('inDev = @inDev');
    params.inDev = inDev ? 1 : 0;
  }

  if (emailName !== undefined) {
    if (!emailName?.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email Name cannot be empty' 
      });
    }
    updateFields.push('EmailName = @emailName');
    params.emailName = emailName.trim();
  }

  if (description !== undefined) {
    if (!description?.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Description cannot be empty' 
      });
    }
    updateFields.push('Explain = @description');
    params.description = description.trim();
  }

  if (emailSubject !== undefined) {
    updateFields.push('EmailSubject = @emailSubject');
    params.emailSubject = emailSubject?.trim() || null;
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'No valid fields provided for update' 
    });
  }

  try {
    const updateQuery = `
      UPDATE pow.DQEmail 
      SET ${updateFields.join(', ')}
      WHERE ID = @id
    `;

    const result = await executeQuery(updateQuery, params);

    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(200).json({
        success: true,
        message: 'DQ Email updated successfully',
        data: {
          id: parseInt(id),
          updatedFields: Object.keys(req.body)
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'DQ Email not found or no changes made'
      });
    }

  } catch (error) {
    console.error('Update DQ Email error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update DQ Email',
      error: error.message
    });
  }
}
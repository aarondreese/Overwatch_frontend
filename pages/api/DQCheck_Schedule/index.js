import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  const { method } = req;

  try {
    if (method === 'PUT') {
      return await handlePut(req, res);
    } else if (method === 'POST') {
      return await handlePost(req, res);
    } else if (method === 'DELETE') {
      return await handleDelete(req, res);
    } else {
      return res.status(405).json({ 
        success: false, 
        message: 'Method not allowed' 
      });
    }
  } catch (error) {
    console.error('DQCheck_Schedule API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

async function handlePost(req, res) {
  const { dqCheckId, scheduleId } = req.body;

  if (!dqCheckId || !scheduleId) {
    return res.status(400).json({
      success: false,
      message: 'DQ Check ID and Schedule ID are required'
    });
  }

  try {
    // First check if the relationship already exists
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM pow.DQCheck_Schedule
      WHERE DQCheck_ID = @dqCheckId AND Schedule_ID = @scheduleId
    `;
    
    const checkResult = await executeQuery(checkQuery, {
      dqCheckId: parseInt(dqCheckId),
      scheduleId: parseInt(scheduleId)
    });

    if (checkResult.recordset[0].count > 0) {
      return res.status(409).json({
        success: false,
        message: 'Schedule relationship already exists for this DQ check'
      });
    }

    // Create the new relationship
    const insertQuery = `
      INSERT INTO pow.DQCheck_Schedule (DQCheck_ID, Schedule_ID, IsEnabled)
      VALUES (@dqCheckId, @scheduleId, 1)
    `;

    const result = await executeQuery(insertQuery, {
      dqCheckId: parseInt(dqCheckId),
      scheduleId: parseInt(scheduleId)
    });

    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(201).json({
        success: true,
        message: 'Schedule relationship created successfully',
        data: {
          dqCheckId: parseInt(dqCheckId),
          scheduleId: parseInt(scheduleId),
          isEnabled: true
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to create schedule relationship'
      });
    }

  } catch (error) {
    console.error('Create schedule relationship error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create schedule relationship',
      error: error.message
    });
  }
}

async function handleDelete(req, res) {
  const { dqCheckId, scheduleId } = req.body;

  if (!dqCheckId || !scheduleId) {
    return res.status(400).json({
      success: false,
      message: 'DQ Check ID and Schedule ID are required'
    });
  }

  try {
    const deleteQuery = `
      DELETE FROM pow.DQCheck_Schedule
      WHERE DQCheck_ID = @dqCheckId AND Schedule_ID = @scheduleId
    `;

    const result = await executeQuery(deleteQuery, {
      dqCheckId: parseInt(dqCheckId),
      scheduleId: parseInt(scheduleId)
    });

    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(200).json({
        success: true,
        message: 'Schedule relationship deleted successfully',
        data: {
          dqCheckId: parseInt(dqCheckId),
          scheduleId: parseInt(scheduleId)
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Schedule relationship not found'
      });
    }

  } catch (error) {
    console.error('Delete schedule relationship error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete schedule relationship',
      error: error.message
    });
  }
}

async function handlePut(req, res) {
  const { dqCheckId, scheduleId, isEnabled } = req.body;

  if (!dqCheckId || !scheduleId) {
    return res.status(400).json({ 
      success: false, 
      message: 'DQCheck ID and Schedule ID are required' 
    });
  }

  if (typeof isEnabled !== 'boolean') {
    return res.status(400).json({ 
      success: false, 
      message: 'isEnabled must be a boolean value' 
    });
  }

  try {
    // Check if the relationship exists
    const checkQuery = `
      SELECT ID FROM pow.DQCheck_Schedule 
      WHERE DQCheck_ID = @dqCheckId AND Schedule_ID = @scheduleId
    `;
    
    const checkResult = await executeQuery(checkQuery, {
      dqCheckId: parseInt(dqCheckId),
      scheduleId: parseInt(scheduleId)
    });

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'DQCheck-Schedule relationship not found'
      });
    }

    // Update the relationship
    const updateQuery = `
      UPDATE pow.DQCheck_Schedule 
      SET IsEnabled = @isEnabled
      WHERE DQCheck_ID = @dqCheckId AND Schedule_ID = @scheduleId
    `;

    const result = await executeQuery(updateQuery, {
      dqCheckId: parseInt(dqCheckId),
      scheduleId: parseInt(scheduleId),
      isEnabled: isEnabled ? 1 : 0
    });

    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(200).json({
        success: true,
        message: 'DQCheck-Schedule relationship updated successfully',
        data: {
          dqCheckId: parseInt(dqCheckId),
          scheduleId: parseInt(scheduleId),
          isEnabled: isEnabled
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'DQCheck-Schedule relationship not found or no changes made'
      });
    }

  } catch (error) {
    console.error('Update DQCheck-Schedule relationship error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update DQCheck-Schedule relationship',
      error: error.message
    });
  }
}
import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  const { method } = req;

  try {
    if (method === 'GET') {
      return await handleGet(req, res);
    } else {
      return res.status(405).json({ 
        success: false, 
        message: 'Method not allowed' 
      });
    }
  } catch (error) {
    console.error('DQCheck Schedules API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

async function handleGet(req, res) {
  const { id } = req.query; // This comes from the [id] in the filename
  const dqCheckId = id;

  if (!dqCheckId) {
    return res.status(400).json({ 
      success: false, 
      message: 'DQCheck ID is required' 
    });
  }

  try {
    const query = `
      SELECT 
        cs.ID as relationshipId,
        cs.DQCheck_ID as dqCheckId,
        cs.Schedule_ID as scheduleId,
        cs.IsEnabled as isEnabled,
        s.Title as scheduleTitle,
        s.IsEnabled as scheduleIsEnabled,
        s.ActiveFrom as scheduleActiveFrom,
        s.ActiveTo as scheduleActiveTo,
        sms.Days as scheduleDays,
        sms.Times as scheduleTimes
      FROM pow.DQCheck_Schedule cs
      INNER JOIN pow.Schedule s ON cs.Schedule_ID = s.ID
      LEFT JOIN pow.ShowMyShedule sms ON s.ID = sms.ID
      WHERE cs.DQCheck_ID = @dqCheckId
      ORDER BY s.Title
    `;

    const result = await executeQuery(query, { dqCheckId: parseInt(dqCheckId) });

    const scheduleRelationships = result.recordset.map(row => ({
      relationshipId: row.relationshipId,
      dqCheckId: row.dqCheckId,
      scheduleId: row.scheduleId,
      isEnabled: Boolean(row.isEnabled),
      schedule: {
        id: row.scheduleId,
        title: row.scheduleTitle,
        isEnabled: Boolean(row.scheduleIsEnabled),
        activeFrom: row.scheduleActiveFrom,
        activeTo: row.scheduleActiveTo,
        days: row.scheduleDays,
        times: row.scheduleTimes
      }
    }));

    return res.status(200).json({
      success: true,
      message: 'DQCheck schedule relationships retrieved successfully',
      data: scheduleRelationships,
      count: scheduleRelationships.length
    });

  } catch (error) {
    console.error('Get DQCheck schedules error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve DQCheck schedule relationships',
      error: error.message
    });
  }
}
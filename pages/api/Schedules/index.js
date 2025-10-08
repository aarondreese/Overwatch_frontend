import { executeQuery } from '@/lib/db';

// Helper function for API responses
function apiResponse(res, status, success, message, data = null, error = null) {
  return res.status(status).json({
    success,
    message,
    data,
    ...(error && { error })
  });
}

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        await handleGet(req, res);
        break;
      case 'POST':
        await handlePost(req, res);
        break;
      case 'PUT':
        await handlePut(req, res);
        break;
      case 'DELETE':
        await handleDelete(req, res);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return apiResponse(res, 405, false, `Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Schedules API error:', error);
    return apiResponse(res, 500, false, 'Internal server error', null, error.message);
  }
}

async function handleGet(req, res) {
  const { id } = req.query;

  let query, params;
  
  if (id) {
    // Get single schedule with summary data and relationship counts
    query = `
      SELECT 
        s.ID as id,
        s.Title as title,
        s.ActiveFrom as activeFrom,
        s.ActiveTo as activeTo,
        s.IsEnabled as isEnabled,
        sms.Days as days,
        sms.Times as times,
        sms.IncludeBankHols as includeBankHols,
        ISNULL(dqc.checkCount, 0) as dqcheckSchedulesCount,
        ISNULL(dqe.emailCount, 0) as dqemailSchedulesCount
      FROM pow.Schedule s
      LEFT JOIN pow.ShowMyShedule sms ON s.ID = sms.ID
      LEFT JOIN (
        SELECT Schedule_ID, COUNT(*) as checkCount 
        FROM pow.DQCheck_Schedule 
        WHERE Schedule_ID = @id
        GROUP BY Schedule_ID
      ) dqc ON s.ID = dqc.Schedule_ID
      LEFT JOIN (
        SELECT Schedule_ID, COUNT(*) as emailCount 
        FROM pow.DQEmail_Schedule 
        WHERE Schedule_ID = @id
        GROUP BY Schedule_ID
      ) dqe ON s.ID = dqe.Schedule_ID
      WHERE s.ID = @id
    `;
    params = { id: parseInt(id) };
  } else {
    // Get all schedules with summary data and relationship counts
    query = `
      SELECT 
        s.ID as id,
        s.Title as title,
        s.ActiveFrom as activeFrom,
        s.ActiveTo as activeTo,
        s.IsEnabled as isEnabled,
        sms.Days as days,
        sms.Times as times,
        sms.IncludeBankHols as includeBankHols,
        ISNULL(dqc.checkCount, 0) as dqcheckSchedulesCount,
        ISNULL(dqe.emailCount, 0) as dqemailSchedulesCount
      FROM pow.Schedule s
      LEFT JOIN pow.ShowMyShedule sms ON s.ID = sms.ID
      LEFT JOIN (
        SELECT Schedule_ID, COUNT(*) as checkCount 
        FROM pow.DQCheck_Schedule 
        GROUP BY Schedule_ID
      ) dqc ON s.ID = dqc.Schedule_ID
      LEFT JOIN (
        SELECT Schedule_ID, COUNT(*) as emailCount 
        FROM pow.DQEmail_Schedule 
        GROUP BY Schedule_ID
      ) dqe ON s.ID = dqe.Schedule_ID
      ORDER BY s.Title
    `;
    params = {};
  }

  const result = await executeQuery(query, params);
  
  if (id && result.recordset.length === 0) {
    return apiResponse(res, 404, false, 'Schedule not found');
  }

  const schedules = result.recordset.map(schedule => ({
    id: schedule.id,
    title: schedule.title,
    activeFrom: schedule.activeFrom,
    activeTo: schedule.activeTo,
    isEnabled: Boolean(schedule.isEnabled),
    showMySchedule: {
      days: schedule.days,
      times: schedule.times,
      includeBankHols: Boolean(schedule.includeBankHols)
    },
    dqcheckSchedules: { length: schedule.dqcheckSchedulesCount },
    dqemailSchedules: schedule.dqemailSchedulesCount
  }));

  return apiResponse(res, 200, true, 'Schedules retrieved successfully', id ? schedules[0] : schedules);
}

async function handlePost(req, res) {
  const { title, activeFrom, activeTo, isEnabled = true } = req.body;

  if (!title) {
    return apiResponse(res, 400, false, 'Title is required');
  }

  // Check if title already exists
  const existingSchedule = await executeQuery(
    'SELECT ID FROM pow.Schedule WHERE Title = @title',
    { title }
  );

  if (existingSchedule.recordset.length > 0) {
    return apiResponse(res, 400, false, 'Schedule title already exists');
  }

  const query = `
    INSERT INTO pow.Schedule (Title, ActiveFrom, ActiveTo, IsEnabled)
    OUTPUT INSERTED.ID, INSERTED.Title, INSERTED.ActiveFrom, INSERTED.ActiveTo, INSERTED.IsEnabled
    VALUES (@title, @activeFrom, @activeTo, @isEnabled)
  `;

  const result = await executeQuery(query, {
    title,
    activeFrom: activeFrom || new Date(),
    activeTo: activeTo || null,
    isEnabled: isEnabled ? 1 : 0
  });
  
  const newSchedule = {
    id: result.recordset[0].ID,
    title: result.recordset[0].Title,
    activeFrom: result.recordset[0].ActiveFrom,
    activeTo: result.recordset[0].ActiveTo,
    isEnabled: Boolean(result.recordset[0].IsEnabled)
  };

  return apiResponse(res, 201, true, 'Schedule created successfully', newSchedule);
}

async function handlePut(req, res) {
  const { id, title, activeFrom, activeTo, isEnabled } = req.body;

  if (!id) {
    return apiResponse(res, 400, false, 'Schedule ID is required');
  }

  if (!title) {
    return apiResponse(res, 400, false, 'Title is required');
  }

  // Check if schedule exists
  const existingSchedule = await executeQuery(
    'SELECT ID FROM pow.Schedule WHERE ID = @id',
    { id: parseInt(id) }
  );

  if (existingSchedule.recordset.length === 0) {
    return apiResponse(res, 404, false, 'Schedule not found');
  }

  // Check if title already exists for another schedule
  const duplicateSchedule = await executeQuery(
    'SELECT ID FROM pow.Schedule WHERE Title = @title AND ID != @id',
    { title, id: parseInt(id) }
  );

  if (duplicateSchedule.recordset.length > 0) {
    return apiResponse(res, 400, false, 'Schedule title already exists');
  }

  const query = `
    UPDATE pow.Schedule 
    SET Title = @title, ActiveFrom = @activeFrom, ActiveTo = @activeTo, IsEnabled = @isEnabled
    OUTPUT INSERTED.ID, INSERTED.Title, INSERTED.ActiveFrom, INSERTED.ActiveTo, INSERTED.IsEnabled
    WHERE ID = @id
  `;

  const result = await executeQuery(query, {
    title,
    activeFrom: activeFrom || new Date(),
    activeTo: activeTo || null,
    isEnabled: isEnabled ? 1 : 0,
    id: parseInt(id)
  });
  
  if (result.recordset.length === 0) {
    return apiResponse(res, 404, false, 'Schedule not found');
  }

  const updatedSchedule = {
    id: result.recordset[0].ID,
    title: result.recordset[0].Title,
    activeFrom: result.recordset[0].ActiveFrom,
    activeTo: result.recordset[0].ActiveTo,
    isEnabled: Boolean(result.recordset[0].IsEnabled)
  };

  return apiResponse(res, 200, true, 'Schedule updated successfully', updatedSchedule);
}

async function handleDelete(req, res) {
  const { id } = req.query;

  if (!id) {
    return apiResponse(res, 400, false, 'Schedule ID is required');
  }

  // Check if schedule exists
  const existingSchedule = await executeQuery(
    'SELECT ID FROM pow.Schedule WHERE ID = @id',
    { id: parseInt(id) }
  );

  if (existingSchedule.recordset.length === 0) {
    return apiResponse(res, 404, false, 'Schedule not found');
  }

  // Delete the schedule
  await executeQuery(
    'DELETE FROM pow.Schedule WHERE ID = @id',
    { id: parseInt(id) }
  );

  return apiResponse(res, 200, true, 'Schedule deleted successfully');
}

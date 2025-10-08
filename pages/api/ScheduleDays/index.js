import { executeQuery } from '@/lib/db';

function apiResponse(res, status, success, message, data = null) {
  return res.status(status).json({
    success,
    message,
    data
  });
}

export default async function handler(req, res) {
  const { method } = req;

  try {
    if (method === 'GET') {
      return await handleGet(req, res);
    } else if (method === 'PUT') {
      return await handlePut(req, res);
    } else {
      return apiResponse(res, 405, false, 'Method not allowed');
    }
  } catch (error) {
    console.error('ScheduleDays API error:', error);
    return apiResponse(res, 500, false, 'Internal server error', error.message);
  }
}

async function handleGet(req, res) {
  const { scheduleId } = req.query;

  if (!scheduleId) {
    return apiResponse(res, 400, false, 'Schedule ID is required');
  }

  const query = `
    SELECT 
      ID,
      Schedule_ID,
      Monday,
      Tuesday,
      Wednesday,
      Thursday,
      Friday,
      Saturday,
      Sunday,
      IncludeBankHols
    FROM pow.ScheduleDay 
    WHERE Schedule_ID = @scheduleId
  `;

  const result = await executeQuery(query, { scheduleId: parseInt(scheduleId) });

  if (result.recordset.length === 0) {
    // Create default record if none exists
    const insertQuery = `
      INSERT INTO pow.ScheduleDay 
      (Schedule_ID, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday, IncludeBankHols)
      VALUES (@scheduleId, 1, 1, 1, 1, 1, 0, 0, 0)
    `;
    
    await executeQuery(insertQuery, { scheduleId: parseInt(scheduleId) });
    
    // Return the default values
    return apiResponse(res, 200, true, 'Schedule days retrieved (created default)', {
      id: null,
      scheduleId: parseInt(scheduleId),
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
      includeBankHols: false
    });
  }

  const record = result.recordset[0];
  const scheduleDays = {
    id: record.ID,
    scheduleId: record.Schedule_ID,
    monday: Boolean(record.Monday),
    tuesday: Boolean(record.Tuesday),
    wednesday: Boolean(record.Wednesday),
    thursday: Boolean(record.Thursday),
    friday: Boolean(record.Friday),
    saturday: Boolean(record.Saturday),
    sunday: Boolean(record.Sunday),
    includeBankHols: Boolean(record.IncludeBankHols)
  };

  return apiResponse(res, 200, true, 'Schedule days retrieved successfully', scheduleDays);
}

async function handlePut(req, res) {
  const { scheduleId, monday, tuesday, wednesday, thursday, friday, saturday, sunday, includeBankHols } = req.body;

  if (!scheduleId) {
    return apiResponse(res, 400, false, 'Schedule ID is required');
  }

  // Check if record exists
  const checkQuery = `SELECT ID FROM pow.ScheduleDay WHERE Schedule_ID = @scheduleId`;
  const checkResult = await executeQuery(checkQuery, { scheduleId: parseInt(scheduleId) });

  let query;
  if (checkResult.recordset.length === 0) {
    // Insert new record
    query = `
      INSERT INTO pow.ScheduleDay 
      (Schedule_ID, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday, IncludeBankHols)
      VALUES (@scheduleId, @monday, @tuesday, @wednesday, @thursday, @friday, @saturday, @sunday, @includeBankHols)
    `;
  } else {
    // Update existing record
    query = `
      UPDATE pow.ScheduleDay 
      SET Monday = @monday,
          Tuesday = @tuesday,
          Wednesday = @wednesday,
          Thursday = @thursday,
          Friday = @friday,
          Saturday = @saturday,
          Sunday = @sunday,
          IncludeBankHols = @includeBankHols
      WHERE Schedule_ID = @scheduleId
    `;
  }

  const params = {
    scheduleId: parseInt(scheduleId),
    monday: monday ? 1 : 0,
    tuesday: tuesday ? 1 : 0,
    wednesday: wednesday ? 1 : 0,
    thursday: thursday ? 1 : 0,
    friday: friday ? 1 : 0,
    saturday: saturday ? 1 : 0,
    sunday: sunday ? 1 : 0,
    includeBankHols: includeBankHols ? 1 : 0
  };

  await executeQuery(query, params);

  return apiResponse(res, 200, true, 'Schedule days updated successfully', {
    scheduleId: parseInt(scheduleId),
    monday: Boolean(monday),
    tuesday: Boolean(tuesday),
    wednesday: Boolean(wednesday),
    thursday: Boolean(thursday),
    friday: Boolean(friday),
    saturday: Boolean(saturday),
    sunday: Boolean(sunday),
    includeBankHols: Boolean(includeBankHols)
  });
}
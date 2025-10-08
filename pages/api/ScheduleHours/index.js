import { executeQuery } from '../../../lib/db';

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
    console.error('ScheduleHours API error:', error);
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
      [0], [1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11],
      [12], [13], [14], [15], [16], [17], [18], [19], [20], [21], [22], [23]
    FROM pow.ScheduleHour 
    WHERE Schedule_ID = @scheduleId
  `;

  const result = await executeQuery(query, { scheduleId: parseInt(scheduleId) });

  if (result.recordset.length === 0) {
    // Create default record if none exists (business hours: 9am-5pm)
    const defaultHours = Array(24).fill(0);
    for (let i = 9; i <= 17; i++) {
      defaultHours[i] = 1;
    }
    
    const insertQuery = `
      INSERT INTO pow.ScheduleHour 
      (Schedule_ID, [0], [1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11], 
       [12], [13], [14], [15], [16], [17], [18], [19], [20], [21], [22], [23])
      VALUES (@scheduleId, ${defaultHours.map((_, i) => `@hour${i}`).join(', ')})
    `;
    
    const params = { scheduleId: parseInt(scheduleId) };
    defaultHours.forEach((val, i) => {
      params[`hour${i}`] = val;
    });
    
    await executeQuery(insertQuery, params);
    
    // Return the default values
    return apiResponse(res, 200, true, 'Schedule hours retrieved (created default)', {
      id: null,
      scheduleId: parseInt(scheduleId),
      hours: defaultHours.map(h => Boolean(h))
    });
  }

  const record = result.recordset[0];
  const hours = [];
  for (let i = 0; i < 24; i++) {
    hours.push(Boolean(record[i.toString()]));
  }

  const scheduleHours = {
    id: record.ID,
    scheduleId: record.Schedule_ID,
    hours: hours
  };

  return apiResponse(res, 200, true, 'Schedule hours retrieved successfully', scheduleHours);
}

async function handlePut(req, res) {
  const { scheduleId, hours } = req.body;

  if (!scheduleId) {
    return apiResponse(res, 400, false, 'Schedule ID is required');
  }

  if (!Array.isArray(hours) || hours.length !== 24) {
    return apiResponse(res, 400, false, 'Hours must be an array of 24 boolean values');
  }

  // Check if record exists
  const checkQuery = `SELECT ID FROM pow.ScheduleHour WHERE Schedule_ID = @scheduleId`;
  const checkResult = await executeQuery(checkQuery, { scheduleId: parseInt(scheduleId) });

  let query;
  const params = { scheduleId: parseInt(scheduleId) };
  
  // Add hour parameters
  hours.forEach((hour, i) => {
    params[`hour${i}`] = hour ? 1 : 0;
  });

  if (checkResult.recordset.length === 0) {
    // Insert new record
    query = `
      INSERT INTO pow.ScheduleHour 
      (Schedule_ID, [0], [1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11], 
       [12], [13], [14], [15], [16], [17], [18], [19], [20], [21], [22], [23])
      VALUES (@scheduleId, ${hours.map((_, i) => `@hour${i}`).join(', ')})
    `;
  } else {
    // Update existing record
    const hourUpdates = hours.map((_, i) => `[${i}] = @hour${i}`).join(', ');
    query = `
      UPDATE pow.ScheduleHour 
      SET ${hourUpdates}
      WHERE Schedule_ID = @scheduleId
    `;
  }

  await executeQuery(query, params);

  return apiResponse(res, 200, true, 'Schedule hours updated successfully', {
    scheduleId: parseInt(scheduleId),
    hours: hours.map(h => Boolean(h))
  });
}
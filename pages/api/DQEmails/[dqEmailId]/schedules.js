import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  const { method } = req;
  const { dqEmailId } = req.query;

  if (!dqEmailId) {
    return res.status(400).json({
      success: false,
      message: "DQ Email ID is required",
    });
  }

  try {
    if (method === "GET") {
      return await handleGet(req, res);
    } else if (method === "PUT") {
      return await handlePut(req, res);
    } else {
      return res.status(405).json({
        success: false,
        message: "Method not allowed",
      });
    }
  } catch (error) {
    console.error("DQ Email Schedules API error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

async function handleGet(req, res) {
  const { dqEmailId } = req.query;

  // Get all schedules associated with this DQ email
  const query = `
    SELECT 
      s.ID as scheduleId,
      s.ScheduleName as scheduleName,
      s.Description as description,
      s.IsEnabled as scheduleEnabled,
      es.ID as emailScheduleId,
      es.IsEnabled as emailScheduleEnabled,
      es.StartDate as startDate,
      es.EndDate as endDate,
      -- Get schedule days
      (SELECT STRING_AGG(sd.DayName, ', ') 
       FROM pow.Schedule_Day sd 
       WHERE sd.Schedule_ID = s.ID AND sd.IsEnabled = 1) as scheduleDays,
      -- Get schedule hours  
      (SELECT STRING_AGG(CONCAT(sh.StartHour, ':', FORMAT(sh.StartMinute, '00')), ', ')
       FROM pow.Schedule_Hour sh 
       WHERE sh.Schedule_ID = s.ID AND sh.IsEnabled = 1) as scheduleHours
    FROM pow.DQEmail_Schedule es
    INNER JOIN pow.Schedule s ON es.Schedule_ID = s.ID
    WHERE es.DQEmail_ID = @dqEmailId
    ORDER BY s.ScheduleName
  `;

  const result = await executeQuery(query, { dqEmailId: parseInt(dqEmailId) });

  const schedules = result.recordset.map((schedule) => ({
    scheduleId: schedule.scheduleId,
    scheduleName: schedule.scheduleName,
    description: schedule.description,
    scheduleEnabled: Boolean(schedule.scheduleEnabled),
    emailScheduleId: schedule.emailScheduleId,
    emailScheduleEnabled: Boolean(schedule.emailScheduleEnabled),
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    scheduleDays: schedule.scheduleDays,
    scheduleHours: schedule.scheduleHours,
    // Overall enabled status (both schedule and email-schedule must be enabled)
    isActive: Boolean(schedule.scheduleEnabled && schedule.emailScheduleEnabled),
  }));

  return res.status(200).json({
    success: true,
    message: "DQ Email schedules retrieved successfully",
    data: schedules,
    count: schedules.length,
  });
}

async function handlePut(req, res) {
  const { dqEmailId } = req.query;
  const { emailScheduleId, enabled } = req.body;

  if (!emailScheduleId || typeof enabled !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: "Email schedule ID and enabled status are required",
    });
  }

  console.log("PUT request for DQEmail Schedule:", { dqEmailId, emailScheduleId, enabled });

  try {
    // Update the DQEmail_Schedule record
    const updateQuery = `
      UPDATE pow.DQEmail_Schedule 
      SET IsEnabled = @enabled
      WHERE ID = @emailScheduleId AND DQEmail_ID = @dqEmailId
    `;

    const result = await executeQuery(updateQuery, {
      emailScheduleId: parseInt(emailScheduleId),
      dqEmailId: parseInt(dqEmailId),
      enabled: enabled ? 1 : 0,
    });

    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(200).json({
        success: true,
        message: "Schedule status updated successfully",
        data: {
          emailScheduleId: parseInt(emailScheduleId),
          enabled,
        },
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Schedule not found or no changes made",
      });
    }
  } catch (error) {
    console.error("Update schedule status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update schedule status",
      error: error.message,
    });
  }
}
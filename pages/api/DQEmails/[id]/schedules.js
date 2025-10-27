import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  if (!id) {
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
    } else if (method === "DELETE") {
      return await handleDelete(req, res);
    } else if (method === "POST") {
      return await handlePost(req, res);
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
  const { id } = req.query;

  try {
    // Get all schedules associated with this DQ email using ShowMyShedule view
    const query = `
      SELECT 
        sms.ID as scheduleId,
        sms.Title as scheduleName,
        sms.IsEnabled as scheduleEnabled,
        sms.Days as scheduleDays,
        sms.Times as scheduleHours,
        sms.IncludeBankHols as includeBankHols,
        s.ActiveFrom as activeFrom,
        s.ActiveTo as activeTo,
        es.ID as emailScheduleId,
        es.IsEnabled as emailScheduleEnabled
      FROM pow.DQEmail_Schedule es
      INNER JOIN pow.ShowMyShedule sms ON es.Schedule_ID = sms.ID
      INNER JOIN pow.Schedule s ON es.Schedule_ID = s.ID
      WHERE es.DQEmail_ID = @dqEmailId
      ORDER BY sms.Title
    `;

    const result = await executeQuery(query, { dqEmailId: parseInt(id) });

    const schedules = result.recordset.map((schedule) => ({
      scheduleId: schedule.scheduleId,
      scheduleName: schedule.scheduleName,
      description: null, // Schedule table doesn't have a Description field
      scheduleEnabled: Boolean(schedule.scheduleEnabled),
      emailScheduleId: schedule.emailScheduleId,
      emailScheduleEnabled: Boolean(schedule.emailScheduleEnabled),
      startDate: schedule.activeFrom,
      endDate: schedule.activeTo,
      scheduleDays: schedule.scheduleDays ? schedule.scheduleDays.trim() : null,
      scheduleHours: schedule.scheduleHours
        ? schedule.scheduleHours.trim()
        : null,
      includeBankHols: Boolean(schedule.includeBankHols),
      // Overall enabled status (both schedule and email-schedule must be enabled)
      isActive: Boolean(
        schedule.scheduleEnabled && schedule.emailScheduleEnabled
      ),
    }));

    return res.status(200).json({
      success: true,
      message: "DQ Email schedules retrieved successfully",
      data: schedules,
      count: schedules.length,
    });
  } catch (error) {
    console.error("Error in handleGet for schedules:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve schedules",
      error: error.message,
    });
  }
}

async function handlePut(req, res) {
  const { id } = req.query;
  const { emailScheduleId, enabled } = req.body;

  if (!emailScheduleId || typeof enabled !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "Email schedule ID and enabled status are required",
    });
  }

  console.log("PUT request for DQEmail Schedule:", {
    dqEmailId: id,
    emailScheduleId,
    enabled,
  });

  try {
    // Update the DQEmail_Schedule record
    const updateQuery = `
      UPDATE pow.DQEmail_Schedule 
      SET IsEnabled = @enabled
      WHERE ID = @emailScheduleId AND DQEmail_ID = @dqEmailId
    `;

    const result = await executeQuery(updateQuery, {
      emailScheduleId: parseInt(emailScheduleId),
      dqEmailId: parseInt(id),
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

async function handleDelete(req, res) {
  const { id } = req.query;
  const { emailScheduleId } = req.body;

  if (!emailScheduleId) {
    return res.status(400).json({
      success: false,
      message: "Email schedule ID is required",
    });
  }

  console.log("DELETE request for DQEmail Schedule:", {
    dqEmailId: id,
    emailScheduleId,
  });

  try {
    // Delete the DQEmail_Schedule record
    const deleteQuery = `
      DELETE FROM pow.DQEmail_Schedule 
      WHERE ID = @emailScheduleId AND DQEmail_ID = @dqEmailId
    `;

    const result = await executeQuery(deleteQuery, {
      emailScheduleId: parseInt(emailScheduleId),
      dqEmailId: parseInt(id),
    });

    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(200).json({
        success: true,
        message: "Schedule deleted successfully",
        data: {
          emailScheduleId: parseInt(emailScheduleId),
        },
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }
  } catch (error) {
    console.error("Delete schedule error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete schedule",
      error: error.message,
    });
  }
}

async function handlePost(req, res) {
  const { id } = req.query;
  const { scheduleId } = req.body;

  if (!scheduleId) {
    return res.status(400).json({
      success: false,
      message: "Schedule ID is required",
    });
  }

  console.log("POST request to add DQEmail Schedule:", {
    dqEmailId: id,
    scheduleId,
  });

  try {
    // Insert new DQEmail_Schedule record
    const insertQuery = `
      INSERT INTO pow.DQEmail_Schedule (DQEmail_ID, Schedule_ID, IsEnabled)
      VALUES (@dqEmailId, @scheduleId, 1)
    `;

    const result = await executeQuery(insertQuery, {
      dqEmailId: parseInt(id),
      scheduleId: parseInt(scheduleId),
    });

    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(201).json({
        success: true,
        message: "Schedule added successfully",
        data: {
          scheduleId: parseInt(scheduleId),
        },
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to add schedule",
      });
    }
  } catch (error) {
    console.error("Add schedule error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add schedule",
      error: error.message,
    });
  }
}

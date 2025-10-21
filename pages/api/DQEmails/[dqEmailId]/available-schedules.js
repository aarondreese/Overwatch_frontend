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

  if (method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // Get all schedules that are NOT currently assigned to this DQ email
    const query = `
      SELECT 
        sms.ID as scheduleId,
        sms.Title as scheduleName,
        sms.IsEnabled as scheduleEnabled,
        sms.Days as scheduleDays,
        sms.Times as scheduleHours,
        s.ActiveFrom as activeFrom,
        s.ActiveTo as activeTo
      FROM pow.ShowMyShedule sms
      INNER JOIN pow.Schedule s ON sms.ID = s.ID
      WHERE sms.ID NOT IN (
        SELECT Schedule_ID 
        FROM pow.DQEmail_Schedule 
        WHERE DQEmail_ID = @dqEmailId
      )
      AND sms.IsEnabled = 1
      ORDER BY sms.Title
    `;

    const result = await executeQuery(query, { dqEmailId: parseInt(dqEmailId) });

    const schedules = result.recordset.map((schedule) => ({
      scheduleId: schedule.scheduleId,
      scheduleName: schedule.scheduleName,
      scheduleEnabled: Boolean(schedule.scheduleEnabled),
      startDate: schedule.activeFrom,
      endDate: schedule.activeTo,
      scheduleDays: schedule.scheduleDays ? schedule.scheduleDays.trim() : null,
      scheduleHours: schedule.scheduleHours ? schedule.scheduleHours.trim() : null,
    }));

    return res.status(200).json({
      success: true,
      message: "Available schedules retrieved successfully",
      data: schedules,
      count: schedules.length,
    });
  } catch (error) {
    console.error("Error fetching available schedules:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve available schedules",
      error: error.message,
    });
  }
}

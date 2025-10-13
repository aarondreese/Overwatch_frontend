import { executeQuery } from '@/lib/db';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  try {
    if (method !== 'GET') {
      return res.status(405).json({ 
        success: false, 
        message: 'Method not allowed' 
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'DQ Check ID is required'
      });
    }

    // Get the last 14 distinct days with run history, then get the last run for each day
    const query = `
      WITH RecentDays AS (
        SELECT DISTINCT CAST(rh.RunStart AS DATE) as RunDate
        FROM pow.RunHistory rh
        WHERE rh.DQCheck_ID = @id
          AND rh.RunStart IS NOT NULL
      ),
      Last14Days AS (
        SELECT TOP 14 RunDate
        FROM RecentDays
        ORDER BY RunDate DESC
      ),
      LastRunPerDay AS (
        SELECT 
          rd.RunDate,
          rh.ID,
          rh.RecordCount,
          rh.RunStart,
          ROW_NUMBER() OVER (PARTITION BY rd.RunDate ORDER BY rh.RunStart DESC) as rn
        FROM Last14Days rd
        INNER JOIN pow.RunHistory rh ON CAST(rh.RunStart AS DATE) = rd.RunDate
        WHERE rh.DQCheck_ID = @id
      )
      SELECT 
        RunDate,
        ID as runId,
        RecordCount,
        RunStart
      FROM LastRunPerDay
      WHERE rn = 1
      ORDER BY RunDate ASC
    `;

    const params = { id: parseInt(id) };
    const result = await executeQuery(query, params);

    const runHistory = result.recordset.map(record => ({
      runDate: record.RunDate,
      runId: record.runId,
      resultCount: record.RecordCount || 0,
      runStart: record.RunStart
    }));

    return res.status(200).json({
      success: true,
      message: 'Run history retrieved successfully',
      data: runHistory,
      count: runHistory.length
    });

  } catch (error) {
    console.error('Run history API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error', 
      error: error.message
    });
  }
}
import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  try {
    // Get ALL config data to see the full picture
    const query = `
      SELECT * FROM pow.Config
      ORDER BY ID
    `;

    const result = await executeQuery(query, {});

    res.status(200).json({
      success: true,
      message: "All Config data",
      data: result.recordset,
      count: result.recordset.length,
    });
  } catch (error) {
    console.error("Config data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get config data",
      error: error.message,
    });
  }
}

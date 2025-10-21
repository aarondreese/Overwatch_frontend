import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Get all views that start with 'map_' from all schemas
    const query = `
      SELECT 
        TABLE_SCHEMA as schemaName,
        TABLE_NAME as viewName,
        CONCAT(TABLE_SCHEMA, '.', TABLE_NAME) as fullViewName
      FROM INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_NAME LIKE 'map_%'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;

    const result = await executeQuery(query);

    const mapViews = result.recordset.map((view) => ({
      schemaName: view.schemaName,
      viewName: view.viewName,
      fullViewName: view.fullViewName,
    }));

    res.status(200).json({
      success: true,
      data: mapViews,
      count: mapViews.length,
    });
  } catch (error) {
    console.error("Map Views API error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get map views",
      error: error.message,
    });
  }
}

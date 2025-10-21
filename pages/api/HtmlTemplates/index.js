import { executeQuery } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const query = `
      SELECT 
        template_name as templateName,
        template_text as templateText
      FROM pow.HtmlTemplate 
      ORDER BY template_name
    `;

    const result = await executeQuery(query);

    const templates = result.recordset.map((template) => ({
      name: template.templateName,
      text: template.templateText,
    }));

    res.status(200).json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    console.error("HTML Templates API error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get HTML templates",
      error: error.message,
    });
  }
}

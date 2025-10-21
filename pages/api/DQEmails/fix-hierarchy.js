import { executeQuery } from "@/lib/db";

// Extract ^For directives from HTML template (case-insensitive)
const extractForDirectives = (templateText) => {
  if (!templateText) return [];

  // Match ^for= followed by single or double quoted content, allow optional spaces
  const regex = /\^for\s*=\s*['"]([^'\"]+)['"]/gi;
  const directives = [];
  let match;

  while ((match = regex.exec(templateText)) !== null) {
      const directive = match[1].trim();
      // Split on a case-insensitive ' in ' with flexible whitespace
      const parts = directive.split(/\s+in\s+/i);
      if (parts.length === 2) {
        const variable = parts[0].trim();
        const collection = parts[1].trim();
        directives.push({
          full: directive,
          variable,
          collection,
          position: match.index,
          originalCase: match[0], // Store the original case found in template
        });
      }
  }

  return directives.sort((a, b) => a.position - b.position);
};

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  if (method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: "Method not allowed. Use POST to fix hierarchy.",
    });
  }

  try {
    console.log(`Fix hierarchy request for DQEmail ID: ${id}`);
    
    // Get the DQEmail record with template
    const getDQEmailQuery = `
      SELECT 
        dqe.ID as id,
        dqe.hierarchy as currentHierarchy,
        ht.template_text as templateText
      FROM pow.DQEmail dqe
      LEFT JOIN pow.HtmlTemplate ht ON dqe.htmlTemplateName = ht.template_name
      WHERE dqe.ID = @id
    `;

    console.log('Executing query:', getDQEmailQuery, 'with params:', {id});
    const dqEmailResult = await executeQuery(getDQEmailQuery, {id});
    console.log('Query result:', dqEmailResult);
    
    if (!dqEmailResult || !dqEmailResult.recordset || dqEmailResult.recordset.length === 0) {
      console.log('No DQEmail found for ID:', id);
      return res.status(404).json({
        success: false,
        message: "DQEmail not found",
      });
    }

    const dqEmail = dqEmailResult.recordset[0];
    console.log('DQEmail data:', dqEmail);
    
    if (!dqEmail.templateText) {
      console.log('No template text found for DQEmail:', id);
      return res.status(400).json({
        success: false,
        message: "No template found for this DQEmail",
      });
    }

    // Extract hierarchy from template
    console.log('Extracting hierarchy from template...');
    const forDirectives = extractForDirectives(dqEmail.templateText);
    console.log('For directives found:', forDirectives);
    
    // Normalize collections: for each directive take the collection after 'in'
    // If collection contains dots (e.g., 'admin.DueEPC') take only the last segment ('DueEPC')
    // Preserve directive order and remove duplicates while keeping first occurrence
    const normalized = [];
    forDirectives.forEach((fd) => {
      let collection = fd.collection || "";
      collection = collection.trim();
      if (!collection) return;
      const parts = collection.split('.');
      const last = parts[parts.length - 1];
      const val = last.trim();
      if (val && !normalized.includes(val)) normalized.push(val);
    });

    const templateHierarchy = normalized.join('>');

    console.log('Collections found:', forDirectives.map(fd => fd.collection));
    console.log('Normalized hierarchy levels:', normalized);
    console.log('Template hierarchy:', templateHierarchy);
    console.log('Current database hierarchy:', dqEmail.currentHierarchy);

    // Check if hierarchy needs updating
    const needsUpdate = dqEmail.currentHierarchy !== templateHierarchy;

    if (!needsUpdate) {
      return res.status(200).json({
        success: true,
        message: "Hierarchy is already correct",
        currentHierarchy: dqEmail.currentHierarchy,
        templateHierarchy: templateHierarchy,
        needsUpdate: false
      });
    }

    // Update the hierarchy field
    const updateQuery = `
      UPDATE pow.DQEmail 
      SET hierarchy = @templateHierarchy
      WHERE ID = @id
    `;

    await executeQuery(updateQuery, {templateHierarchy, id});

    return res.status(200).json({
      success: true,
      message: "Hierarchy updated successfully",
      previousHierarchy: dqEmail.currentHierarchy,
      newHierarchy: templateHierarchy,
      forDirectives: forDirectives,
      needsUpdate: true
    });

  } catch (error) {
    console.error("Fix hierarchy error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
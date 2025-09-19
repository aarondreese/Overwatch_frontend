// Native Next.js API endpoint for Source Systems
import { executeQuery } from "../../../lib/db";
import { apiResponse } from "../../../lib/dbUtils";

export default async function handler(req, res) {
  try {
    switch (req.method) {
      case "GET":
        await handleGet(req, res);
        break;
      case "POST":
        await handlePost(req, res);
        break;
      case "PUT":
        await handlePut(req, res);
        break;
      case "DELETE":
        await handleDelete(req, res);
        break;
      default:
        apiResponse.methodNotAllowed(res, ["GET", "POST", "PUT", "DELETE"]);
    }
  } catch (error) {
    apiResponse.error(res, error);
  }
}

// GET - List all source systems with their domains and synonyms
async function handleGet(req, res) {
  const query = `
    SELECT 
      ss.ID as id,
      ss.SystemName as systemName,
      ss.LinkedServerName as linkedServerName,
      ss.DatabaseName as databaseName,
      ss.DefaultSourceSchema as defaultSourceSchema,
      ss.DefaultTargetSchema as defaultTargetSchema,
      d.ID as domainId,
      d.DomainName as domainName,
      s.SystemID as synonymId,
      s.Synonym as synonymName,
      s.SourceSchema as synonymSourceSchema,
      s.object_name as synonymObjectName
    FROM pow.SourceSystem ss
    LEFT JOIN pow.Domain d ON ss.ID = d.SourceSystem_ID
    LEFT JOIN pow.Synonym s ON ss.ID = s.SourceSystem_Id
    ORDER BY ss.SystemName, d.DomainName, s.Synonym
  `;

  const result = await executeQuery(query);
  
  // Group domains and synonyms by source system
  const systemsMap = new Map();
  
  result.recordset.forEach(row => {
    if (!systemsMap.has(row.id)) {
      systemsMap.set(row.id, {
        id: row.id,
        systemName: row.systemName,
        linkedServerName: row.linkedServerName,
        databaseName: row.databaseName,
        defaultSourceSchema: row.defaultSourceSchema,
        defaultTargetSchema: row.defaultTargetSchema,
        domains: [],
        synonyms: []
      });
    }
    
    const system = systemsMap.get(row.id);
    
    // Add domain if it exists and not already added
    if (row.domainId && !system.domains.some(d => d.id === row.domainId)) {
      system.domains.push({
        id: row.domainId,
        domainName: row.domainName,
        sourceSystemId: row.id
      });
    }
    
    // Add synonym if it exists and not already added
    if (row.synonymId && !system.synonyms.some(s => s.id === row.synonymId)) {
      system.synonyms.push({
        id: row.synonymId,
        synonymName: row.synonymName,
        sourceSchema: row.synonymSourceSchema,
        objectName: row.synonymObjectName,
        sourceSystemId: row.id
      });
    }
  });
  
  const systems = Array.from(systemsMap.values());
  apiResponse.success(res, systems, "Source systems retrieved successfully");
}

// POST - Create new source system using stored procedure
async function handlePost(req, res) {
  const {
    systemName,
    linkedServerName,
    databaseName,
    defaultSourceSchema,
    defaultTargetSchema,
  } = req.body;

  if (!systemName) {
    return apiResponse.badRequest(res, "System name is required");
  }

  const query = `EXEC api.usp_AddSourceSystem 
    @SystemName = @systemName,
    @LinkedServerName = @linkedServerName,
    @DatabaseName = @databaseName,
    @DefaultSourceSchema = @defaultSourceSchema,
    @DefaultTargetSchema = @defaultTargetSchema`;

  const params = {
    systemName: systemName.trim(),
    linkedServerName: linkedServerName || null,
    databaseName: databaseName || null,
    defaultSourceSchema: defaultSourceSchema || null,
    defaultTargetSchema: defaultTargetSchema || null,
  };

  try {
    const result = await executeQuery(query, params);

    if (result.recordset && result.recordset.length > 0) {
      apiResponse.created(
        res,
        result.recordset[0],
        "Source system created successfully"
      );
    } else {
      apiResponse.error(
        res,
        new Error("Failed to create source system - no data returned")
      );
    }
  } catch (error) {
    // Handle specific database errors
    if (error.message.includes("already exists")) {
      return apiResponse.badRequest(
        res,
        "A source system with this name already exists"
      );
    }
    if (error.message.includes("SystemName is required")) {
      return apiResponse.badRequest(
        res,
        "System name is required and cannot be empty"
      );
    }

    // Re-throw other errors to be handled by the main error handler
    throw error;
  }
}

// PUT - Update existing source system
async function handlePut(req, res) {
  const {
    id,
    systemName,
    linkedServerName,
    databaseName,
    defaultSourceSchema,
    defaultTargetSchema,
  } = req.body;

  if (!id || !systemName) {
    return apiResponse.badRequest(res, "ID and system name are required");
  }

  const query = `
    UPDATE pow.SourceSystem 
    SET 
      SystemName = @systemName,
      LinkedServerName = @linkedServerName,
      DatabaseName = @databaseName,
      DefaultSourceSchema = @defaultSourceSchema,
      DefaultTargetSchema = @defaultTargetSchema
    WHERE ID = @id
  `;

  const params = {
    id,
    systemName,
    linkedServerName: linkedServerName || null,
    databaseName: databaseName || null,
    defaultSourceSchema: defaultSourceSchema || null,
    defaultTargetSchema: defaultTargetSchema || null,
  };

  const result = await executeQuery(query, params);

  if (result.rowsAffected[0] === 0) {
    return apiResponse.notFound(res, "Source system not found");
  }

  // Return the updated record
  const getQuery = `
    SELECT 
      ID as id,
      SystemName as systemName,
      LinkedServerName as linkedServerName,
      DatabaseName as databaseName,
      DefaultSourceSchema as defaultSourceSchema,
      DefaultTargetSchema as defaultTargetSchema
    FROM pow.SourceSystem 
    WHERE ID = @id
  `;

  const updatedRecord = await executeQuery(getQuery, { id });
  apiResponse.success(
    res,
    updatedRecord.recordset[0],
    "Source system updated successfully"
  );
}

// DELETE - Delete source system (hard delete since no IsActive column)
async function handleDelete(req, res) {
  const { id } = req.query;

  if (!id) {
    return apiResponse.badRequest(res, "ID is required");
  }

  const query = `
    DELETE FROM pow.SourceSystem 
    WHERE ID = @id
  `;

  const result = await executeQuery(query, { id: parseInt(id) });

  if (result.rowsAffected[0] === 0) {
    return apiResponse.notFound(res, "Source system not found");
  }

  apiResponse.success(res, { id }, "Source system deleted successfully");
}

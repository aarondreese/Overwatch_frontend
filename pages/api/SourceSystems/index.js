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

// GET - List all source systems
async function handleGet(req, res) {
  const query = `
    SELECT 
      ID as id,
      SystemName as systemName,
      LinkedServerName as linkedServerName,
      DatabaseName as databaseName,
      DefaultSourceSchema as defaultSourceSchema,
      DefaultTargetSchema as defaultTargetSchema
    FROM pow.SourceSystem
    ORDER BY SystemName
  `;

  const result = await executeQuery(query);
  apiResponse.success(
    res,
    result.recordset,
    "Source systems retrieved successfully"
  );
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

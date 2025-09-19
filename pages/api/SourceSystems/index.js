// Native Next.js API endpoint for Source Systems
import { executeQuery } from '../../../lib/db';
import { apiResponse } from '../../../lib/dbUtils';

export default async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':
        await handleGet(req, res);
        break;
      case 'POST':
        await handlePost(req, res);
        break;
      case 'PUT':
        await handlePut(req, res);
        break;
      case 'DELETE':
        await handleDelete(req, res);
        break;
      default:
        apiResponse.methodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE']);
    }
  } catch (error) {
    apiResponse.error(res, error);
  }
}

// GET - List all source systems
async function handleGet(req, res) {
  const query = `
    SELECT 
      SourceSystemID as id,
      SystemName as systemName,
      LinkedServerName as linkedServerName,
      SourceDatabaseName as databaseName,
      SourceSchemaName as defaultSourceSchema,
      TargetSchemaName as defaultTargetSchema,
      CreatedDate,
      ModifiedDate,
      IsActive
    FROM pow.SourceSystem
    WHERE IsActive = 1
    ORDER BY SystemName
  `;
  
  const result = await executeQuery(query);
  apiResponse.success(res, result.recordset, 'Source systems retrieved successfully');
}

// POST - Create new source system
async function handlePost(req, res) {
  const { systemName, linkedServerName, databaseName, defaultSourceSchema, defaultTargetSchema } = req.body;
  
  if (!systemName) {
    return apiResponse.badRequest(res, 'System name is required');
  }
  
  const query = `
    INSERT INTO pow.SourceSystem (
      SystemName, 
      LinkedServerName, 
      SourceDatabaseName, 
      SourceSchemaName, 
      TargetSchemaName,
      CreatedDate,
      ModifiedDate,
      IsActive
    )
    VALUES (
      @systemName, 
      @linkedServerName, 
      @databaseName, 
      @defaultSourceSchema, 
      @defaultTargetSchema,
      GETDATE(),
      GETDATE(),
      1
    );
    SELECT SCOPE_IDENTITY() as id;
  `;
  
  const params = {
    systemName,
    linkedServerName: linkedServerName || null,
    databaseName: databaseName || null,
    defaultSourceSchema: defaultSourceSchema || null,
    defaultTargetSchema: defaultTargetSchema || null
  };
  
  const result = await executeQuery(query, params);
  const newId = result.recordset[0].id;
  
  // Return the created record
  const getQuery = `
    SELECT 
      SourceSystemID as id,
      SystemName as systemName,
      LinkedServerName as linkedServerName,
      SourceDatabaseName as databaseName,
      SourceSchemaName as defaultSourceSchema,
      TargetSchemaName as defaultTargetSchema,
      CreatedDate,
      ModifiedDate,
      IsActive
    FROM pow.SourceSystem 
    WHERE SourceSystemID = @id
  `;
  
  const createdRecord = await executeQuery(getQuery, { id: newId });
  apiResponse.created(res, createdRecord.recordset[0], 'Source system created successfully');
}

// PUT - Update existing source system
async function handlePut(req, res) {
  const { id, systemName, linkedServerName, databaseName, defaultSourceSchema, defaultTargetSchema } = req.body;
  
  if (!id || !systemName) {
    return apiResponse.badRequest(res, 'ID and system name are required');
  }
  
  const query = `
    UPDATE pow.SourceSystem 
    SET 
      SystemName = @systemName,
      LinkedServerName = @linkedServerName,
      SourceDatabaseName = @databaseName,
      SourceSchemaName = @defaultSourceSchema,
      TargetSchemaName = @defaultTargetSchema,
      ModifiedDate = GETDATE()
    WHERE SourceSystemID = @id AND IsActive = 1
  `;
  
  const params = {
    id,
    systemName,
    linkedServerName: linkedServerName || null,
    databaseName: databaseName || null,
    defaultSourceSchema: defaultSourceSchema || null,
    defaultTargetSchema: defaultTargetSchema || null
  };
  
  const result = await executeQuery(query, params);
  
  if (result.rowsAffected[0] === 0) {
    return apiResponse.notFound(res, 'Source system not found or inactive');
  }
  
  // Return the updated record
  const getQuery = `
    SELECT 
      SourceSystemID as id,
      SystemName as systemName,
      LinkedServerName as linkedServerName,
      SourceDatabaseName as databaseName,
      SourceSchemaName as defaultSourceSchema,
      TargetSchemaName as defaultTargetSchema,
      CreatedDate,
      ModifiedDate,
      IsActive
    FROM pow.SourceSystem 
    WHERE SourceSystemID = @id
  `;
  
  const updatedRecord = await executeQuery(getQuery, { id });
  apiResponse.success(res, updatedRecord.recordset[0], 'Source system updated successfully');
}

// DELETE - Soft delete source system
async function handleDelete(req, res) {
  const { id } = req.query;
  
  if (!id) {
    return apiResponse.badRequest(res, 'ID is required');
  }
  
  const query = `
    UPDATE pow.SourceSystem 
    SET IsActive = 0, ModifiedDate = GETDATE()
    WHERE SourceSystemID = @id
  `;
  
  const result = await executeQuery(query, { id: parseInt(id) });
  
  if (result.rowsAffected[0] === 0) {
    return apiResponse.notFound(res, 'Source system not found');
  }
  
  apiResponse.success(res, { id }, 'Source system deleted successfully');
}

// Client-side functions for frontend compatibility
export async function listSourceSystems() {
  const res = await fetch("/api/SourceSystems");
  const data = await res.json();
  console.log("data:", data);
  return data.data; // Extract the data array from the response
}

export async function updateSourceSystems(dto) {
  const sourceSystemEditModel = {
    id: dto.SystemID,
    systemName: dto.SystemName,
    linkedServerName: dto.LinkedServerName == "" ? null : dto.LinkedServerName,
    databaseName: dto.SourceDatabaseName,
    defaultSourceSchema: dto.SourceSchemaName,
    defaultTargetSchema: dto.TargetSchemaName,
  };

  console.log("in updateSourceSystems editmodel: ", sourceSystemEditModel);
  const method = dto.SystemID == -1 ? "POST" : "PUT";
  console.warn("using Method: ", method);
  console.warn("systemID: ", dto.SystemID);
  
  const res = await fetch("/api/SourceSystems", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method,
    body: JSON.stringify(sourceSystemEditModel),
  });
  
  console.log("in updateSourceSystems dto: ", dto);
  const responseData = await res.json();
  console.log("Got back from fetch: ", responseData);
  
  if (res.status === 200 || res.status === 201) {
    const data = await listSourceSystems();
    return data;
  }
  
  throw new Error(responseData.message || "Something went wrong");
}

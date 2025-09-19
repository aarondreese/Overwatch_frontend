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

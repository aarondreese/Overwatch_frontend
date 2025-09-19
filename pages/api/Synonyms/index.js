// Native Next.js API endpoint for Synonyms
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

// GET - List synonyms (optionally filtered by source system)
async function handleGet(req, res) {
  const { sourceSystemId } = req.query;
  
  let query = `
    SELECT 
      s.SystemID as id,
      s.Synonym as synonymName,
      s.SourceSchema as sourceSchema,
      s.base_object_name as baseObjectName,
      s.object_name as objectName,
      s.object_schema as objectSchema,
      s.object_db as objectDb,
      s.object_linked_server as objectLinkedServer,
      s.SourceSystem_Id as sourceSystemId,
      ss.SystemName as sourceSystemName
    FROM pow.Synonym s
    INNER JOIN pow.SourceSystem ss ON s.SourceSystem_Id = ss.ID
  `;
  
  const params = {};
  
  if (sourceSystemId) {
    query += ` WHERE s.SourceSystem_Id = @sourceSystemId`;
    params.sourceSystemId = parseInt(sourceSystemId);
  }
  
  query += ` ORDER BY ss.SystemName, s.Synonym`;
  
  const result = await executeQuery(query, params);
  apiResponse.success(res, result.recordset, "Synonyms retrieved successfully");
}

// POST - Create new synonym
async function handlePost(req, res) {
  const { 
    sourceSystemId, 
    synonymName, 
    sourceSchema,
    objectName,
    objectSchema,
    objectDb,
    objectLinkedServer 
  } = req.body;
  
  if (!sourceSystemId || !synonymName || !sourceSchema || !objectName) {
    return apiResponse.badRequest(res, "Source System ID, Synonym Name, Source Schema, and Object Name are required");
  }
  
  // Check if source system exists
  const sourceSystemCheck = await executeQuery(
    `SELECT ID FROM pow.SourceSystem WHERE ID = @sourceSystemId`,
    { sourceSystemId: parseInt(sourceSystemId) }
  );
  
  if (sourceSystemCheck.recordset.length === 0) {
    return apiResponse.badRequest(res, "Source System not found");
  }
  
  // Check for duplicate synonym name within the same source system
  const duplicateCheck = await executeQuery(
    `SELECT SystemID FROM pow.Synonym WHERE SourceSystem_Id = @sourceSystemId AND Synonym = @synonymName`,
    { sourceSystemId: parseInt(sourceSystemId), synonymName: synonymName.trim() }
  );
  
  if (duplicateCheck.recordset.length > 0) {
    return apiResponse.badRequest(res, "A synonym with this name already exists for this source system");
  }
  
  // Build base_object_name
  const baseObjectName = objectLinkedServer 
    ? `[${objectLinkedServer}].[${objectDb || ''}].[${objectSchema || 'dbo'}].[${objectName}]`
    : `[${objectDb || ''}].[${objectSchema || 'dbo'}].[${objectName}]`;
  
  const insertQuery = `
    INSERT INTO pow.Synonym (
      Synonym,
      SourceSchema,
      base_object_name,
      object_name,
      object_schema,
      object_db,
      object_linked_server,
      SourceSystem_Id
    )
    VALUES (
      @synonymName,
      @sourceSchema,
      @baseObjectName,
      @objectName,
      @objectSchema,
      @objectDb,
      @objectLinkedServer,
      @sourceSystemId
    );
    SELECT SCOPE_IDENTITY() as id;
  `;
  
  const params = {
    synonymName: synonymName.trim(),
    sourceSchema: sourceSchema.trim(),
    baseObjectName,
    objectName: objectName.trim(),
    objectSchema: objectSchema || 'dbo',
    objectDb: objectDb || null,
    objectLinkedServer: objectLinkedServer || null,
    sourceSystemId: parseInt(sourceSystemId)
  };
  
  const result = await executeQuery(insertQuery, params);
  const newId = result.recordset[0].id;
  
  // Return the created record with full details
  const getQuery = `
    SELECT 
      s.SystemID as id,
      s.Synonym as synonymName,
      s.SourceSchema as sourceSchema,
      s.base_object_name as baseObjectName,
      s.object_name as objectName,
      s.object_schema as objectSchema,
      s.object_db as objectDb,
      s.object_linked_server as objectLinkedServer,
      s.SourceSystem_Id as sourceSystemId,
      ss.SystemName as sourceSystemName
    FROM pow.Synonym s
    INNER JOIN pow.SourceSystem ss ON s.SourceSystem_Id = ss.ID
    WHERE s.SystemID = @id
  `;
  
  const createdRecord = await executeQuery(getQuery, { id: newId });
  apiResponse.created(res, createdRecord.recordset[0], "Synonym created successfully");
}

// PUT - Update existing synonym
async function handlePut(req, res) {
  const { 
    id,
    synonymName, 
    sourceSchema,
    objectName,
    objectSchema,
    objectDb,
    objectLinkedServer 
  } = req.body;
  
  if (!id || !synonymName || !sourceSchema || !objectName) {
    return apiResponse.badRequest(res, "ID, Synonym Name, Source Schema, and Object Name are required");
  }
  
  // Build base_object_name
  const baseObjectName = objectLinkedServer 
    ? `[${objectLinkedServer}].[${objectDb || ''}].[${objectSchema || 'dbo'}].[${objectName}]`
    : `[${objectDb || ''}].[${objectSchema || 'dbo'}].[${objectName}]`;
  
  const query = `
    UPDATE pow.Synonym 
    SET 
      Synonym = @synonymName,
      SourceSchema = @sourceSchema,
      base_object_name = @baseObjectName,
      object_name = @objectName,
      object_schema = @objectSchema,
      object_db = @objectDb,
      object_linked_server = @objectLinkedServer
    WHERE SystemID = @id
  `;
  
  const params = {
    id: parseInt(id),
    synonymName: synonymName.trim(),
    sourceSchema: sourceSchema.trim(),
    baseObjectName,
    objectName: objectName.trim(),
    objectSchema: objectSchema || 'dbo',
    objectDb: objectDb || null,
    objectLinkedServer: objectLinkedServer || null
  };
  
  const result = await executeQuery(query, params);
  
  if (result.rowsAffected[0] === 0) {
    return apiResponse.notFound(res, "Synonym not found");
  }
  
  // Return the updated record
  const getQuery = `
    SELECT 
      s.SystemID as id,
      s.Synonym as synonymName,
      s.SourceSchema as sourceSchema,
      s.base_object_name as baseObjectName,
      s.object_name as objectName,
      s.object_schema as objectSchema,
      s.object_db as objectDb,
      s.object_linked_server as objectLinkedServer,
      s.SourceSystem_Id as sourceSystemId,
      ss.SystemName as sourceSystemName
    FROM pow.Synonym s
    INNER JOIN pow.SourceSystem ss ON s.SourceSystem_Id = ss.ID
    WHERE s.SystemID = @id
  `;
  
  const updatedRecord = await executeQuery(getQuery, { id: parseInt(id) });
  apiResponse.success(res, updatedRecord.recordset[0], "Synonym updated successfully");
}

// DELETE - Delete synonym
async function handleDelete(req, res) {
  const { id } = req.query;
  
  if (!id) {
    return apiResponse.badRequest(res, "ID is required");
  }
  
  const query = `
    DELETE FROM pow.Synonym 
    WHERE SystemID = @id
  `;
  
  const result = await executeQuery(query, { id: parseInt(id) });
  
  if (result.rowsAffected[0] === 0) {
    return apiResponse.notFound(res, "Synonym not found");
  }
  
  apiResponse.success(res, { id: parseInt(id) }, "Synonym deleted successfully");
}

// Native Next.js API endpoint for Domains
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

// GET - List domains (optionally filtered by source system)
async function handleGet(req, res) {
  const { sourceSystemId } = req.query;
  
  let query = `
    SELECT 
      d.ID as id,
      d.SourceSystem_ID as sourceSystemId,
      d.DomainName as domainName,
      ss.SystemName as sourceSystemName
    FROM pow.Domain d
    INNER JOIN pow.SourceSystem ss ON d.SourceSystem_ID = ss.ID
  `;
  
  const params = {};
  
  if (sourceSystemId) {
    query += ` WHERE d.SourceSystem_ID = @sourceSystemId`;
    params.sourceSystemId = parseInt(sourceSystemId);
  }
  
  query += ` ORDER BY ss.SystemName, d.DomainName`;
  
  const result = await executeQuery(query, params);
  apiResponse.success(res, result.recordset, "Domains retrieved successfully");
}

// POST - Create new domain
async function handlePost(req, res) {
  const { sourceSystemId, domainName } = req.body;
  
  if (!sourceSystemId || !domainName) {
    return apiResponse.badRequest(res, "Source System ID and Domain Name are required");
  }
  
  // Check if source system exists
  const sourceSystemCheck = await executeQuery(
    `SELECT ID FROM pow.SourceSystem WHERE ID = @sourceSystemId`,
    { sourceSystemId: parseInt(sourceSystemId) }
  );
  
  if (sourceSystemCheck.recordset.length === 0) {
    return apiResponse.badRequest(res, "Source System not found");
  }
  
  // Check for duplicate domain name within the same source system
  const duplicateCheck = await executeQuery(
    `SELECT ID FROM pow.Domain WHERE SourceSystem_ID = @sourceSystemId AND DomainName = @domainName`,
    { sourceSystemId: parseInt(sourceSystemId), domainName: domainName.trim() }
  );
  
  if (duplicateCheck.recordset.length > 0) {
    return apiResponse.badRequest(res, "A domain with this name already exists for this source system");
  }
  
  const insertQuery = `
    INSERT INTO pow.Domain (SourceSystem_ID, DomainName)
    VALUES (@sourceSystemId, @domainName);
    SELECT SCOPE_IDENTITY() as id;
  `;
  
  const params = {
    sourceSystemId: parseInt(sourceSystemId),
    domainName: domainName.trim()
  };
  
  const result = await executeQuery(insertQuery, params);
  const newId = result.recordset[0].id;
  
  // Return the created record with full details
  const getQuery = `
    SELECT 
      d.ID as id,
      d.SourceSystem_ID as sourceSystemId,
      d.DomainName as domainName,
      ss.SystemName as sourceSystemName
    FROM pow.Domain d
    INNER JOIN pow.SourceSystem ss ON d.SourceSystem_ID = ss.ID
    WHERE d.ID = @id
  `;
  
  const createdRecord = await executeQuery(getQuery, { id: newId });
  apiResponse.created(res, createdRecord.recordset[0], "Domain created successfully");
}

// PUT - Update existing domain
async function handlePut(req, res) {
  const { id, domainName } = req.body;
  
  if (!id || !domainName) {
    return apiResponse.badRequest(res, "ID and Domain Name are required");
  }
  
  const query = `
    UPDATE pow.Domain 
    SET DomainName = @domainName
    WHERE ID = @id
  `;
  
  const params = {
    id: parseInt(id),
    domainName: domainName.trim()
  };
  
  const result = await executeQuery(query, params);
  
  if (result.rowsAffected[0] === 0) {
    return apiResponse.notFound(res, "Domain not found");
  }
  
  // Return the updated record
  const getQuery = `
    SELECT 
      d.ID as id,
      d.SourceSystem_ID as sourceSystemId,
      d.DomainName as domainName,
      ss.SystemName as sourceSystemName
    FROM pow.Domain d
    INNER JOIN pow.SourceSystem ss ON d.SourceSystem_ID = ss.ID
    WHERE d.ID = @id
  `;
  
  const updatedRecord = await executeQuery(getQuery, { id: parseInt(id) });
  apiResponse.success(res, updatedRecord.recordset[0], "Domain updated successfully");
}

// DELETE - Delete domain
async function handleDelete(req, res) {
  const { id } = req.query;
  
  if (!id) {
    return apiResponse.badRequest(res, "ID is required");
  }
  
  const query = `
    DELETE FROM pow.Domain 
    WHERE ID = @id
  `;
  
  const result = await executeQuery(query, { id: parseInt(id) });
  
  if (result.rowsAffected[0] === 0) {
    return apiResponse.notFound(res, "Domain not found");
  }
  
  apiResponse.success(res, { id: parseInt(id) }, "Domain deleted successfully");
}


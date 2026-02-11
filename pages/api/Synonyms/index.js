// Native Next.js API endpoint for Synonyms
import { executeQuery } from "../../../lib/db";
import { apiResponse } from "../../../lib/dbUtils";

const SYNONYM_SELECT_BASE = `
  SELECT 
    s.object_id as id,
    s.name as synonymName,
    synSchema.name as sourceSchema,
    s.base_object_name as baseObjectName,
    PARSENAME(s.base_object_name, 1) as objectName,
    PARSENAME(s.base_object_name, 2) as objectSchema,
    PARSENAME(s.base_object_name, 3) as objectDb,
    PARSENAME(s.base_object_name, 4) as objectLinkedServer,
    ss.ID as sourceSystemId,
    ss.SystemName as sourceSystemName,
    ss.LinkedServerName as linkedServerName,
    ss.DatabaseName as databaseName
  FROM sys.synonyms s
  INNER JOIN sys.schemas synSchema ON s.schema_id = synSchema.schema_id
  LEFT JOIN pow.SourceSystem ss
    ON ISNULL(PARSENAME(s.base_object_name, 4), '') = ISNULL(ss.LinkedServerName, '')
   AND ISNULL(PARSENAME(s.base_object_name, 3), '') = ISNULL(ss.DatabaseName, '')
`;

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
  let query = SYNONYM_SELECT_BASE;
  const params = {};

  if (sourceSystemId) {
    query += ` WHERE ss.ID = @sourceSystemId`;
    params.sourceSystemId = parseInt(sourceSystemId);
  }

  query += ` ORDER BY ISNULL(ss.SystemName, synSchema.name), synSchema.name, s.name`;

  const result = await executeQuery(query, params);
  apiResponse.success(res, result.recordset, "Synonyms retrieved successfully");
}

// POST - Create new synonym object in SQL Server
async function handlePost(req, res) {
  const {
    sourceSystemId,
    synonymName,
    sourceSchema: synonymSchema,
    objectName,
    objectSchema,
    objectDb,
    objectLinkedServer,
  } = req.body;

  const validated = await validateSynonymInput(res, {
    sourceSystemId,
    synonymName,
    synonymSchema,
    objectName,
    objectSchema,
    objectDb,
    objectLinkedServer,
  });

  if (!validated) {
    return;
  }

  const duplicateExists = await synonymExists(
    validated.synonymSchema,
    validated.synonymName,
  );

  if (duplicateExists) {
    return apiResponse.badRequest(
      res,
      "A synonym with this schema and name already exists",
    );
  }

  const baseObjectName = buildBaseObjectName(
    validated.objectLinkedServer,
    validated.objectDb,
    validated.objectSchema,
    validated.objectName,
  );

  const qualifiedSynonym = buildQualifiedName([
    validated.synonymSchema,
    validated.synonymName,
  ]);

  await executeQuery(`
    DECLARE @sql NVARCHAR(MAX) = N'CREATE SYNONYM ${qualifiedSynonym} FOR ${baseObjectName}';
    EXEC sp_executesql @sql;
  `);

  const createdRecord = await fetchSynonymBySchemaAndName(
    validated.synonymSchema,
    validated.synonymName,
  );

  apiResponse.created(res, createdRecord, "Synonym created successfully");
}

// PUT - Update existing synonym (drop + recreate)
async function handlePut(req, res) {
  const {
    id,
    sourceSystemId,
    synonymName,
    sourceSchema: synonymSchema,
    objectName,
    objectSchema,
    objectDb,
    objectLinkedServer,
  } = req.body;

  if (!id) {
    return apiResponse.badRequest(res, "Synonym ID is required");
  }

  const parsedId = parseInt(id);
  const existingRecord = await fetchSynonymById(parsedId);

  if (!existingRecord) {
    return apiResponse.notFound(res, "Synonym not found");
  }

  const effectiveSourceSystemId =
    sourceSystemId || existingRecord.sourceSystemId;
  if (!effectiveSourceSystemId) {
    return apiResponse.badRequest(
      res,
      "Source System ID is required to update this synonym",
    );
  }

  const validated = await validateSynonymInput(res, {
    sourceSystemId: effectiveSourceSystemId,
    synonymName,
    synonymSchema,
    objectName,
    objectSchema,
    objectDb,
    objectLinkedServer,
  });

  if (!validated) {
    return;
  }

  const duplicateExists = await synonymExists(
    validated.synonymSchema,
    validated.synonymName,
    parsedId,
  );

  if (duplicateExists) {
    return apiResponse.badRequest(
      res,
      "A synonym with this schema and name already exists",
    );
  }

  await dropSynonym(existingRecord.sourceSchema, existingRecord.synonymName);

  const baseObjectName = buildBaseObjectName(
    validated.objectLinkedServer,
    validated.objectDb,
    validated.objectSchema,
    validated.objectName,
  );

  const qualifiedSynonym = buildQualifiedName([
    validated.synonymSchema,
    validated.synonymName,
  ]);

  await executeQuery(`
    DECLARE @sql NVARCHAR(MAX) = N'CREATE SYNONYM ${qualifiedSynonym} FOR ${baseObjectName}';
    EXEC sp_executesql @sql;
  `);

  const updatedRecord = await fetchSynonymBySchemaAndName(
    validated.synonymSchema,
    validated.synonymName,
  );

  apiResponse.success(res, updatedRecord, "Synonym updated successfully");
}

// DELETE - Drop synonym object
async function handleDelete(req, res) {
  const { id } = req.query;

  if (!id) {
    return apiResponse.badRequest(res, "ID is required");
  }

  const parsedId = parseInt(id);
  const existingRecord = await fetchSynonymById(parsedId);

  if (!existingRecord) {
    return apiResponse.notFound(res, "Synonym not found");
  }

  await dropSynonym(existingRecord.sourceSchema, existingRecord.synonymName);

  apiResponse.success(res, { id: parsedId }, "Synonym deleted successfully");
}

async function validateSynonymInput(res, input) {
  const {
    sourceSystemId,
    synonymName,
    synonymSchema,
    objectName,
    objectSchema,
    objectDb,
    objectLinkedServer,
  } = input;

  if (sourceSystemId === undefined || sourceSystemId === null) {
    apiResponse.badRequest(res, "Source System ID is required");
    return null;
  }

  const parsedSourceSystemId = parseInt(sourceSystemId);
  if (Number.isNaN(parsedSourceSystemId)) {
    apiResponse.badRequest(res, "Source System ID must be a valid number");
    return null;
  }

  const sourceSystem = await getSourceSystemById(parsedSourceSystemId);
  if (!sourceSystem) {
    apiResponse.badRequest(res, "Source System not found");
    return null;
  }

  const resolvedSynonymName = (synonymName || "").trim();
  if (!resolvedSynonymName) {
    apiResponse.badRequest(res, "Synonym name is required");
    return null;
  }

  const resolvedSynonymSchema = (
    synonymSchema ||
    sourceSystem.defaultTargetSchema ||
    "dbo"
  ).trim();

  if (!resolvedSynonymSchema) {
    apiResponse.badRequest(res, "Target schema is required");
    return null;
  }

  const resolvedObjectName = (objectName || "").trim();
  if (!resolvedObjectName) {
    apiResponse.badRequest(res, "Source object name is required");
    return null;
  }

  const resolvedObjectSchema = (
    objectSchema ||
    sourceSystem.defaultSourceSchema ||
    "dbo"
  ).trim();

  if (!resolvedObjectSchema) {
    apiResponse.badRequest(res, "Source object schema is required");
    return null;
  }

  const resolvedDatabaseName = (
    objectDb ||
    sourceSystem.databaseName ||
    ""
  ).trim();
  if (!resolvedDatabaseName) {
    apiResponse.badRequest(
      res,
      "A source database is required either in the request or on the source system configuration",
    );
    return null;
  }

  const linkedServerInput =
    objectLinkedServer === undefined || objectLinkedServer === null
      ? sourceSystem.linkedServerName
      : objectLinkedServer;

  const resolvedLinkedServer =
    linkedServerInput === undefined || linkedServerInput === null
      ? null
      : linkedServerInput.toString().trim() || null;

  const schemaIsPresent = await schemaExists(resolvedSynonymSchema);
  if (!schemaIsPresent) {
    apiResponse.badRequest(
      res,
      `Schema "${resolvedSynonymSchema}" does not exist in the target database`,
    );
    return null;
  }

  return {
    sourceSystemId: parsedSourceSystemId,
    synonymName: resolvedSynonymName,
    synonymSchema: resolvedSynonymSchema,
    objectName: resolvedObjectName,
    objectSchema: resolvedObjectSchema,
    objectDb: resolvedDatabaseName,
    objectLinkedServer: resolvedLinkedServer,
  };
}

async function getSourceSystemById(sourceSystemId) {
  const result = await executeQuery(
    `
      SELECT 
        ID as id,
        SystemName as systemName,
        LinkedServerName as linkedServerName,
        DatabaseName as databaseName,
        DefaultSourceSchema as defaultSourceSchema,
        DefaultTargetSchema as defaultTargetSchema
      FROM pow.SourceSystem
      WHERE ID = @sourceSystemId
    `,
    { sourceSystemId },
  );

  return result.recordset[0] || null;
}

async function schemaExists(schemaName) {
  const result = await executeQuery(
    `SELECT schema_id FROM sys.schemas WHERE name = @schemaName`,
    { schemaName },
  );

  return result.recordset.length > 0;
}

async function synonymExists(schemaName, synonymName, excludeId = null) {
  const result = await executeQuery(
    `
      SELECT s.object_id as id
      FROM sys.synonyms s
      INNER JOIN sys.schemas synSchema ON s.schema_id = synSchema.schema_id
      WHERE synSchema.name = @synonymSchema
        AND s.name = @synonymName
    `,
    { synonymSchema: schemaName, synonymName },
  );

  if (result.recordset.length === 0) {
    return false;
  }

  if (!excludeId) {
    return true;
  }

  return result.recordset.some((row) => row.id !== excludeId);
}

async function fetchSynonymBySchemaAndName(schemaName, synonymName) {
  const result = await executeQuery(
    `${SYNONYM_SELECT_BASE} WHERE synSchema.name = @synonymSchema AND s.name = @synonymName`,
    { synonymSchema: schemaName, synonymName },
  );

  return result.recordset[0] || null;
}

async function fetchSynonymById(id) {
  const result = await executeQuery(
    `${SYNONYM_SELECT_BASE} WHERE s.object_id = @id`,
    { id },
  );

  return result.recordset[0] || null;
}

async function dropSynonym(schemaName, synonymName) {
  const qualifiedName = buildQualifiedName([schemaName, synonymName]);

  await executeQuery(`
    DECLARE @sql NVARCHAR(MAX) = N'DROP SYNONYM ${qualifiedName}';
    EXEC sp_executesql @sql;
  `);
}

function buildBaseObjectName(
  linkedServer,
  databaseName,
  objectSchema,
  objectName,
) {
  const segments = [];
  if (linkedServer) {
    segments.push(quoteIdentifier(linkedServer));
  }
  segments.push(quoteIdentifier(databaseName));
  segments.push(quoteIdentifier(objectSchema));
  segments.push(quoteIdentifier(objectName));
  return segments.join(".");
}

function buildQualifiedName(segments) {
  return segments.map((segment) => quoteIdentifier(segment)).join(".");
}

function quoteIdentifier(value) {
  if (typeof value !== "string") {
    throw new Error("Identifier must be a string");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Identifier cannot be empty");
  }

  const escaped = trimmed.split("]").join("]]");
  return `[${escaped}]`;
}

import { executeQuery } from "@/lib/db";
import type { NextApiRequest, NextApiResponse } from "next";
import type {
  ConfigRecord,
  ConfigGridRow,
  ConfigGridCell,
  ConfigGetResponse,
  ConfigPostRequest,
  ConfigPostResponse,
  ConfigPutRequest,
  ConfigPutResponse,
  ConfigDeleteRequest,
  ConfigDeleteResponse,
  ConfigErrorResponse,
} from "@/types/config";

type ConfigApiResponse =
  | ConfigGetResponse
  | ConfigPostResponse
  | ConfigPutResponse
  | ConfigDeleteResponse
  | ConfigErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConfigApiResponse>
): Promise<void> {
  const { method } = req;

  try {
    if (method === "GET") {
      return await handleGet(req, res);
    } else if (method === "POST") {
      return await handlePost(req, res);
    } else if (method === "PUT") {
      return await handlePut(req, res);
    } else if (method === "DELETE") {
      return await handleDelete(req, res);
    } else {
      return res.status(405).json({
        success: false,
        message: "Method not allowed",
      });
    }
  } catch (error) {
    console.error("Config API error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ConfigGetResponse | ConfigErrorResponse>
): Promise<void> {
  try {
    // Get all config data
    const query = `SELECT * FROM pow.Config`;
    const result = await executeQuery(query, {});
    const allData = result.recordset as ConfigRecord[];

    // Find the current environment (Parameter='CurrentEnvironment', Environment=NULL)
    const currentEnvRecord = allData.find(
      (r) => r.Parameter === "CurrentEnvironment" && r.Environment === null
    );
    const currentEnvironment: string | null = currentEnvRecord
      ? currentEnvRecord.ConfigValue
      : null;

    // Get distinct environments (excluding NULL) - case insensitive
    const environmentsMap = allData
      .filter((r) => r.Environment !== null)
      .reduce((map, r) => {
        const envLower = r.Environment!.toLowerCase();
        if (!map.has(envLower)) {
          map.set(envLower, r.Environment!);
        }
        return map;
      }, new Map<string, string>());
    const environments = Array.from(environmentsMap.values()).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    // Get distinct parameters (excluding 'CurrentEnvironment') - case insensitive
    const parametersMap = allData
      .filter((r) => r.Parameter !== "CurrentEnvironment")
      .reduce((map, r) => {
        const paramLower = r.Parameter!.toLowerCase();
        if (!map.has(paramLower)) {
          map.set(paramLower, r.Parameter!);
        }
        return map;
      }, new Map<string, string>());
    const parameters = Array.from(parametersMap.values()).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    // Build grid structure
    const grid: ConfigGridRow[] = parameters.map((param) => {
      const row: ConfigGridRow = {
        parameter: param,
      };

      // Add a value for each environment (case-insensitive match)
      environments.forEach((env) => {
        const record = allData.find(
          (r) =>
            r.Parameter?.toLowerCase() === param.toLowerCase() &&
            r.Environment?.toLowerCase() === env.toLowerCase()
        );
        const cell: ConfigGridCell = {
          value: record?.ConfigValue || null,
          id: record?.ID || null,
        };
        row[env] = cell;
      });

      return row;
    });

    return res.status(200).json({
      success: true,
      message: "Configuration data retrieved successfully",
      data: {
        currentEnvironment,
        environments,
        parameters,
        grid,
        raw: allData,
      },
    });
  } catch (error) {
    console.error("Error in handleGet for Config:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve configuration data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ConfigPostResponse | ConfigErrorResponse>
): Promise<void> {
  const { parameter, environment, configValue } =
    req.body as ConfigPostRequest;

  if (!parameter) {
    return res.status(400).json({
      success: false,
      message: "Parameter is required",
    });
  }

  try {
    // Check if this parameter/environment combination already exists (case-insensitive)
    const checkQuery = `
      SELECT ID FROM pow.Config 
      WHERE LOWER(Parameter) = LOWER(@parameter) AND 
            ${
              environment === null
                ? "Environment IS NULL"
                : "LOWER(Environment) = LOWER(@environment)"
            }
    `;

    const checkParams: Record<string, string> = { parameter };
    if (environment !== null) {
      checkParams.environment = environment;
    }

    const checkResult = await executeQuery(checkQuery, checkParams);

    if (checkResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Configuration for parameter '${parameter}' in environment '${
          environment || "NULL"
        }' already exists`,
      });
    }

    // Insert new config
    const insertQuery = `
      INSERT INTO pow.Config (Parameter, Environment, ConfigValue)
      OUTPUT INSERTED.*
      VALUES (@parameter, @environment, @configValue)
    `;

    const insertResult = await executeQuery(insertQuery, {
      parameter,
      environment: environment || null,
      configValue: configValue || null,
    });

    return res.status(201).json({
      success: true,
      message: "Configuration created successfully",
      data: insertResult.recordset[0] as ConfigRecord,
    });
  } catch (error) {
    console.error("Create config error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create configuration",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse<ConfigPutResponse | ConfigErrorResponse>
): Promise<void> {
  const { id, configValue } = req.body as ConfigPutRequest;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Configuration ID is required",
    });
  }

  try {
    const updateQuery = `
      UPDATE pow.Config
      SET ConfigValue = @configValue
      WHERE ID = @id
    `;

    const result = await executeQuery(updateQuery, {
      id: parseInt(String(id)),
      configValue: configValue !== undefined ? configValue : null,
    });

    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(200).json({
        success: true,
        message: "Configuration updated successfully",
        data: { id: parseInt(String(id)) },
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }
  } catch (error) {
    console.error("Update config error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update configuration",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<ConfigDeleteResponse | ConfigErrorResponse>
): Promise<void> {
  const { id } = req.body as ConfigDeleteRequest;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Configuration ID is required",
    });
  }

  try {
    const deleteQuery = `
      DELETE FROM pow.Config WHERE ID = @id
    `;

    const result = await executeQuery(deleteQuery, {
      id: parseInt(String(id)),
    });

    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(200).json({
        success: true,
        message: "Configuration deleted successfully",
        data: { id: parseInt(String(id)) },
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }
  } catch (error) {
    console.error("Delete config error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete configuration",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

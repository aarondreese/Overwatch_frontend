/**
 * Database schema types for pow.Config table
 * 
 * Schema:
 * - ID: int (NOT NULL, PRIMARY KEY)
 * - Environment: nvarchar (NULL)
 * - Parameter: nvarchar (NULL)
 * - ConfigValue: nvarchar (NULL)
 */

export interface ConfigRecord {
  ID: number;
  Environment: string | null;
  Parameter: string | null;
  ConfigValue: string | null;
}

export interface ConfigGridCell {
  value: string | null;
  id: number | null;
}

export interface ConfigGridRow {
  parameter: string;
  [environment: string]: string | ConfigGridCell;
}

export interface ConfigGetResponse {
  success: true;
  message: string;
  data: {
    currentEnvironment: string | null;
    environments: string[];
    parameters: string[];
    grid: ConfigGridRow[];
    raw: ConfigRecord[];
  };
}

export interface ConfigPostRequest {
  parameter: string;
  environment: string | null;
  configValue: string | null;
}

export interface ConfigPostResponse {
  success: boolean;
  message: string;
  data?: ConfigRecord;
}

export interface ConfigPutRequest {
  id: number;
  configValue: string | null;
}

export interface ConfigPutResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
  };
}

export interface ConfigDeleteRequest {
  id: number;
}

export interface ConfigDeleteResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
  };
}

export interface ConfigErrorResponse {
  success: false;
  message: string;
  error?: string;
}

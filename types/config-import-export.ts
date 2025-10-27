/**
 * Types for Config Import/Export API
 */

import type { ConfigRecord } from "./config";

export interface ConfigExportItem {
  parameter: string | null;
  environment: string | null;
  configValue: string | null;
}

export interface ConfigExportData {
  exportDate: string;
  currentEnvironment: string | null;
  configurations: ConfigExportItem[];
}

export interface ConfigExportResponse {
  success: boolean;
  data?: ConfigExportData;
  message?: string;
  error?: string;
}

export interface ConfigImportItem {
  parameter: string;
  environment: string | null;
  configValue: string | null;
}

export interface ConfigImportData {
  configurations: ConfigImportItem[];
}

export interface ConfigImportRequest {
  importData: ConfigImportData;
  validateOnly?: boolean;
}

export interface NewRecord {
  parameter: string;
  environment: string | null;
  configValue: string | null;
}

export interface UpdatedRecord {
  parameter: string;
  environment: string | null;
  oldValue: string | null;
  newValue: string | null;
  id: number;
}

export interface UnchangedRecord {
  parameter: string;
  environment: string | null;
  value: string | null;
}

export interface ImportError {
  error: string;
  config: Partial<ConfigImportItem>;
}

export interface ValidationResult {
  totalRecords: number;
  newRecords: NewRecord[];
  updatedRecords: UpdatedRecord[];
  unchangedRecords: UnchangedRecord[];
  errors: ImportError[];
}

export interface ImportSuccessResponse {
  success: true;
  message: string;
  data: {
    imported: true;
    newRecords: number;
    updatedRecords: number;
    unchangedRecords: number;
    errors: number;
  };
}

export interface ValidationResponse {
  success: true;
  message: string;
  data: {
    imported: false;
    validation: ValidationResult;
  };
}

export interface ImportErrorResponse {
  success: false;
  message: string;
  error?: string;
}

export type ConfigImportResponse =
  | ImportSuccessResponse
  | ValidationResponse
  | ImportErrorResponse;

export interface CurrentConfigRecord {
  Parameter: string | null;
  Environment: string | null;
  ConfigValue: string | null;
  ID: number;
}

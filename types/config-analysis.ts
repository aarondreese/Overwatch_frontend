/**
 * Types for Config Usage Analysis API
 */

export interface ProcedureRecord {
  SchemaName: string;
  ObjectName: string;
  ObjectType: string;
  Definition: string;
}

export interface ParameterMatch {
  pattern: string;
  parameter: string;
}

export interface ProcedureDetail {
  schema: string;
  name: string;
  type: string;
  fullName: string;
  referencedParameters: ParameterMatch[];
}

export interface ParameterAnalysis {
  parameter: string;
  exists: boolean;
  usedIn: string[];
}

export interface MissingParameter {
  parameter: string;
  usedIn: string[];
}

export interface ExistingParameter {
  parameter: string;
  usedIn: string[];
}

export interface AnalysisSummary {
  totalProceduresFunctions: number;
  totalReferencedParameters: number;
  missingParametersCount: number;
  existingParametersCount: number;
  unusedParametersCount: number;
}

export interface ConfigAnalysisResponse {
  success: boolean;
  data?: {
    summary: AnalysisSummary;
    existingParameters: string[];
    referencedParameters: string[];
    missingParameters: MissingParameter[];
    existingButReferenced: ExistingParameter[];
    unusedParameters: string[];
    procedureDetails: ProcedureDetail[];
    analysis: ParameterAnalysis[];
  };
  message?: string;
  error?: string;
}

import { useState, useCallback } from "react";
import type {
  ConfigGetResponse,
  ConfigPostResponse,
  ConfigPutResponse,
} from "@/types/config";
import type {
  ConfigExportResponse,
  ConfigImportResponse,
} from "@/types/config-import-export";
import type { ConfigAnalysisResponse } from "@/types/config-analysis";

export function useConfigAPI() {
  const [configData, setConfigData] = useState<ConfigGetResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/Config");
      const result: ConfigGetResponse = await response.json();

      if (result.success) {
        setConfigData(result.data);
        setError(null);
      } else {
        setError(result.message || "Failed to load configuration data");
      }
    } catch (err) {
      console.error("Error fetching configs:", err);
      setError("Failed to load configuration data");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveConfig = useCallback(
    async (
      parameter: string,
      environment: string,
      configValue: string,
      id?: number | null
    ): Promise<boolean> => {
      try {
        if (id) {
          // Update existing
          const response = await fetch("/api/Config", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, configValue }),
          });
          const result: ConfigPutResponse = await response.json();
          
          if (result.success) {
            await fetchConfigs();
            return true;
          } else {
            alert(result.message || "Failed to update configuration");
            return false;
          }
        } else {
          // Create new
          const response = await fetch("/api/Config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ parameter, environment, configValue }),
          });
          const result: ConfigPostResponse = await response.json();
          
          if (result.success) {
            await fetchConfigs();
            return true;
          } else {
            alert(result.message || "Failed to create configuration");
            return false;
          }
        }
      } catch (err) {
        console.error("Error saving config:", err);
        alert("Failed to save configuration");
        return false;
      }
    },
    [fetchConfigs]
  );

  const deleteParameter = useCallback(
    async (parameter: string): Promise<boolean> => {
      const configsToDelete = configData?.raw.filter(
        (c) => c.Parameter === parameter
      );

      if (!configsToDelete) return false;

      try {
        for (const config of configsToDelete) {
          await fetch("/api/Config", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: config.ID }),
          });
        }
        await fetchConfigs();
        return true;
      } catch (err) {
        console.error("Error deleting parameter:", err);
        alert("Failed to delete parameter");
        return false;
      }
    },
    [configData, fetchConfigs]
  );

  const addParameter = useCallback(
    async (parameter: string): Promise<boolean> => {
      if (!configData?.environments || configData.environments.length === 0) {
        alert("Please add an environment first");
        return false;
      }

      try {
        for (const env of configData.environments) {
          const response = await fetch("/api/Config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              parameter,
              environment: env,
              configValue: "",
            }),
          });

          const result: ConfigPostResponse = await response.json();
          if (!result.success) {
            alert(`Failed to add parameter for environment ${env}: ${result.message}`);
            return false;
          }
        }
        await fetchConfigs();
        return true;
      } catch (err) {
        console.error("Error adding parameter:", err);
        alert("Failed to add parameter");
        return false;
      }
    },
    [configData, fetchConfigs]
  );

  const addEnvironment = useCallback(
    async (environment: string): Promise<boolean> => {
      if (!configData?.parameters || configData.parameters.length === 0) {
        alert("Please add a parameter first");
        return false;
      }

      try {
        for (const param of configData.parameters) {
          const response = await fetch("/api/Config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              parameter: param,
              environment,
              configValue: "",
            }),
          });

          const result: ConfigPostResponse = await response.json();
          if (!result.success) {
            alert(`Failed to add environment for parameter ${param}: ${result.message}`);
            return false;
          }
        }
        await fetchConfigs();
        return true;
      } catch (err) {
        console.error("Error adding environment:", err);
        alert("Failed to add environment");
        return false;
      }
    },
    [configData, fetchConfigs]
  );

  const changeCurrentEnvironment = useCallback(
    async (newEnv: string): Promise<boolean> => {
      if (!newEnv) return false;

      try {
        const currentEnvRecord = configData?.raw.find(
          (r) => r.Parameter === "CurrentEnvironment" && r.Environment === null
        );

        const method = currentEnvRecord ? "PUT" : "POST";
        const body = currentEnvRecord
          ? { id: currentEnvRecord.ID, configValue: newEnv }
          : { parameter: "CurrentEnvironment", environment: null, configValue: newEnv };

        const response = await fetch("/api/Config", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const result: ConfigPutResponse | ConfigPostResponse = await response.json();
        if (result.success) {
          await fetchConfigs();
          return true;
        } else {
          alert(result.message || `Failed to ${currentEnvRecord ? 'update' : 'create'} current environment`);
          return false;
        }
      } catch (err) {
        console.error("Error changing current environment:", err);
        alert("Failed to change current environment");
        return false;
      }
    },
    [configData, fetchConfigs]
  );

  const analyzeUsage = useCallback(async (): Promise<ConfigAnalysisResponse["data"] | null> => {
    try {
      const response = await fetch("/api/Config/analyze-usage");
      const result: ConfigAnalysisResponse = await response.json();

      if (result.success) {
        return result.data;
      } else {
        alert(result.message || "Failed to analyze parameter usage");
        return null;
      }
    } catch (err) {
      console.error("Error analyzing usage:", err);
      alert("Failed to analyze parameter usage");
      return null;
    }
  }, []);

  const exportConfig = useCallback(async (): Promise<ConfigExportResponse["data"] | null> => {
    try {
      const response = await fetch("/api/Config/import-export");
      const result: ConfigExportResponse = await response.json();

      if (result.success && result.data) {
        return result.data;
      } else {
        alert(result.message || "Failed to export configuration");
        return null;
      }
    } catch (err) {
      console.error("Error exporting config:", err);
      alert("Failed to export configuration");
      return null;
    }
  }, []);

  const validateImport = useCallback(
    async (importData: any): Promise<ConfigImportResponse | null> => {
      try {
        const response = await fetch("/api/Config/import-export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ importData, validateOnly: true }),
        });

        const result: ConfigImportResponse = await response.json();
        return result;
      } catch (err) {
        console.error("Error validating import:", err);
        alert("Failed to validate import data");
        return null;
      }
    },
    []
  );

  const confirmImport = useCallback(
    async (importData: any): Promise<ConfigImportResponse | null> => {
      try {
        const response = await fetch("/api/Config/import-export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ importData, validateOnly: false }),
        });

        const result: ConfigImportResponse = await response.json();
        
        if (result.success && result.data.imported) {
          await fetchConfigs();
        }
        
        return result;
      } catch (err) {
        console.error("Error importing config:", err);
        alert("Failed to import configuration");
        return null;
      }
    },
    [fetchConfigs]
  );

  return {
    configData,
    loading,
    error,
    fetchConfigs,
    saveConfig,
    deleteParameter,
    addParameter,
    addEnvironment,
    changeCurrentEnvironment,
    analyzeUsage,
    exportConfig,
    validateImport,
    confirmImport,
  };
}

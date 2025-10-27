import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { 
  ArrowLeftIcon, 
  PlusCircleIcon, 
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon
} from "@heroicons/react/24/solid";

export default function ConfigManagement() {
  const [configData, setConfigData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [showAddConfigModal, setShowAddConfigModal] = useState(false);
  const [showAddEnvModal, setShowAddEnvModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importValidation, setImportValidation] = useState(null);
  const [validatingImport, setValidatingImport] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [newParameter, setNewParameter] = useState("");
  const [newEnvironment, setNewEnvironment] = useState("");
  const [changingEnvironment, setChangingEnvironment] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/Config");
      const result = await response.json();

      if (result.success) {
        setConfigData(result.data);
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

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleCellClick = (parameter, environment) => {
    const row = configData?.grid.find(r => r.parameter === parameter);
    const cellData = row?.[environment];
    setEditingCell({ parameter, environment });
    setEditValue(cellData?.value || "");
  };

  const handleSaveCell = async () => {
    if (!editingCell) return;

    const { parameter, environment } = editingCell;
    const row = configData?.grid.find(r => r.parameter === parameter);
    const cellData = row?.[environment];

    try {
      if (cellData?.id) {
        // Update existing config
        const response = await fetch("/api/Config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: cellData.id,
            configValue: editValue
          })
        });

        const result = await response.json();
        if (result.success) {
          await fetchConfigs();
        } else {
          alert(result.message || "Failed to update configuration");
        }
      } else {
        // Create new config for this parameter/environment combination
        const response = await fetch("/api/Config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parameter,
            environment,
            configValue: editValue
          })
        });

        const result = await response.json();
        if (result.success) {
          await fetchConfigs();
        } else {
          alert(result.message || "Failed to create configuration");
        }
      }
    } catch (err) {
      console.error("Error saving config:", err);
      alert("Failed to save configuration");
    } finally {
      setEditingCell(null);
      setEditValue("");
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleAddParameter = async () => {
    if (!newParameter.trim()) {
      alert("Please enter a parameter name");
      return;
    }

    if (configData?.parameters.includes(newParameter)) {
      alert("This parameter already exists");
      return;
    }

    if (!configData?.environments || configData.environments.length === 0) {
      alert("Please add an environment first");
      return;
    }

    try {
      // Create a record for this parameter in EACH environment
      for (const env of configData.environments) {
        const response = await fetch("/api/Config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parameter: newParameter,
            environment: env,
            configValue: ""
          })
        });

        const result = await response.json();
        if (!result.success) {
          alert(`Failed to add parameter for environment ${env}: ${result.message}`);
          return;
        }
      }

      await fetchConfigs();
      setShowAddConfigModal(false);
      setNewParameter("");
    } catch (err) {
      console.error("Error adding parameter:", err);
      alert("Failed to add parameter");
    }
  };

  const handleAddEnvironment = async () => {
    if (!newEnvironment.trim()) {
      alert("Please enter an environment name");
      return;
    }

    if (configData?.environments.includes(newEnvironment)) {
      alert("This environment already exists");
      return;
    }

    if (!configData?.parameters || configData.parameters.length === 0) {
      alert("Please add a parameter first");
      return;
    }

    try {
      // Create a record for EACH parameter in this new environment
      for (const param of configData.parameters) {
        const response = await fetch("/api/Config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parameter: param,
            environment: newEnvironment,
            configValue: "",
            description: ""
          })
        });

        const result = await response.json();
        if (!result.success) {
          alert(`Failed to add environment for parameter ${param}: ${result.message}`);
          return;
        }
      }

      await fetchConfigs();
      setShowAddEnvModal(false);
      setNewEnvironment("");
    } catch (err) {
      console.error("Error adding environment:", err);
      alert("Failed to add environment");
    }
  };

  const handleDeleteParameter = async (parameter) => {
    if (!confirm(`Are you sure you want to delete all configurations for parameter '${parameter}'?`)) {
      return;
    }

    try {
      const configsToDelete = configData?.raw.filter(c => c.Parameter === parameter);
      
      for (const config of configsToDelete) {
        await fetch("/api/Config", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: config.ID })
        });
      }

      await fetchConfigs();
    } catch (err) {
      console.error("Error deleting parameter:", err);
      alert("Failed to delete parameter");
    }
  };

  const handleChangeCurrentEnvironment = async (newEnv) => {
    if (!newEnv) return;

    try {
      setChangingEnvironment(true);
      
      // Find the CurrentEnvironment record
      const currentEnvRecord = configData?.raw.find(
        r => r.Parameter === 'CurrentEnvironment' && r.Environment === null
      );

      if (currentEnvRecord) {
        // Update existing record
        const response = await fetch("/api/Config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: currentEnvRecord.ID,
            configValue: newEnv
          })
        });

        const result = await response.json();
        if (result.success) {
          await fetchConfigs();
        } else {
          alert(result.message || "Failed to update current environment");
        }
      } else {
        // Create new CurrentEnvironment record
        const response = await fetch("/api/Config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parameter: 'CurrentEnvironment',
            environment: null,
            configValue: newEnv
          })
        });

        const result = await response.json();
        if (result.success) {
          await fetchConfigs();
        } else {
          alert(result.message || "Failed to create current environment");
        }
      }
    } catch (err) {
      console.error("Error changing current environment:", err);
      alert("Failed to change current environment");
    } finally {
      setChangingEnvironment(false);
    }
  };

  const handleAnalyzeUsage = async () => {
    try {
      setLoadingAnalysis(true);
      setShowAnalysisModal(true);
      
      const response = await fetch("/api/Config/analyze-usage");
      const result = await response.json();
      
      if (result.success) {
        setAnalysisData(result.data);
      } else {
        alert(result.message || "Failed to analyze parameter usage");
        setShowAnalysisModal(false);
      }
    } catch (err) {
      console.error("Error analyzing usage:", err);
      alert("Failed to analyze parameter usage");
      setShowAnalysisModal(false);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoadingExport(true);
      setShowExportModal(true);
      
      const response = await fetch("/api/Config/import-export");
      const result = await response.json();
      
      if (result.success) {
        setExportData(result.data);
      } else {
        alert(result.message || "Failed to export configuration");
        setShowExportModal(false);
      }
    } catch (err) {
      console.error("Error exporting config:", err);
      alert("Failed to export configuration");
      setShowExportModal(false);
    } finally {
      setLoadingExport(false);
    }
  };

  const handleDownloadExport = () => {
    if (!exportData) return;
    
    const content = JSON.stringify(exportData, null, 2);
    const filename = `config-export-${new Date().toISOString().split('T')[0]}.json`;
    const mimeType = 'application/json';
    
    // Create download
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleCopyExport = () => {
    if (!exportData) return;
    
    const content = JSON.stringify(exportData, null, 2);
    navigator.clipboard.writeText(content).then(() => {
      alert("Configuration copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy:", err);
      alert("Failed to copy to clipboard");
    });
  };

  const handleValidateImport = async () => {
    if (!importText.trim()) {
      alert("Please paste configuration data to import");
      return;
    }

    try {
      setValidatingImport(true);
      
      let importData;
      
      // Try to parse as JSON
      try {
        importData = JSON.parse(importText);
      } catch (parseErr) {
        alert("Invalid JSON format. Please check your data.");
        setValidatingImport(false);
        return;
      }

      // Validate with API
      const response = await fetch("/api/Config/import-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importData,
          validateOnly: true
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setImportValidation(result.data.validation);
      } else {
        alert(result.message || "Failed to validate import data");
      }
    } catch (err) {
      console.error("Error validating import:", err);
      alert("Failed to validate import data");
    } finally {
      setValidatingImport(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importValidation) {
      alert("Please validate the import first");
      return;
    }

    if (importValidation.errors && importValidation.errors.length > 0) {
      alert("Cannot import: there are validation errors");
      return;
    }

    if (!confirm(`Are you sure you want to import ${importValidation.newRecords.length} new records and update ${importValidation.updatedRecords.length} existing records?`)) {
      return;
    }

    try {
      setImportingData(true);
      
      const importData = JSON.parse(importText);

      const response = await fetch("/api/Config/import-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importData,
          validateOnly: false
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Import successful! ${result.data.newRecords} new records added, ${result.data.updatedRecords} records updated.`);
        setShowImportModal(false);
        setImportText("");
        setImportValidation(null);
        await fetchConfigs();
      } else {
        alert(result.message || "Failed to import configuration");
      }
    } catch (err) {
      console.error("Error importing config:", err);
      alert("Failed to import configuration");
    } finally {
      setImportingData(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Configuration Management - Overwatch</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                <ArrowLeftIcon className="h-4 w-4" />
                <span>Back to Main Menu</span>
              </button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-800">Configuration Management</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {configData?.currentEnvironment && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-blue-100 border border-blue-300 rounded-md">
                <span className="text-sm font-medium text-blue-800">
                  Current Environment:
                </span>
                <select
                  value={configData.currentEnvironment}
                  onChange={(e) => handleChangeCurrentEnvironment(e.target.value)}
                  disabled={changingEnvironment}
                  className="text-sm font-bold text-blue-900 bg-blue-50 border border-blue-400 rounded px-2 py-1 cursor-pointer hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {configData.environments.map(env => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex space-x-2">
              <button
                onClick={handleAnalyzeUsage}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
                <span>Analyze Usage</span>
              </button>
              <button
                onClick={() => setShowAddConfigModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <PlusCircleIcon className="h-5 w-5" />
                <span>Add Parameter</span>
              </button>
              <button
                onClick={() => setShowAddEnvModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <PlusCircleIcon className="h-5 w-5" />
                <span>Add Environment</span>
              </button>
            </div>
          </div>
        </div>

        {/* Configuration Grid */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Parameter
                  </th>
                  {configData?.environments.map(env => (
                    <th
                      key={env}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {env}
                      {configData.currentEnvironment === env && (
                        <span className="ml-2 text-blue-600">★</span>
                      )}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {configData?.grid.map(row => (
                  <tr key={row.parameter} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                      {row.parameter}
                    </td>
                    {configData.environments.map(env => {
                      const cellData = row[env];
                      const isEditing = editingCell?.parameter === row.parameter && editingCell?.environment === env;
                      
                      return (
                        <td
                          key={`${row.parameter}-${env}`}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                autoFocus
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') handleSaveCell();
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                              />
                              <button
                                onClick={handleSaveCell}
                                className="text-green-600 hover:text-green-800"
                              >
                                ✓
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-red-600 hover:text-red-800"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleCellClick(row.parameter, env)}
                              className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1 min-h-[28px]"
                              title="Click to edit"
                            >
                              {cellData?.value || <span className="text-gray-400 italic">empty</span>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleDeleteParameter(row.parameter)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete all configurations for this parameter"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {(!configData?.grid || configData.grid.length === 0) && (
          <div className="text-center py-12 text-gray-500">
            No configuration data found. Click &quot;Add Parameter&quot; to get started.
          </div>
        )}

        {/* Import/Export Section */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Import / Export Configuration</h3>
              <p className="text-sm text-gray-600 mt-1">
                Export current configuration or import from another environment
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                <span>Export Configuration</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors shadow-sm"
              >
                <ArrowUpTrayIcon className="h-5 w-5" />
                <span>Import Configuration</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Parameter Modal */}
      {showAddConfigModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Parameter</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parameter Name
                </label>
                <input
                  type="text"
                  value={newParameter}
                  onChange={(e) => setNewParameter(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="e.g., DatabaseConnection"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowAddConfigModal(false);
                  setNewParameter("");
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddParameter}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Environment Modal */}
      {showAddEnvModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Environment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Environment Name
                </label>
                <input
                  type="text"
                  value={newEnvironment}
                  onChange={(e) => setNewEnvironment(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="e.g., Production, Development"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowAddEnvModal(false);
                  setNewEnvironment("");
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEnvironment}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Modal */}
      {showAnalysisModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-4/5 max-w-6xl shadow-lg rounded-md bg-white mb-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium text-gray-900">Parameter Usage Analysis</h3>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {loadingAnalysis ? (
              <div className="text-center py-8">
                <div className="text-lg text-gray-600">Analyzing database...</div>
              </div>
            ) : analysisData ? (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Procedures/Functions</div>
                      <div className="text-2xl font-bold text-gray-900">{analysisData.summary.totalProceduresFunctions}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Referenced Params</div>
                      <div className="text-2xl font-bold text-blue-600">{analysisData.summary.totalReferencedParameters}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Existing</div>
                      <div className="text-2xl font-bold text-green-600">{analysisData.summary.existingParametersCount}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Missing</div>
                      <div className="text-2xl font-bold text-red-600">{analysisData.summary.missingParametersCount}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Unused</div>
                      <div className="text-2xl font-bold text-yellow-600">{analysisData.summary.unusedParametersCount}</div>
                    </div>
                  </div>
                </div>

                {/* Missing Parameters */}
                {analysisData.missingParameters.length > 0 && (
                  <div className="border border-red-200 bg-red-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-3">
                      ⚠️ Missing Parameters ({analysisData.missingParameters.length})
                    </h4>
                    <div className="space-y-3">
                      {analysisData.missingParameters.map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border border-red-200">
                          <div className="font-medium text-red-900">{item.parameter}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            Used in: {item.usedIn.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing Parameters */}
                {analysisData.existingButReferenced.length > 0 && (
                  <div className="border border-green-200 bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-3">
                      ✓ Existing Parameters ({analysisData.existingButReferenced.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analysisData.existingButReferenced.map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border border-green-200">
                          <div className="font-medium text-green-900">{item.parameter}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {item.usedIn.length} reference(s)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unused Parameters */}
                {analysisData.unusedParameters.length > 0 && (
                  <div className="border border-yellow-200 bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-3">
                      ℹ️ Unused Parameters ({analysisData.unusedParameters.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisData.unusedParameters.map((param, idx) => (
                        <span key={idx} className="bg-white px-3 py-1 rounded border border-yellow-200 text-sm">
                          {param}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Procedure Details */}
                <div className="border border-gray-200 bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">
                    Procedure/Function Details ({analysisData.procedureDetails.length})
                  </h4>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {analysisData.procedureDetails.map((proc, idx) => (
                      <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-900">{proc.fullName}</div>
                            <div className="text-xs text-gray-500">{proc.type}</div>
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {proc.referencedParameters.length} param(s)
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {proc.referencedParameters.map((ref, ridx) => (
                            <div key={ridx} className="text-sm flex items-center gap-2">
                              <span className={`font-mono ${
                                analysisData.existingParameters.includes(ref.parameter) 
                                  ? 'text-green-700' 
                                  : 'text-red-700'
                              }`}>
                                {ref.parameter}
                              </span>
                              <span className="text-xs text-gray-500">({ref.pattern})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No analysis data available
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-4/5 max-w-5xl shadow-lg rounded-md bg-white mb-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium text-gray-900">Export Configuration</h3>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setExportData(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {loadingExport ? (
              <div className="text-center py-8">
                <div className="text-lg text-gray-600">Generating export...</div>
              </div>
            ) : exportData ? (
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">
                    Export Date: <span className="font-medium">{new Date(exportData.exportDate).toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Current Environment: <span className="font-medium">{exportData.currentEnvironment || 'None'}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Total Configurations: <span className="font-medium">{exportData.configurations.length}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    JSON Configuration Data:
                  </label>
                  <textarea
                    value={JSON.stringify(exportData, null, 2)}
                    readOnly
                    className="w-full h-96 border border-gray-300 rounded px-3 py-2 font-mono text-sm bg-gray-50"
                  />
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Copy this data to import into another environment
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCopyExport}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Copy to Clipboard
                    </button>
                    <button
                      onClick={handleDownloadExport}
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Download File
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No export data available
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setExportData(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-4/5 max-w-5xl shadow-lg rounded-md bg-white mb-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium text-gray-900">Import Configuration</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportText("");
                  setImportValidation(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Import text area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paste JSON Configuration Data:
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    setImportValidation(null);
                  }}
                  className="w-full h-64 border border-gray-300 rounded px-3 py-2 font-mono text-sm"
                  placeholder='Paste JSON configuration data here...'
                />
              </div>

              {/* Validation button */}
              <div className="flex justify-end">
                <button
                  onClick={handleValidateImport}
                  disabled={validatingImport || !importText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validatingImport ? 'Validating...' : 'Validate Import'}
                </button>
              </div>

              {/* Validation Results */}
              {importValidation && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Validation Results</h4>
                  
                  {/* Summary */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <div className="text-sm text-blue-600">Total Records</div>
                      <div className="text-2xl font-bold text-blue-900">{importValidation.totalRecords}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                      <div className="text-sm text-green-600">New Records</div>
                      <div className="text-2xl font-bold text-green-900">{importValidation.newRecords.length}</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                      <div className="text-sm text-yellow-600">Updates</div>
                      <div className="text-2xl font-bold text-yellow-900">{importValidation.updatedRecords.length}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <div className="text-sm text-gray-600">Unchanged</div>
                      <div className="text-2xl font-bold text-gray-900">{importValidation.unchangedRecords.length}</div>
                    </div>
                  </div>

                  {/* Errors */}
                  {importValidation.errors && importValidation.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                      <h5 className="font-semibold text-red-800 mb-2">Errors ({importValidation.errors.length})</h5>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {importValidation.errors.map((err, idx) => (
                          <div key={idx} className="text-sm text-red-700">{err.error}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Records */}
                  {importValidation.newRecords.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-semibold text-green-800 mb-2">New Records ({importValidation.newRecords.length})</h5>
                      <div className="bg-green-50 border border-green-200 rounded p-3 max-h-48 overflow-y-auto">
                        <div className="space-y-1">
                          {importValidation.newRecords.map((rec, idx) => (
                            <div key={idx} className="text-sm font-mono">
                              <span className="font-semibold">{rec.parameter}</span>
                              <span className="text-gray-600"> ({rec.environment || 'NULL'})</span>
                              <span className="text-gray-500"> = </span>
                              <span className="text-green-700">{rec.configValue || 'null'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Updated Records */}
                  {importValidation.updatedRecords.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-semibold text-yellow-800 mb-2">Updated Records ({importValidation.updatedRecords.length})</h5>
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 max-h-48 overflow-y-auto">
                        <div className="space-y-2">
                          {importValidation.updatedRecords.map((rec, idx) => (
                            <div key={idx} className="text-sm font-mono">
                              <div className="font-semibold">{rec.parameter} ({rec.environment || 'NULL'})</div>
                              <div className="ml-4">
                                <span className="text-red-600 line-through">{rec.oldValue || 'null'}</span>
                                {' → '}
                                <span className="text-green-600">{rec.newValue || 'null'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportText("");
                  setImportValidation(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              {importValidation && importValidation.errors.length === 0 && (
                <button
                  onClick={handleConfirmImport}
                  disabled={importingData}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importingData ? 'Importing...' : `Confirm Import (${importValidation.newRecords.length + importValidation.updatedRecords.length} changes)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

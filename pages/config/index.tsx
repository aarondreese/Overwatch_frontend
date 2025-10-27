import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import Modal from "@/components/Modal";
import ConfigCell from "@/components/ConfigCell";
import { useConfigAPI } from "@/lib/client/useConfigAPI";
import type { ConfigGridCell } from "@/types/config";
import type {
  ConfigExportData,
  ValidationResult,
} from "@/types/config-import-export";
import type { ConfigAnalysisResponse } from "@/types/config-analysis";

interface EditingCell {
  parameter: string;
  environment: string;
}

export default function ConfigManagement() {
  // Use custom hook for API operations
  const {
    configData,
    loading,
    error,
    fetchConfigs,
    saveConfig,
    deleteParameter: apiDeleteParameter,
    addParameter: apiAddParameter,
    addEnvironment: apiAddEnvironment,
    changeCurrentEnvironment: apiChangeCurrentEnvironment,
    analyzeUsage: apiAnalyzeUsage,
    exportConfig: apiExportConfig,
    validateImport: apiValidateImport,
    confirmImport: apiConfirmImport,
  } = useConfigAPI();

  // UI state
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [showAddConfigModal, setShowAddConfigModal] = useState(false);
  const [showAddEnvModal, setShowAddEnvModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState<ConfigExportData | null>(null);
  const [analysisData, setAnalysisData] = useState<
    ConfigAnalysisResponse["data"] | null
  >(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importValidation, setImportValidation] =
    useState<ValidationResult | null>(null);
  const [validatingImport, setValidatingImport] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [newParameter, setNewParameter] = useState("");
  const [newEnvironment, setNewEnvironment] = useState("");
  const [changingEnvironment, setChangingEnvironment] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // Simplified handlers using the custom hook
  const handleCellClick = (parameter: string, environment: string) => {
    const row = configData?.grid.find((r) => r.parameter === parameter);
    const cellData = row?.[environment] as ConfigGridCell | undefined;
    setEditingCell({ parameter, environment });
    setEditValue(cellData?.value || "");
  };

  const handleSaveCell = async () => {
    if (!editingCell) return;
    const { parameter, environment } = editingCell;
    const row = configData?.grid.find((r) => r.parameter === parameter);
    const cellData = row?.[environment] as ConfigGridCell | undefined;

    const success = await saveConfig(
      parameter,
      environment,
      editValue,
      cellData?.id
    );
    if (success) {
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

    const success = await apiAddParameter(newParameter);
    if (success) {
      setShowAddConfigModal(false);
      setNewParameter("");
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

    const success = await apiAddEnvironment(newEnvironment);
    if (success) {
      setShowAddEnvModal(false);
      setNewEnvironment("");
    }
  };

  const handleDeleteParameter = async (parameter: string) => {
    if (
      !confirm(
        `Are you sure you want to delete all configurations for parameter '${parameter}'?`
      )
    ) {
      return;
    }
    await apiDeleteParameter(parameter);
  };

  const handleChangeCurrentEnvironment = async (newEnv: string) => {
    if (!newEnv) return;
    setChangingEnvironment(true);
    await apiChangeCurrentEnvironment(newEnv);
    setChangingEnvironment(false);
  };

  const handleAnalyzeUsage = async () => {
    setLoadingAnalysis(true);
    setShowAnalysisModal(true);
    const data = await apiAnalyzeUsage();
    if (data) {
      setAnalysisData(data);
    } else {
      setShowAnalysisModal(false);
    }
    setLoadingAnalysis(false);
  };

  const handleExport = async () => {
    setLoadingExport(true);
    setShowExportModal(true);
    const data = await apiExportConfig();
    if (data) {
      setExportData(data);
    } else {
      setShowExportModal(false);
    }
    setLoadingExport(false);
  };

  const handleDownloadExport = () => {
    if (!exportData) return;
    const content = JSON.stringify(exportData, null, 2);
    const filename = `config-export-${
      new Date().toISOString().split("T")[0]
    }.json`;
    const blob = new Blob([content], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
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
    navigator.clipboard
      .writeText(content)
      .then(() => alert("Configuration copied to clipboard!"))
      .catch((err) => {
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
      const importData = JSON.parse(importText);
      const result = await apiValidateImport(importData);

      if (result?.success && !result.data.imported) {
        setImportValidation(result.data.validation);
      } else {
        alert(result?.message || "Failed to validate import data");
      }
    } catch (parseErr) {
      alert("Invalid JSON format. Please check your data.");
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
    if (
      !confirm(
        `Are you sure you want to import ${importValidation.newRecords.length} new records and update ${importValidation.updatedRecords.length} existing records?`
      )
    ) {
      return;
    }

    try {
      setImportingData(true);
      const importData = JSON.parse(importText);
      const result = await apiConfirmImport(importData);

      if (result?.success && result.data.imported) {
        alert(
          `Import successful! ${result.data.newRecords} new records added, ${result.data.updatedRecords} records updated.`
        );
        setShowImportModal(false);
        setImportText("");
        setImportValidation(null);
      } else {
        alert(result?.message || "Failed to import configuration");
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
      <div className="flex justify-center items-center bg-gray-50 min-h-screen">
        <div className="text-gray-600 text-xl">Loading configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center bg-gray-50 min-h-screen">
        <div className="text-red-600 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Configuration Management - Overwatch</title>
      </Head>

      <div className="bg-gray-50 p-6 min-h-screen">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <Link
                href="/"
                className="inline-flex items-center text-blue-600 hover:text-blue-800"
              >
                <ArrowLeftIcon className="mr-2 w-4 h-4" />
                Back to Home
              </Link>
              <h1 className="mt-2 font-bold text-gray-900 text-3xl">
                Configuration Management
              </h1>
              <p className="mt-1 text-gray-600">
                Manage configuration parameters across all environments
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleAnalyzeUsage}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 shadow-sm px-6 py-3 rounded-md text-white transition-colors"
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
                <span>Analyze Usage</span>
              </button>
              <button
                onClick={() => setShowAddEnvModal(true)}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 shadow-sm px-6 py-3 rounded-md text-white transition-colors"
              >
                <PlusCircleIcon className="w-5 h-5" />
                <span>Add Environment</span>
              </button>
              <button
                onClick={() => setShowAddConfigModal(true)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 shadow-sm px-6 py-3 rounded-md text-white transition-colors"
              >
                <PlusCircleIcon className="w-5 h-5" />
                <span>Add Parameter</span>
              </button>
            </div>
          </div>

          {/* Current Environment Selector */}
          {configData && (
            <div className="bg-white shadow mb-6 p-6 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">
                    Current Environment
                  </h3>
                  <p className="mt-1 text-gray-600 text-sm">
                    Select the active environment for the application
                  </p>
                </div>
                <select
                  value={configData.currentEnvironment || ""}
                  onChange={(e) =>
                    handleChangeCurrentEnvironment(e.target.value)
                  }
                  disabled={changingEnvironment}
                  className="shadow-sm px-4 py-2 border border-gray-300 focus:border-indigo-500 rounded-md focus:ring-indigo-500"
                >
                  <option value="">Select Environment</option>
                  {configData.environments.map((env) => (
                    <option key={env} value={env}>
                      {env}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Configuration Grid */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="divide-y divide-gray-200 min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="left-0 sticky bg-gray-50 px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Parameter
                    </th>
                    {configData?.environments.map((env) => (
                      <th
                        key={env}
                        className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider"
                      >
                        {env}
                        {env === configData.currentEnvironment && (
                          <span className="bg-green-100 ml-2 px-2 py-1 rounded-full text-green-800 text-xs">
                            Current
                          </span>
                        )}
                      </th>
                    ))}
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {configData?.grid.map((row) => (
                    <tr key={row.parameter} className="hover:bg-gray-50">
                      <td className="left-0 sticky bg-white px-6 py-4 font-medium text-gray-900 text-sm whitespace-nowrap">
                        {row.parameter}
                      </td>
                      {configData.environments.map((env) => {
                        const cellData = row[env];
                        const isEditing =
                          editingCell?.parameter === row.parameter &&
                          editingCell?.environment === env;

                        return (
                          <td
                            key={`${row.parameter}-${env}`}
                            className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap"
                          >
                            <ConfigCell
                              parameter={row.parameter}
                              environment={env}
                              cellData={cellData}
                              isEditing={isEditing}
                              editValue={editValue}
                              onEditValueChange={setEditValue}
                              onCellClick={handleCellClick}
                              onSave={handleSaveCell}
                              onCancel={handleCancelEdit}
                            />
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteParameter(row.parameter)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete all configurations for this parameter"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {(!configData?.grid || configData.grid.length === 0) && (
            <div className="py-12 text-gray-500 text-center">
              No configuration data found. Click &quot;Add Parameter&quot; to
              get started.
            </div>
          )}

          {/* Import/Export Section */}
          <div className="bg-white shadow mt-6 p-6 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-800 text-lg">
                  Import / Export Configuration
                </h3>
                <p className="mt-1 text-gray-600 text-sm">
                  Export current configuration or import from another
                  environment
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleExport}
                  className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 shadow-sm px-6 py-3 rounded-md text-white transition-colors"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  <span>Export Configuration</span>
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 shadow-sm px-6 py-3 rounded-md text-white transition-colors"
                >
                  <ArrowUpTrayIcon className="w-5 h-5" />
                  <span>Import Configuration</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Parameter Modal */}
      <Modal
        isOpen={showAddConfigModal}
        onClose={() => {
          setShowAddConfigModal(false);
          setNewParameter("");
        }}
        title="Add Parameter"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-gray-700 text-sm">
              Parameter Name
            </label>
            <input
              type="text"
              value={newParameter}
              onChange={(e) => setNewParameter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded w-full"
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
            className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleAddParameter}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
          >
            Add
          </button>
        </div>
      </Modal>

      {/* Add Environment Modal */}
      <Modal
        isOpen={showAddEnvModal}
        onClose={() => {
          setShowAddEnvModal(false);
          setNewEnvironment("");
        }}
        title="Add Environment"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-gray-700 text-sm">
              Environment Name
            </label>
            <input
              type="text"
              value={newEnvironment}
              onChange={(e) => setNewEnvironment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded w-full"
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
            className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleAddEnvironment}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white"
          >
            Add
          </button>
        </div>
      </Modal>

      {/* Analysis Modal */}
      <Modal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        title="Parameter Usage Analysis"
        size="xl"
      >
        {loadingAnalysis ? (
          <div className="py-8 text-center">
            <div className="text-gray-600 text-lg">Analyzing database...</div>
          </div>
        ) : analysisData ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="mb-2 font-semibold text-gray-700">Summary</h4>
              <div className="gap-4 grid grid-cols-2 md:grid-cols-5 text-sm">
                <div>
                  <div className="text-gray-600">Procedures/Functions</div>
                  <div className="font-bold text-gray-900 text-2xl">
                    {analysisData.summary.totalProceduresFunctions}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Referenced Params</div>
                  <div className="font-bold text-blue-600 text-2xl">
                    {analysisData.summary.totalReferencedParameters}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Existing</div>
                  <div className="font-bold text-green-600 text-2xl">
                    {analysisData.summary.existingParametersCount}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Missing</div>
                  <div className="font-bold text-red-600 text-2xl">
                    {analysisData.summary.missingParametersCount}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Unused</div>
                  <div className="font-bold text-yellow-600 text-2xl">
                    {analysisData.summary.unusedParametersCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Missing Parameters */}
            {analysisData.missingParameters.length > 0 && (
              <div className="bg-red-50 p-4 border border-red-200 rounded-lg">
                <h4 className="mb-3 font-semibold text-red-800">
                  ⚠️ Missing Parameters ({analysisData.missingParameters.length}
                  )
                </h4>
                <div className="space-y-3">
                  {analysisData.missingParameters.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3 border border-red-200 rounded"
                    >
                      <div className="font-medium text-red-900">
                        {item.parameter}
                      </div>
                      <div className="mt-1 text-gray-600 text-sm">
                        Used in: {item.usedIn.join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Parameters */}
            {analysisData.existingButReferenced.length > 0 && (
              <div className="bg-green-50 p-4 border border-green-200 rounded-lg">
                <h4 className="mb-3 font-semibold text-green-800">
                  ✓ Existing Parameters (
                  {analysisData.existingButReferenced.length})
                </h4>
                <div className="gap-3 grid grid-cols-1 md:grid-cols-2">
                  {analysisData.existingButReferenced.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3 border border-green-200 rounded"
                    >
                      <div className="font-medium text-green-900">
                        {item.parameter}
                      </div>
                      <div className="mt-1 text-gray-600 text-xs">
                        {item.usedIn.length} reference(s)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unused Parameters */}
            {analysisData.unusedParameters.length > 0 && (
              <div className="bg-yellow-50 p-4 border border-yellow-200 rounded-lg">
                <h4 className="mb-3 font-semibold text-yellow-800">
                  ℹ️ Unused Parameters ({analysisData.unusedParameters.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysisData.unusedParameters.map((param, idx) => (
                    <span
                      key={idx}
                      className="bg-white px-3 py-1 border border-yellow-200 rounded text-sm"
                    >
                      {param}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Procedure Details */}
            <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg">
              <h4 className="mb-3 font-semibold text-gray-800">
                Procedure/Function Details (
                {analysisData.procedureDetails.length})
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {analysisData.procedureDetails.map((proc, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-3 border border-gray-200 rounded"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">
                          {proc.fullName}
                        </div>
                        <div className="text-gray-500 text-xs">{proc.type}</div>
                      </div>
                      <span className="bg-blue-100 px-2 py-1 rounded text-blue-800 text-xs">
                        {proc.referencedParameters.length} param(s)
                      </span>
                    </div>
                    <div className="space-y-1 mt-2">
                      {proc.referencedParameters.map((ref, ridx) => (
                        <div
                          key={ridx}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span
                            className={`font-mono ${
                              analysisData.existingParameters.includes(
                                ref.parameter
                              )
                                ? "text-green-700"
                                : "text-red-700"
                            }`}
                          >
                            {ref.parameter}
                          </span>
                          <span className="text-gray-500 text-xs">
                            ({ref.pattern})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-gray-500 text-center">
            No analysis data available
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={() => setShowAnalysisModal(false)}
            className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded text-gray-700"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Configuration"
        size="lg"
      >
        {loadingExport ? (
          <div className="py-8 text-gray-600 text-center">
            Preparing export...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded">
              <pre className="max-h-96 overflow-auto text-sm">
                {JSON.stringify(exportData, null, 2)}
              </pre>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCopyExport}
                className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded text-gray-700"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={handleDownloadExport}
                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white"
              >
                Download JSON
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportText("");
          setImportValidation(null);
        }}
        title="Import Configuration"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-gray-700 text-sm">
              Paste Configuration JSON
            </label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded w-full"
              rows={10}
              placeholder="Paste exported JSON configuration here..."
            />
          </div>

          {importValidation && (
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-semibold text-gray-800">
                Validation Results:
              </h4>
              <ul className="space-y-1 mt-2 text-sm">
                <li className="text-green-600">
                  ✓ {importValidation.newRecords.length} new records
                </li>
                <li className="text-blue-600">
                  ↻ {importValidation.updatedRecords.length} records to update
                </li>
                <li className="text-gray-600">
                  - {importValidation.unchangedRecords.length} unchanged records
                </li>
                {importValidation.errors.length > 0 && (
                  <li className="text-red-600">
                    ✗ {importValidation.errors.length} errors
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setShowImportModal(false);
                setImportText("");
                setImportValidation(null);
              }}
              className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleValidateImport}
              disabled={validatingImport}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 px-4 py-2 rounded text-white"
            >
              {validatingImport ? "Validating..." : "Validate"}
            </button>
            {importValidation && importValidation.errors.length === 0 && (
              <button
                onClick={handleConfirmImport}
                disabled={importingData}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 px-4 py-2 rounded text-white"
              >
                {importingData ? "Importing..." : "Import"}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

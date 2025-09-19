import Head from "next/head";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  listSourceSystems,
  updateSourceSystems,
} from "../../lib/client/sourceSystems";
import { addDomain } from "../api/Domains/index";
import { addSynonym, updateSynonym } from "../api/Synonyms/index";
import { useForm } from "react-hook-form";

import {
  PencilSquareIcon,
  PlusCircleIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";

export default function Sourcesystem() {
  const [systems, setSystems] = useState([]);
  const [selectedSystemID, setSelectedSystemID] = useState(-1);
  const [sourceSystemModalIsOpen, setSourceSystemModalIsOpen] = useState(false);
  const [domainModalIsOpen, setDomainModalIsOpen] = useState(false);
  const [synonymModalIsOpen, setSynonymModalIsOpen] = useState(false);
  const [selectedTabName, setSelectedTabName] = useState("domain-tab");
  const [synonymSearchTerm, setSynonymSearchTerm] = useState("");

  /*Source System Modal Form*/
  const {
    register: registerSourceSystem,
    handleSubmit: handleSubmitSourceSystem,
    reset: resetSourceSystem,
    formState: { errors: errorsSourceSystem },
  } = useForm();

  /*Domain Modal Form*/
  const {
    register: registerDomain,
    handleSubmit: handleSubmitDomain,
    reset: resetDomain,
    formState: { errors: errorsDomain },
  } = useForm();

  /*Synonym Modal Form*/
  const {
    register: registerSynonym,
    handleSubmit: handleSubmitSynonym,
    reset: resetSynonym,
    formState: { errors: errorsSynonym },
  } = useForm();

  const fetchdata = useCallback(async () => {
    try {
      const data = await listSourceSystems();
      console.log("Fetched source systems data:", data);
      setSystems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching source systems:", error);
      setSystems([]);
    }
  }, []);

  const initialLoad = useEffect(() => {
    fetchdata();
  }, [fetchdata]);

  const resetSourceSystemFormData = useCallback(
    (system) => {
      console.log("in resetSourceSystemFormData: ", system);
      if (!system.hasOwnProperty("id")) {
        console.log("no ID property!");
        resetSourceSystem({
          SystemID: -1,
          SystemName: null,
          LinkedServerName: null,
          SourceDatabaseName: null,
          SourceSchemaName: null,
          TargetSchemaName: null,
        });
      } else {
        resetSourceSystem({
          SystemID: system.id,
          SystemName: system.systemName ? system.systemName : null,
          LinkedServerName: system.linkedServerName
            ? system.linkedServerName
            : null,
          SourceDatabaseName: system.databaseName ? system.databaseName : null,
          SourceSchemaName: system.defaultSourceSchema
            ? system.defaultSourceSchema
            : null,
          TargetSchemaName: system.defaultTargetSchema
            ? system.defaultTargetSchema
            : null,
        });
      }
    },
    [resetSourceSystem]
  );

  const resetDomainFormData = useCallback(
    (data) => {
      console.log("in Reset Domain Form Data");
      resetDomain({
        SourceSystemID: selectedSystemID,
        DomainName: null,
      });
    },
    [resetDomain, selectedSystemID]
  );

  async function handleSourceSystemFormSubmit(formData) {
    console.log("in handleSourceSystemFormSubmit: ", formData);
    const res = await updateSourceSystems(formData);
    setSystems(await listSourceSystems());
    setSourceSystemModalIsOpen(false);
  }

  async function handleDomainFormSubmit(formData) {
    console.log("in handleDomainFormSubmit: ", formData);
    const res = await addDomain(formData);
    await fetchdata();
    setDomainModalIsOpen(false);
  }

  async function handleSynonymFormSubmit(formData) {
    console.log("in handleSynonymFormSubmit: ", formData);
    const res = await addSynonym(formData);
    await fetchdata();
    setSynonymModalIsOpen(false);
  }

  const resetSynonymFormData = useCallback(() => {
    console.log("in Reset Synonym Form Data");
    resetSynonym({
      SourceSystemID: selectedSystemID,
      SynonymName: null,
      TableName: null,
      ColumnName: null,
    });
  }, [resetSynonym, selectedSystemID]);

  function filterDomains(systemID) {
    setSelectedSystemID(systemID);
    // Clear search when changing systems
    setSynonymSearchTerm("");
  }

  const selectedSystem = useMemo(() => {
    // Safety check: ensure systems is an array before filtering
    if (!systems || !Array.isArray(systems)) {
      return null;
    }

    const system = systems.filter((s) => s.id === selectedSystemID);
    console.log("SelectedSystem updated: ", system);
    if (system.length > 0) {
      resetSourceSystemFormData(system[0]);
      return system[0];
    } else {
      resetSourceSystemFormData({});
      return null;
    }
  }, [selectedSystemID, systems, resetSourceSystemFormData]);

  // Filter synonyms based on search term
  const filteredSynonyms = useMemo(() => {
    if (!selectedSystem?.synonyms || !synonymSearchTerm.trim()) {
      return selectedSystem?.synonyms || [];
    }

    const searchLower = synonymSearchTerm.toLowerCase();
    return selectedSystem.synonyms.filter(
      (synonym) =>
        synonym.synonymName.toLowerCase().includes(searchLower) ||
        (synonym.tableName &&
          synonym.tableName.toLowerCase().includes(searchLower)) ||
        (synonym.columnName &&
          synonym.columnName.toLowerCase().includes(searchLower)) ||
        synonym.systemID.toString().includes(searchLower)
    );
  }, [selectedSystem?.synonyms, synonymSearchTerm]);

  function openDomainModal() {
    resetDomainFormData();
    setDomainModalIsOpen(true);
    setSourceSystemModalIsOpen(false);
  }
  function closeDomainModal() {
    setDomainModalIsOpen(false);
  }
  function openSynonymModal() {
    resetSynonymFormData();
    setSynonymModalIsOpen(true);
    setSourceSystemModalIsOpen(false);
    setDomainModalIsOpen(false);
  }
  function closeSynonymModal() {
    setSynonymModalIsOpen(false);
  }
  function openSourceSystemModal(systemID) {
    filterDomains(systemID);
    setSourceSystemModalIsOpen(true);
    setDomainModalIsOpen(false);
  }
  function closeSourceSystemModal() {
    setSourceSystemModalIsOpen(false);
  }

  // Modal Component
  const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Source Systems - Overwatch</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">
            Source Systems
          </h1>

          {/* Source Systems Table */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 mb-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Available Source Systems
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Linked Server
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Database
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source Schema
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Target Schema
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {systems &&
                      systems.map((system) => (
                        <tr
                          key={system.id}
                          className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                            system.id === selectedSystemID
                              ? "bg-blue-50 border-l-4 border-blue-500"
                              : ""
                          }`}
                          onClick={() => setSelectedSystemID(system.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {system.systemName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {system.linkedServerName || "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {system.databaseName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {system.defaultSourceSchema}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {system.defaultTargetSchema}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded text-sm transition-colors duration-200 flex items-center gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                openSourceSystemModal(system.id);
                              }}
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    <tr className="bg-gray-50">
                      <td
                        colSpan="5"
                        className="px-6 py-4 text-sm text-gray-500"
                      >
                        Total: {systems.length} source systems
                      </td>
                      <td className="px-6 py-4">
                        <button
                          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded text-sm transition-colors duration-200 flex items-center gap-2"
                          onClick={() => openSourceSystemModal(-1)}
                        >
                          <PlusCircleIcon className="h-4 w-4" />
                          Add New
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex">
                <button
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                    selectedTabName === "domain-tab"
                      ? "border-blue-500 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedTabName("domain-tab")}
                >
                  Domains ({selectedSystem?.domains?.length || 0})
                </button>
                <button
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                    selectedTabName === "synonym-tab"
                      ? "border-blue-500 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedTabName("synonym-tab")}
                >
                  Synonyms ({selectedSystem?.synonyms?.length || 0})
                </button>
                <button
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                    selectedTabName === "dqemail-tab"
                      ? "border-blue-500 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedTabName("dqemail-tab")}
                >
                  DQ Emails
                </button>
              </nav>
            </div>

            {/* Domain Tab Content */}
            <div
              className={`${selectedTabName === "domain-tab" ? "" : "hidden"}`}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {selectedSystemID === -1
                        ? "Domains"
                        : `Domains for ${
                            selectedSystem?.systemName || "Unknown System"
                          }`}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedSystemID === -1
                        ? "Select a source system to view and manage its domains"
                        : "Manage data domains for this source system"}
                    </p>
                  </div>
                  {selectedSystemID !== -1 && (
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200 flex items-center gap-2"
                      onClick={() => openDomainModal()}
                    >
                      <PlusCircleIcon className="h-5 w-5" />
                      Add Domain
                    </button>
                  )}
                </div>

                {selectedSystemID === -1 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg
                        className="mx-auto h-12 w-12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-600 mb-2">
                      No Source System Selected
                    </h4>
                    <p className="text-gray-500">
                      Please select a source system from the table above to view
                      and manage its domains.
                    </p>
                  </div>
                ) : !selectedSystem?.domains ||
                  selectedSystem.domains.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg
                        className="mx-auto h-12 w-12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m0 0V9a2 2 0 012-2h2m5 2v4m0 0h2a2 2 0 002-2V9a2 2 0 00-2-2h-2m0 4V7"
                        />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-600 mb-2">
                      No Domains Found
                    </h4>
                    <p className="text-gray-500 mb-6">
                      This source system doesn't have any domains yet. Create
                      your first domain to get started.
                    </p>
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200 flex items-center gap-2 mx-auto"
                      onClick={() => openDomainModal()}
                    >
                      <PlusCircleIcon className="h-5 w-5" />
                      Create First Domain
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Domain Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedSystem.domains.map((domain) => (
                          <tr key={domain.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                  <span className="text-sm font-medium text-blue-600">
                                    {domain.domainName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {domain.domainName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    ID: {domain.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {domain.createdDate
                                  ? new Date(
                                      domain.createdDate
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex gap-2 justify-end">
                                <button
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Edit Domain"
                                >
                                  <PencilSquareIcon className="h-4 w-4" />
                                </button>
                                <button
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete Domain"
                                >
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Synonym Tab Content */}
            <div
              className={`${selectedTabName === "synonym-tab" ? "" : "hidden"}`}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {selectedSystemID === -1
                        ? "Synonyms"
                        : `Synonyms for ${
                            selectedSystem?.systemName || "Unknown System"
                          }`}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedSystemID === -1
                        ? "Select a source system to view and manage its synonyms"
                        : "Manage table and column synonyms for this source system"}
                    </p>
                  </div>
                  {selectedSystemID !== -1 && (
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200 flex items-center gap-2"
                      onClick={() => openSynonymModal()}
                    >
                      <PlusCircleIcon className="h-5 w-5" />
                      Add Synonym
                    </button>
                  )}
                </div>

                {selectedSystemID === -1 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg
                        className="mx-auto h-12 w-12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-600 mb-2">
                      No Source System Selected
                    </h4>
                    <p className="text-gray-500">
                      Please select a source system from the table above to view
                      and manage its synonyms.
                    </p>
                  </div>
                ) : !selectedSystem?.synonyms ||
                  selectedSystem.synonyms.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg
                        className="mx-auto h-12 w-12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-600 mb-2">
                      No Synonyms Found
                    </h4>
                    <p className="text-gray-500 mb-6">
                      This source system doesn't have any synonyms yet. Use the
                      "Add Synonym" button above to get started.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Search Bar */}
                    <div className="mb-6 flex gap-4 items-center">
                      <div className="flex-1 relative">
                        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search synonyms..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={synonymSearchTerm}
                          onChange={(e) => setSynonymSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                          {filteredSynonyms.length} of{" "}
                          {selectedSystem.synonyms.length} synonyms
                        </span>
                        {synonymSearchTerm && (
                          <button
                            className="text-gray-400 hover:text-gray-600"
                            onClick={() => setSynonymSearchTerm("")}
                            title="Clear search"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Synonyms Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Synonym Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Target
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredSynonyms.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="px-6 py-8 text-center">
                                <div className="text-gray-500">
                                  {synonymSearchTerm ? (
                                    <>
                                      <div className="mb-2">
                                        No synonyms found matching "
                                        {synonymSearchTerm}"
                                      </div>
                                      <button
                                        className="text-blue-600 hover:text-blue-800"
                                        onClick={() => setSynonymSearchTerm("")}
                                      >
                                        Clear search
                                      </button>
                                    </>
                                  ) : (
                                    "No synonyms available"
                                  )}
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredSynonyms.map((synonym) => (
                              <tr
                                key={synonym.systemID}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                                      <span className="text-sm font-medium text-purple-600">
                                        {synonym.synonymName
                                          .charAt(0)
                                          .toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {synonym.synonymName}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        ID: {synonym.systemID}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      synonym.columnName
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {synonym.columnName ? "Column" : "Table"}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {synonym.tableName && (
                                      <div className="font-medium">
                                        {synonym.tableName}
                                      </div>
                                    )}
                                    {synonym.columnName && (
                                      <div className="text-xs text-gray-500">
                                        {synonym.columnName}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Active
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      className="text-blue-600 hover:text-blue-900"
                                      title="Edit Synonym"
                                    >
                                      <PencilSquareIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      className="text-red-600 hover:text-red-900"
                                      title="Delete Synonym"
                                    >
                                      <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DQ Emails Tab Content */}
            <div
              className={`${selectedTabName === "dqemail-tab" ? "" : "hidden"}`}
            >
              <div className="p-6">
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg
                      className="mx-auto h-12 w-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-600 mb-2">
                    DQ Emails
                  </h4>
                  <p className="text-gray-500">
                    Data Quality email configuration will be available soon.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Domain Modal */}
        <Modal
          isOpen={domainModalIsOpen}
          onClose={closeDomainModal}
          title={`Add Domain to ${selectedSystem?.systemName}`}
        >
          <form
            onSubmit={handleSubmitDomain((data) =>
              handleDomainFormSubmit(data)
            )}
            className="space-y-4"
          >
            <input
              type="hidden"
              value={selectedSystem?.id}
              {...registerDomain("SourceSystemID")}
            />
            <div>
              <label
                htmlFor="DomainName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Domain Name
              </label>
              <input
                type="text"
                id="DomainName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter domain name"
                {...registerDomain("DomainName", {
                  required: "Domain name is required",
                })}
              />
              {errorsDomain.DomainName && (
                <p className="mt-1 text-sm text-red-600">
                  {errorsDomain.DomainName.message}
                </p>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
              >
                Create Domain
              </button>
              <button
                type="button"
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded transition-colors duration-200"
                onClick={closeDomainModal}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>

        {/* Synonym Modal */}
        <Modal
          isOpen={synonymModalIsOpen}
          onClose={closeSynonymModal}
          title={`Add Synonym to ${selectedSystem?.systemName}`}
        >
          <form
            onSubmit={handleSubmitSynonym((data) =>
              handleSynonymFormSubmit(data)
            )}
            className="space-y-4"
          >
            <input
              type="hidden"
              value={selectedSystem?.id}
              {...registerSynonym("SourceSystemID")}
            />
            <div>
              <label
                htmlFor="SynonymName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Synonym Name *
              </label>
              <input
                type="text"
                id="SynonymName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter synonym name"
                {...registerSynonym("SynonymName", {
                  required: "Synonym name is required",
                })}
              />
              {errorsSynonym.SynonymName && (
                <p className="mt-1 text-sm text-red-600">
                  {errorsSynonym.SynonymName.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="TableName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Table Name *
              </label>
              <input
                type="text"
                id="TableName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter target table name"
                {...registerSynonym("TableName", {
                  required: "Table name is required",
                })}
              />
              {errorsSynonym.TableName && (
                <p className="mt-1 text-sm text-red-600">
                  {errorsSynonym.TableName.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="ColumnName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Column Name
                <span className="text-xs text-gray-500 ml-2">
                  (Optional - leave blank for table-level synonym)
                </span>
              </label>
              <input
                type="text"
                id="ColumnName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter target column name (optional)"
                {...registerSynonym("ColumnName")}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
              >
                Create Synonym
              </button>
              <button
                type="button"
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded transition-colors duration-200"
                onClick={closeSynonymModal}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>

        {/* Source System Modal */}
        <Modal
          isOpen={sourceSystemModalIsOpen}
          onClose={closeSourceSystemModal}
          title="Source System Maintenance"
        >
          <form
            onSubmit={handleSubmitSourceSystem((data) =>
              handleSourceSystemFormSubmit(data)
            )}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="SystemName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                System Name
              </label>
              <input
                type="text"
                id="SystemName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter system name"
                defaultValue={selectedSystem ? selectedSystem.systemName : ""}
                {...registerSourceSystem("SystemName", {
                  required: "System name is required",
                })}
              />
              {errorsSourceSystem.SystemName && (
                <p className="mt-1 text-sm text-red-600">
                  {errorsSourceSystem.SystemName.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="LinkedServerName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Linked Server Name
                <span className="text-xs text-gray-500 ml-2">(Optional)</span>
              </label>
              <input
                type="text"
                id="LinkedServerName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter linked server name"
                defaultValue={selectedSystem?.linkedServerName || ""}
                {...registerSourceSystem("LinkedServerName")}
              />
            </div>
            <div>
              <label
                htmlFor="SourceDatabaseName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Source Database Name
              </label>
              <input
                type="text"
                id="SourceDatabaseName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter source database name"
                defaultValue={selectedSystem?.databaseName || ""}
                {...registerSourceSystem("SourceDatabaseName", {
                  required: "Database name is required",
                })}
              />
              {errorsSourceSystem.SourceDatabaseName && (
                <p className="mt-1 text-sm text-red-600">
                  {errorsSourceSystem.SourceDatabaseName.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="SourceSchemaName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Default Source Schema
              </label>
              <input
                type="text"
                id="SourceSchemaName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter source schema name"
                defaultValue={selectedSystem?.defaultSourceSchema || ""}
                {...registerSourceSystem("SourceSchemaName", {
                  required: "Source schema is required",
                })}
              />
              {errorsSourceSystem.SourceSchemaName && (
                <p className="mt-1 text-sm text-red-600">
                  {errorsSourceSystem.SourceSchemaName.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="TargetSchemaName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Target Schema in POW
              </label>
              <input
                type="text"
                id="TargetSchemaName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter target schema name"
                defaultValue={selectedSystem?.defaultTargetSchema || ""}
                {...registerSourceSystem("TargetSchemaName", {
                  required: "Target schema is required",
                })}
              />
              {errorsSourceSystem.TargetSchemaName && (
                <p className="mt-1 text-sm text-red-600">
                  {errorsSourceSystem.TargetSchemaName.message}
                </p>
              )}
            </div>
            <input
              type="hidden"
              value={selectedSystem ? selectedSystem.id : -1}
              {...registerSourceSystem("SystemID")}
            />
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
              >
                {selectedSystem
                  ? "Update Source System"
                  : "Create New Source System"}
              </button>
              <button
                type="button"
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded transition-colors duration-200"
                onClick={closeSourceSystemModal}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
}

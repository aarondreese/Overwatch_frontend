import Head from "next/head";
import { useEffect, useState, useCallback } from "react";
import { getDomainByID, updateDomain, addDomain, deleteDomain } from "../../lib/client/domains";
import { listSourceSystems } from "../../lib/client/sourceSystems";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

export default function DomainDetails() {
  const [domain, setDomain] = useState(null);
  const [sourceSystems, setSourceSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [openCheckID, setOpenCheckID] = useState(-1);
  const [backLink, setBackLink] = useState({ url: "/domain", label: "Back to Domains" });

  // Form state
  const [formData, setFormData] = useState({
    domainName: "",
    sourceSystemId: "",
  });

  const router = useRouter();
  const { id, from } = router.query;

  // Determine back link based on 'from' query parameter
  useEffect(() => {
    if (from === "sourcesystem") {
      setBackLink({ url: "/sourcesystem", label: "Back to Source Systems" });
    } else {
      setBackLink({ url: "/domain", label: "Back to Domains" });
    }
  }, [from]);

  // Fetch source systems
  const fetchSourceSystems = useCallback(async () => {
    try {
      const systems = await listSourceSystems();
      setSourceSystems(systems || []);
    } catch (err) {
      console.error("Error fetching source systems:", err);
      setError("Failed to load source systems");
    }
  }, []);

  // Fetch domain data
  const fetchDomain = useCallback(async () => {
    if (id === "new") {
      setIsNew(true);
      setIsEditing(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getDomainByID(id);
      setDomain(data);
      setFormData({
        domainName: data.domainName,
        sourceSystemId: data.sourceSystemId,
      });
    } catch (err) {
      console.error("Error fetching domain:", err);
      setError("Failed to load domain");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!router.isReady) return;
    fetchSourceSystems();
    fetchDomain();
  }, [router.isReady, fetchSourceSystems, fetchDomain]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      if (!formData.domainName.trim()) {
        setError("Domain name is required");
        return;
      }

      if (!formData.sourceSystemId) {
        setError("Source system is required");
        return;
      }

      if (isNew) {
        const newDomain = await addDomain({
          SourceSystemID: parseInt(formData.sourceSystemId),
          DomainName: formData.domainName.trim(),
        });
        // Redirect back to the domain list
        router.push("/domain");
      } else {
        await updateDomain({
          ID: parseInt(id),
          DomainName: formData.domainName.trim(),
        });
        // Refresh domain data
        await fetchDomain();
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Error saving domain:", err);
      setError(err.message || "Failed to save domain");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this domain? This action cannot be undone.")) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await deleteDomain(id);
      router.push("/domain");
    } catch (err) {
      console.error("Error deleting domain:", err);
      setError(err.message || "Failed to delete domain");
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isNew) {
      router.push("/domain");
    } else {
      setFormData({
        domainName: domain.domainName,
        sourceSystemId: domain.sourceSystemId,
      });
      setIsEditing(false);
      setError(null);
    }
  };

  const updateOpenCheckID = (checkId) => {
    setOpenCheckID(checkId === openCheckID ? -1 : checkId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading domain...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{isNew ? "New Domain" : domain?.domainName || "Domain Details"} - Overwatch</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              href={backLink.url}
              className="inline-flex items-center gap-2 px-4 py-2 mb-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              {backLink.label}
            </Link>
            <h1 className="text-3xl font-bold text-gray-800">
              {isNew ? "Create New Domain" : isEditing ? "Edit Domain" : "Domain Details"}
            </h1>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Domain Information Card */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {isNew ? "Domain Information" : "Domain Information"}
              </h2>
              {!isNew && !isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200 flex items-center gap-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Edit
                  </button>
                  {(!domain?.dqchecks || domain.dqchecks.length === 0) && (
                    <button
                      onClick={handleDelete}
                      disabled={isSaving}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Domain Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="domainName"
                    value={formData.domainName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter domain name"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{domain?.domainName || "-"}</p>
                )}
              </div>

              {/* Source System */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source System
                </label>
                {isEditing && isNew ? (
                  <select
                    name="sourceSystemId"
                    value={formData.sourceSystemId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a source system</option>
                    {sourceSystems.map((system) => (
                      <option key={system.id} value={system.id}>
                        {system.systemName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900 py-2">{domain?.sourceSystemName || "-"}</p>
                )}
              </div>

              {/* Domain ID (only shown when viewing existing domain) */}
              {!isNew && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domain ID
                  </label>
                  <p className="text-gray-900 py-2">{domain?.id || "-"}</p>
                </div>
              )}

              {/* Source System ID (only shown when viewing existing domain) */}
              {!isNew && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source System ID
                  </label>
                  <p className="text-gray-900 py-2">{domain?.sourceSystemId || "-"}</p>
                </div>
              )}
            </div>

            {/* Action Buttons (shown when editing) */}
            {isEditing && (
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckIcon className="h-4 w-4" />
                  {isSaving ? "Saving..." : isNew ? "Create Domain" : "Save Changes"}
                </button>
              </div>
            )}
          </div>

          {/* DQ Checks Section (only shown for existing domains) */}
          {!isNew && domain && domain.dqchecks && domain.dqchecks.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Data Quality Checks ({domain.dqchecks.length})
              </h2>

              <div className="space-y-3">
                {domain.dqchecks.map((check) => (
                  <div key={check.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateOpenCheckID(check.id)}
                      className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                        check.id === openCheckID
                          ? "bg-blue-600 text-white"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            check.isActive
                              ? check.id === openCheckID
                                ? "bg-green-100 text-green-800"
                                : "bg-green-100 text-green-800"
                              : check.id === openCheckID
                              ? "bg-gray-100 text-gray-800"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {check.isActive ? "Active" : "Inactive"}
                        </span>
                        <span className="font-medium">{check.functionName}</span>
                      </div>
                      <svg
                        className={`h-5 w-5 transition-transform ${
                          check.id === openCheckID ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {check.id === openCheckID && (
                      <div className="px-4 py-4 bg-white border-t border-gray-200">
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                          <p className="text-gray-600">{check.explain || "No description available"}</p>
                        </div>

                        {check.showMySchedules && check.showMySchedules.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Schedules</h4>
                            <div className="space-y-2">
                              {check.showMySchedules.map((schedule) => (
                                <div
                                  key={schedule.id}
                                  className="bg-gray-50 rounded p-3 text-sm"
                                >
                                  <div className="font-medium text-gray-900 mb-1">
                                    {schedule.title}
                                  </div>
                                  <div className="text-gray-600 space-y-1">
                                    <div>Days: {schedule.days || "Not specified"}</div>
                                    <div>Times: {schedule.times || "Not specified"}</div>
                                    <div>
                                      Bank Holidays: {schedule.includeBankHols ? "Yes" : "No"}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

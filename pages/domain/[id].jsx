import Head from "next/head";
import { useEffect, useState, useCallback } from "react";
import {
  getDomainByID,
  updateDomain,
  addDomain,
  deleteDomain,
} from "../../lib/client/domains";
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
  const [backLink, setBackLink] = useState({
    url: "/domain",
    label: "Back to Domains",
  });

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
    if (
      !confirm(
        "Are you sure you want to delete this domain? This action cannot be undone."
      )
    ) {
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
      <div className="flex justify-center items-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="mx-auto border-blue-600 border-b-2 rounded-full w-12 h-12 animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading domain...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>
          {isNew ? "New Domain" : domain?.domainName || "Domain Details"} -
          Overwatch
        </title>
      </Head>

      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto px-4 py-8 container">
          {/* Header */}
          <div className="mb-6">
            <Link
              href={backLink.url}
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 shadow-sm mb-4 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 text-sm transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              {backLink.label}
            </Link>
            <h1 className="font-bold text-gray-800 text-3xl">
              {isNew
                ? "Create New Domain"
                : isEditing
                ? "Edit Domain"
                : "Domain Details"}
            </h1>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 mb-6 px-4 py-3 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {/* Domain Information Card */}
          <div className="bg-white shadow-lg mb-6 p-6 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-semibold text-gray-800 text-xl">
                {isNew ? "Domain Information" : "Domain Information"}
              </h2>
              {!isNew && !isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium text-white transition-colors duration-200"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit
                  </button>
                  {(!domain?.dqchecks || domain.dqchecks.length === 0) && (
                    <button
                      onClick={handleDelete}
                      disabled={isSaving}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded font-medium text-white transition-colors duration-200"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
              {/* Domain Name */}
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Domain Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="domainName"
                    value={formData.domainName}
                    onChange={handleInputChange}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    placeholder="Enter domain name"
                  />
                ) : (
                  <p className="py-2 text-gray-900">
                    {domain?.domainName || "-"}
                  </p>
                )}
              </div>

              {/* Source System */}
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Source System
                </label>
                {isEditing && isNew ? (
                  <select
                    name="sourceSystemId"
                    value={formData.sourceSystemId}
                    onChange={handleInputChange}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  >
                    <option value="">Select a source system</option>
                    {sourceSystems.map((system) => (
                      <option key={system.id} value={system.id}>
                        {system.systemName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="py-2 text-gray-900">
                    {domain?.sourceSystemName || "-"}
                  </p>
                )}
              </div>

              {/* Domain ID (only shown when viewing existing domain) */}
              {!isNew && (
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Domain ID
                  </label>
                  <p className="py-2 text-gray-900">{domain?.id || "-"}</p>
                </div>
              )}

              {/* Source System ID (only shown when viewing existing domain) */}
              {!isNew && (
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Source System ID
                  </label>
                  <p className="py-2 text-gray-900">
                    {domain?.sourceSystemId || "-"}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons (shown when editing) */}
            {isEditing && (
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50 px-6 py-2 border border-gray-300 rounded-md text-gray-700 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2 rounded-md text-white transition-colors"
                >
                  <CheckIcon className="w-4 h-4" />
                  {isSaving
                    ? "Saving..."
                    : isNew
                    ? "Create Domain"
                    : "Save Changes"}
                </button>
              </div>
            )}
          </div>

          {/* DQ Checks Section (only shown for existing domains) */}
          {!isNew &&
            domain &&
            domain.dqchecks &&
            domain.dqchecks.length > 0 && (
              <div className="bg-white shadow-lg p-6 border border-gray-200 rounded-lg">
                <h2 className="mb-6 font-semibold text-gray-800 text-xl">
                  Data Quality Checks ({domain.dqchecks.length})
                </h2>

                <div className="space-y-3">
                  {domain.dqchecks.map((check) => (
                    <div
                      key={check.id}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
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
                          <span className="font-medium">
                            {check.functionName}
                          </span>
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
                        <div className="bg-white px-4 py-4 border-gray-200 border-t">
                          <div className="mb-4">
                            <h4 className="mb-2 font-medium text-gray-700 text-sm">
                              Description
                            </h4>
                            <p className="text-gray-600">
                              {check.explain || "No description available"}
                            </p>
                          </div>

                          {check.showMySchedules &&
                            check.showMySchedules.length > 0 && (
                              <div>
                                <h4 className="mb-2 font-medium text-gray-700 text-sm">
                                  Schedules
                                </h4>
                                <div className="space-y-2">
                                  {check.showMySchedules.map((schedule) => (
                                    <div
                                      key={schedule.id}
                                      className="bg-gray-50 p-3 rounded text-sm"
                                    >
                                      <div className="mb-1 font-medium text-gray-900">
                                        {schedule.title}
                                      </div>
                                      <div className="space-y-1 text-gray-600">
                                        <div>
                                          Days:{" "}
                                          {schedule.days || "Not specified"}
                                        </div>
                                        <div>
                                          Times:{" "}
                                          {schedule.times || "Not specified"}
                                        </div>
                                        <div>
                                          Bank Holidays:{" "}
                                          {schedule.includeBankHols
                                            ? "Yes"
                                            : "No"}
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

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { listDQChecks, updateDQCheckStatus } from "@/lib/client/dqchecks";
import AddDQCheckModal from '@/components/AddDQCheckModal';

import {
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";

export default function DQChecks() {
  const router = useRouter();
  const [dqChecks, setDQChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter DQ checks based on search term
  const filteredDQChecks = dqChecks.filter(check => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      check.functionName?.toLowerCase().includes(searchLower) ||
      check.domainName?.toLowerCase().includes(searchLower) ||
      check.systemName?.toLowerCase().includes(searchLower)
    );
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listDQChecks();
      setDQChecks(data);
    } catch (error) {
      console.error("Error fetching DQ checks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleToggleStatus(checkId, currentStatus) {
    try {
      await updateDQCheckStatus(checkId, !currentStatus);
      // Refresh the data
      fetchData();
    } catch (error) {
      console.error("Error updating DQ check status:", error);
      // Could add a toast notification here
    }
  }

  function getStatusColor(isActive) {
    return isActive ? "text-green-600" : "text-red-600";
  }

  function getWarningLevelColor(warningLevel) {
    if (warningLevel >= 100) return "bg-orange-100 text-orange-800";
    if (warningLevel >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  }

  function getWarningLevelText(warningLevel) {
    if (warningLevel >= 100) return "Important";
    if (warningLevel >= 50) return "Advisory";
    return "Info";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading DQ checks...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Data Quality Checks</title>
        <meta
          name="description"
          content="Manage and monitor data quality checks"
        />
      </Head>

      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                Data Quality Checks
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add New DQ Check
              </button>
              <div className="text-sm text-gray-600">
                {searchTerm 
                  ? `${filteredDQChecks.length} of ${dqChecks.length} checks found`
                  : `${dqChecks.length} checks found`
                }
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {filteredDQChecks.filter((check) => check.isActive).length}
                  </div>
                  <div className="text-sm text-gray-500">Active Checks</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <XCircleIcon className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {filteredDQChecks.filter((check) => !check.isActive).length}
                  </div>
                  <div className="text-sm text-gray-500">Disabled Checks</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <BeakerIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {filteredDQChecks.filter((check) => check.isInTest).length}
                  </div>
                  <div className="text-sm text-gray-500">In Testing</div>
                </div>
              </div>
            </div>
          </div>

          {/* DQ Checks Table */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Data Quality Checks
                </h2>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by function, domain, or system..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm w-80"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Function Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Domain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      System
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Warning Level
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Schedules
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Results
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDQChecks.map((check) => (
                    <tr
                      key={check.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/dqchecks/${check.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {check.functionName}
                            </div>
                            {check.isInTest && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                <BeakerIcon className="h-3 w-3 mr-1" />
                                Testing
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {check.domainName || "Unknown"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {check.systemName || "Unknown"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(check.id, check.isActive);
                          }}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            check.isActive
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          }`}
                        >
                          {check.isActive ? (
                            <>
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getWarningLevelColor(
                            check.warningLevel
                          )}`}
                        >
                          {getWarningLevelText(check.warningLevel)} (
                          {check.warningLevel})
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          (check.activeScheduleCount || 0) === 0 
                            ? "bg-red-100 text-red-800" 
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {check.activeScheduleCount || 0}/{(check.activeScheduleCount || 0) + (check.inactiveScheduleCount || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                          {check.resultCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dqchecks/${check.id}`);
                            }}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="View details"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredDQChecks.length === 0 && !loading && (
            <div className="text-center py-12">
              <CheckCircleIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? `No DQ checks found matching "${searchTerm}"` : "No DQ checks found"}
              </p>
            </div>
          )}
        </div>
        
        {/* Add DQ Check Modal */}
        <AddDQCheckModal 
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchData(); // Refresh the DQ checks list
            setShowAddModal(false);
          }}
        />
      </div>
    </>
  );
}

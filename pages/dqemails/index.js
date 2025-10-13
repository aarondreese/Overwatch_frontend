import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { listDQEmails, updateDQEmailStatus } from "@/lib/client/dqemails";

import {
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  BeakerIcon,
  PlayIcon,
  PauseIcon,
} from "@heroicons/react/24/solid";

export default function DQEmails() {
  const router = useRouter();
  const [dqEmails, setDQEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter DQ emails based on search term
  const filteredDQEmails = dqEmails.filter(email => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      email.emailName?.toLowerCase().includes(searchLower) ||
      email.description?.toLowerCase().includes(searchLower) ||
      email.emailSubject?.toLowerCase().includes(searchLower) ||
      email.dqCheckFunction?.toLowerCase().includes(searchLower)
    );
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listDQEmails();
      setDQEmails(data);
    } catch (error) {
      console.error("Error fetching DQ emails:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleToggleStatus(emailId, currentStatus) {
    try {
      await updateDQEmailStatus(emailId, !currentStatus);
      // Refresh the data
      fetchData();
    } catch (error) {
      console.error("Error updating DQ email status:", error);
      // Could add a toast notification here
    }
  }

  function getStatusColor(isActive) {
    return isActive ? "text-green-600" : "text-red-600";
  }

  function formatLastRun(lastRunDateTime) {
    if (!lastRunDateTime) return 'Never';
    return new Date(lastRunDateTime).toLocaleString();
  }

  function formatFrequency(frequencyInMinutes) {
    if (!frequencyInMinutes) return 'Not set';
    if (frequencyInMinutes < 60) return `${frequencyInMinutes}m`;
    if (frequencyInMinutes < 1440) return `${Math.floor(frequencyInMinutes / 60)}h`;
    return `${Math.floor(frequencyInMinutes / 1440)}d`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading DQ emails...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Data Quality Emails</title>
        <meta
          name="description"
          content="Manage and monitor data quality email notifications"
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
                Data Quality Emails
              </h1>
            </div>
            <div className="text-sm text-gray-600">
              {searchTerm 
                ? `${filteredDQEmails.length} of ${dqEmails.length} emails found`
                : `${dqEmails.length} emails found`
              }
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {filteredDQEmails.filter((email) => email.isActive).length}
                  </div>
                  <div className="text-sm text-gray-500">Active Emails</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <XCircleIcon className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {filteredDQEmails.filter((email) => !email.isActive).length}
                  </div>
                  <div className="text-sm text-gray-500">Inactive Emails</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <BeakerIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {filteredDQEmails.filter((email) => email.inDev).length}
                  </div>
                  <div className="text-sm text-gray-500">In Development</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <EnvelopeIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {filteredDQEmails.filter((email) => email.dqCheckId).length}
                  </div>
                  <div className="text-sm text-gray-500">Linked to DQ Checks</div>
                </div>
              </div>
            </div>
          </div>

          {/* DQ Emails Table */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Data Quality Emails
                </h2>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name, subject, or function..."
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
                      Email Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DQ Check
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Frequency
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Schedules
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Run
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDQEmails.map((email) => (
                    <tr
                      key={email.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/dqemails/${email.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {email.emailName}
                            </div>
                            {email.inDev && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                <BeakerIcon className="h-3 w-3 mr-1" />
                                Development
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {email.emailSubject || "No subject"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {email.dqCheckFunction || "No DQ Check"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(email.id, email.isActive);
                          }}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            email.isActive
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          }`}
                        >
                          {email.isActive ? (
                            <>
                              <PlayIcon className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <PauseIcon className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {formatFrequency(email.frequencyInMinutes)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          (email.activeScheduleCount || 0) === 0 
                            ? "bg-red-100 text-red-800" 
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {email.activeScheduleCount || 0}/{email.totalScheduleCount || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {formatLastRun(email.lastRunDateTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dqemails/${email.id}`);
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

          {filteredDQEmails.length === 0 && !loading && (
            <div className="text-center py-12">
              <EnvelopeIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? `No DQ emails found matching "${searchTerm}"` : "No DQ emails found"}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
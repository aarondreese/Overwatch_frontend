import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import { listDomains } from "../../lib/client/domains";

import { PlusCircleIcon, ArrowLeftIcon } from "@heroicons/react/24/solid";

export default function Domain() {
  const [domains, setDomains] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("domainName"); // 'domainName' or 'sourceSystemName'
  const [sortDirection, setSortDirection] = useState("asc"); // 'asc' or 'desc'
  const router = useRouter();

  const fetchdata = useCallback(async () => {
    const data = await listDomains();
    console.log(data);
    setDomains(data || []);
  }, []);

  const initialLoad = useEffect(() => {
    fetchdata();
  }, [fetchdata]);

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort domains
  const filteredDomains = useMemo(() => {
    let result = domains;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter((domain) => {
        const domainNameMatch = domain.domainName
          ?.toLowerCase()
          .includes(searchLower);
        const sourceSystemMatch = domain.sourceSystemName
          ?.toLowerCase()
          .includes(searchLower);
        return domainNameMatch || sourceSystemMatch;
      });
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      let aValue = a[sortField] || "";
      let bValue = b[sortField] || "";

      // Convert to lowercase for case-insensitive sorting
      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [domains, searchTerm, sortField, sortDirection]);

  return (
    <>
      <Head>
        <title>Domains - Overwatch</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">
            Domains
          </h1>

          {/* Header Section */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  Back to Main Menu
                </Link>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    All Domains
                  </h2>
                  <p className="text-sm text-gray-600">
                    Manage data domains across all source systems
                  </p>
                </div>
              </div>
              <Link
                href="/domain/new"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200 flex items-center gap-2"
              >
                <PlusCircleIcon className="h-5 w-5" />
                Add Domain
              </Link>
            </div>

            {/* Search Filter */}
            <div className="mt-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by domain name or source system..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
              {searchTerm && (
                <p className="mt-2 text-sm text-gray-600">
                  Found {filteredDomains.length} of {domains.length} domains
                </p>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            {!filteredDomains || filteredDomains.length === 0 ? (
              /* Empty State */
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
                  {searchTerm ? "No Domains Found" : "No Domains Found"}
                </h4>
                <p className="text-gray-500 mb-6">
                  {searchTerm
                    ? "No domains match your search criteria. Try adjusting your search term."
                    : "No domains have been created yet. Create your first domain to get started."}
                </p>
                {!searchTerm && (
                  <Link
                    href="/domain/new"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200 flex items-center gap-2 mx-auto"
                  >
                    <PlusCircleIcon className="h-5 w-5" />
                    Create First Domain
                  </Link>
                )}
              </div>
            ) : (
              /* Domains Table */
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("domainName")}
                          className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                        >
                          Domain
                          <span className="flex flex-col">
                            <svg
                              className={`h-3 w-3 ${
                                sortField === "domainName" &&
                                sortDirection === "asc"
                                  ? "text-blue-600"
                                  : "text-gray-400"
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" />
                            </svg>
                            <svg
                              className={`h-3 w-3 -mt-1 ${
                                sortField === "domainName" &&
                                sortDirection === "desc"
                                  ? "text-blue-600"
                                  : "text-gray-400"
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" />
                            </svg>
                          </span>
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort("sourceSystemName")}
                          className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                        >
                          Source System
                          <span className="flex flex-col">
                            <svg
                              className={`h-3 w-3 ${
                                sortField === "sourceSystemName" &&
                                sortDirection === "asc"
                                  ? "text-blue-600"
                                  : "text-gray-400"
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" />
                            </svg>
                            <svg
                              className={`h-3 w-3 -mt-1 ${
                                sortField === "sourceSystemName" &&
                                sortDirection === "desc"
                                  ? "text-blue-600"
                                  : "text-gray-400"
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" />
                            </svg>
                          </span>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDomains.map((domain) => (
                      <tr
                        key={domain.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/domain/${domain.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                              <span className="text-sm font-medium text-blue-600">
                                {domain.domainName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {domain.domainName}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {domain.sourceSystemName || "Unknown System"}
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
      </div>
    </>
  );
}

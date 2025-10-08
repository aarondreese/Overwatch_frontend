import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { listSchedules, deleteSchedule, updateSchedule } from "../lib/client/schedules";

import {
  PencilSquareIcon,
  PlusCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

export default function Schedules() {
  const router = useRouter();
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleID, setSelectedScheduleID] = useState(null);

  const fetchdata = useCallback(async () => {
    const data = await listSchedules();
    setSchedules(data || []);
  }, []);

  const initialLoad = useEffect(() => {
    fetchdata();
  }, [fetchdata]);

  async function handleDeleteSchedule(scheduleID) {
    if (confirm("Are you sure you want to delete this schedule?")) {
      try {
        await deleteSchedule(scheduleID);
        await fetchdata();
      } catch (error) {
        console.error("Error deleting schedule:", error);
        alert("Failed to delete schedule. Please try again.");
      }
    }
  }

  async function handleToggleStatus(scheduleID, currentStatus) {
    try {
      // Find the current schedule to get all its data
      const currentSchedule = schedules.find(s => s.id === scheduleID);
      if (!currentSchedule) {
        console.error("Schedule not found:", scheduleID);
        return;
      }

      // Create the update DTO with the toggled status
      const updateDTO = {
        ID: scheduleID,
        Title: currentSchedule.title,
        ActiveFrom: currentSchedule.activeFrom,
        ActiveTo: currentSchedule.activeTo,
        IsEnabled: !currentStatus
      };

      await updateSchedule(updateDTO);
      await fetchdata(); // Refresh the data
    } catch (error) {
      console.error("Error updating schedule status:", error);
      alert("Failed to update schedule status. Please try again.");
    }
  }

  // Format date to DD/MM/YY
  function formatDate(dateString) {
    if (!dateString) return "forever";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }

  // Format days string for better readability
  function formatDays(daysString) {
    if (!daysString) return "N/A";
    const dayMap = {
      'Mo': 'Mon',
      'Tu': 'Tue', 
      'We': 'Wed',
      'Th': 'Thu',
      'Fr': 'Fri',
      'Sa': 'Sat',
      'Su': 'Sun'
    };
    
    let result = [];
    for (let i = 0; i < daysString.length; i += 2) {
      const dayCode = daysString.substr(i, 2);
      if (dayCode.trim() && dayMap[dayCode]) {
        result.push(dayMap[dayCode]);
      }
    }
    return result.join(', ') || "N/A";
  }

  return (
    <>
      <Head>
        <title>Schedules - Overwatch</title>
        <meta name="description" content="Manage data quality schedules" />
      </Head>

      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Schedule Management
          </h1>

          {/* Header Section */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  All Schedules
                </h2>
                <p className="text-sm text-gray-600">
                  Manage timing schedules for DQ checks, email dispatch, and event monitoring
                </p>
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center gap-2">
                <PlusCircleIcon className="h-5 w-5" />
                Add Schedule
              </button>
            </div>
          </div>

          {/* Schedules Table */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Schedule Name
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Times
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bank Holidays
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Active Period
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {schedules.map((schedule) => (
                    <tr
                      key={schedule.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedScheduleID === schedule.id ? "bg-blue-50" : ""
                      }`}
                      onClick={() => setSelectedScheduleID(
                        selectedScheduleID === schedule.id ? null : schedule.id
                      )}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {schedule.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={schedule.isEnabled}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(schedule.id, schedule.isEnabled);
                            }}
                            className="sr-only peer"
                          />
                          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          <span className="ml-3 text-sm font-medium text-gray-900">
                            {schedule.isEnabled ? "Enabled" : "Disabled"}
                          </span>
                        </label>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDays(schedule.showMySchedule?.days)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {schedule.showMySchedule?.times || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            schedule.showMySchedule?.includeBankHols
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {schedule.showMySchedule?.includeBankHols ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(schedule.activeFrom)} - {formatDate(schedule.activeTo)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                            Checks: {schedule.dqcheckSchedules?.length || 0}
                          </span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                            Emails: {schedule.dqemailSchedules || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/schedules/${schedule.id}`);
                            }}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Edit Schedule"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          {schedule.dqcheckSchedules?.length === 0 &&
                            schedule.dqemailSchedules === 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSchedule(schedule.id);
                                }}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Delete Schedule"
                              >
                                <XCircleIcon className="h-4 w-4" />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {schedules.length === 0 && (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500">No schedules found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
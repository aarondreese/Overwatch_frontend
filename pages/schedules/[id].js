import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { getScheduleByID, updateSchedule, getScheduleDays, updateScheduleDays, getScheduleHours, updateScheduleHours } from "@/lib/client/schedules";

import {
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

export default function ScheduleDetail() {
  const router = useRouter();
  const { id } = router.query;
  
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Schedule editing state
  const [title, setTitle] = useState("");
  const [activeFrom, setActiveFrom] = useState("");
  const [activeTo, setActiveTo] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  
  // Days and hours state
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedHours, setSelectedHours] = useState([]);
  const [includeBankHols, setIncludeBankHols] = useState(false);
  
  // Original state for change tracking
  const [originalTitle, setOriginalTitle] = useState("");
  const [originalActiveFrom, setOriginalActiveFrom] = useState("");
  const [originalActiveTo, setOriginalActiveTo] = useState("");
  const [originalIsEnabled, setOriginalIsEnabled] = useState(true);
  const [originalDays, setOriginalDays] = useState([]);
  const [originalHours, setOriginalHours] = useState([]);
  const [originalIncludeBankHols, setOriginalIncludeBankHols] = useState(false);

  const days = [
    { code: "Mo", name: "Monday", short: "Mon" },
    { code: "Tu", name: "Tuesday", short: "Tue" },
    { code: "We", name: "Wednesday", short: "Wed" },
    { code: "Th", name: "Thursday", short: "Thu" },
    { code: "Fr", name: "Friday", short: "Fri" },
    { code: "Sa", name: "Saturday", short: "Sat" },
    { code: "Su", name: "Sunday", short: "Sun" },
  ];

  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    if (id) {
      fetchSchedule();
    }
  }, [id]);

  async function fetchSchedule() {
    try {
      setLoading(true);
      
      // Fetch schedule, days, and hours data in parallel
      const [scheduleData, scheduleDaysData, scheduleHoursData] = await Promise.all([
        getScheduleByID(id),
        getScheduleDays(id),
        getScheduleHours(id)
      ]);
      
      setSchedule(scheduleData);
      
      // Set form data
      const titleValue = scheduleData.title || "";
      const activeFromValue = scheduleData.activeFrom ? scheduleData.activeFrom.substring(0, 10) : "";
      const activeToValue = scheduleData.activeTo ? scheduleData.activeTo.substring(0, 10) : "";
      const isEnabledValue = scheduleData.isEnabled;
      const includeBankHolsValue = scheduleDaysData.includeBankHols || false;
      
      setTitle(titleValue);
      setActiveFrom(activeFromValue);
      setActiveTo(activeToValue);
      setIsEnabled(isEnabledValue);
      setIncludeBankHols(includeBankHolsValue);
      
      // Store original values
      setOriginalTitle(titleValue);
      setOriginalActiveFrom(activeFromValue);
      setOriginalActiveTo(activeToValue);
      setOriginalIsEnabled(isEnabledValue);
      setOriginalIncludeBankHols(includeBankHolsValue);
      
      // Set days from ScheduleDay table
      const activeDays = [];
      const dayMapping = {
        monday: "Mo",
        tuesday: "Tu", 
        wednesday: "We",
        thursday: "Th",
        friday: "Fr",
        saturday: "Sa",
        sunday: "Su"
      };
      
      Object.entries(dayMapping).forEach(([dayName, dayCode]) => {
        if (scheduleDaysData[dayName]) {
          activeDays.push(dayCode);
        }
      });
      setSelectedDays(activeDays);
      setOriginalDays([...activeDays]);
      
      // Set hours from ScheduleHour table
      const activeHours = [];
      scheduleHoursData.hours.forEach((isActive, hour) => {
        if (isActive) {
          activeHours.push(hour);
        }
      });
      setSelectedHours(activeHours);
      setOriginalHours([...activeHours]);
      
    } catch (error) {
      console.error("Error fetching schedule:", error);
      alert("Failed to load schedule details.");
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(dayCode) {
    setSelectedDays(prev => 
      prev.includes(dayCode)
        ? prev.filter(d => d !== dayCode)
        : [...prev, dayCode].sort((a, b) => 
            days.findIndex(d => d.code === a) - days.findIndex(d => d.code === b)
          )
    );
  }

  function toggleHour(hour) {
    setSelectedHours(prev =>
      prev.includes(hour)
        ? prev.filter(h => h !== hour)
        : [...prev, hour].sort((a, b) => a - b)
    );
  }

  function formatHour(hour) {
    if (hour === 0) return "12am";
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return "12pm";
    return `${hour - 12}pm`;
  }

  // Check if there are any changes
  function hasChanges() {
    return (
      title !== originalTitle ||
      activeFrom !== originalActiveFrom ||
      activeTo !== originalActiveTo ||
      isEnabled !== originalIsEnabled ||
      includeBankHols !== originalIncludeBankHols ||
      JSON.stringify(selectedDays.sort()) !== JSON.stringify(originalDays.sort()) ||
      JSON.stringify(selectedHours.sort()) !== JSON.stringify(originalHours.sort())
    );
  }

  // Check if the schedule is valid for saving
  function isValidSchedule() {
    return (
      title.trim() !== "" &&
      selectedDays.length > 0 &&
      selectedHours.length > 0
    );
  }

  // Check if save should be enabled
  function canSave() {
    return hasChanges() && isValidSchedule() && !saving;
  }

  // Get color state for a day
  function getDayColorState(dayCode) {
    const wasOriginallyActive = originalDays.includes(dayCode);
    const isCurrentlySelected = selectedDays.includes(dayCode);
    
    if (wasOriginallyActive && isCurrentlySelected) {
      return "blue"; // Original active, still active
    } else if (!wasOriginallyActive && isCurrentlySelected) {
      return "green"; // Added
    } else if (wasOriginallyActive && !isCurrentlySelected) {
      return "red"; // Removed
    } else {
      return "gray"; // Not active originally, not selected now
    }
  }

  // Get color state for an hour
  function getHourColorState(hour) {
    const wasOriginallyActive = originalHours.includes(hour);
    const isCurrentlySelected = selectedHours.includes(hour);
    
    if (wasOriginallyActive && isCurrentlySelected) {
      return "blue"; // Original active, still active
    } else if (!wasOriginallyActive && isCurrentlySelected) {
      return "green"; // Added
    } else if (wasOriginallyActive && !isCurrentlySelected) {
      return "red"; // Removed
    } else {
      return "gray"; // Not active originally, not selected now
    }
  }

  // Get CSS classes for day button based on color state
  function getDayButtonClasses(dayCode) {
    const colorState = getDayColorState(dayCode);
    const baseClasses = "p-4 rounded-lg border-2 transition-all font-medium cursor-pointer";
    
    switch (colorState) {
      case "blue":
        return `${baseClasses} border-blue-500 bg-blue-50 text-blue-700`;
      case "green":
        return `${baseClasses} border-green-500 bg-green-50 text-green-700`;
      case "red":
        return `${baseClasses} border-red-500 bg-red-50 text-red-700`;
      default:
        return `${baseClasses} border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300`;
    }
  }

  // Get CSS classes for hour button based on color state
  function getHourButtonClasses(hour) {
    const colorState = getHourColorState(hour);
    const baseClasses = "p-3 rounded-lg border-2 transition-all font-medium text-sm cursor-pointer";
    
    switch (colorState) {
      case "blue":
        return `${baseClasses} border-blue-500 bg-blue-50 text-blue-700`;
      case "green":
        return `${baseClasses} border-green-500 bg-green-50 text-green-700`;
      case "red":
        return `${baseClasses} border-red-500 bg-red-50 text-red-700`;
      default:
        return `${baseClasses} border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300`;
    }
  }

  // Get color state for schedule enabled toggle
  function getEnabledToggleState() {
    if (originalIsEnabled === isEnabled) {
      return "blue"; // No change from original
    } else if (!originalIsEnabled && isEnabled) {
      return "green"; // Was disabled, now enabled
    } else if (originalIsEnabled && !isEnabled) {
      return "red"; // Was enabled, now disabled
    }
    return "blue";
  }

  // Get color state for bank holidays toggle
  function getBankHolsToggleState() {
    if (originalIncludeBankHols === includeBankHols) {
      return "blue"; // No change from original
    } else if (!originalIncludeBankHols && includeBankHols) {
      return "green"; // Was disabled, now enabled
    } else if (originalIncludeBankHols && !includeBankHols) {
      return "red"; // Was enabled, now disabled
    }
    return "blue";
  }

  // Get CSS classes for toggle switch based on color state
  function getToggleClasses(colorState, isChecked) {
    const baseClasses = "relative w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all";
    
    switch (colorState) {
      case "green":
        return `${baseClasses} bg-gray-200 peer-focus:ring-4 peer-focus:ring-green-300 after:border-gray-300 peer-checked:bg-green-600`;
      case "red":
        return `${baseClasses} bg-gray-200 peer-focus:ring-4 peer-focus:ring-red-300 after:border-gray-300 peer-checked:bg-red-600`;
      default:
        return `${baseClasses} bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 after:border-gray-300 peer-checked:bg-blue-600`;
    }
  }

  async function handleSave() {
    // Validate before saving
    if (!isValidSchedule()) {
      let errorMessage = "Cannot save schedule:\n";
      if (title.trim() === "") {
        errorMessage += "• Schedule name is required\n";
      }
      if (selectedDays.length === 0) {
        errorMessage += "• At least one day must be selected\n";
      }
      if (selectedHours.length === 0) {
        errorMessage += "• At least one hour must be selected\n";
      }
      alert(errorMessage);
      return;
    }

    try {
      setSaving(true);
      
      // Update main schedule
      const updateDTO = {
        ID: parseInt(id),
        Title: title,
        ActiveFrom: activeFrom ? new Date(activeFrom).toISOString() : schedule.activeFrom,
        ActiveTo: activeTo ? new Date(activeTo).toISOString() : null,
        IsEnabled: isEnabled
      };

      // Update schedule days
      const dayMapping = {
        monday: "Mo",
        tuesday: "Tu", 
        wednesday: "We",
        thursday: "Th",
        friday: "Fr",
        saturday: "Sa",
        sunday: "Su"
      };
      
      const scheduleDaysUpdate = {
        monday: selectedDays.includes("Mo"),
        tuesday: selectedDays.includes("Tu"),
        wednesday: selectedDays.includes("We"),
        thursday: selectedDays.includes("Th"),
        friday: selectedDays.includes("Fr"),
        saturday: selectedDays.includes("Sa"),
        sunday: selectedDays.includes("Su"),
        includeBankHols: includeBankHols
      };

      // Update schedule hours
      const scheduleHoursArray = Array(24).fill(false);
      selectedHours.forEach(hour => {
        scheduleHoursArray[hour] = true;
      });

      // Execute all updates in parallel
      await Promise.all([
        updateSchedule(updateDTO),
        updateScheduleDays(parseInt(id), scheduleDaysUpdate),
        updateScheduleHours(parseInt(id), scheduleHoursArray)
      ]);
      
      alert("Schedule updated successfully!");
      router.push("/schedules");
      
    } catch (error) {
      console.error("Error updating schedule:", error);
      alert("Failed to update schedule. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading schedule...</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Schedule not found</p>
          <Link href="/schedules" className="mt-4 text-blue-600 hover:text-blue-800">
            Back to Schedules
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{schedule.title} - Schedule Detail</title>
        <meta name="description" content="Edit schedule details" />
      </Head>

      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Link
                href="/schedules"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Schedules
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                Edit Schedule: {schedule.title}
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              {hasChanges() && (
                <span className="text-sm text-amber-600 font-medium">
                  Unsaved changes
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Schedule Details */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Schedule Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Name *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      title.trim() === "" 
                        ? "border-red-300 focus:ring-red-500" 
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                    placeholder="Enter schedule name"
                  />
                  {title.trim() === "" && (
                    <p className="mt-1 text-sm text-red-600">Schedule name is required</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Active From
                    </label>
                    <input
                      type="date"
                      value={activeFrom}
                      onChange={(e) => setActiveFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Active To (Optional)
                    </label>
                    <input
                      type="date"
                      value={activeTo}
                      onChange={(e) => setActiveTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                      Schedule Enabled
                    </span>
                    {getEnabledToggleState() === "green" && (
                      <span className="text-xs text-green-600 font-medium">(Activated)</span>
                    )}
                    {getEnabledToggleState() === "red" && (
                      <span className="text-xs text-red-600 font-medium">(Deactivated)</span>
                    )}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => setIsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={getToggleClasses(getEnabledToggleState(), isEnabled)}></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                      Include Bank Holidays
                    </span>
                    {getBankHolsToggleState() === "green" && (
                      <span className="text-xs text-green-600 font-medium">(Enabled)</span>
                    )}
                    {getBankHolsToggleState() === "red" && (
                      <span className="text-xs text-red-600 font-medium">(Disabled)</span>
                    )}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeBankHols}
                      onChange={(e) => setIncludeBankHols(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={getToggleClasses(getBankHolsToggleState(), includeBankHols)}></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Usage Information */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Usage Information
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    DQ Checks using this schedule:
                  </span>
                  <button
                    onClick={() => router.push(`/schedules/${id}/usage`)}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer"
                    title="View checks using this schedule"
                  >
                    {schedule.dqcheckSchedules?.length || 0}
                  </button>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Email notifications using this schedule:
                  </span>
                  <button
                    onClick={() => router.push(`/schedules/${id}/usage`)}
                    className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer"
                    title="View emails using this schedule"
                  >
                    {schedule.dqemailSchedules || 0}
                  </button>
                </div>

                {(schedule.dqcheckSchedules?.length > 0 || schedule.dqemailSchedules > 0) && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> This schedule is currently in use. 
                      Changes may affect existing data quality checks and email notifications.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Days Selection */}
          <div className="mt-8 bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Active Days
              </h2>
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded border-2 border-blue-500 bg-blue-50"></div>
                  <span className="text-gray-600">Currently Active</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded border-2 border-green-500 bg-green-50"></div>
                  <span className="text-gray-600">Added</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded border-2 border-red-500 bg-red-50"></div>
                  <span className="text-gray-600">Removed</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded border-2 border-gray-200 bg-gray-50"></div>
                  <span className="text-gray-600">Inactive</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-3">
              {days.map((day) => (
                <button
                  key={day.code}
                  onClick={() => toggleDay(day.code)}
                  className={getDayButtonClasses(day.code)}
                >
                  <div className="text-sm font-medium">{day.short}</div>
                  <div className="text-xs mt-1">{day.name}</div>
                </button>
              ))}
            </div>
            
            {selectedDays.length === 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">
                  ⚠️ No days selected. Please select at least one day for the schedule to be active.
                </p>
              </div>
            )}
          </div>

          {/* Hours Selection */}
          <div className="mt-8 bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Active Hours
              </h2>
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded border-2 border-blue-500 bg-blue-50"></div>
                  <span className="text-gray-600">Currently Active</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded border-2 border-green-500 bg-green-50"></div>
                  <span className="text-gray-600">Added</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded border-2 border-red-500 bg-red-50"></div>
                  <span className="text-gray-600">Removed</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded border-2 border-gray-200 bg-gray-50"></div>
                  <span className="text-gray-600">Inactive</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3">
              {hours.map((hour) => (
                <button
                  key={hour}
                  onClick={() => toggleHour(hour)}
                  className={getHourButtonClasses(hour)}
                >
                  {formatHour(hour)}
                </button>
              ))}
            </div>
            
            <div className="mt-4 flex space-x-3">
              <button
                onClick={() => setSelectedHours([9, 10, 11, 12, 13, 14, 15, 16, 17])}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
              >
                Business Hours (9am-5pm)
              </button>
              <button
                onClick={() => setSelectedHours(hours)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
              >
                All Hours
              </button>
              <button
                onClick={() => setSelectedHours([])}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
              >
                Clear All
              </button>
            </div>
            
            {selectedHours.length === 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">
                  ⚠️ No hours selected. Please select at least one hour for the schedule to be active.
                </p>
              </div>
            )}
          </div>

          {/* Save Button - Fixed at bottom */}
          <div className="mt-8 bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                {!isValidSchedule() ? (
                  <div className="text-sm text-red-600">
                    <p className="font-medium mb-1">Cannot save schedule:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {title.trim() === "" && <li>Schedule name is required</li>}
                      {selectedDays.length === 0 && <li>At least one day must be selected</li>}
                      {selectedHours.length === 0 && <li>At least one hour must be selected</li>}
                    </ul>
                  </div>
                ) : hasChanges() ? (
                  <p className="text-sm text-amber-600">
                    You have unsaved changes. Click "Save Changes" to apply them.
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    No changes made to this schedule.
                  </p>
                )}
              </div>
              <div className="flex space-x-3">
                <Link
                  href="/schedules"
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md font-medium transition-colors"
                >
                  Cancel
                </Link>
                <button
                  onClick={handleSave}
                  disabled={!canSave()}
                  className={`px-6 py-2 rounded-md font-medium transition-colors flex items-center ${
                    canSave()
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
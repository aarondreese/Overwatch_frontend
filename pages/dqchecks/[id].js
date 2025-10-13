import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import RunHistoryModal from '@/components/RunHistoryModal';
import { 
  getDQCheckByID, 
  updateDQCheckStatus, 
  updateDQCheckLifetime,
  updateDQCheckWarningLevel,
  updateDQCheckExplanation,
  updateDQCheckTestStatus
} from "@/lib/client/dqchecks";

import {
  CheckCircleIcon,
  XCircleIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";

export default function DQCheckDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [dqCheck, setDQCheck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingLifetime, setEditingLifetime] = useState(false);
  const [editingWarningLevel, setEditingWarningLevel] = useState(false);
  const [editingExplanation, setEditingExplanation] = useState(false);
  const [lifetimeValue, setLifetimeValue] = useState("");
  const [warningLevelValue, setWarningLevelValue] = useState("");
  const [explanationValue, setExplanationValue] = useState("");
  const [scheduleRelationships, setScheduleRelationships] = useState([]);
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [selectedScheduleToAdd, setSelectedScheduleToAdd] = useState('');
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [deletingRelationships, setDeletingRelationships] = useState(new Set());
  const [showRunHistoryModal, setShowRunHistoryModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDQCheck();
      loadScheduleData();
    }
  }, [id]);

  // Update DQ check counts when schedule relationships change
  useEffect(() => {
    if (dqCheck && scheduleRelationships.length >= 0) {
      updateLocalScheduleCounts();
    }
  }, [scheduleRelationships]);

  function updateLocalScheduleCounts() {
    if (!dqCheck) return;
    
    // Calculate new counts from current relationships
    const activeCount = scheduleRelationships.filter(rel => 
      rel.isEnabled && rel.schedule.isEnabled
    ).length;
    
    const inactiveCount = scheduleRelationships.filter(rel => 
      !rel.isEnabled || !rel.schedule.isEnabled
    ).length;
    
    // Update local DQ check state
    setDQCheck(prev => ({
      ...prev,
      activeScheduleCount: activeCount,
      inactiveScheduleCount: inactiveCount,
      scheduleCount: activeCount // Keep for backward compatibility
    }));
  }

  async function loadScheduleData() {
    if (!id) return;
    
    setLoadingSchedules(true);
    try {
      // Load relationships and available schedules in parallel
      const [relationshipsRes, schedulesRes] = await Promise.all([
        fetch(`/api/DQChecks/${id}/schedules`),
        fetch('/api/Schedules')
      ]);

      const relationshipsData = await relationshipsRes.json();
      const schedulesData = await schedulesRes.json();

      if (relationshipsData.success && schedulesData.success) {
        setScheduleRelationships(relationshipsData.data);
        
        // Filter available schedules
        const assignedIds = relationshipsData.data.map(rel => rel.scheduleId);
        const available = schedulesData.data.filter(schedule => 
          !assignedIds.includes(schedule.id) && schedule.isEnabled
        );
        setAvailableSchedules(available);
      }
    } catch (error) {
      console.error('Error loading schedule data:', error);
    } finally {
      setLoadingSchedules(false);
    }
  }

  async function fetchDQCheck() {
    if (!id) {
      console.error("No ID available for fetching DQ check");
      return;
    }
    
    try {
      setLoading(true);
      const data = await getDQCheckByID(id);
      setDQCheck(data);
    } catch (error) {
      console.error("Error fetching DQ check:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus() {
    if (!dqCheck) return;
    
    try {
      await updateDQCheckStatus(dqCheck.id, !dqCheck.isActive);
      // Update local state
      setDQCheck({ ...dqCheck, isActive: !dqCheck.isActive });
    } catch (error) {
      console.error("Error updating DQ check status:", error);
    }
  }

  async function handleToggleTestStatus() {
    if (!dqCheck) return;
    
    try {
      await updateDQCheckTestStatus(dqCheck.id, !dqCheck.isInTest);
      setDQCheck({ ...dqCheck, isInTest: !dqCheck.isInTest });
    } catch (error) {
      console.error("Error updating test status:", error);
    }
  }

  function handleEditLifetime() {
    setLifetimeValue(dqCheck.lifetime?.toString() || "");
    setEditingLifetime(true);
  }

  function handleEditWarningLevel() {
    setWarningLevelValue(dqCheck.warningLevel?.toString() || "");
    setEditingWarningLevel(true);
  }

  async function handleSaveLifetime() {
    const value = parseInt(lifetimeValue);
    if (isNaN(value) || value < 0 || value > 9999) {
      alert("Lifetime must be a number between 0 and 9999");
      return;
    }
    
    try {
      await updateDQCheckLifetime(dqCheck.id, value);
      setDQCheck({ ...dqCheck, lifetime: value });
      setEditingLifetime(false);
    } catch (error) {
      console.error("Error updating lifetime:", error);
      alert("Failed to update lifetime. Please try again.");
    }
  }

  async function handleSaveWarningLevel() {
    const value = parseInt(warningLevelValue);
    if (isNaN(value) || value < 1 || value > 100) {
      alert("Warning Level must be a number between 1 and 100");
      return;
    }
    
    try {
      await updateDQCheckWarningLevel(dqCheck.id, value);
      setDQCheck({ ...dqCheck, warningLevel: value });
      setEditingWarningLevel(false);
    } catch (error) {
      console.error("Error updating warning level:", error);
      alert("Failed to update warning level. Please try again.");
    }
  }

  function handleCancelLifetime() {
    setEditingLifetime(false);
    setLifetimeValue("");
  }

  function handleCancelWarningLevel() {
    setEditingWarningLevel(false);
    setWarningLevelValue("");
  }

  function handleEditExplanation() {
    setExplanationValue(dqCheck.explain || "");
    setEditingExplanation(true);
  }

  async function handleSaveExplanation() {
    try {
      await updateDQCheckExplanation(dqCheck.id, explanationValue);
      setDQCheck({ ...dqCheck, explain: explanationValue });
      setEditingExplanation(false);
    } catch (error) {
      console.error("Error updating explanation:", error);
      alert("Failed to update explanation. Please try again.");
    }
  }

  function handleCancelExplanation() {
    setEditingExplanation(false);
    setExplanationValue("");
  }

  async function handleToggleScheduleRelationship(relationshipId, scheduleId, currentEnabled) {
    try {
      const response = await fetch('/api/DQCheck_Schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dqCheckId: id,
          scheduleId: scheduleId,
          isEnabled: !currentEnabled
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Update local state immediately
        setScheduleRelationships(prev => 
          prev.map(rel => 
            rel.relationshipId === relationshipId 
              ? { ...rel, isEnabled: !currentEnabled }
              : rel
          )
        );
      } else {
        alert(`Failed to update schedule relationship: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating schedule relationship:', error);
      alert('Failed to update schedule relationship');
    }
  }

  async function handleAddScheduleRelationship() {
    if (!selectedScheduleToAdd) return;

    try {
      setAddingSchedule(true);
      const response = await fetch('/api/DQCheck_Schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dqCheckId: id,
          scheduleId: parseInt(selectedScheduleToAdd)
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Find the selected schedule and create relationship object
        const selectedSchedule = availableSchedules.find(s => s.id === parseInt(selectedScheduleToAdd));
        if (selectedSchedule) {
          const newRelationship = {
            relationshipId: `temp_${Date.now()}`,
            dqCheckId: id,
            scheduleId: selectedSchedule.id,
            isEnabled: true,
            schedule: {
              id: selectedSchedule.id,
              title: selectedSchedule.title,
              isEnabled: selectedSchedule.isEnabled,
              activeFrom: selectedSchedule.activeFrom,
              activeTo: selectedSchedule.activeTo,
              days: selectedSchedule.showMySchedule?.days || '',
              times: selectedSchedule.showMySchedule?.times || ''
            }
          };

          // Update local state
          setScheduleRelationships(prev => [...prev, newRelationship]);
          setAvailableSchedules(prev => prev.filter(s => s.id !== selectedSchedule.id));
          setSelectedScheduleToAdd('');
        }
      } else {
        alert(`Failed to add schedule relationship: ${result.message}`);
      }
    } catch (error) {
      console.error('Error adding schedule relationship:', error);
      alert('Failed to add schedule relationship');
    } finally {
      setAddingSchedule(false);
    }
  }

  async function handleDeleteScheduleRelationship(relationshipId, scheduleId, scheduleName) {
    const confirmed = window.confirm(
      `Are you sure you want to delete the relationship with "${scheduleName}"?`
    );
    if (!confirmed) return;

    try {
      setDeletingRelationships(prev => new Set([...prev, relationshipId]));
      
      const response = await fetch('/api/DQCheck_Schedule', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dqCheckId: id,
          scheduleId: scheduleId
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Find deleted relationship to add back to available
        const deletedRel = scheduleRelationships.find(rel => rel.relationshipId === relationshipId);
        
        // Remove from relationships
        setScheduleRelationships(prev => 
          prev.filter(rel => rel.relationshipId !== relationshipId)
        );

        // Add back to available if enabled
        if (deletedRel?.schedule.isEnabled) {
          const scheduleToAddBack = {
            id: deletedRel.schedule.id,
            title: deletedRel.schedule.title,
            isEnabled: deletedRel.schedule.isEnabled,
            activeFrom: deletedRel.schedule.activeFrom,
            activeTo: deletedRel.schedule.activeTo,
            showMySchedule: {
              days: deletedRel.schedule.days,
              times: deletedRel.schedule.times
            }
          };
          setAvailableSchedules(prev => [...prev, scheduleToAddBack].sort((a, b) => a.title.localeCompare(b.title)));
        }
      } else {
        alert(`Failed to delete schedule relationship: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting schedule relationship:', error);
      alert('Failed to delete schedule relationship');
    } finally {
      setDeletingRelationships(prev => {
        const newSet = new Set(prev);
        newSet.delete(relationshipId);
        return newSet;
      });
    }
  }



  function getWarningLevelColor(warningLevel) {
    if (warningLevel >= 100) return "bg-orange-100 text-orange-800 border-orange-200";
    if (warningLevel >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-green-100 text-green-800 border-green-200";
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
          <p className="mt-4 text-gray-600">Loading DQ check details...</p>
        </div>
      </div>
    );
  }

  if (!dqCheck) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-24 w-24 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">DQ Check Not Found</h2>
          <p className="text-gray-600 mb-4">The requested DQ check could not be found.</p>
          <Link
            href="/dqchecks"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to DQ Checks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{dqCheck.functionName} - DQ Check Details</title>
        <meta name="description" content={`Details for DQ check: ${dqCheck.functionName}`} />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Link
                href="/dqchecks"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to DQ Checks
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                {dqCheck.functionName}
              </h1>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* First Row - Basic Information and Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Basic Information */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Basic Information
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Function Name
                      </label>
                      <p className="mt-1 text-sm text-gray-900">{dqCheck.functionName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Domain
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {dqCheck.domainName || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Source System
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {dqCheck.systemName || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Warning Level
                      </label>
                      {editingWarningLevel ? (
                        <div className="mt-1 flex items-center space-x-2">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={warningLevelValue}
                            onChange={(e) => setWarningLevelValue(e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="1-100"
                          />
                          <button
                            onClick={handleSaveWarningLevel}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelWarningLevel}
                            className="px-2 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getWarningLevelColor(dqCheck.warningLevel)}`}>
                            {getWarningLevelText(dqCheck.warningLevel)} ({dqCheck.warningLevel})
                          </span>
                          <button
                            onClick={handleEditWarningLevel}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                            title="Edit Warning Level"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Status */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dqCheck.isActive}
                          onChange={handleToggleStatus}
                          className="sr-only peer"
                        />
                        <div className={`relative w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                          dqCheck.isActive 
                            ? "bg-green-600 peer-checked:after:translate-x-full peer-checked:after:border-white" 
                            : "bg-red-600"
                        }`}></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">In Testing</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dqCheck.isInTest}
                          onChange={handleToggleTestStatus}
                          className="sr-only peer"
                        />
                        <div className={`relative w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                          dqCheck.isInTest 
                            ? "bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white" 
                            : "bg-gray-400"
                        }`}></div>
                      </label>
                    </div>
                    {editingLifetime ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <span className="text-sm text-gray-600">Lifetime</span>
                            <div className="relative group">
                              <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                              <div className="absolute right-0 top-6 hidden group-hover:block z-20 w-64">
                                <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
                                  This is the number of days after we last saw an issue to consider it 'spent'. If we see it again AFTER this period, we will treat it as a NEW issue.
                                  <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 rotate-45"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            max="9999"
                            value={lifetimeValue}
                            onChange={(e) => setLifetimeValue(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0-9999"
                          />
                          <span className="text-xs text-gray-500">days</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSaveLifetime}
                            className="flex-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelLifetime}
                            className="flex-1 px-3 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span className="text-sm text-gray-600">Lifetime</span>
                          <div className="relative group">
                            <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute right-0 top-6 hidden group-hover:block z-20 w-64">
                              <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
                                This is the number of days after we last saw an issue to consider it 'spent'. If we see it again AFTER this period, we will treat it as a NEW issue.
                                <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 rotate-45"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-900">
                            {dqCheck.lifetime ? `${dqCheck.lifetime} days` : 'Not set'}
                          </span>
                          <button
                            onClick={handleEditLifetime}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                            title="Edit Lifetime"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Second Row - Description & Context (Full Width) */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Description & Context
                </h2>
                {!editingExplanation && (
                  <button
                    onClick={handleEditExplanation}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                    title="Edit Description"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              {editingExplanation ? (
                <div className="space-y-3">
                  <textarea
                    value={explanationValue}
                    onChange={(e) => setExplanationValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows="4"
                    placeholder="Describe why this check is important and how to fix issues in the source system..."
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveExplanation}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelExplanation}
                      className="px-4 py-2 bg-gray-400 text-white text-sm rounded hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {dqCheck.explain ? (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {dqCheck.explain}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      No description provided. Click the edit icon to add context about why this check is important and how to fix issues.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Third Row - Usage Statistics and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Usage Statistics */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Usage Statistics
                  </h2>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <CalendarDaysIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-blue-600">
                          {dqCheck.activeScheduleCount || 0}
                        </div>
                        <div className="text-sm text-gray-600">Active Schedules</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <CalendarDaysIcon className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-gray-600">
                          {dqCheck.inactiveScheduleCount || 0}
                        </div>
                        <div className="text-sm text-gray-600">Inactive Schedules</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <button
                        onClick={() => setShowRunHistoryModal(true)}
                        className="w-full bg-green-50 hover:bg-green-100 rounded-lg p-4 transition-colors cursor-pointer"
                      >
                        <ChartBarIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-green-600">
                          {dqCheck.resultCount || 0}
                        </div>
                        <div className="text-sm text-gray-600">Total Results</div>
                        <div className="text-xs text-gray-500 mt-1">Click for history</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add New Schedule Relationship */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add Schedule</h3>
                
                {loadingSchedules ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600 text-sm">Loading...</p>
                  </div>
                ) : availableSchedules.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-sm">All active schedules are already assigned</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select
                      value={selectedScheduleToAdd}
                      onChange={(e) => setSelectedScheduleToAdd(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                      disabled={addingSchedule}
                    >
                      <option value="">Select a schedule...</option>
                      {availableSchedules.map((schedule) => (
                        <option key={schedule.id} value={schedule.id}>
                          {schedule.title}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddScheduleRelationship}
                      disabled={!selectedScheduleToAdd || addingSchedule}
                      className="w-full px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      {addingSchedule ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <PlusIcon className="h-4 w-4" />
                          <span>Add Schedule</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule Relationships Section */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Schedules ({scheduleRelationships.length})
              </h2>
              
              {loadingSchedules ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading schedule relationships...</p>
                </div>
              ) : scheduleRelationships.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <CalendarDaysIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No schedule relationships configured</p>
                  <p className="text-gray-400 text-xs mt-1">Add schedules using the panel above</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {scheduleRelationships.map((relationship) => {
                    const isDeleting = deletingRelationships.has(relationship.relationshipId);
                    return (
                      <div 
                        key={relationship.relationshipId} 
                        className={`border border-gray-200 rounded-lg p-4 bg-white transition-all duration-300 ${
                          isDeleting ? 'opacity-50 scale-95' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h5 className="text-sm font-medium">
                              <Link
                                href={`/schedules/${relationship.scheduleId}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                              >
                                {relationship.schedule.title}
                              </Link>
                            </h5>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                relationship.schedule.isEnabled 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                Schedule: {relationship.schedule.isEnabled ? 'Active' : 'Inactive'}
                              </span>
                              {relationship.schedule.days && (
                                <span>Days: {relationship.schedule.days.trim()}</span>
                              )}
                              {relationship.schedule.times && (
                                <span>Times: {relationship.schedule.times}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs font-medium ${
                                relationship.isEnabled ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {relationship.isEnabled ? 'Enabled' : 'Disabled'}
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={relationship.isEnabled}
                                  onChange={() => handleToggleScheduleRelationship(
                                    relationship.relationshipId,
                                    relationship.scheduleId,
                                    relationship.isEnabled
                                  )}
                                />
                                <div className={`relative w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                                  relationship.isEnabled 
                                    ? "bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white" 
                                    : "bg-gray-400"
                                }`}></div>
                              </label>
                            </div>
                            
                            <button
                              onClick={() => handleDeleteScheduleRelationship(
                                relationship.relationshipId,
                                relationship.scheduleId,
                                relationship.schedule.title
                              )}
                              className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium transition-colors flex items-center space-x-1"
                            >
                              <TrashIcon className="h-3 w-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Run History Modal */}
      <RunHistoryModal
        isOpen={showRunHistoryModal}
        onClose={() => setShowRunHistoryModal(false)}
        dqCheckId={dqCheck?.id}
        dqCheckName={dqCheck?.functionName}
      />

      </>
    );
  }
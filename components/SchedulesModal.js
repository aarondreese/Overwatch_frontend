import { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, ClockIcon, CheckCircleIcon, XCircleIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/solid';
import { getDQEmailSchedules, updateDQEmailScheduleStatus, deleteDQEmailSchedule, addDQEmailSchedule, getAvailableSchedules } from '@/lib/client/dqemails';
import ToggleSwitch from './ToggleSwitch';

export default function SchedulesModal({ 
  isOpen, 
  onClose, 
  dqEmailId,
  emailName,
  emailIsActive,
  onScheduleUpdate
}) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updatingSchedule, setUpdatingSchedule] = useState(null);
  const [deletingSchedule, setDeletingSchedule] = useState(null);
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [addingSchedule, setAddingSchedule] = useState(false);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDQEmailSchedules(dqEmailId);
      setSchedules(data);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Failed to load schedules: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [dqEmailId]);

  useEffect(() => {
    if (isOpen) {
      if (!dqEmailId) {
        setError('DQ Email ID is required');
        setLoading(false);
        return;
      }
      fetchSchedules();
    }
  }, [isOpen, dqEmailId, fetchSchedules]);

  const fetchAvailableSchedules = async () => {
    try {
      const data = await getAvailableSchedules(dqEmailId);
      setAvailableSchedules(data);
    } catch (err) {
      console.error('Error fetching available schedules:', err);
    }
  };

  const handleClose = () => {
    // Notify parent to refresh counts when modal closes
    if (onScheduleUpdate) {
      onScheduleUpdate();
    }
    onClose();
  };

  const handleToggleSchedule = async (schedule) => {
    setUpdatingSchedule(schedule.emailScheduleId);
    try {
      await updateDQEmailScheduleStatus(
        dqEmailId, 
        schedule.emailScheduleId, 
        !schedule.emailScheduleEnabled
      );
      
      // Update local state immediately without refreshing from server
      setSchedules(prev => prev.map(s => 
        s.emailScheduleId === schedule.emailScheduleId 
          ? { 
              ...s, 
              emailScheduleEnabled: !s.emailScheduleEnabled,
              isActive: s.scheduleEnabled && !s.emailScheduleEnabled
            }
          : s
      ));
      
      // Don't notify parent here - only on close
    } catch (err) {
      console.error('Error updating schedule:', err);
      setError('Failed to update schedule: ' + err.message);
    } finally {
      setUpdatingSchedule(null);
    }
  };

  const handleDeleteSchedule = async (schedule) => {
    if (!confirm(`Are you sure you want to remove "${schedule.scheduleName}" from this email?`)) {
      return;
    }

    setDeletingSchedule(schedule.emailScheduleId);
    try {
      await deleteDQEmailSchedule(dqEmailId, schedule.emailScheduleId);
      
      // Remove from local state immediately
      setSchedules(prev => prev.filter(s => s.emailScheduleId !== schedule.emailScheduleId));
      
      // Refresh available schedules
      await fetchAvailableSchedules();
      
      // Don't notify parent here - only on close
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError('Failed to delete schedule: ' + err.message);
    } finally {
      setDeletingSchedule(null);
    }
  };

  const handleAddSchedule = async () => {
    if (!selectedScheduleId) {
      setError('Please select a schedule to add');
      return;
    }

    setAddingSchedule(true);
    setError(null);
    try {
      await addDQEmailSchedule(dqEmailId, parseInt(selectedScheduleId));
      
      // Refresh schedules list from server
      await fetchSchedules();
      await fetchAvailableSchedules();
      
      // Reset form
      setShowAddSchedule(false);
      setSelectedScheduleId('');
      
      // Don't notify parent here - only on close
    } catch (err) {
      console.error('Error adding schedule:', err);
      setError('Failed to add schedule: ' + err.message);
    } finally {
      setAddingSchedule(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px) scaleY(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scaleY(1);
          }
        }
      `}</style>
      
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <ClockIcon className="h-6 w-6 text-purple-600 mr-2" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Email Schedules
              </h2>
              <p className="text-sm text-gray-600">{emailName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading schedules...</span>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No schedules found for this email</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">
                    {schedules.filter(s => s.isActive).length}
                  </div>
                  <div className="text-sm text-green-600">Active Schedules</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-700">
                    {schedules.filter(s => !s.isActive).length}
                  </div>
                  <div className="text-sm text-yellow-600">Inactive Schedules</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">
                    {schedules.length}
                  </div>
                  <div className="text-sm text-blue-600">Total Schedules</div>
                </div>
              </div>

              {/* Add Schedule Button */}
              {!showAddSchedule && (
                <div 
                  className="mb-4 transform transition-all duration-300 ease-in-out"
                  style={{ animation: 'fadeIn 0.3s ease-in' }}
                >
                  <button
                    onClick={() => {
                      setShowAddSchedule(true);
                      fetchAvailableSchedules();
                    }}
                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center font-medium"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Schedule to Email
                  </button>
                </div>
              )}

              {/* Add Schedule Form */}
              {showAddSchedule && (
                <div 
                  className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg transform transition-all duration-300 ease-in-out"
                  style={{ 
                    animation: 'slideDown 0.3s ease-out',
                    transformOrigin: 'top'
                  }}
                >
                  <h3 className="text-md font-medium text-gray-900 mb-3">Add New Schedule</h3>
                  <div className="space-y-3">
                    <select
                      value={selectedScheduleId}
                      onChange={(e) => setSelectedScheduleId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      disabled={addingSchedule}
                    >
                      <option value="">Select a schedule...</option>
                      {availableSchedules.map((schedule) => (
                        <option key={schedule.scheduleId} value={schedule.scheduleId}>
                          {schedule.scheduleName} - {schedule.scheduleDays} @ {schedule.scheduleHours}
                        </option>
                      ))}
                    </select>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAddSchedule}
                        disabled={!selectedScheduleId || addingSchedule}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed transform hover:scale-105"
                      >
                        {addingSchedule ? 'Adding...' : 'Add Schedule'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddSchedule(false);
                          setSelectedScheduleId('');
                        }}
                        disabled={addingSchedule}
                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-all duration-200 transform hover:scale-105"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedules List */}
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.emailScheduleId}
                    className={`border rounded-lg p-4 transition-colors ${
                      schedule.isActive 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900">
                            {schedule.scheduleName}
                          </h3>
                          <div className="flex items-center space-x-2">
                            {/* Schedule Status */}
                            {schedule.scheduleEnabled ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <CheckCircleIcon className="h-3 w-3 mr-1" />
                                Schedule Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <XCircleIcon className="h-3 w-3 mr-1" />
                                Schedule Disabled
                              </span>
                            )}
                            
                            {/* Email Status (from DQEmail.isActive) */}
                            {emailIsActive ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircleIcon className="h-3 w-3 mr-1" />
                                Email Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <XCircleIcon className="h-3 w-3 mr-1" />
                                Email Inactive
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {schedule.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {schedule.description}
                          </p>
                        )}
                        
                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                          {schedule.scheduleDays && (
                            <div>
                              <span className="font-medium">Days:</span> {schedule.scheduleDays}
                            </div>
                          )}
                          {schedule.scheduleHours && (
                            <div>
                              <span className="font-medium">Times:</span> {schedule.scheduleHours}
                            </div>
                          )}
                          {schedule.startDate && (
                            <div>
                              <span className="font-medium">Start:</span> {new Date(schedule.startDate).toLocaleDateString()}
                            </div>
                          )}
                          {schedule.endDate && (
                            <div>
                              <span className="font-medium">End:</span> {new Date(schedule.endDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex-shrink-0 ml-4 flex items-center space-x-3">
                        {/* Toggle Switch */}
                        <div className="flex flex-col items-center">
                          <ToggleSwitch
                            checked={schedule.emailScheduleEnabled}
                            onChange={() => handleToggleSchedule(schedule)}
                            disabled={updatingSchedule === schedule.emailScheduleId || !schedule.scheduleEnabled}
                            label=""
                          />
                          <span className="text-xs text-gray-500 mt-1">
                            {schedule.emailScheduleEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteSchedule(schedule)}
                          disabled={deletingSchedule === schedule.emailScheduleId}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                          title="Remove schedule from email"
                        >
                          {deletingSchedule === schedule.emailScheduleId ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                          ) : (
                            <TrashIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
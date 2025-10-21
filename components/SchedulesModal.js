import { useState, useEffect } from 'react';
import { XMarkIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { getDQEmailSchedules, updateDQEmailScheduleStatus } from '@/lib/client/dqemails';

export default function SchedulesModal({ 
  isOpen, 
  onClose, 
  dqEmailId,
  emailName,
  onScheduleUpdate
}) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updatingSchedule, setUpdatingSchedule] = useState(null);

  useEffect(() => {
    if (isOpen && dqEmailId) {
      fetchSchedules();
    }
  }, [isOpen, dqEmailId]);

  const fetchSchedules = async () => {
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
  };

  const handleToggleSchedule = async (schedule) => {
    setUpdatingSchedule(schedule.emailScheduleId);
    try {
      await updateDQEmailScheduleStatus(
        dqEmailId, 
        schedule.emailScheduleId, 
        !schedule.emailScheduleEnabled
      );
      
      // Update local state
      setSchedules(prev => prev.map(s => 
        s.emailScheduleId === schedule.emailScheduleId 
          ? { 
              ...s, 
              emailScheduleEnabled: !s.emailScheduleEnabled,
              isActive: s.scheduleEnabled && !s.emailScheduleEnabled
            }
          : s
      ));
      
      // Notify parent component to refresh counts
      if (onScheduleUpdate) {
        onScheduleUpdate();
      }
    } catch (err) {
      console.error('Error updating schedule:', err);
      setError('Failed to update schedule: ' + err.message);
    } finally {
      setUpdatingSchedule(null);
    }
  };

  if (!isOpen) return null;

  return (
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
            onClick={onClose}
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
                            
                            {/* Email Schedule Status */}
                            {schedule.emailScheduleEnabled ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircleIcon className="h-3 w-3 mr-1" />
                                Email Enabled
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <XCircleIcon className="h-3 w-3 mr-1" />
                                Email Disabled
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
                      
                      {/* Toggle Button */}
                      <div className="flex-shrink-0 ml-4">
                        <button
                          onClick={() => handleToggleSchedule(schedule)}
                          disabled={updatingSchedule === schedule.emailScheduleId || !schedule.scheduleEnabled}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            !schedule.scheduleEnabled
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : schedule.emailScheduleEnabled
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {updatingSchedule === schedule.emailScheduleId ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Updating...
                            </div>
                          ) : !schedule.scheduleEnabled ? (
                            'Schedule Disabled'
                          ) : schedule.emailScheduleEnabled ? (
                            'Disable Email'
                          ) : (
                            'Enable Email'
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
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
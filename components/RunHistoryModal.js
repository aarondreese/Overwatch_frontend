import { useState, useEffect } from 'react';
import { XMarkIcon, ChartBarIcon } from '@heroicons/react/24/solid';

const RunHistoryModal = ({ isOpen, onClose, dqCheckId, dqCheckName }) => {
  const [runHistory, setRunHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && dqCheckId) {
      loadRunHistory();
    }
  }, [isOpen, dqCheckId]);

  const loadRunHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/DQChecks/${dqCheckId}/runhistory`);
      const result = await response.json();
      
      if (result.success) {
        setRunHistory(result.data);
      } else {
        setError(result.message || 'Failed to load run history');
      }
    } catch (err) {
      console.error('Error loading run history:', err);
      setError('Failed to load run history');
    } finally {
      setLoading(false);
    }
  };

  const maxCount = Math.max(...runHistory.map(r => r.resultCount), 1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-5 mx-auto p-6 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
            <ChartBarIcon className="h-5 w-5 text-blue-600" />
            <span>Run History - Last 14 Days</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="text-sm text-gray-600 mb-6">
          DQ Check: <span className="font-medium">{dqCheckName}</span>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading run history...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">Error loading data</div>
            <p className="text-gray-600 text-sm">{error}</p>
            <button
              onClick={loadRunHistory}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Retry
            </button>
          </div>
        ) : runHistory.length === 0 ? (
          <div className="text-center py-8">
            <ChartBarIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No run history found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart Container */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-end justify-between h-64 space-x-1">
                {runHistory.map((record, index) => {
                  const height = maxCount > 0 ? (record.resultCount / maxCount) * 100 : 0;
                  const date = new Date(record.runDate);
                  const dayMonth = `${date.getDate()}/${date.getMonth() + 1}`;
                  
                  return (
                    <div key={record.runId} className="flex-1 flex flex-col items-center">
                      {/* Bar */}
                      <div className="w-full flex flex-col justify-end h-56">
                        <div
                          className="w-full bg-blue-600 hover:bg-blue-700 transition-colors rounded-t cursor-pointer relative group"
                          style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0px' }}
                          title={`${dayMonth}: ${record.resultCount} results`}
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            <div className="text-center">
                              <div className="font-medium">{date.toLocaleDateString()}</div>
                              <div>{record.resultCount} results</div>
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* X-axis label */}
                      <div className="text-xs text-gray-600 mt-1 text-center">
                        {record.resultCount}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* X-axis title */}
              <div className="text-center mt-2 text-sm text-gray-600">
                Result Count (Last 14 Days)
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="font-medium text-blue-900">Total Days</div>
                  <div className="text-blue-700">{runHistory.length}</div>
                </div>
                <div>
                  <div className="font-medium text-blue-900">Avg Results</div>
                  <div className="text-blue-700">
                    {runHistory.length > 0 
                      ? Math.round(runHistory.reduce((sum, r) => sum + r.resultCount, 0) / runHistory.length)
                      : 0
                    }
                  </div>
                </div>
                <div>
                  <div className="font-medium text-blue-900">Max Results</div>
                  <div className="text-blue-700">{maxCount}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end border-t pt-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 text-gray-700 hover:bg-gray-400 rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RunHistoryModal;
import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import ToggleSwitch from './ToggleSwitch';

export default function AddDQCheckModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    functionName: '',
    domainId: '',
    isActive: true,
    explain: '',
    warningLevel: '',
    lifetime: '',
    isInTest: false,
    schedules: []
  });

  const [loading, setLoading] = useState(false);
  const [availableFunctions, setAvailableFunctions] = useState([]);
  const [domains, setDomains] = useState([]);
  const [allDomains, setAllDomains] = useState([]);
  const [sourceSystems, setSourceSystems] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      setError('');
    } else {
      setFormData({
        functionName: '',
        domainId: '',
        isActive: true,
        explain: '',
        warningLevel: '',
        lifetime: '',
        isInTest: false,
        schedules: []
      });
      // Reset domains to show all when modal closes
      setDomains(allDomains);
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      
      // Load available functions, source systems, and schedules in parallel
      const [functionsRes, sourceSystemsRes, schedulesRes] = await Promise.all([
        fetch('/api/available-dq-functions'),
        fetch('/api/SourceSystems'),
        fetch('/api/Schedules')
      ]);

      const functionsData = await functionsRes.json();
      const sourceSystemsData = await sourceSystemsRes.json();
      const schedulesData = await schedulesRes.json();

      if (functionsData.success) {
        setAvailableFunctions(functionsData.data.available);
      }
      
      if (sourceSystemsData.success) {
        setSourceSystems(sourceSystemsData.data);
        // Flatten all domains from all source systems
        const allDomainsFlat = sourceSystemsData.data.reduce((acc, system) => {
          const systemDomains = system.domains.map(domain => ({
            ...domain,
            sourceSystemId: system.id,
            sourceSystemName: system.systemName,
            sourceSchema: system.defaultTargetSchema // Use defaultTargetSchema instead of defaultSourceSchema
          }));
          return [...acc, ...systemDomains];
        }, []);
        setAllDomains(allDomainsFlat);
        setDomains(allDomainsFlat); // Initially show all domains
      }
      
      if (schedulesData.success) {
        setSchedules(schedulesData.data);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load form data. Please try again.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFunctionChange = (e) => {
    const selectedFunctionName = e.target.value;
    setFormData(prev => ({
      ...prev,
      functionName: selectedFunctionName,
      domainId: '' // Reset domain selection when function changes
    }));

    // Filter domains based on the selected function's schema
    if (selectedFunctionName) {
      const selectedFunction = availableFunctions.find(f => f.functionName === selectedFunctionName);
      if (selectedFunction) {
        const functionSchema = selectedFunction.schemaName;
        const filteredDomains = allDomains.filter(domain => domain.sourceSchema === functionSchema);
        setDomains(filteredDomains);
      }
    } else {
      // If no function selected, show all domains
      setDomains(allDomains);
    }
  };

  const handleScheduleToggle = (scheduleId) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules.includes(scheduleId)
        ? prev.schedules.filter(id => id !== scheduleId)
        : [...prev.schedules, scheduleId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.functionName || !formData.domainId || !formData.explain?.trim()) {
        setError('Function Name, Domain, and Description are required.');
        return;
      }

      // Validate warning level range
      if (formData.warningLevel && (parseInt(formData.warningLevel) < 1 || parseInt(formData.warningLevel) > 100)) {
        setError('Warning Level must be between 1 and 100.');
        return;
      }

      // Validate lifetime range
      if (formData.lifetime && (parseInt(formData.lifetime) < 1 || parseInt(formData.lifetime) > 9999)) {
        setError('Lifetime must be between 1 and 9999 days.');
        return;
      }

      const response = await fetch('/api/DQChecks/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          functionName: formData.functionName,
          domainId: parseInt(formData.domainId),
          isActive: formData.isActive ? 1 : 0,
          explain: formData.explain || null,
          warningLevel: formData.warningLevel ? parseInt(formData.warningLevel) : null,
          lifetime: formData.lifetime ? parseInt(formData.lifetime) : null,
          isInTest: formData.isInTest ? 1 : 0,
          schedules: formData.schedules.map(id => parseInt(id))
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.message || 'Failed to create DQ check');
      }
    } catch (error) {
      console.error('Error creating DQ check:', error);
      setError('Failed to create DQ check. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <h3 className="text-xl font-semibold text-gray-900">
            Add New DQ Check
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Loading State */}
        {loadingData && (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading form data...</p>
          </div>
        )}

        {/* Form */}
        {!loadingData && (
          <form onSubmit={handleSubmit} className="mt-4">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Function Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Function Name *
                </label>
                <select
                  name="functionName"
                  value={formData.functionName}
                  onChange={handleFunctionChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a function...</option>
                  {availableFunctions.map((func) => (
                    <option key={func.functionName} value={func.functionName}>
                      {func.fullFunctionName}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {availableFunctions.length} available functions found
                </p>
              </div>

              {/* Domain */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain *
                </label>
                <select
                  name="domainId"
                  value={formData.domainId}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a domain...</option>
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.domainName} ({domain.sourceSystemName})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.functionName 
                    ? `${domains.length} domains available for ${availableFunctions.find(f => f.functionName === formData.functionName)?.schemaName || 'selected'} schema`
                    : `${domains.length} domains available (select a function to filter)`
                  }
                </p>
              </div>

              {/* Warning Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Warning Level
                </label>
                <input
                  type="number"
                  name="warningLevel"
                  value={formData.warningLevel}
                  onChange={handleInputChange}
                  min="1"
                  max="100"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 50, 100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must be between 1-100 (1-49: Info, 50-99: Advisory, 100: Important)
                </p>
              </div>

              {/* Lifetime */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lifetime (days)
                </label>
                <input
                  type="number"
                  name="lifetime"
                  value={formData.lifetime}
                  onChange={handleInputChange}
                  min="1"
                  max="9999"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 30, 9999"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must be between 1-9999 days (how long results should be kept)
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="explain"
                value={formData.explain}
                onChange={handleInputChange}
                rows={4}
                required
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe what this DQ check validates..."
              />
            </div>

            {/* Toggle Switches */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <ToggleSwitch
                checked={formData.isActive}
                onChange={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                label="Active (enabled for execution)"
              />

              <ToggleSwitch
                checked={formData.isInTest}
                onChange={() => setFormData(prev => ({ ...prev, isInTest: !prev.isInTest }))}
                label="In Test (testing mode)"
              />
            </div>

            {/* Schedules */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Associate with Schedules
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schedules.map((schedule) => (
                  <ToggleSwitch
                    key={schedule.id}
                    checked={formData.schedules.includes(schedule.id)}
                    onChange={() => handleScheduleToggle(schedule.id)}
                    disabled={!schedule.isEnabled}
                    label={
                      <span>
                        {schedule.title}
                        {!schedule.isEnabled && (
                          <span className="text-red-500 text-xs ml-1">(Disabled)</span>
                        )}
                      </span>
                    }
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {formData.schedules.length} schedule(s) selected
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create DQ Check'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
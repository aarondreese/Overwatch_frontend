import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { listHtmlTemplates } from '@/lib/client/htmlTemplates';
import { listMapViews } from '@/lib/client/mapViews';
import { listDQChecks } from '@/lib/client/dqchecks';

const FREQUENCY_UNITS = [
  { value: 1, label: 'Minutes' },
  { value: 60, label: 'Hours' },
  { value: 1440, label: 'Days' }
];

export default function EditEmailSettingsModal({ 
  isOpen, 
  onClose, 
  dqEmail, 
  onSave 
}) {
  const [formData, setFormData] = useState({
    htmlTemplateName: '',
    mapView: '',
    dqCheckId: '',
    frequencyNumber: 0,
    frequencyUnit: 1,
    emailSubject: '',
    description: '',
    devEmailAddress: ''
  });
  
  const [dropdownData, setDropdownData] = useState({
    htmlTemplates: [],
    mapViews: [],
    dqChecks: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize form data when modal opens or dqEmail changes
  useEffect(() => {
    if (isOpen && dqEmail) {
      const frequencyInMinutes = dqEmail.frequencyInMinutes || 0;
      let frequencyNumber = frequencyInMinutes;
      let frequencyUnit = 1; // Default to minutes

      // Convert to largest possible unit
      if (frequencyInMinutes % 1440 === 0) {
        frequencyNumber = frequencyInMinutes / 1440;
        frequencyUnit = 1440; // Days
      } else if (frequencyInMinutes % 60 === 0) {
        frequencyNumber = frequencyInMinutes / 60;
        frequencyUnit = 60; // Hours
      }

      setFormData({
        htmlTemplateName: dqEmail.htmlTemplateName || '',
        mapView: dqEmail.mapView || '',
        dqCheckId: dqEmail.dqCheckId || '',
        frequencyNumber,
        frequencyUnit,
        emailSubject: dqEmail.emailSubject || '',
        description: dqEmail.description || '',
        devEmailAddress: dqEmail.devEmailAddress || ''
      });
    }
  }, [isOpen, dqEmail]);

  // Load dropdown data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDropdownData();
    }
  }, [isOpen]);

  const loadDropdownData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [htmlTemplates, mapViews, dqChecks] = await Promise.all([
        listHtmlTemplates(),
        listMapViews(),
        listDQChecks()
      ]);

      setDropdownData({
        htmlTemplates,
        mapViews,
        dqChecks
      });
    } catch (err) {
      console.error('Error loading dropdown data:', err);
      setError('Failed to load dropdown options: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Calculate total frequency in minutes
    const frequencyInMinutes = formData.frequencyNumber * formData.frequencyUnit;
    
    const updates = {
      htmlTemplateName: formData.htmlTemplateName || null,
      mapView: formData.mapView || null,
      dqCheckId: formData.dqCheckId ? parseInt(formData.dqCheckId) : null,
      frequencyInMinutes,
      emailSubject: formData.emailSubject || null,
      description: formData.description || null,
      devEmailAddress: formData.devEmailAddress || null
    };

    try {
      await onSave(updates);
      onClose();
    } catch (err) {
      console.error('Error saving email settings:', err);
      setError('Failed to save settings: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Edit Email Settings
          </h2>
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
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading options...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Email Information */}
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={formData.emailSubject}
                    onChange={(e) => handleInputChange('emailSubject', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter email subject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Development Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.devEmailAddress}
                    onChange={(e) => handleInputChange('devEmailAddress', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter development email address"
                  />
                </div>
              </div>

              {/* Technical Configuration */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Configuration</h3>
                
                <div className="grid grid-cols-1 gap-6">
                  {/* HTML Template Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      HTML Template
                    </label>
                    <select
                      value={formData.htmlTemplateName}
                      onChange={(e) => handleInputChange('htmlTemplateName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a template</option>
                      {dropdownData.htmlTemplates.map((template) => (
                        <option key={template.name} value={template.name}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Map View Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Map View
                    </label>
                    <select
                      value={formData.mapView}
                      onChange={(e) => handleInputChange('mapView', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a map view</option>
                      {dropdownData.mapViews.map((view) => (
                        <option key={view.fullViewName} value={view.viewName}>
                          {view.fullViewName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Linked DQ Check Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Linked DQ Check
                    </label>
                    <select
                      value={formData.dqCheckId}
                      onChange={(e) => handleInputChange('dqCheckId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a DQ check</option>
                      {dropdownData.dqChecks.map((check) => (
                        <option key={check.id} value={check.id}>
                          {check.functionName} ({check.domainName || 'No Domain'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Frequency Configuration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        min="0"
                        value={formData.frequencyNumber}
                        onChange={(e) => handleInputChange('frequencyNumber', parseInt(e.target.value) || 0)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter number"
                      />
                      <select
                        value={formData.frequencyUnit}
                        onChange={(e) => handleInputChange('frequencyUnit', parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {FREQUENCY_UNITS.map((unit) => (
                          <option key={unit.value} value={unit.value}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Total: Every {formData.frequencyNumber * formData.frequencyUnit} minutes
                    </p>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
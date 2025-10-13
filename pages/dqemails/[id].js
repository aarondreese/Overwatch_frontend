import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { getDQEmail, updateDQEmail, getDQEmailResources } from "@/lib/client/dqemails";

import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  BeakerIcon,
  ClockIcon,
  EnvelopeIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  TableCellsIcon,
  EyeIcon,
  LinkIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/solid";

export default function DQEmailDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [dqEmail, setDQEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resources, setResources] = useState({ template: null, mapViewColumns: null });
  const [resourcesLoading, setResourcesLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDQEmail();
    }
  }, [id]);

  const fetchDQEmail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDQEmail(id);
      setDQEmail(data);
      
      // If this email uses DQ check + map view approach, fetch additional resources
      if (data.htmlTemplateName || data.mapView) {
        fetchEmailResources(data.htmlTemplateName, data.mapView);
      }
    } catch (err) {
      console.error("Error fetching DQ email:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailResources = async (templateName, mapViewName) => {
    if (!templateName && !mapViewName) return;
    
    try {
      setResourcesLoading(true);
      const resourceData = await getDQEmailResources(templateName, mapViewName);
      setResources({
        template: resourceData.data.template || null,
        mapViewColumns: resourceData.data.mapViewColumns || null,
        templateError: resourceData.templateError,
        mapViewError: resourceData.mapViewError
      });
    } catch (err) {
      console.error("Error fetching email resources:", err);
      setResources({
        template: null,
        mapViewColumns: null,
        templateError: `Error loading template: ${err.message}`,
        mapViewError: `Error loading map view: ${err.message}`
      });
    } finally {
      setResourcesLoading(false);
    }
  };

  const handleToggleStatus = async (field, currentValue) => {
    try {
      await updateDQEmail(id, { [field]: !currentValue });
      fetchDQEmail(); // Refresh data
    } catch (err) {
      console.error(`Error updating ${field}:`, err);
      // Could add toast notification here
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const formatFrequency = (frequencyInMinutes) => {
    if (!frequencyInMinutes) return 'Not configured';
    if (frequencyInMinutes < 60) return `Every ${frequencyInMinutes} minutes`;
    if (frequencyInMinutes < 1440) return `Every ${Math.floor(frequencyInMinutes / 60)} hours`;
    return `Every ${Math.floor(frequencyInMinutes / 1440)} days`;
  };

  // Parse MapRules XML to extract field mappings
  const parseMapRules = (mapRulesXml) => {
    if (!mapRulesXml) return [];

    try {
      // Parse XML using DOMParser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(mapRulesXml, "text/xml");
      
      const collections = xmlDoc.getElementsByTagName('collection');
      const mappings = [];

      for (let collection of collections) {
        const collectionName = collection.getElementsByTagName('collectionname')[0]?.textContent;
        const instanceName = collection.getElementsByTagName('instancename')[0]?.textContent;
        const fields = collection.getElementsByTagName('field');

        for (let field of fields) {
          const fieldName = field.getElementsByTagName('name')[0]?.textContent;
          const columnName = field.getElementsByTagName('column')[0]?.textContent;

          if (fieldName && columnName) {
            mappings.push({
              collection: collectionName,
              instance: instanceName,
              templateVariable: `${instanceName}.${fieldName}`,
              mapColumn: columnName,
              fieldName,
              columnName
            });
          }
        }
      }

      return mappings;
    } catch (error) {
      console.error('Error parsing MapRules XML:', error);
      return [];
    }
  };

  // Format XML with proper indentation
  const formatXml = (xmlString) => {
    if (!xmlString) return '';

    try {
      // Clean up the XML string first
      let xml = xmlString.replace(/>\s*</g, '><'); // Remove whitespace between tags
      
      let formatted = '';
      let indent = 0;
      const indentSize = 2;
      
      // Split by < to process each tag
      const parts = xml.split('<');
      
      for (let i = 0; i < parts.length; i++) {
        if (i === 0 && parts[i] === '') continue; // Skip first empty part
        
        let part = parts[i];
        if (!part) continue;
        
        // Check if this is a closing tag
        const isClosingTag = part.startsWith('/');
        // Check if this is a self-closing tag
        const isSelfClosing = part.endsWith('/>');
        
        if (isClosingTag) {
          indent = Math.max(0, indent - 1);
        }
        
        // Add indentation
        formatted += ' '.repeat(indent * indentSize);
        formatted += '<' + part;
        
        // Add newline unless it's inline content
        const tagEnd = part.indexOf('>');
        if (tagEnd !== -1) {
          const afterTag = part.substring(tagEnd + 1);
          if (afterTag && !afterTag.match(/^\s*$/)) {
            // This tag has content, don't add newline yet
            formatted += '\n';
          } else {
            formatted += '\n';
          }
        }
        
        // Increase indent for opening tags (but not self-closing)
        if (!isClosingTag && !isSelfClosing && tagEnd !== -1) {
          indent++;
        }
      }
      
      return formatted.trim();
    } catch (error) {
      console.error('Error formatting XML:', error);
      
      // Fallback: simple line-by-line formatting
      try {
        return xmlString
          .replace(/></g, '>\n<')
          .split('\n')
          .map((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return '';
            
            let indentLevel = 0;
            const openTags = xmlString.substring(0, xmlString.indexOf(trimmed)).match(/<[^\/][^>]*>/g) || [];
            const closeTags = xmlString.substring(0, xmlString.indexOf(trimmed)).match(/<\/[^>]*>/g) || [];
            indentLevel = Math.max(0, openTags.length - closeTags.length);
            
            if (trimmed.startsWith('</')) indentLevel = Math.max(0, indentLevel - 1);
            
            return '  '.repeat(indentLevel) + trimmed;
          })
          .filter(line => line.trim())
          .join('\n');
      } catch (fallbackError) {
        return xmlString; // Return original if all formatting fails
      }
    }
  };

  // Extract template interpolation variables from HTML template
  const extractTemplateVariables = (templateText) => {
    if (!templateText) return [];

    const regex = /\{\{([^}]+)\}\}/g;
    const variables = new Set();
    let match;

    while ((match = regex.exec(templateText)) !== null) {
      const variable = match[1].trim();
      variables.add(variable);
    }

    return Array.from(variables).sort();
  };

  // Extract ^For directives from HTML template (case-insensitive)
  const extractForDirectives = (templateText) => {
    if (!templateText) return [];

    const regex = /\^for="([^"]+)"/gi; // Added 'i' flag for case-insensitive
    const directives = [];
    let match;

    while ((match = regex.exec(templateText)) !== null) {
      const directive = match[1].trim();
      const parts = directive.split(' in ');
      if (parts.length === 2) {
        const variable = parts[0].trim();
        const collection = parts[1].trim();
        directives.push({
          full: directive,
          variable,
          collection,
          position: match.index,
          originalCase: match[0] // Store the original case found in template
        });
      }
    }

    return directives.sort((a, b) => a.position - b.position);
  };

  // Highlight ^For directives in template with color coding
  const highlightForDirectives = (templateText, forDirectives) => {
    if (!templateText || !forDirectives.length) return templateText;

    const colors = [
      { bg: 'bg-blue-200', text: 'text-blue-900', border: 'border-blue-300' },
      { bg: 'bg-green-200', text: 'text-green-900', border: 'border-green-300' },
      { bg: 'bg-purple-200', text: 'text-purple-900', border: 'border-purple-300' },
      { bg: 'bg-orange-200', text: 'text-orange-900', border: 'border-orange-300' },
      { bg: 'bg-pink-200', text: 'text-pink-900', border: 'border-pink-300' },
    ];

    let highlightedText = templateText;
    
    // Sort directives by position in reverse order to avoid position shifting during replacement
    const sortedDirectives = [...forDirectives].sort((a, b) => b.position - a.position);
    
    sortedDirectives.forEach((directive, index) => {
      const color = colors[index % colors.length];
      // Use the original case found in the template
      const originalPattern = directive.originalCase;
      const replacement = `<span class="inline-block px-2 py-1 rounded ${color.bg} ${color.text} ${color.border} border font-semibold">${originalPattern}</span>`;
      highlightedText = highlightedText.replace(originalPattern, replacement);
    });

    return highlightedText;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading DQ email details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading DQ Email</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/dqemails"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to DQ Emails
          </Link>
        </div>
      </div>
    );
  }

  if (!dqEmail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <EnvelopeIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">DQ Email not found</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{dqEmail.emailName} - DQ Email Details</title>
        <meta name="description" content={`Details for DQ email: ${dqEmail.emailName}`} />
      </Head>

      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Link
                href="/dqemails"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {dqEmail.emailName}
                </h1>
                <p className="text-gray-600 mt-1">DQ Email Details</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {dqEmail.inDev && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  <BeakerIcon className="h-4 w-4 mr-1" />
                  Development
                </span>
              )}
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                dqEmail.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}>
                {dqEmail.isActive ? (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircleIcon className="h-4 w-4 mr-1" />
                    Inactive
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <div className="text-lg font-semibold text-gray-900">Status</div>
                    <div className="text-sm text-gray-500">Email activation</div>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleStatus('isActive', dqEmail.isActive)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    dqEmail.isActive
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-red-100 text-red-800 hover:bg-red-200"
                  }`}
                >
                  {dqEmail.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <div className="text-lg font-semibold text-gray-900">
                    {dqEmail.activeScheduleCount || 0}
                  </div>
                  <div className="text-sm text-gray-500">Active Schedules</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <BeakerIcon className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <div className="text-lg font-semibold text-gray-900">Development</div>
                    <div className="text-sm text-gray-500">Testing mode</div>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleStatus('inDev', dqEmail.inDev)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    dqEmail.inDev
                      ? "bg-orange-100 text-orange-800 hover:bg-orange-200"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  {dqEmail.inDev ? 'Move to Production' : 'Move to Development'}
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Email Configuration */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <EnvelopeIcon className="h-6 w-6 mr-2" />
                Email Configuration
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Subject
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                    {dqEmail.emailSubject || 'No subject configured'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                    {dqEmail.description}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HTML Template
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                    {dqEmail.htmlTemplateName || 'No template specified'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Development Email Address
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                    {dqEmail.devEmailAddress || 'Not configured'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                    {formatFrequency(dqEmail.frequencyInMinutes)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Run
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                    {formatDate(dqEmail.lastRunDateTime)}
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Configuration */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <CodeBracketIcon className="h-6 w-6 mr-2" />
                Technical Configuration
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Linked DQ Check
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                    {dqEmail.dqCheckFunction ? (
                      <Link 
                        href={`/dqchecks/${dqEmail.dqCheckId}`}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {dqEmail.dqCheckFunction}
                      </Link>
                    ) : (
                      'No DQ check linked'
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stored Procedure
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900 font-mono">
                    {dqEmail.runStoredProcedure || 'Not specified'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Map View
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                    {dqEmail.mapView || 'Not configured'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hierarchy
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                    {dqEmail.hierarchy || 'Not configured'}
                  </div>
                </div>

                {dqEmail.mapRules && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Map Rules
                    </label>
                    <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900 font-mono max-h-40 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">
                        {typeof dqEmail.mapRules === 'string' 
                          ? dqEmail.mapRules 
                          : JSON.stringify(dqEmail.mapRules, null, 2)
                        }
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Template and Map View Resources - Only show if using DQ check approach */}
          {(dqEmail.htmlTemplateName || dqEmail.mapView) && (
            <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              {/* HTML Template */}
              {dqEmail.htmlTemplateName && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <DocumentTextIcon className="h-6 w-6 mr-2" />
                    HTML Template: {dqEmail.htmlTemplateName}
                  </h2>
                  
                  {resourcesLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading template...</span>
                    </div>
                  ) : resources.templateError ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                        <div className="ml-3">
                          <p className="text-sm text-red-800">{resources.templateError}</p>
                        </div>
                      </div>
                    </div>
                  ) : resources.template ? (
                    <div className="space-y-4">
                      {resources.template.description && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                            {resources.template.description}
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Template Content (^For directives highlighted)
                        </label>
                        <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900 max-h-96 overflow-y-auto">
                          <div 
                            className="whitespace-pre-wrap font-mono text-xs"
                            dangerouslySetInnerHTML={{
                              __html: (() => {
                                const forDirectives = extractForDirectives(resources.template.text);
                                return highlightForDirectives(resources.template.text, forDirectives)
                                  .replace(/</g, '&lt;')
                                  .replace(/>/g, '&gt;')
                                  .replace(/&lt;span class="([^"]*)"&gt;([^&]*)&lt;\/span&gt;/g, '<span class="$1">$2</span>');
                              })()
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                        <div>
                          <span className="font-medium">Created:</span> {
                            resources.template.createdDate 
                              ? new Date(resources.template.createdDate).toLocaleDateString()
                              : 'Unknown'
                          }
                        </div>
                        <div>
                          <span className="font-medium">Modified:</span> {
                            resources.template.modifiedDate 
                              ? new Date(resources.template.modifiedDate).toLocaleDateString()
                              : 'Unknown'
                          }
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-sm text-gray-600">Template not found</p>
                    </div>
                  )}
                </div>
              )}

              {/* Map View Columns */}
              {dqEmail.mapView && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <TableCellsIcon className="h-6 w-6 mr-2" />
                    Map View Columns: {dqEmail.mapView}
                  </h2>
                  
                  {resourcesLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading columns...</span>
                    </div>
                  ) : resources.mapViewError ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                        <div className="ml-3">
                          <p className="text-sm text-red-800">{resources.mapViewError}</p>
                        </div>
                      </div>
                    </div>
                  ) : resources.mapViewColumns && resources.mapViewColumns.length > 0 ? (
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600">
                        Found {resources.mapViewColumns.length} columns in this view:
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto">
                        <div className="grid gap-2">
                          {resources.mapViewColumns.map((column, index) => (
                            <div 
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {column.columnName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {column.dataType}
                                  {column.maxLength && ` (${column.maxLength})`}
                                  {!column.isNullable && ' • NOT NULL'}
                                  {column.columnDefault && ` • Default: ${column.columnDefault}`}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-sm text-gray-600">No columns found for this view</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MapRules Mapping Visualization - Only show if we have both template and mapRules */}
            {dqEmail.mapRules && resources.template && (
              <div className="mt-8">
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <LinkIcon className="h-6 w-6 mr-2" />
                    Template Variable Mappings
                  </h2>
                  
                  {(() => {
                    const mappings = parseMapRules(dqEmail.mapRules);
                    const templateVars = extractTemplateVariables(resources.template.text);
                    
                    if (mappings.length === 0) {
                      return (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                          <p className="text-sm text-yellow-800">
                            Could not parse MapRules XML. The XML might be malformed or use an unexpected structure.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-6">
                        {/* Formatted XML Structure */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">MapRules XML Structure:</h4>
                          <div className="bg-white border border-gray-300 rounded p-4 overflow-x-auto">
                            <pre className="text-sm font-mono text-gray-800 whitespace-pre">
                              {formatXml(dqEmail.mapRules)}
                            </pre>
                          </div>
                        </div>

                        {/* Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-blue-700">{templateVars.length}</div>
                            <div className="text-sm text-blue-600">Template Variables</div>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-green-700">{mappings.length}</div>
                            <div className="text-sm text-green-600">Mapped Fields</div>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-purple-700">
                              {new Set(mappings.map(m => m.collection)).size}
                            </div>
                            <div className="text-sm text-purple-600">Collections</div>
                          </div>
                        </div>

                        {/* Color Key for ^For Directives */}
                        {(() => {
                          const forDirectives = resources.template ? extractForDirectives(resources.template.text) : [];
                          if (forDirectives.length === 0) return null;

                          const colors = [
                            { bg: 'bg-blue-200', text: 'text-blue-900', border: 'border-blue-300', light: 'bg-blue-50' },
                            { bg: 'bg-green-200', text: 'text-green-900', border: 'border-green-300', light: 'bg-green-50' },
                            { bg: 'bg-purple-200', text: 'text-purple-900', border: 'border-purple-300', light: 'bg-purple-50' },
                            { bg: 'bg-orange-200', text: 'text-orange-900', border: 'border-orange-300', light: 'bg-orange-50' },
                            { bg: 'bg-pink-200', text: 'text-pink-900', border: 'border-pink-300', light: 'bg-pink-50' },
                          ];

                          return (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Template Loop Color Key:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {forDirectives.map((directive, index) => {
                                  const color = colors[index % colors.length];
                                  return (
                                    <div key={index} className={`p-3 rounded-lg border ${color.light} ${color.border}`}>
                                      <div className={`inline-block px-2 py-1 rounded text-xs font-mono ${color.bg} ${color.text} ${color.border} border mb-2`}>
                                        ^For="{directive.full}"
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        <div><strong>Variable:</strong> {directive.variable}</div>
                                        <div><strong>Collection:</strong> {directive.collection}</div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Hierarchical Structure */}
                        {(() => {
                          // Get ^For directives to determine color mapping
                          const forDirectives = resources.template ? extractForDirectives(resources.template.text) : [];
                          const colors = [
                            { bg: 'bg-blue-200', text: 'text-blue-900', border: 'border-blue-300', light: 'bg-blue-50' },
                            { bg: 'bg-green-200', text: 'text-green-900', border: 'border-green-300', light: 'bg-green-50' },
                            { bg: 'bg-purple-200', text: 'text-purple-900', border: 'border-purple-300', light: 'bg-purple-50' },
                            { bg: 'bg-orange-200', text: 'text-orange-900', border: 'border-orange-300', light: 'bg-orange-50' },
                            { bg: 'bg-pink-200', text: 'text-pink-900', border: 'border-pink-300', light: 'bg-pink-50' },
                          ];

                          // Parse the hierarchy from dqEmail.hierarchy (e.g., "serviceLeads>supportWorkers>properties")
                          const hierarchyOrder = dqEmail.hierarchy ? dqEmail.hierarchy.split('>') : [];
                          const collections = Array.from(new Set(mappings.map(m => m.collection)));
                          
                          // If no hierarchy defined, just show collections in order found
                          const orderedCollections = hierarchyOrder.length > 0 
                            ? hierarchyOrder.filter(h => collections.includes(h))
                            : collections;

                          // Create mapping between collections and ^For directives
                          const getCollectionColor = (collectionName, level) => {
                            // Try to find matching ^For directive
                            const matchingDirective = forDirectives.find(d => d.collection === collectionName);
                            if (matchingDirective) {
                              const directiveIndex = forDirectives.indexOf(matchingDirective);
                              return colors[directiveIndex % colors.length];
                            }
                            // Fallback to level-based coloring
                            return colors[level % colors.length];
                          };

                          const renderCollection = (collectionName, level = 0) => {
                            const collectionMappings = mappings.filter(m => m.collection === collectionName);
                            const indent = level * 2; // 2rem per level
                            const color = getCollectionColor(collectionName, level);
                            
                            return (
                              <div 
                                key={collectionName} 
                                className={`border ${color.border} rounded-lg p-4 ${color.light}`}
                                style={{ marginLeft: `${indent}rem` }}
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <h3 className={`text-lg font-semibold ${color.text} flex items-center`}>
                                    {level > 0 && (
                                      <div className="flex items-center mr-2">
                                        {Array.from({ length: level }).map((_, i) => (
                                          <div key={i} className="w-4 h-px bg-gray-400 mr-1"></div>
                                        ))}
                                        <ArrowRightIcon className="h-4 w-4 text-gray-400 mr-2" />
                                      </div>
                                    )}
                                    <span className={`px-3 py-1 rounded-full text-sm ${color.bg} ${color.text} border ${color.border}`}>
                                      Collection: {collectionName}
                                    </span>
                                  </h3>
                                  <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                                    Level {level + 1} • {collectionMappings.length} fields
                                  </span>
                                </div>
                                
                                <div className="space-y-3">
                                  {collectionMappings.map((mapping, index) => (
                                    <div key={index} className="bg-white border border-gray-200 rounded-md p-3 shadow-sm">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4 flex-1">
                                          {/* Template Variable */}
                                          <div className="flex-1">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Template Variable</div>
                                            <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-mono">
                                              {`{{${mapping.templateVariable}}}`}
                                            </div>
                                          </div>
                                          
                                          {/* Arrow */}
                                          <div className="flex-shrink-0">
                                            <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                                          </div>
                                          
                                          {/* Map Column */}
                                          <div className="flex-1">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Database Column</div>
                                            <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-mono">
                                              {mapping.mapColumn}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Verification Badge */}
                                        <div className="flex-shrink-0 ml-4">
                                          {templateVars.includes(mapping.templateVariable) ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                                              Used
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                                              Unused
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Field Details */}
                                      <div className="mt-2 text-xs text-gray-500 border-t pt-2">
                                        <span className="font-medium">Field:</span> {mapping.fieldName} • 
                                        <span className="font-medium ml-2">Instance:</span> {mapping.instance}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          };

                          return (
                            <div className="space-y-4">
                              {/* Hierarchy Visualization */}
                              {hierarchyOrder.length > 0 && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Data Hierarchy Structure:</h4>
                                  <div className="flex items-center space-x-2 text-sm">
                                    {hierarchyOrder.map((collection, index) => (
                                      <div key={collection} className="flex items-center">
                                        <span className="px-3 py-1 bg-white border border-gray-300 rounded-full font-mono text-xs">
                                          {collection}
                                        </span>
                                        {index < hierarchyOrder.length - 1 && (
                                          <ArrowRightIcon className="h-4 w-4 text-gray-400 mx-2" />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-2">
                                    Each level can contain multiple instances of the next level
                                  </div>
                                </div>
                              )}

                              {/* Nested Collections */}
                              {orderedCollections.map((collectionName, index) => 
                                renderCollection(collectionName, index)
                              )}
                            </div>
                          );
                        })()}

                        {/* Unmapped Template Variables */}
                        {(() => {
                          const mappedVars = new Set(mappings.map(m => m.templateVariable));
                          const unmappedVars = templateVars.filter(v => !mappedVars.has(v));
                          
                          if (unmappedVars.length > 0) {
                            return (
                              <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                                <h3 className="text-lg font-semibold text-orange-800 mb-3">
                                  Unmapped Template Variables
                                </h3>
                                <div className="text-sm text-orange-700 mb-3">
                                  These variables appear in the template but are not defined in the MapRules:
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {unmappedVars.map((variable, index) => (
                                    <span key={index} className="inline-flex items-center px-3 py-1 bg-orange-200 text-orange-800 rounded-full text-sm font-mono">
                                      {`{{${variable}}}`}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
            </>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end space-x-4">
            <Link
              href="/dqemails"
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back to List
            </Link>
            <button
              onClick={() => {
                // TODO: Implement edit functionality
                alert('Edit functionality coming soon!');
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Edit Email
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
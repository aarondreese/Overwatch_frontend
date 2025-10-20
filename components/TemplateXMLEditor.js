import { useState, useEffect } from 'react';
import { 
  CodeBracketIcon, 
  DocumentTextIcon, 
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';

export default function TemplateXMLEditor({ 
  dqEmail, 
  templateText, 
  mapViewColumns, 
  formatXml,
  formatHtml,
  onSave,
  onCancel,
  onChangesDetected
}) {
  const [htmlTemplate, setHtmlTemplate] = useState('');
  const [parsedHierarchy, setParsedHierarchy] = useState([]);
  const [columnMappings, setColumnMappings] = useState({});
  const [generatedXML, setGeneratedXML] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [burstField, setBurstField] = useState('');
  const [emailField, setEmailField] = useState('');
  const [existingMappingsLoaded, setExistingMappingsLoaded] = useState(false);

  // Auto-format HTML when component mounts
  useEffect(() => {
    if (templateText && !htmlTemplate) {
      const formatted = formatHtml ? formatHtml(templateText) : templateText;
      setHtmlTemplate(formatted);
    }
  }, [templateText, formatHtml, htmlTemplate]);

  // Parse existing mapRules XML to extract mappings and groupBy settings
  const parseExistingMappings = (mapRulesXml, hierarchy, viewColumns) => {
    if (!mapRulesXml || !hierarchy) return { mappings: {}, updatedHierarchy: hierarchy };
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(mapRulesXml, 'text/xml');
      const mappings = {};
      
      // Create a deep copy of the hierarchy to avoid mutations
      const updatedHierarchy = hierarchy.map(level => ({...level}));
      
      // Extract field mappings from XML grouped by collection
      const collections = xmlDoc.querySelectorAll('collection');
      console.log(`Found ${collections.length} collections in XML`);
      
      collections.forEach((collection, index) => {
        const collectionNameElement = collection.querySelector('collectionname');
        const groupByElement = collection.querySelector('groupby');
        const instanceNameElement = collection.querySelector('instancename');
        const fields = collection.querySelectorAll('field');
        
        console.log(`Processing collection ${index + 1}:`, {
          collectionName: collectionNameElement?.textContent,
          groupBy: groupByElement?.textContent,
          instanceName: instanceNameElement?.textContent,
          fieldsCount: fields.length
        });
        
        if (collectionNameElement) {
          const collectionName = collectionNameElement.textContent;
          const groupByValue = groupByElement ? groupByElement.textContent : null;
          const instanceName = instanceNameElement ? instanceNameElement.textContent : null;
          
          console.log(`Looking for hierarchy level matching:`, {
            collectionName,
            instanceName,
            groupByValue
          });
          
          // Find the corresponding hierarchy level by collection name or instance name (case-insensitive)
          const hierarchyLevel = updatedHierarchy.find(h => 
            h.collection?.toLowerCase() === collectionName?.toLowerCase() || 
            h.variable?.toLowerCase() === instanceName?.toLowerCase() ||
            h.originalCollection?.toLowerCase() === collectionName?.toLowerCase()
          );
          
          if (hierarchyLevel) {
            console.log(`Found matching hierarchy level:`, {
              collection: hierarchyLevel.collection,
              variable: hierarchyLevel.variable,
              originalCollection: hierarchyLevel.originalCollection
            });
            
            // Set groupBy from XML if it exists, but match it to actual column name case-insensitively
            if (groupByValue) {
              // Find the actual column name that matches case-insensitively
              const actualColumn = viewColumns?.find(col => 
                col.columnName.toLowerCase() === groupByValue.toLowerCase()
              );
              
              const actualGroupByValue = actualColumn ? actualColumn.columnName : groupByValue;
              hierarchyLevel.groupBy = actualGroupByValue;
              
              if (actualColumn) {
                console.log(`✅ Successfully set groupBy for ${collectionName} (${hierarchyLevel.variable}): ${groupByValue} -> ${actualGroupByValue}`);
              } else {
                console.log(`⚠️ GroupBy column "${groupByValue}" not found in view columns, using as-is`);
              }
            } else {
              console.log(`⚠️ No groupBy value found for ${collectionName}`);
            }
            
            // Extract field mappings
            fields.forEach(field => {
              const nameElement = field.querySelector('name');
              const columnElement = field.querySelector('column');
              
              if (nameElement && columnElement) {
                const fieldName = nameElement.textContent;
                const xmlColumnName = columnElement.textContent;
                
                // Find the actual column name that matches case-insensitively
                const actualColumn = viewColumns?.find(col => 
                  col.columnName.toLowerCase() === xmlColumnName.toLowerCase()
                );
                
                const actualColumnName = actualColumn ? actualColumn.columnName : xmlColumnName;
                
                // Create the template variable key (e.g., "admin.name")
                const templateVar = `${hierarchyLevel.variable}.${fieldName}`;
                mappings[templateVar] = actualColumnName;
                
                if (actualColumn && actualColumn.columnName !== xmlColumnName) {
                  console.log(`📝 Column mapping case corrected: ${xmlColumnName} -> ${actualColumnName}`);
                }
              }
            });
          } else {
            console.error(`❌ Could not find hierarchy level for collection: ${collectionName}, instanceName: ${instanceName}`);
            console.log('Available hierarchy levels:', updatedHierarchy.map(h => ({
              collection: h.collection,
              variable: h.variable,
              originalCollection: h.originalCollection
            })));
          }
        }
      });
      
      console.log('Parsed existing mappings:', mappings);
      console.log('Final updated hierarchy with groupBy values:', updatedHierarchy.map(h => ({
        collection: h.collection,
        variable: h.variable,
        groupBy: h.groupBy,
        originalCollection: h.originalCollection,
        variablesCount: h.variables?.length
      })));
      
      return { mappings, updatedHierarchy };
    } catch (error) {
      console.warn('Could not parse existing mapRules for mappings:', error);
      return { mappings: {}, updatedHierarchy: hierarchy };
    }
  };

  // Initialize burst and email fields from existing mapRules if available
  useEffect(() => {
    if (dqEmail?.mapRules && !burstField && !emailField) {
      try {
        // Try to parse existing XML to extract burst and email
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(dqEmail.mapRules, 'text/xml');
        const burstElement = xmlDoc.querySelector('burst');
        const emailElement = xmlDoc.querySelector('email');
        
        if (burstElement) {
          console.log('Loading existing burst field:', burstElement.textContent);
          setBurstField(burstElement.textContent);
        }
        if (emailElement) {
          console.log('Loading existing email field:', emailElement.textContent);
          setEmailField(emailElement.textContent);
        }
      } catch (error) {
        console.warn('Could not parse existing mapRules:', error);
      }
    }
  }, [dqEmail?.mapRules, burstField, emailField]);

  // Initialize column mappings from existing mapRules when component mounts
  useEffect(() => {
    if (dqEmail?.mapRules && parsedHierarchy.length > 0 && !existingMappingsLoaded) {
      console.log('Attempting to parse existing mappings...', {
        hasMapRules: !!dqEmail.mapRules,
        hierarchyLength: parsedHierarchy.length,
        existingMappingsLoaded
      });
      
      const { mappings, updatedHierarchy } = parseExistingMappings(dqEmail.mapRules, parsedHierarchy, mapViewColumns);
      if (Object.keys(mappings).length > 0) {
        console.log('Loading existing mappings:', mappings);
        console.log('Updated hierarchy with groupBy:', updatedHierarchy);
        console.log('About to call setParsedHierarchy with:', updatedHierarchy.map(h => ({
          collection: h.collection,
          variable: h.variable,
          groupBy: h.groupBy
        })));
        console.log('Setting column mappings and hierarchy...');
        setColumnMappings(mappings);
        setParsedHierarchy(updatedHierarchy);
        console.log('State updates called, marking as loaded');
        setExistingMappingsLoaded(true);
      } else {
        console.log('No mappings found in existing XML, marking as loaded anyway');
        setExistingMappingsLoaded(true);
      }
    }
  }, [dqEmail?.mapRules, parsedHierarchy.length, existingMappingsLoaded, mapViewColumns]); // Added mapViewColumns

  // Debug: Log when parsedHierarchy actually changes
  useEffect(() => {
    console.log('parsedHierarchy state changed:', parsedHierarchy.map(h => ({
      collection: h.collection,
      variable: h.variable,
      groupBy: h.groupBy
    })));
  }, [parsedHierarchy]);

  // Parse ^for directives from HTML template
  const parseTemplateHierarchy = (template) => {
    const forDirectiveRegex = /\^for="([^"]+)"/gi;
    const variableRegex = /\{\{([^}]+)\}\}/g;
    
    let matches = [];
    let match;
    
    // Find all ^for directives
    while ((match = forDirectiveRegex.exec(template)) !== null) {
      const directive = match[1].trim();
      const parts = directive.split(' in ');
      
      if (parts.length === 2) {
        const variable = parts[0].trim();
        const collection = parts[1].trim();
        
        // Clean up collection name - remove any prefixes (e.g., "serviceLead.supportWorkers" -> "supportWorkers")
        const cleanCollection = collection.includes('.') ? collection.split('.').pop() : collection;
        
        matches.push({
          variable,
          collection: cleanCollection,
          originalCollection: collection, // Keep original for reference
          position: match.index,
          full: directive
        });
      }
    }
    
    // Extract all template variables
    const templateVars = new Set();
    while ((match = variableRegex.exec(template)) !== null) {
      templateVars.add(match[1].trim());
    }
    
    // Build hierarchy structure
    const hierarchy = matches.map((m, index) => {
      // Find variables that belong to this collection instance
      const instanceVariables = Array.from(templateVars).filter(v => 
        v.startsWith(m.variable + '.')
      ).map(v => ({
        templateVar: v,
        fieldName: v.split('.')[1],
        mappedColumn: null // Will be set by user
      }));
      
      return {
        level: index,
        variable: m.variable,
        collection: m.collection, // Now using clean collection name
        originalCollection: m.originalCollection, // Keep original for reference
        variables: instanceVariables,
        groupBy: null // Will be set by user
      };
    });
    
    return hierarchy;
  };



  // Generate XML from hierarchy and mappings (unformatted)
  const generateXMLFromHierarchy = (hierarchy, mappings, burst, email) => {
    if (!hierarchy.length) return '';
    
    // Use provided burst and email fields, or fallback to auto-detection
    const burstValue = burst || (hierarchy[0]?.variable) || 'recipients';
    const emailValue = email || 'Email';
    
    // Generate unformatted XML - let formatXml handle the formatting
    let xml = `<root><burst>${burstValue}</burst><email>${emailValue}</email><collections>`;
    
    hierarchy.forEach((level, index) => {
      xml += `<collection><collectionname>${level.collection}</collectionname>`;
      
      // Improved groupBy logic - try multiple fallbacks before defaulting to 'ID'
      let groupByValue = level.groupBy;
      if (!groupByValue) {
        // Try to find a mapped column from the first variable
        const firstVariable = level.variables[0];
        if (firstVariable && mappings[firstVariable.templateVar]) {
          groupByValue = mappings[firstVariable.templateVar];
        } else if (firstVariable && firstVariable.fieldName) {
          // Try to find a column that matches the field name
          groupByValue = firstVariable.fieldName;
        } else {
          // Last resort - but warn about it
          groupByValue = 'ID';
          console.warn(`No groupBy value found for level ${index + 1} (${level.collection}), defaulting to 'ID'`);
        }
      }
      
      xml += `<groupby>${groupByValue}</groupby>`;
      xml += `<instancename>${level.variable}</instancename><fields>`;
      
      level.variables.forEach(variable => {
        const mappedColumn = mappings[variable.templateVar] || variable.fieldName;
        xml += `<field><name>${variable.fieldName}</name><column>${mappedColumn}</column></field>`;
      });
      
      xml += `</fields></collection>`;
    });
    
    xml += `</collections></root>`;
    
    return xml;
  };

  // Update parsed hierarchy when template changes
  useEffect(() => {
    console.log('Template parsing useEffect triggered, existingMappingsLoaded:', existingMappingsLoaded);
    const hierarchy = parseTemplateHierarchy(htmlTemplate);
    
    // Only set hierarchy if we haven't loaded existing mappings yet, or if we have no mapRules
    if (!existingMappingsLoaded || !dqEmail?.mapRules) {
      console.log('Setting fresh hierarchy from template parsing');
      setParsedHierarchy(hierarchy);
    } else {
      console.log('Skipping hierarchy update - existing mappings already loaded');
    }
    
    // Only initialize column mappings if empty AND we don't have existing mapRules to parse AND haven't loaded existing mappings yet
    if (Object.keys(columnMappings).length === 0 && (!dqEmail?.mapRules || !existingMappingsLoaded)) {
      const initialMappings = {};
      hierarchy.forEach(level => {
        level.variables.forEach(variable => {
          // Try to auto-match by name similarity
          const similarColumn = mapViewColumns?.find(col => 
            col.columnName.toLowerCase().includes(variable.fieldName?.toLowerCase() || '')
          );
          initialMappings[variable.templateVar] = similarColumn?.columnName || '';
        });
      });
      
      // Only set if we don't have existing mapRules, to avoid overwriting
      if (!dqEmail?.mapRules) {
        setColumnMappings(initialMappings);
      }
    }

    // Auto-suggest burst and email fields if not already set
    if (mapViewColumns && (!burstField || !emailField)) {
      if (!burstField) {
        // Look for common burst field names
        const burstColumn = mapViewColumns.find(col => 
          ['burst', 'burstid', 'groupid', 'recipient', 'recipientid'].includes(col.columnName.toLowerCase())
        );
        if (burstColumn) setBurstField(burstColumn.columnName);
      }
      
      if (!emailField) {
        // Look for email field names
        const emailColumn = mapViewColumns.find(col => 
          ['email', 'emailaddress', 'mail', 'mailadress'].includes(col.columnName.toLowerCase())
        );
        if (emailColumn) setEmailField(emailColumn.columnName);
      }
    }
  }, [htmlTemplate, mapViewColumns, burstField, emailField, dqEmail?.mapRules, existingMappingsLoaded]); // Added existingMappingsLoaded dependency

  // Generate XML when hierarchy, mappings, or burst/email fields change
  useEffect(() => {
    // Only generate XML if we have parsed hierarchy and either:
    // 1. No existing mapRules to load, OR
    // 2. Existing mappings have been loaded
    if (parsedHierarchy.length > 0 && (!dqEmail?.mapRules || existingMappingsLoaded)) {
      console.log('Generating XML with current state:', {
        hierarchyLevels: parsedHierarchy.length,
        hasExistingMapRules: !!dqEmail?.mapRules,
        existingMappingsLoaded,
        groupByValues: parsedHierarchy.map(h => h.groupBy)
      });
      
      const xml = generateXMLFromHierarchy(parsedHierarchy, columnMappings, burstField, emailField);
      setGeneratedXML(xml);
      const xmlChanged = xml !== dqEmail.mapRules;
      const templateChanged = htmlTemplate !== templateText;
      const hasChanges = xmlChanged || templateChanged;
      
      setIsModified(hasChanges);
      
      // Notify parent about changes
      if (onChangesDetected) {
        onChangesDetected(hasChanges);
      }
    }
  }, [parsedHierarchy, columnMappings, burstField, emailField, htmlTemplate, dqEmail.mapRules, templateText, onChangesDetected, existingMappingsLoaded]);

  const handleColumnMappingChange = (templateVar, columnName) => {
    setColumnMappings(prev => ({
      ...prev,
      [templateVar]: columnName
    }));
  };

  const handleGroupByChange = (collectionIndex, groupByColumn) => {
    setParsedHierarchy(prev => prev.map((level, index) => 
      index === collectionIndex ? { ...level, groupBy: groupByColumn } : level
    ));
  };

  const handleSave = () => {
    if (onSave) {
      // Build hierarchy string for database (e.g., "serviceLeads>supportWorkers>properties")
      const hierarchyString = parsedHierarchy.map(level => level.collection).join('>');
      
      onSave({
        mapRules: generatedXML,
        htmlTemplate: htmlTemplate,
        hierarchy: hierarchyString
      });
    }
  };

  const colors = [
    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', accent: 'bg-blue-200' },
    { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', accent: 'bg-green-200' },
    { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', accent: 'bg-purple-200' },
    { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', accent: 'bg-orange-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <ArrowPathIcon className="h-6 w-6 mr-2" />
          Template-XML Editor
        </h2>
        <div className="flex items-center space-x-3">
          {isModified && (
            <span className="flex items-center text-sm text-orange-600">
              <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
              Unsaved changes
            </span>
          )}
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            <XMarkIcon className="h-4 w-4 inline mr-1" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isModified}
            className={`px-4 py-2 rounded-md transition-colors ${
              isModified 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <CheckIcon className="h-4 w-4 inline mr-1" />
            Save Changes
          </button>
        </div>
      </div>

      {/* HTML Template Editor - Full Width */}
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            HTML Template Editor
          </h3>
          <button
            onClick={() => {
              if (formatHtml) {
                const formatted = formatHtml(htmlTemplate);
                setHtmlTemplate(formatted);
              }
            }}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center"
            title="Format HTML"
          >
            <CodeBracketIcon className="h-4 w-4 mr-1" />
            Format
          </button>
        </div>
        <textarea
          value={htmlTemplate}
          onChange={(e) => setHtmlTemplate(e.target.value)}
          className="w-full h-96 p-3 border border-gray-300 rounded-md font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your HTML template with ^for directives..."
        />
      </div>

      {/* Burst and Email Configuration */}
      {parsedHierarchy.length > 0 && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Burst & Email Configuration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Burst Field
              </label>
              <select
                value={burstField}
                onChange={(e) => setBurstField(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select burst field...</option>
                {mapViewColumns?.map(col => (
                  <option key={col.columnName} value={col.columnName}>
                    {col.columnName} ({col.dataType})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                The field that determines how recipients are grouped for email bursts
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Field
              </label>
              <select
                value={emailField}
                onChange={(e) => setEmailField(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select email field...</option>
                {mapViewColumns?.map(col => (
                  <option key={col.columnName} value={col.columnName}>
                    {col.columnName} ({col.dataType})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                The column containing email addresses for recipients
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hierarchy and Mapping Editor */}
      {parsedHierarchy.length > 0 && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Collection Hierarchy & Column Mapping
          </h3>
          
          <div className="space-y-6">
            {parsedHierarchy.map((level, levelIndex) => {
              const color = colors[levelIndex % colors.length];
              
              return (
                <div 
                  key={`${levelIndex}-${level.collection}-${level.groupBy || 'no-groupby'}`} 
                  className={`border rounded-lg p-4 ${color.bg} ${color.border}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className={`font-semibold ${color.text}`}>
                      Level {levelIndex + 1}: {level.collection}
                    </h4>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">Group By:</label>
                        <select
                          key={`groupby-${levelIndex}-${level.groupBy || 'empty'}`}
                          value={level.groupBy || ''}
                          onChange={(e) => handleGroupByChange(levelIndex, e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select column...</option>
                          {mapViewColumns?.map(col => (
                            <option key={col.columnName} value={col.columnName}>
                              {col.columnName}
                            </option>
                          ))}
                        </select>
                        {/* Debug info - remove after fixing */}
                        {process.env.NODE_ENV === 'development' && (
                          <span className="text-xs text-gray-500 bg-yellow-100 px-2 py-1 rounded">
                            Current: "{level.groupBy || 'none'}" | Index: {levelIndex}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {level.variables.map((variable, varIndex) => (
                      <div key={varIndex} className="bg-white rounded border border-gray-200 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              Template Variable: <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                {`{{${variable.templateVar}}}`}
                              </code>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Field: {variable.fieldName}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <label className="text-sm font-medium text-gray-700">Maps to:</label>
                            <select
                              value={columnMappings[variable.templateVar] || ''}
                              onChange={(e) => handleColumnMappingChange(variable.templateVar, e.target.value)}
                              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select column...</option>
                              {mapViewColumns?.map(col => (
                                <option key={col.columnName} value={col.columnName}>
                                  {col.columnName} ({col.dataType})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {parsedHierarchy.length === 0 && htmlTemplate && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">No ^for directives found</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Add ^for="variable in collection" directives to your HTML template to enable automatic XML generation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* XML Comparison - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CodeBracketIcon className="h-5 w-5 mr-2" />
            Current XML (Database)
          </h3>
          <div className="bg-gray-50 border border-gray-200 rounded p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">
              {dqEmail.mapRules ? formatXml(dqEmail.mapRules) : 'No existing MapRules'}
            </pre>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CodeBracketIcon className="h-5 w-5 mr-2" />
            Generated XML (Preview)
          </h3>
          <div className="bg-blue-50 border border-blue-200 rounded p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs font-mono text-blue-800 whitespace-pre-wrap">
              {generatedXML ? formatXml(generatedXML) : 'Template parsing will generate XML here...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
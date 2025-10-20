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
  const [templateParseTimeout, setTemplateParseTimeout] = useState(null);

  // Auto-format HTML when component mounts
  useEffect(() => {
    if (templateText && !htmlTemplate) {
      const formatted = formatHtml ? formatHtml(templateText) : templateText;
      setHtmlTemplate(formatted);
    }
  }, [templateText, formatHtml, htmlTemplate]);

  // Parse existing mapRules XML to extract mappings and groupBy settings
  const parseExistingMappings = (mapRulesXml, hierarchy, viewColumns, templateText) => {
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
                
                // Store all XML fields for later merging with template-parsed fields
                if (!hierarchyLevel.xmlFields) {
                  hierarchyLevel.xmlFields = [];
                }
                hierarchyLevel.xmlFields.push({
                  fieldName,
                  templateVar,
                  mappedColumn: actualColumnName
                });
                
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
      // Merge XML fields with template-parsed hierarchy, determining visibility from template
      updatedHierarchy.forEach(level => {
        if (level.xmlFields) {
          level.xmlFields.forEach(xmlField => {
            // Check if this field is already in variables from template parsing
            const existsInVariables = level.variables.some(v => v.templateVar === xmlField.templateVar);
            if (!existsInVariables) {
              // Field exists in XML but not in template parsing, add it as potentially hidden
              const isHidden = isFieldHidden(xmlField.templateVar, templateText);
              level.variables.push({
                templateVar: xmlField.templateVar,
                fieldName: xmlField.fieldName,
                mappedColumn: xmlField.mappedColumn,
                isHidden: isHidden
              });
            } else {
              // Field exists in both XML and template, ensure it's marked as visible
              const existingVar = level.variables.find(v => v.templateVar === xmlField.templateVar);
              if (existingVar) {
                existingVar.isHidden = false;
              }
            }
          });
          // Clean up temporary xmlFields property
          delete level.xmlFields;
        }
      });
      
      console.log('Final updated hierarchy with groupBy values and hidden fields:', updatedHierarchy.map(h => ({
        collection: h.collection,
        variable: h.variable,
        groupBy: h.groupBy,
        originalCollection: h.originalCollection,
        variablesCount: h.variables?.length,
        hiddenFieldsCount: h.variables?.filter(v => v.isHidden)?.length || 0
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
      
      const { mappings, updatedHierarchy } = parseExistingMappings(dqEmail.mapRules, parsedHierarchy, mapViewColumns, htmlTemplate);
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
  }, [dqEmail?.mapRules, parsedHierarchy.length, existingMappingsLoaded, mapViewColumns, htmlTemplate]); // Added htmlTemplate

  // Debug: Log when parsedHierarchy actually changes
  useEffect(() => {
    console.log('parsedHierarchy state changed:', parsedHierarchy.map(h => ({
      collection: h.collection,
      variable: h.variable,
      groupBy: h.groupBy
    })));
  }, [parsedHierarchy]);

  // Determine if a field is hidden by checking if it appears in the template
  const isFieldHidden = (templateVar, templateText) => {
    if (!templateText) return false;
    const variableRegex = /\{\{([^}]+)\}\}/g;
    let match;
    
    while ((match = variableRegex.exec(templateText)) !== null) {
      if (match[1].trim() === templateVar) {
        return false; // Found in template, not hidden
      }
    }
    
    return true; // Not found in template, is hidden
  };

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

  const addHiddenField = (levelIndex, columnName) => {
    if (!columnName) return;
    
    const templateVar = `${parsedHierarchy[levelIndex].variable}.${columnName}`;
    
    setParsedHierarchy(prev => prev.map((level, index) => {
      if (index === levelIndex) {
        const newVariable = {
          templateVar: templateVar,
          fieldName: columnName,
          mappedColumn: null,
          isHidden: true // Mark as hidden field
        };
        
        return {
          ...level,
          variables: [...level.variables, newVariable]
        };
      }
      return level;
    }));
    
    // Automatically set the column mapping since user selected a specific column
    setColumnMappings(prev => ({
      ...prev,
      [templateVar]: columnName
    }));
  };

  // Get available columns that haven't been mapped yet in this level
  const getUnmappedColumns = (levelIndex) => {
    if (!mapViewColumns) return [];
    
    const currentLevel = parsedHierarchy[levelIndex];
    if (!currentLevel) return [];
    
    // Get all currently mapped columns in this level
    const mappedColumns = new Set();
    currentLevel.variables.forEach(variable => {
      const mappedColumn = columnMappings[variable.templateVar];
      if (mappedColumn) {
        mappedColumns.add(mappedColumn);
      }
    });
    
    // Return columns that aren't mapped yet
    return mapViewColumns.filter(col => !mappedColumns.has(col.columnName));
  };

  const removeHiddenField = (levelIndex, varIndex) => {
    setParsedHierarchy(prev => prev.map((level, index) => {
      if (index === levelIndex) {
        const newVariables = level.variables.filter((_, i) => i !== varIndex);
        return {
          ...level,
          variables: newVariables
        };
      }
      return level;
    }));
  };

  // Get available columns for GroupBy dropdown based on hierarchy rules
  const getAvailableGroupByColumns = (levelIndex) => {
    if (!mapViewColumns) return [];
    
    // For level 0 (root level), all columns are available
    if (levelIndex === 0) {
      return mapViewColumns.map(col => ({ ...col, fromParent: false }));
    }
    
    // For child levels, only columns that are mapped in parent levels are available
    const availableColumns = [];
    
    // Get all columns mapped in parent levels (levels 0 to levelIndex-1)
    for (let parentLevel = 0; parentLevel < levelIndex; parentLevel++) {
      const parentLevelData = parsedHierarchy[parentLevel];
      if (parentLevelData) {
        parentLevelData.variables.forEach(variable => {
          const mappedColumn = columnMappings[variable.templateVar];
          if (mappedColumn) {
            // Find the actual column info
            const columnInfo = mapViewColumns.find(col => col.columnName === mappedColumn);
            if (columnInfo) {
              // Check if not already added
              if (!availableColumns.find(existing => existing.columnName === columnInfo.columnName)) {
                availableColumns.push({ 
                  ...columnInfo, 
                  fromParent: true,
                  parentLevel: parentLevel 
                });
              }
            }
          }
        });
      }
    }
    
    return availableColumns;
  };

  const handleTemplateChange = (newTemplate) => {
    setHtmlTemplate(newTemplate);
    
    // Clear existing timeout
    if (templateParseTimeout) {
      clearTimeout(templateParseTimeout);
    }
    
    // Set new timeout for debounced parsing
    const timeoutId = setTimeout(() => {
      console.log('Debounced template parsing triggered');
      // Use a callback to get the current state values at execution time
      setParsedHierarchy(currentHierarchy => {
        setColumnMappings(currentMappings => {
          reparseTemplateAndUpdateVisibility(newTemplate, currentMappings, currentHierarchy);
          return currentMappings; // Don't change columnMappings
        });
        return currentHierarchy; // Return original hierarchy, will be updated in reparseTemplateAndUpdateVisibility
      });
    }, 300);
    
    setTemplateParseTimeout(timeoutId);
  };

  // Re-parse template and update field visibility
  const reparseTemplateAndUpdateVisibility = (templateText, currentColumnMappings, currentHierarchy) => {
    if (!currentHierarchy.length) return;
    
    console.log('Re-evaluating field visibility and detecting new template variables');
    console.log('Current column mappings:', currentColumnMappings);
    
    // Extract all template variables from current template
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const currentTemplateVars = new Set();
    let match;
    
    while ((match = variableRegex.exec(templateText)) !== null) {
      currentTemplateVars.add(match[1].trim());
    }
    
    const updatedHierarchy = currentHierarchy.map(level => {
      // First, update existing variables' visibility and remove orphaned hidden fields
      const updatedVariables = level.variables.filter(variable => {
        const isInTemplate = currentTemplateVars.has(variable.templateVar);
        const isMapped = currentColumnMappings[variable.templateVar] && currentColumnMappings[variable.templateVar] !== '';
        
        console.log(`Checking field ${variable.templateVar}: inTemplate=${isInTemplate}, isMapped=${isMapped}, isHidden=${variable.isHidden}`);
        
        // Remove if: hidden + not in template + not mapped
        if (variable.isHidden && !isInTemplate && !isMapped) {
          console.log(`Removing orphaned hidden field: ${variable.templateVar} (not in template and not mapped)`);
          return false;
        }
        
        return true;
      }).map(variable => {
        const wasHidden = variable.isHidden;
        const isNowHidden = isFieldHidden(variable.templateVar, templateText);
        
        if (wasHidden !== isNowHidden) {
          console.log(`Field visibility changed: ${variable.templateVar} was ${wasHidden ? 'hidden' : 'visible'}, now ${isNowHidden ? 'hidden' : 'visible'}`);
        }
        
        return {
          ...variable,
          isHidden: isNowHidden
        };
      });
      
      // Find template variables that belong to this level but aren't tracked yet
      const existingVars = new Set(updatedVariables.map(v => v.templateVar));
      const newVariables = [];
      
      [...currentTemplateVars].forEach(templateVar => {
        // Check if this template variable belongs to this level (starts with level.variable.)
        if (templateVar.startsWith(level.variable + '.') && !existingVars.has(templateVar)) {
          const fieldName = templateVar.split('.')[1];
          console.log(`Found new template variable: ${templateVar} (field: ${fieldName}) for level ${level.collection}`);
          
          newVariables.push({
            templateVar: templateVar,
            fieldName: fieldName,
            mappedColumn: null,
            isHidden: isFieldHidden(templateVar, templateText)
          });
        }
      });
      
      if (newVariables.length > 0) {
        console.log(`Adding ${newVariables.length} new template variables to level ${level.collection}`);
      }
      
      return {
        ...level,
        variables: [...updatedVariables, ...newVariables]
      };
    });
    
    console.log('Setting updated hierarchy:', updatedHierarchy);
    setParsedHierarchy(updatedHierarchy);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (templateParseTimeout) {
        clearTimeout(templateParseTimeout);
      }
    };
  }, [templateParseTimeout]);

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
          onChange={(e) => handleTemplateChange(e.target.value)}
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
                          {getAvailableGroupByColumns(levelIndex).map(col => (
                            <option key={col.columnName} value={col.columnName}>
                              {col.columnName} ({col.dataType})
                              {col.fromParent && ' • from parent level'}
                            </option>
                          ))}
                        </select>
                        {/* Validation feedback */}
                        {levelIndex > 0 && (
                          <div className="text-xs mt-1">
                            {getAvailableGroupByColumns(levelIndex).length === 0 ? (
                              <span className="text-red-600 bg-red-50 px-2 py-1 rounded">
                                ⚠️ No fields available from parent levels
                              </span>
                            ) : level.groupBy && !getAvailableGroupByColumns(levelIndex).find(col => col.columnName === level.groupBy) ? (
                              <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                ⚠️ Selected field not available from parent levels
                              </span>
                            ) : level.groupBy ? (
                              <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
                                ✅ Valid selection
                              </span>
                            ) : (
                              <span className="text-gray-500">
                                {getAvailableGroupByColumns(levelIndex).length} fields available from parent levels
                              </span>
                            )}
                          </div>
                        )}
                        {/* Debug info - remove after fixing */}
                        {process.env.NODE_ENV === 'development' && (
                          <span className="text-xs text-gray-500 bg-yellow-100 px-2 py-1 rounded">
                            Current: "{level.groupBy || 'none'}" | Available: {getAvailableGroupByColumns(levelIndex).length}
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
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                              {variable.isHidden ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mr-2">
                                  Hidden Field
                                </span>
                              ) : (
                                <span className="mr-2">Template Variable:</span>
                              )}
                              {variable.isHidden ? (
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                  {variable.fieldName} (non-display)
                                </code>
                              ) : (
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                  {`{{${variable.templateVar}}}`}
                                </code>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Field: {variable.fieldName}
                              {variable.isHidden && <span className=" text-orange-600"> • Used for grouping only</span>}
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
                            {variable.isHidden && (
                              <button
                                onClick={() => removeHiddenField(levelIndex, varIndex)}
                                className="text-red-600 hover:text-red-800 transition-colors p-1"
                                title="Remove hidden field"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Hidden Field Dropdown */}
                    <div className="bg-gray-50 rounded border border-dashed border-gray-300 p-3">
                      <div className="flex items-center space-x-3">
                        <PlusIcon className="h-4 w-4 text-gray-600 flex-shrink-0" />
                        <div className="flex-1">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                addHiddenField(levelIndex, e.target.value);
                                e.target.value = ''; // Reset selection
                              }
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={getUnmappedColumns(levelIndex).length === 0}
                          >
                            <option value="">
                              {getUnmappedColumns(levelIndex).length === 0 
                                ? 'All available columns are already mapped' 
                                : 'Select a column to add as hidden field...'
                              }
                            </option>
                            {getUnmappedColumns(levelIndex).map(col => (
                              <option key={col.columnName} value={col.columnName}>
                                {col.columnName} ({col.dataType})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2 ml-7">
                        Add a field that exists in the view but is not displayed in the email template.
                        These fields can be used for grouping in child levels.
                        <span className="block mt-1 font-medium">
                          {getUnmappedColumns(levelIndex).length} unmapped columns available
                        </span>
                      </div>
                    </div>
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
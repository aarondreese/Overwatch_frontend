// Shared color sequence for highlighting and loop keys
const loopColors = [
  {
    bg: "bg-blue-200",
    text: "text-blue-900",
    border: "border-blue-300",
    light: "bg-blue-50",
  },
  {
    bg: "bg-green-200",
    text: "text-green-900",
    border: "border-green-300",
    light: "bg-green-50",
  },
  {
    bg: "bg-purple-200",
    text: "text-purple-900",
    border: "border-purple-300",
    light: "bg-purple-50",
  },
  {
    bg: "bg-orange-200",
    text: "text-orange-900",
    border: "border-orange-300",
    light: "bg-orange-50",
  },
  {
    bg: "bg-pink-200",
    text: "text-pink-900",
    border: "border-pink-300",
    light: "bg-pink-50",
  },
];
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import {
  getDQEmail,
  updateDQEmail,
  getDQEmailResources,
  updateHtmlTemplate,
} from "@/lib/client/dqemails";
import { listHtmlTemplates } from "@/lib/client/htmlTemplates";
import { listMapViews } from "@/lib/client/mapViews";
import { listDQChecks } from "@/lib/client/dqchecks";
import { listStoredProcedures } from "@/lib/client/storedProcedures";
import TemplateXMLEditor from "@/components/TemplateXMLEditor";

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
  PencilSquareIcon,
} from "@heroicons/react/24/solid";

export default function DQEmailDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [dqEmail, setDQEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resources, setResources] = useState({
    template: null,
    mapViewColumns: null,
  });
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editorChanges, setEditorChanges] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [dropdownData, setDropdownData] = useState({
    htmlTemplates: [],
    mapViews: [],
    dqChecks: [],
    storedProcedures: []
  });
  const [dropdownLoading, setDropdownLoading] = useState(false);

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
      console.log("Fetching resources for:", { templateName, mapViewName });
      setResourcesLoading(true);
      const resourceData = await getDQEmailResources(templateName, mapViewName);
      console.log("Resources fetched:", resourceData);
      setResources({
        template: resourceData.data.template || null,
        mapViewColumns: resourceData.data.mapViewColumns || null,
        templateError: resourceData.templateError,
        mapViewError: resourceData.mapViewError,
      });
    } catch (err) {
      console.error("Error fetching email resources:", err);
      setResources({
        template: null,
        mapViewColumns: null,
        templateError: `Error loading template: ${err.message}`,
        mapViewError: `Error loading map view: ${err.message}`,
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

  const handleEditorSave = async (changes) => {
    try {
      setEditorChanges(changes);

      // Update MapRules in DQEmail table
      console.log("Updating DQ Email with:", {
        mapRules: changes.mapRules,
        hierarchy: changes.hierarchy,
      });
      const updateResult = await updateDQEmail(id, {
        mapRules: changes.mapRules,
        hierarchy: changes.hierarchy, // Update hierarchy if provided
      });

      console.log("Update result:", updateResult);

      if (!updateResult || !updateResult.success) {
        const errorMessage = updateResult?.message || "Unknown error occurred";
        throw new Error(`Failed to update DQ Email: ${errorMessage}`);
      }

      // Update HTML template in HtmlTemplate table if template was changed
      if (changes.htmlTemplate && dqEmail.htmlTemplateName) {
        const templateResult = await updateHtmlTemplate(
          dqEmail.htmlTemplateName,
          changes.htmlTemplate
        );
        if (!templateResult.success) {
          throw new Error(
            `Failed to update HTML template: ${templateResult.message}`
          );
        }
      }

      // Refresh the DQ email data and resources
      await fetchDQEmail();

      setShowEditor(false);
      setEditorChanges(null);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Error saving editor changes:", err);
      // Could add toast notification here
    }
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
    setEditorChanges(null);
    setHasUnsavedChanges(false);
  };

  const loadDropdownData = async () => {
    setDropdownLoading(true);
    try {
      const [htmlTemplates, mapViews, dqChecks, storedProcedures] = await Promise.all([
        listHtmlTemplates(),
        listMapViews(),
        listDQChecks(),
        listStoredProcedures()
      ]);

      setDropdownData({
        htmlTemplates,
        mapViews,
        dqChecks,
        storedProcedures
      });
    } catch (err) {
      console.error('Error loading dropdown data:', err);
      setError('Failed to load dropdown options: ' + err.message);
    } finally {
      setDropdownLoading(false);
    }
  };

  const handleStartEditing = async () => {
    // Initialize form data with current email settings
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

    // Determine which mode to use: stored procedure or DQ check + map view
    const useStoredProcedure = Boolean(dqEmail.runStoredProcedure && !dqEmail.dqCheckId && !dqEmail.mapView);

    setEditFormData({
      htmlTemplateName: dqEmail.htmlTemplateName || '',
      mapView: dqEmail.mapView || '',
      dqCheckId: dqEmail.dqCheckId || '',
      runStoredProcedure: dqEmail.runStoredProcedure || '',
      useStoredProcedure,
      frequencyNumber,
      frequencyUnit,
      emailSubject: dqEmail.emailSubject || '',
      description: dqEmail.description || '',
      devEmailAddress: dqEmail.devEmailAddress || ''
    });

    setIsEditing(true);
    await loadDropdownData();
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditFormData({});
  };

  const isFormValid = () => {
    if (editFormData.useStoredProcedure) {
      // Stored Procedure mode - requires stored procedure
      return editFormData.runStoredProcedure && editFormData.runStoredProcedure.trim() !== '';
    } else {
      // DQ Check + Map View mode - requires all three fields
      return editFormData.htmlTemplateName && editFormData.htmlTemplateName.trim() !== '' &&
             editFormData.dqCheckId &&
             editFormData.mapView && editFormData.mapView.trim() !== '';
    }
  };

  const handleSaveEditing = async () => {
    try {
      // Calculate total frequency in minutes
      const frequencyInMinutes = editFormData.frequencyNumber * editFormData.frequencyUnit;
      
      const updates = {
        htmlTemplateName: editFormData.htmlTemplateName || null,
        frequencyInMinutes,
        emailSubject: editFormData.emailSubject || null,
        description: editFormData.description || null,
        devEmailAddress: editFormData.devEmailAddress || null
      };

      // Add fields based on the selected mode
      if (editFormData.useStoredProcedure) {
        // Stored Procedure mode
        updates.runStoredProcedure = editFormData.runStoredProcedure || null;
        updates.mapView = null;
        updates.dqCheckId = null;
      } else {
        // DQ Check + Map View mode
        updates.mapView = editFormData.mapView || null;
        updates.dqCheckId = editFormData.dqCheckId ? parseInt(editFormData.dqCheckId) : null;
        updates.runStoredProcedure = null;
      }

      await updateDQEmail(id, updates);
      await fetchDQEmail(); // Refresh the data
      setIsEditing(false);
      setEditFormData({});
    } catch (err) {
      console.error('Error saving email settings:', err);
      setError('Failed to save settings: ' + err.message);
    }
  };

  const handleFormChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  const formatFrequency = (frequencyInMinutes) => {
    if (!frequencyInMinutes) return "Not configured";
    
    const days = Math.floor(frequencyInMinutes / 1440);
    const hours = Math.floor((frequencyInMinutes % 1440) / 60);
    const minutes = frequencyInMinutes % 60;
    
    const parts = [];
    
    if (days > 0) {
      parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    }
    if (hours > 0) {
      parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    }
    if (minutes > 0) {
      parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    }
    
    if (parts.length === 0) {
      return "Not configured";
    }
    
    return `Every ${parts.join(', ')}`;
  };

  // Parse MapRules XML to extract field mappings
  const parseMapRules = (mapRulesXml) => {
    if (!mapRulesXml) return [];

    try {
      // Parse XML using DOMParser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(mapRulesXml, "text/xml");

      const collections = xmlDoc.getElementsByTagName("collection");
      const mappings = [];

      for (let collection of collections) {
        const collectionName =
          collection.getElementsByTagName("collectionname")[0]?.textContent;
        const instanceName =
          collection.getElementsByTagName("instancename")[0]?.textContent;
        const fields = collection.getElementsByTagName("field");

        for (let field of fields) {
          const fieldName = field.getElementsByTagName("name")[0]?.textContent;
          const columnName =
            field.getElementsByTagName("column")[0]?.textContent;

          if (fieldName && columnName) {
            mappings.push({
              collection: collectionName,
              instance: instanceName,
              templateVariable: `${instanceName}.${fieldName}`,
              mapColumn: columnName,
              fieldName,
              columnName,
            });
          }
        }
      }

      return mappings;
    } catch (error) {
      console.error("Error parsing MapRules XML:", error);
      return [];
    }
  };

  // Format XML with proper indentation - keeps simple content tags on same line
  const formatXml = (xmlString) => {
    if (!xmlString) return "";

    try {
      // Parse using DOMParser for better handling
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");

      // Check for parsing errors
      const parserError = xmlDoc.getElementsByTagName("parsererror");
      if (parserError.length > 0) {
        return xmlString; // Return original if parsing fails
      }

      // Format XML recursively
      const formatNode = (node, indentLevel = 0) => {
        const indent = "  ".repeat(indentLevel);

        if (node.nodeType === 3) {
          // Text node
          const text = node.textContent.trim();
          return text ? text : "";
        }

        if (node.nodeType === 1) {
          // Element node
          const tagName = node.tagName;
          const children = Array.from(node.childNodes);

          // Check if this is a simple text element (only contains text, no child elements)
          const hasOnlyText =
            children.length === 1 && children[0].nodeType === 3;

          if (hasOnlyText) {
            const textContent = children[0].textContent.trim();
            return `${indent}<${tagName}>${textContent}</${tagName}>`;
          } else if (children.length === 0) {
            return `${indent}<${tagName}></${tagName}>`;
          } else {
            let result = `${indent}<${tagName}>\n`;
            children.forEach((child) => {
              const childFormatted = formatNode(child, indentLevel + 1);
              if (childFormatted) {
                result += childFormatted + "\n";
              }
            });
            result += `${indent}</${tagName}>`;
            return result;
          }
        }

        return "";
      };

      return formatNode(xmlDoc.documentElement);
    } catch (error) {
      console.error("Error formatting XML:", error);

      // Fallback: simple formatting
      return xmlString
        .replace(/></g, ">\n<")
        .split("\n")
        .map((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return "";

          let indentLevel = 0;
          const matches = xmlString
            .substring(0, xmlString.indexOf(trimmed))
            .match(/<[^\/]/g);
          const closes = xmlString
            .substring(0, xmlString.indexOf(trimmed))
            .match(/<\//g);
          indentLevel = Math.max(
            0,
            (matches?.length || 0) - (closes?.length || 0)
          );

          if (trimmed.startsWith("</"))
            indentLevel = Math.max(0, indentLevel - 1);

          return "  ".repeat(indentLevel) + trimmed;
        })
        .filter((line) => line.trim())
        .join("\n");
    }
  };

  // Format HTML with proper indentation - similar to XML formatter but handles HTML specifics
  const formatHtml = (htmlString) => {
    if (!htmlString) return "";

    try {
      // Parse using DOMParser for HTML
      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(htmlString, "text/html");

      // Check for parsing errors
      const parserError = htmlDoc.getElementsByTagName("parsererror");
      if (parserError.length > 0) {
        // Fall back to manual formatting
        return formatHtmlManually(htmlString);
      }

      // Format HTML recursively
      const formatNode = (node, indentLevel = 0) => {
        const indent = "  ".repeat(indentLevel);

        if (node.nodeType === 3) {
          // Text node
          const text = node.textContent.trim();
          return text ? text : "";
        }

        if (node.nodeType === 1) {
          // Element node
          const tagName = node.tagName.toLowerCase();
          const children = Array.from(node.childNodes);
          const attributes = Array.from(node.attributes);

          // Build attribute string
          const attrString =
            attributes.length > 0
              ? " " +
                attributes
                  .map((attr) => `${attr.name}="${attr.value}"`)
                  .join(" ")
              : "";

          // Self-closing tags
          if (["br", "hr", "img", "input", "meta", "link"].includes(tagName)) {
            return `${indent}<${tagName}${attrString}>`;
          }

          // Check if this is a simple text element (only contains text, no child elements)
          const hasOnlyText =
            children.length === 1 && children[0].nodeType === 3;

          if (hasOnlyText) {
            const textContent = children[0].textContent.trim();
            if (textContent.length < 50) {
              // Keep short content on same line
              return `${indent}<${tagName}${attrString}>${textContent}</${tagName}>`;
            }
          }

          if (children.length === 0) {
            return `${indent}<${tagName}${attrString}></${tagName}>`;
          } else {
            let result = `${indent}<${tagName}${attrString}>\n`;
            children.forEach((child) => {
              const childFormatted = formatNode(child, indentLevel + 1);
              if (childFormatted) {
                result += childFormatted + "\n";
              }
            });
            result += `${indent}</${tagName}>`;
            return result;
          }
        }

        return "";
      };

      // Format the entire document
      let result = "";

      // Add doctype if present
      if (htmlDoc.doctype) {
        result += "<!DOCTYPE html>\n";
      }

      // Format html element and its contents
      const htmlElement = htmlDoc.documentElement;
      if (htmlElement) {
        result += formatNode(htmlElement);
      }

      return result;
    } catch (error) {
      console.error("Error formatting HTML:", error);
      return formatHtmlManually(htmlString);
    }
  };

  // Manual HTML formatting fallback
  const formatHtmlManually = (htmlString) => {
    try {
      let formatted = "";
      let indent = 0;
      const indentSize = 2;

      // Remove extra whitespace and split by tags
      const cleaned = htmlString.replace(/>\s*</g, "><").replace(/\n\s*/g, " ");
      const parts = cleaned.split("<");

      for (let i = 0; i < parts.length; i++) {
        if (i === 0 && parts[i] === "") continue;

        let part = parts[i];
        if (!part) continue;

        const isClosingTag = part.startsWith("/");
        const isSelfClosing =
          part.endsWith("/>") ||
          /^(br|hr|img|input|meta|link)\s*\/?>/.test(part);

        if (isClosingTag) {
          indent = Math.max(0, indent - 1);
        }

        formatted += " ".repeat(indent * indentSize);
        formatted += "<" + part;

        // Add newline
        formatted += "\n";

        if (!isClosingTag && !isSelfClosing && part.indexOf(">") !== -1) {
          indent++;
        }
      }

      return formatted.trim();
    } catch (error) {
      return htmlString; // Return original if all formatting fails
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
      const parts = directive.split(" in ");
      if (parts.length === 2) {
        const variable = parts[0].trim();
        const collection = parts[1].trim();
        directives.push({
          full: directive,
          variable,
          collection,
          position: match.index,
          originalCase: match[0], // Store the original case found in template
        });
      }
    }

    return directives.sort((a, b) => a.position - b.position);
  };

  // Highlight ^For directives in template with color coding (order matches color key)
  const highlightForDirectives = (templateText, forDirectives) => {
    if (!templateText || !forDirectives.length) return templateText;

    // Use the shared color array
    const colors = loopColors;

    let highlightedText = templateText;

    // Replace directives in order of appearance (not reverse)
    forDirectives.forEach((directive, index) => {
      const color = colors[index % colors.length];
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading DQ Email
          </h2>
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
        <meta
          name="description"
          content={`Details for DQ email: ${dqEmail.emailName}`}
        />
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
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  dqEmail.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
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
                    <div className="text-lg font-semibold text-gray-900">
                      Status
                    </div>
                    <div className="text-sm text-gray-500">
                      Email activation
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleToggleStatus("isActive", dqEmail.isActive)
                  }
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    dqEmail.isActive
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-red-100 text-red-800 hover:bg-red-200"
                  }`}
                >
                  {dqEmail.isActive ? "Deactivate" : "Activate"}
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
                    <div className="text-lg font-semibold text-gray-900">
                      Development
                    </div>
                    <div className="text-sm text-gray-500">Testing mode</div>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleStatus("inDev", dqEmail.inDev)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    dqEmail.inDev
                      ? "bg-orange-100 text-orange-800 hover:bg-orange-200"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  {dqEmail.inDev ? "Move to Production" : "Move to Development"}
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Email Configuration */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <EnvelopeIcon className="h-6 w-6 mr-2" />
                  Email Configuration
                </h2>
                {!isEditing && (
                  <button
                    onClick={handleStartEditing}
                    disabled={showEditor}
                    className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm ${
                      showEditor ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    Edit Settings
                  </button>
                )}
                {isEditing && (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveEditing}
                      disabled={!isFormValid()}
                      className={`px-4 py-2 rounded-md transition-colors text-sm ${
                        isFormValid()
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEditing}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {dropdownLoading && isEditing && (
                <div className="flex items-center justify-center py-8 mb-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading options...</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Subject
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editFormData.emailSubject || ''}
                      onChange={(e) => handleFormChange('emailSubject', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email subject"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                      {dqEmail.emailSubject || "No subject configured"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editFormData.description || ''}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter description"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                      {dqEmail.description}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Development Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editFormData.devEmailAddress || ''}
                      onChange={(e) => handleFormChange('devEmailAddress', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter development email address"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                      {dqEmail.devEmailAddress || "Not configured"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  {isEditing ? (
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        min="0"
                        value={editFormData.frequencyNumber || 0}
                        onChange={(e) => handleFormChange('frequencyNumber', parseInt(e.target.value) || 0)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter number"
                      />
                      <select
                        value={editFormData.frequencyUnit || 1}
                        onChange={(e) => handleFormChange('frequencyUnit', parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={1}>Minutes</option>
                        <option value={60}>Hours</option>
                        <option value={1440}>Days</option>
                      </select>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                      {formatFrequency(dqEmail.frequencyInMinutes)}
                    </div>
                  )}
                  {isEditing && (
                    <p className="mt-1 text-sm text-gray-500">
                      Total: Every {(editFormData.frequencyNumber || 0) * (editFormData.frequencyUnit || 1)} minutes
                    </p>
                  )}
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
                {/* Mode Toggle - only show in edit mode */}
                {isEditing && (
                  <div className="border-b border-gray-200 pb-4 mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Configuration Type
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="configType"
                          checked={!editFormData.useStoredProcedure}
                          onChange={() => handleFormChange('useStoredProcedure', false)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">DQ Check + Map View</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="configType"
                          checked={editFormData.useStoredProcedure || false}
                          onChange={() => handleFormChange('useStoredProcedure', true)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Stored Procedure</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Stored Procedure Mode */}
                {(isEditing && editFormData.useStoredProcedure) || (!isEditing && dqEmail.runStoredProcedure && !dqEmail.dqCheckId && !dqEmail.mapView) ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stored Procedure
                    </label>
                    {isEditing ? (
                      <select
                        value={editFormData.runStoredProcedure || ''}
                        onChange={(e) => handleFormChange('runStoredProcedure', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={dropdownLoading}
                      >
                        <option value="">Select a stored procedure</option>
                        {dropdownData.storedProcedures.map((proc) => (
                          <option key={proc.fullProcedureName} value={proc.fullProcedureName}>
                            {proc.fullProcedureName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900 font-mono">
                        {dqEmail.runStoredProcedure || "Not specified"}
                      </div>
                    )}
                  </div>
                ) : (
                  /* DQ Check + Map View Mode */
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        HTML Template
                      </label>
                      {isEditing ? (
                        <select
                          value={editFormData.htmlTemplateName || ''}
                          onChange={(e) => handleFormChange('htmlTemplateName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={dropdownLoading}
                        >
                          <option value="">Select a template</option>
                          {dropdownData.htmlTemplates.map((template) => (
                            <option key={template.name} value={template.name}>
                              {template.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                          {dqEmail.htmlTemplateName || "No template specified"}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Linked DQ Check
                      </label>
                      {isEditing ? (
                        <select
                          value={editFormData.dqCheckId || ''}
                          onChange={(e) => handleFormChange('dqCheckId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={dropdownLoading}
                        >
                          <option value="">Select a DQ check</option>
                          {dropdownData.dqChecks.map((check) => (
                            <option key={check.id} value={check.id}>
                              {check.functionName} ({check.domainName || 'No Domain'})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                          {dqEmail.dqCheckFunction ? (
                            <Link
                              href={`/dqchecks/${dqEmail.dqCheckId}`}
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {dqEmail.dqCheckFunction}
                            </Link>
                          ) : (
                            "No DQ check linked"
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Map View
                      </label>
                      {isEditing ? (
                        <select
                          value={editFormData.mapView || ''}
                          onChange={(e) => handleFormChange('mapView', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={dropdownLoading}
                        >
                          <option value="">Select a map view</option>
                          {dropdownData.mapViews.map((view) => (
                            <option key={view.fullViewName} value={view.viewName}>
                              {view.fullViewName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                          {dqEmail.mapView || "Not configured"}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hierarchy
                      </label>
                      <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                        {dqEmail.hierarchy || "Not configured"}
                      </div>
                    </div>
                  </>
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
                        <span className="ml-3 text-gray-600">
                          Loading template...
                        </span>
                      </div>
                    ) : resources.templateError ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                          <div className="ml-3">
                            <p className="text-sm text-red-800">
                              {resources.templateError}
                            </p>
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
                                  const forDirectives = extractForDirectives(
                                    resources.template.text
                                  );
                                  return highlightForDirectives(
                                    resources.template.text,
                                    forDirectives
                                  )
                                    .replace(/</g, "&lt;")
                                    .replace(/>/g, "&gt;")
                                    .replace(
                                      /&lt;span class="([^"]*)"&gt;([^&]*)&lt;\/span&gt;/g,
                                      '<span class="$1">$2</span>'
                                    );
                                })(),
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                          <div>
                            <span className="font-medium">Created:</span>{" "}
                            {resources.template.createdDate
                              ? new Date(
                                  resources.template.createdDate
                                ).toLocaleDateString()
                              : "Unknown"}
                          </div>
                          <div>
                            <span className="font-medium">Modified:</span>{" "}
                            {resources.template.modifiedDate
                              ? new Date(
                                  resources.template.modifiedDate
                                ).toLocaleDateString()
                              : "Unknown"}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                        <p className="text-sm text-gray-600">
                          Template not found
                        </p>
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
                        <span className="ml-3 text-gray-600">
                          Loading columns...
                        </span>
                      </div>
                    ) : resources.mapViewError ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                          <div className="ml-3">
                            <p className="text-sm text-red-800">
                              {resources.mapViewError}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : resources.mapViewColumns &&
                      resources.mapViewColumns.length > 0 ? (
                      <div className="space-y-4">
                        <div className="text-sm text-gray-600">
                          Found {resources.mapViewColumns.length} columns in
                          this view:
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
                                    {column.maxLength &&
                                      ` (${column.maxLength})`}
                                    {!column.isNullable && " • NOT NULL"}
                                    {column.columnDefault &&
                                      ` • Default: ${column.columnDefault}`}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                        <p className="text-sm text-gray-600">
                          No columns found for this view
                        </p>
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
                      const templateVars = extractTemplateVariables(
                        resources.template.text
                      );

                      if (mappings.length === 0) {
                        return (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm text-yellow-800">
                              Could not parse MapRules XML. The XML might be
                              malformed or use an unexpected structure.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-6">
                          {/* Summary */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <div className="text-2xl font-bold text-blue-700">
                                {templateVars.length}
                              </div>
                              <div className="text-sm text-blue-600">
                                Template Variables
                              </div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                              <div className="text-2xl font-bold text-green-700">
                                {mappings.length}
                              </div>

                              <div className="text-sm text-green-600">
                                Mapped Fields
                              </div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                              <div className="text-2xl font-bold text-purple-700">
                                {
                                  new Set(mappings.map((m) => m.collection))
                                    .size
                                }
                              </div>
                              <div className="text-sm text-purple-600">
                                Collections
                              </div>
                            </div>
                          </div>

                          {/* Color Key for ^For Directives */}
                          {(() => {
                            const forDirectives = resources.template
                              ? extractForDirectives(resources.template.text)
                              : [];
                            if (forDirectives.length === 0) return null;

                            return (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                  Template Loop Color Key:
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {forDirectives.map((directive, index) => {
                                    const color =
                                      loopColors[index % loopColors.length];
                                    return (
                                      <div
                                        key={index}
                                        className={`p-3 rounded-lg border ${color.light} ${color.border}`}
                                      >
                                        <div
                                          className={`inline-block px-2 py-1 rounded text-xs font-mono ${color.bg} ${color.text} ${color.border} border mb-2`}
                                        >
                                          ^For="{directive.full}"
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          <div>
                                            <strong>Variable:</strong>{" "}
                                            {directive.variable}
                                          </div>
                                          <div>
                                            <strong>Collection:</strong>{" "}
                                            {directive.collection}
                                          </div>
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
                            const forDirectives = resources.template
                              ? extractForDirectives(resources.template.text)
                              : [];
                            // Use the same color array for highlighting in HTML Template
                            const colors = loopColors;

                            // Parse the hierarchy from dqEmail.hierarchy (e.g., "serviceLeads>supportWorkers>properties")
                            const hierarchyOrder = dqEmail.hierarchy
                              ? dqEmail.hierarchy.split(">")
                              : [];
                            const collections = Array.from(
                              new Set(mappings.map((m) => m.collection))
                            );

                            // If no hierarchy defined, just show collections in order found
                            const orderedCollections =
                              hierarchyOrder.length > 0
                                ? hierarchyOrder.filter((h) =>
                                    collections.includes(h)
                                  )
                                : collections;

                            // Create mapping between collections and ^For directives
                            const getCollectionColor = (
                              collectionName,
                              level
                            ) => {
                              // Try to find matching ^For directive
                              const matchingDirective = forDirectives.find(
                                (d) => d.collection === collectionName
                              );
                              if (matchingDirective) {
                                const directiveIndex =
                                  forDirectives.indexOf(matchingDirective);
                                return colors[directiveIndex % colors.length];
                              }
                              // Fallback to level-based coloring
                              return colors[level % colors.length];
                            };

                            const renderCollection = (
                              collectionName,
                              level = 0
                            ) => {
                              const collectionMappings = mappings.filter(
                                (m) => m.collection === collectionName
                              );
                              const indent = level * 2; // 2rem per level
                              const color = getCollectionColor(
                                collectionName,
                                level
                              );

                              return (
                                <div
                                  key={collectionName}
                                  className={`border ${color.border} rounded-lg p-4 ${color.light}`}
                                  style={{ marginLeft: `${indent}rem` }}
                                >
                                  <div className="flex items-center justify-between mb-4">
                                    <h3
                                      className={`text-lg font-semibold ${color.text} flex items-center`}
                                    >
                                      {level > 0 && (
                                        <div className="flex items-center mr-2">
                                          {Array.from({ length: level }).map(
                                            (_, i) => (
                                              <div
                                                key={i}
                                                className="w-4 h-px bg-gray-400 mr-1"
                                              ></div>
                                            )
                                          )}
                                          <ArrowRightIcon className="h-4 w-4 text-gray-400 mr-2" />
                                        </div>
                                      )}
                                      <span
                                        className={`px-3 py-1 rounded-full text-sm ${color.bg} ${color.text} border ${color.border}`}
                                      >
                                        Collection: {collectionName}
                                      </span>
                                    </h3>
                                    <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                                      Level {level + 1} •{" "}
                                      {collectionMappings.length} fields
                                    </span>
                                  </div>

                                  <div className="space-y-3">
                                    {collectionMappings.map(
                                      (mapping, index) => (
                                        <div
                                          key={index}
                                          className="bg-white border border-gray-200 rounded-md p-3 shadow-sm"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4 flex-1">
                                              {/* Template Variable */}
                                              <div className="flex-1">
                                                <div className="text-xs font-medium text-gray-500 mb-1">
                                                  Template Variable
                                                </div>
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
                                                <div className="text-xs font-medium text-gray-500 mb-1">
                                                  Database Column
                                                </div>
                                                <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-mono">
                                                  {mapping.mapColumn}
                                                </div>
                                              </div>
                                            </div>

                                            {/* Verification Badge */}
                                            <div className="flex-shrink-0 ml-4">
                                              {templateVars.includes(
                                                mapping.templateVariable
                                              ) ? (
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
                                            <span className="font-medium">
                                              Field:
                                            </span>{" "}
                                            {mapping.fieldName} •
                                            <span className="font-medium ml-2">
                                              Instance:
                                            </span>{" "}
                                            {mapping.instance}
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              );
                            };

                            return (
                              <div className="space-y-4">
                                {/* Hierarchy Visualization */}
                                {hierarchyOrder.length > 0 && (
                                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                      Data Hierarchy Structure:
                                    </h4>
                                    <div className="flex items-center space-x-2 text-sm">
                                      {hierarchyOrder.map(
                                        (collection, index) => (
                                          <div
                                            key={collection}
                                            className="flex items-center"
                                          >
                                            <span className="px-3 py-1 bg-white border border-gray-300 rounded-full font-mono text-xs">
                                              {collection}
                                            </span>
                                            {index <
                                              hierarchyOrder.length - 1 && (
                                              <ArrowRightIcon className="h-4 w-4 text-gray-400 mx-2" />
                                            )}
                                          </div>
                                        )
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2">
                                      Each level can contain multiple instances
                                      of the next level
                                    </div>
                                  </div>
                                )}

                                {/* Nested Collections */}
                                {orderedCollections.map(
                                  (collectionName, index) =>
                                    renderCollection(collectionName, index)
                                )}
                              </div>
                            );
                          })()}

                          {/* Unmapped Template Variables */}
                          {(() => {
                            const mappedVars = new Set(
                              mappings.map((m) => m.templateVariable)
                            );
                            const unmappedVars = templateVars.filter(
                              (v) => !mappedVars.has(v)
                            );

                            if (unmappedVars.length > 0) {
                              return (
                                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                                  <h3 className="text-lg font-semibold text-orange-800 mb-3">
                                    Unmapped Template Variables
                                  </h3>
                                  <div className="text-sm text-orange-700 mb-3">
                                    These variables appear in the template but
                                    are not defined in the MapRules:
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {unmappedVars.map((variable, index) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center px-3 py-1 bg-orange-200 text-orange-800 rounded-full text-sm font-mono"
                                      >
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

          {/* Template-XML Editor */}
          {showEditor && dqEmail.htmlTemplateName && resources.template && (
            <div className="mt-8">
              <TemplateXMLEditor
                dqEmail={dqEmail}
                templateText={resources.template.text}
                mapViewColumns={resources.mapViewColumns}
                formatXml={formatXml}
                formatHtml={formatHtml}
                onSave={handleEditorSave}
                onCancel={handleEditorCancel}
                onChangesDetected={setHasUnsavedChanges}
              />
            </div>
          )}

          {/* Show Edit Template button only for template-based emails */}
          {dqEmail.htmlTemplateName && resources.template && !showEditor && (
            <div className="mt-8 flex justify-end space-x-4">
              <button
                onClick={() => setShowEditor(true)}
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center"
              >
                <PencilSquareIcon className="h-4 w-4 mr-2" />
                Edit Template & Mapping
              </button>
            </div>
          )}
        </div>
      </div>

    </>
  );
}

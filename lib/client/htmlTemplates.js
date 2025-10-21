// Client utilities for HTML Templates API
export async function listHtmlTemplates() {
  const response = await fetch("/api/HtmlTemplates");
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Failed to fetch HTML templates");
  }

  return result.data;
}

export async function getTemplateUsage(templateName) {
  const response = await fetch(`/api/HtmlTemplates/usage?templateName=${encodeURIComponent(templateName)}`);
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Failed to fetch template usage");
  }

  return result.data;
}

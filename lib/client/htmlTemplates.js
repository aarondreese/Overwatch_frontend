// Client utilities for HTML Templates API
export async function listHtmlTemplates() {
  const response = await fetch("/api/HtmlTemplates");
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Failed to fetch HTML templates");
  }

  return result.data;
}

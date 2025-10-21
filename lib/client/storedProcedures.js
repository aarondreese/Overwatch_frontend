// Client utilities for Stored Procedures API
export async function listStoredProcedures() {
  const response = await fetch('/api/StoredProcedures');
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch stored procedures');
  }
  
  return result.data;
}
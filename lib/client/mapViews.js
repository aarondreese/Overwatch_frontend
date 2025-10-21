// Client utilities for Map Views API
export async function listMapViews() {
  const response = await fetch("/api/MapViews");
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Failed to fetch map views");
  }

  return result.data;
}

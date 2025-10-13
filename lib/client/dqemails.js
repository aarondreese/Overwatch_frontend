// Client utilities for DQEmails API
export async function listDQEmails() {
  const response = await fetch('/api/DQEmails');
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch DQ emails');
  }
  
  return result.data;
}

export async function getDQEmail(id) {
  const response = await fetch(`/api/DQEmails?id=${id}`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch DQ email');
  }
  
  return result.data;
}

export async function updateDQEmailStatus(id, isActive) {
  const response = await fetch(`/api/DQEmails?id=${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isActive }),
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to update DQ email status');
  }
  
  return result.data;
}

export async function updateDQEmail(id, updates) {
  const response = await fetch(`/api/DQEmails?id=${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to update DQ email');
  }
  
  return result.data;
}

export async function getDQEmailResources(templateName, mapViewName) {
  try {
    const params = new URLSearchParams();
    if (templateName) params.append('templateName', templateName);
    if (mapViewName) params.append('mapViewName', mapViewName);
    
    const response = await fetch(`/api/DQEmails/resources?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching DQ email resources:', error);
    throw error;
  }
}
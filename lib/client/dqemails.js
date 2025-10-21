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
  try {
    console.log('Making PUT request to update DQ Email:', id, updates);
    const response = await fetch(`/api/DQEmails?id=${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Parsed result:', result);
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to update DQ email');
    }
    
    return result;
  } catch (error) {
    console.error('Error in updateDQEmail:', error);
    throw error;
  }
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

export async function updateHtmlTemplate(templateName, templateText) {
  try {
    const response = await fetch('/api/DQEmails/updateTemplate', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        templateName,
        templateText 
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating HTML template:', error);
    throw error;
  }
}

// Get schedules for a DQ email
export async function getDQEmailSchedules(dqEmailId) {
  if (!dqEmailId) {
    throw new Error('DQ Email ID is required');
  }
  
  const response = await fetch(`/api/DQEmails/${dqEmailId}/schedules`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch DQ email schedules');
  }
  
  return result.data;
}

// Update schedule status for a DQ email
export async function updateDQEmailScheduleStatus(dqEmailId, emailScheduleId, enabled) {
  const response = await fetch(`/api/DQEmails/${dqEmailId}/schedules`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      emailScheduleId,
      enabled
    })
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to update schedule status');
  }
  
  return result.data;
}

// Delete a DQ email schedule relationship
export async function deleteDQEmailSchedule(dqEmailId, emailScheduleId) {
  const response = await fetch(`/api/DQEmails/${dqEmailId}/schedules`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      emailScheduleId
    })
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to delete schedule');
  }
  
  return result.data;
}

// Add a new schedule to a DQ email
export async function addDQEmailSchedule(dqEmailId, scheduleId) {
  const response = await fetch(`/api/DQEmails/${dqEmailId}/schedules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scheduleId
    })
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to add schedule');
  }
  
  return result.data;
}

// Get all available schedules (not currently assigned to this email)
export async function getAvailableSchedules(dqEmailId) {
  const response = await fetch(`/api/DQEmails/${dqEmailId}/available-schedules`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch available schedules');
  }
  
  return result.data;
}
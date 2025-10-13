// Client-side functions for DQ Checks API

export async function listDQChecks() {
  try {
    const response = await fetch('/api/DQChecks');
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch DQ checks');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching DQ checks:', error);
    throw error;
  }
}

export async function getDQCheckByID(id) {
  try {
    const response = await fetch(`/api/DQChecks?id=${id}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch DQ check');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching DQ check:', error);
    throw error;
  }
}

export async function updateDQCheckStatus(id, isActive) {
  try {
    const response = await fetch(`/api/DQChecks?id=${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isActive
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to update DQ check status');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error updating DQ check status:', error);
    throw error;
  }
}

export async function updateDQCheckField(id, fieldUpdates) {
  try {
    const response = await fetch(`/api/DQChecks?id=${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fieldUpdates),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to update DQ check');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error updating DQ check:', error);
    throw error;
  }
}

export async function updateDQCheckLifetime(id, lifetime) {
  return updateDQCheckField(id, { lifetime });
}

export async function updateDQCheckWarningLevel(id, warningLevel) {
  return updateDQCheckField(id, { warningLevel });
}

export async function updateDQCheckExplanation(id, explain) {
  return updateDQCheckField(id, { explain });
}

export async function updateDQCheckTestStatus(id, isInTest) {
  return updateDQCheckField(id, { isInTest });
}
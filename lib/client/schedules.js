// Client-side functions for Schedules API
export async function listSchedules() {
  const res = await fetch("/api/Schedules");
  const data = await res.json();
  console.log("schedules data:", data);
  return data.data; // Extract the data array from the response
}

export async function getScheduleByID(id) {
  const res = await fetch(`/api/Schedules?id=${id}`);
  const data = await res.json();
  console.log("schedule by ID data:", data);
  return data.data; // Extract the data from the response
}

export async function addSchedule(dto) {
  const scheduleModel = {
    title: dto.Title,
    activeFrom: dto.ActiveFrom,
    activeTo: dto.ActiveTo,
    isEnabled: dto.IsEnabled !== undefined ? dto.IsEnabled : true
  };

  console.log("in addSchedule model: ", scheduleModel);

  const res = await fetch("/api/Schedules", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(scheduleModel),
  });

  console.log("in addSchedule dto: ", dto);
  const responseData = await res.json();
  console.log("Got back from schedule fetch: ", responseData);

  if (res.status === 200 || res.status === 201) {
    return responseData.data;
  }

  throw new Error(responseData.message || "Something went wrong");
}

export async function updateSchedule(dto) {
  const scheduleModel = {
    id: dto.ID || dto.id,
    title: dto.Title,
    activeFrom: dto.ActiveFrom,
    activeTo: dto.ActiveTo,
    isEnabled: dto.IsEnabled !== undefined ? dto.IsEnabled : true
  };

  const res = await fetch("/api/Schedules", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "PUT",
    body: JSON.stringify(scheduleModel),
  });

  const responseData = await res.json();

  if (res.status === 200) {
    return responseData.data;
  }

  throw new Error(responseData.message || "Something went wrong");
}

export async function deleteSchedule(id) {
  const res = await fetch(`/api/Schedules?id=${id}`, {
    method: "DELETE",
  });

  const responseData = await res.json();

  if (res.status === 200) {
    return responseData.data;
  }

  throw new Error(responseData.message || "Something went wrong");
}

// Schedule Days API functions
export async function getScheduleDays(scheduleId) {
  const res = await fetch(`/api/ScheduleDays?scheduleId=${scheduleId}`);
  const data = await res.json();
  
  if (res.status === 200) {
    return data.data;
  }
  
  throw new Error(data.message || "Failed to fetch schedule days");
}

export async function updateScheduleDays(scheduleId, days) {
  const res = await fetch("/api/ScheduleDays", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "PUT",
    body: JSON.stringify({
      scheduleId,
      ...days
    }),
  });

  const responseData = await res.json();

  if (res.status === 200) {
    return responseData.data;
  }

  throw new Error(responseData.message || "Failed to update schedule days");
}

// Schedule Hours API functions
export async function getScheduleHours(scheduleId) {
  const res = await fetch(`/api/ScheduleHours?scheduleId=${scheduleId}`);
  const data = await res.json();
  
  if (res.status === 200) {
    return data.data;
  }
  
  throw new Error(data.message || "Failed to fetch schedule hours");
}

export async function updateScheduleHours(scheduleId, hours) {
  const res = await fetch("/api/ScheduleHours", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "PUT",
    body: JSON.stringify({
      scheduleId,
      hours
    }),
  });

  const responseData = await res.json();

  if (res.status === 200) {
    return responseData.data;
  }

  throw new Error(responseData.message || "Failed to update schedule hours");
}
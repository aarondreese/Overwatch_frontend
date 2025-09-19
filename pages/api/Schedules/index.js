export async function listSchedules() {
  const res = await fetch("https://localhost:7001/api/schedules", {
    method: "GET",
  });
  const data = await res.json();
  console.log("schedules data:", data);
  return data;
}

export async function getScheduleByID(DomainID) {
  const res = await fetch(`https://localhost:7001/api/schedules/` + DomainID, {
    method: "GET",
  });
  const data = await res.json();
  console.log("data from api:", data);
  return data;
}

export async function addSchedule(dto) {
  const domainModel = {
    sourceSystem_ID: dto.SourceSystemID,
    domainName: dto.DomainName,
  };

  const res = await fetch("https://localhost:7001/api/schedules", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(scheduleModel),
  });

  return res.formData;
}

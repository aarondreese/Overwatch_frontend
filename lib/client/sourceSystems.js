// Client-side functions for Source Systems API
export async function listSourceSystems() {
  const res = await fetch("/api/SourceSystems");
  const data = await res.json();
  console.log("data:", data);
  return data.data; // Extract the data array from the response
}

export async function updateSourceSystems(dto) {
  const sourceSystemEditModel = {
    id: dto.SystemID,
    systemName: dto.SystemName,
    linkedServerName: dto.LinkedServerName == "" ? null : dto.LinkedServerName,
    databaseName: dto.SourceDatabaseName,
    defaultSourceSchema: dto.SourceSchemaName,
    defaultTargetSchema: dto.TargetSchemaName,
  };

  console.log("in updateSourceSystems editmodel: ", sourceSystemEditModel);
  const method = dto.SystemID == -1 ? "POST" : "PUT";
  console.warn("using Method: ", method);
  console.warn("systemID: ", dto.SystemID);

  const res = await fetch("/api/SourceSystems", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method,
    body: JSON.stringify(sourceSystemEditModel),
  });

  console.log("in updateSourceSystems dto: ", dto);
  const responseData = await res.json();
  console.log("Got back from fetch: ", responseData);

  if (res.status === 200 || res.status === 201) {
    const data = await listSourceSystems();
    return data;
  }

  throw new Error(responseData.message || "Something went wrong");
}

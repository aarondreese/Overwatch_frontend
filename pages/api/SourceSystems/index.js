export async function listSourceSystems() {
  const res = await fetch("https://localhost:7001/api/SourceSystems");
  const data = await res.json();
  console.log("data:", data);
  return data;
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
  const res = await fetch("https://localhost:7001/api/SourceSystems", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method,
    body: JSON.stringify(sourceSystemEditModel),
  });
  console.log("in updateSourceSystems dto: ", dto);
  const status = await res.status;
  console.log("Got back from fetch: ", res);
  if (status == 200) {
    const data = await listSourceSystems();
    return data;
  }
  return "Erm - something went wrong";
}

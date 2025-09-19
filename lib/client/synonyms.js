// Client-side functions for Synonyms API
export async function listSynonyms(sourceSystemId = null) {
  let url = "/api/Synonyms";
  if (sourceSystemId) {
    url += `?sourceSystemId=${sourceSystemId}`;
  }
  
  const res = await fetch(url);
  const data = await res.json();
  console.log("synonyms data:", data);
  return data.data; // Extract the data array from the response
}

export async function addSynonym(dto) {
  const synonymModel = {
    sourceSystemId: dto.SourceSystemID,
    synonymName: dto.SynonymName,
    sourceSchema: dto.SourceSchema || 'dbo',
    objectName: dto.TableName, // Map TableName to objectName
    objectSchema: dto.ObjectSchema || 'dbo',
    objectDb: dto.ObjectDb || null,
    objectLinkedServer: dto.ObjectLinkedServer || null
  };

  console.log("in addSynonym model: ", synonymModel);

  const res = await fetch("/api/Synonyms", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(synonymModel),
  });

  console.log("in addSynonym dto: ", dto);
  const responseData = await res.json();
  console.log("Got back from synonym fetch: ", responseData);

  if (res.status === 200 || res.status === 201) {
    return responseData.data;
  }

  throw new Error(responseData.message || "Something went wrong");
}

export async function updateSynonym(dto) {
  const synonymModel = {
    id: dto.SynonymID,
    synonymName: dto.SynonymName,
    sourceSchema: dto.SourceSchema || 'dbo',
    objectName: dto.TableName, // Map TableName to objectName
    objectSchema: dto.ObjectSchema || 'dbo',
    objectDb: dto.ObjectDb || null,
    objectLinkedServer: dto.ObjectLinkedServer || null
  };

  console.log("in updateSynonym editmodel: ", synonymModel);

  const res = await fetch("/api/Synonyms", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "PUT",
    body: JSON.stringify(synonymModel),
  });

  console.log("in updateSynonym dto: ", dto);
  const responseData = await res.json();
  console.log("Got back from synonym update: ", responseData);

  if (res.status === 200) {
    return responseData.data;
  }

  throw new Error(responseData.message || "Something went wrong");
}

export async function deleteSynonym(synonymID) {
  const res = await fetch(`/api/Synonyms?id=${synonymID}`, {
    method: "DELETE",
  });

  const responseData = await res.json();

  if (res.status === 200) {
    return responseData.data;
  }

  throw new Error(responseData.message || "Something went wrong");
}

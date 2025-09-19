export async function listSynonyms() {
  const res = await fetch("https://localhost:7001/api/Synonyms");
  const data = await res.json();
  console.log("synonyms data:", data);
  return data;
}

export async function getSynonymByID(synonymID) {
  const res = await fetch(`https://localhost:7001/api/Synonyms/${synonymID}`, {
    method: "GET",
  });
  const data = await res.json();
  console.log("synonym data from api:", data);
  return data;
}

export async function addSynonym(dto) {
  const synonymModel = {
    sourceSystem_ID: dto.SourceSystemID,
    synonymName: dto.SynonymName,
    tableName: dto.TableName,
    columnName: dto.ColumnName || null, // Optional for table-level synonyms
  };

  const res = await fetch("https://localhost:7001/api/Synonyms", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(synonymModel),
  });

  const data = await res.json();
  console.log("addSynonym response:", data);
  return data;
}

export async function updateSynonym(dto) {
  const synonymModel = {
    id: dto.SynonymID,
    sourceSystem_ID: dto.SourceSystemID,
    synonymName: dto.SynonymName,
    tableName: dto.TableName,
    columnName: dto.ColumnName || null,
  };

  console.log("in updateSynonym editmodel: ", synonymModel);
  const method = dto.SynonymID == -1 ? "POST" : "PUT";
  let url = "https://localhost:7001/api/Synonyms";

  if (method === "PUT") {
    url = `${url}/${dto.SynonymID}`;
  }

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method,
    body: JSON.stringify(synonymModel),
  });

  console.log("in updateSynonym dto: ", dto);
  const status = await res.status;
  console.log("Got back from fetch: ", res);

  if (status == 200 || status == 201) {
    return res.json();
  }
  return "Error - something went wrong";
}

export async function deleteSynonym(synonymID) {
  let url = `https://localhost:7001/api/Synonyms/${synonymID}`;
  const method = "DELETE";
  const res = await fetch(url, { method });
  return res;
}

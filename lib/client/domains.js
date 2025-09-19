// Client-side functions for Domains API
export async function listDomains(sourceSystemId = null) {
  let url = "/api/Domains";
  if (sourceSystemId) {
    url += `?sourceSystemId=${sourceSystemId}`;
  }
  
  const res = await fetch(url);
  const data = await res.json();
  console.log("domains data:", data);
  return data.data; // Extract the data array from the response
}

export async function addDomain(dto) {
  const domainModel = {
    sourceSystemId: dto.SourceSystemID,
    domainName: dto.DomainName
  };

  console.log("in addDomain model: ", domainModel);

  const res = await fetch("/api/Domains", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(domainModel),
  });

  console.log("in addDomain dto: ", dto);
  const responseData = await res.json();
  console.log("Got back from domain fetch: ", responseData);

  if (res.status === 200 || res.status === 201) {
    return responseData.data;
  }

  throw new Error(responseData.message || "Something went wrong");
}

export async function updateDomain(dto) {
  const domainModel = {
    id: dto.ID,
    domainName: dto.DomainName
  };

  const res = await fetch("/api/Domains", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "PUT",
    body: JSON.stringify(domainModel),
  });

  const responseData = await res.json();

  if (res.status === 200) {
    return responseData.data;
  }

  throw new Error(responseData.message || "Something went wrong");
}

export async function deleteDomain(id) {
  const res = await fetch(`/api/Domains?id=${id}`, {
    method: "DELETE",
  });

  const responseData = await res.json();

  if (res.status === 200) {
    return responseData.data;
  }

  throw new Error(responseData.message || "Something went wrong");
}

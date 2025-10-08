// Client-side functions for Distribution Group Members API
export async function listDistributionGroupMembers(distributionGroupId = null) {
  let url = "/api/DistributionGroupMembers";
  if (distributionGroupId) {
    url += `?distributionGroupId=${distributionGroupId}`;
  }
  
  const res = await fetch(url);
  const data = await res.json();
  console.log("distribution group members data:", data);
  return data.data; // Extract the data array from the response
}

export async function getDistributionGroupMemberById(id) {
  const res = await fetch(`/api/DistributionGroupMembers?id=${id}`);
  const data = await res.json();
  console.log("distribution group member by ID data:", data);
  return data.data; // Extract the data from the response
}

export async function addDistributionGroupMember(dto) {
  const memberModel = {
    distributionGroupId: dto.GroupID,
    emailAddress: dto.EmailAddress,
    isActive: dto.isActive !== undefined ? dto.isActive : true
  };

  console.log("in addDistributionGroupMember model: ", memberModel);

  const res = await fetch("/api/DistributionGroupMembers", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(memberModel),
  });

  console.log("in addDistributionGroupMember dto: ", dto);
  const responseData = await res.json();
  console.log("Got back from distribution group member fetch: ", responseData);

  if (res.status === 200 || res.status === 201) {
    return responseData.data;
  }

  throw new Error(responseData.message || "Something went wrong");
}

export async function updateDistributionGroupMember(dto) {
  const memberModel = {
    id: dto.MemberID || dto.id,
    emailAddress: dto.EmailAddress,
    isActive: dto.isActive !== undefined ? dto.isActive : true
  };

  const res = await fetch("/api/DistributionGroupMembers", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "PUT",
    body: JSON.stringify(memberModel),
  });

  const responseData = await res.json();

  if (res.status === 200) {
    return responseData.data;
  }

  throw new Error(responseData.message || "Something went wrong");
}

export async function deleteDistributionGroupMember(id) {
  const res = await fetch(`/api/DistributionGroupMembers?id=${id}`, {
    method: "DELETE",
  });

  const responseData = await res.json();

  if (res.status === 200) {
    return responseData.data;
  }

  throw new Error(responseData.message || "Something went wrong");
}

// Placeholder function to maintain compatibility
export async function listSourceSystems() {
  // This function was in the original code but doesn't seem to be used for distribution groups
  // Keeping it for backward compatibility
  console.warn("listSourceSystems called from distribution group members - this may not be needed");
  return [];
}
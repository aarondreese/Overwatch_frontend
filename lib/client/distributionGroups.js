// Client-side functions for Distribution Groups API
export async function listDistributionGroups() {
  const res = await fetch("/api/DistributionGroups");
  const data = await res.json();
  console.log("distribution groups data:", data);
  
  // Get groups first
  const groups = data.data || [];
  
  // For each group, fetch its members
  const groupsWithMembers = await Promise.all(
    groups.map(async (group) => {
      try {
        const membersRes = await fetch(`/api/DistributionGroupMembers?distributionGroupId=${group.id}`);
        const membersData = await membersRes.json();
        return {
          ...group,
          members: membersData.data || []
        };
      } catch (error) {
        console.error(`Error fetching members for group ${group.id}:`, error);
        return {
          ...group,
          members: []
        };
      }
    })
  );
  
  return groupsWithMembers;
}

export async function getDistributionGroupById(id) {
  const res = await fetch(`/api/DistributionGroups?id=${id}`);
  const data = await res.json();
  console.log("distribution group by ID data:", data);
  
  const group = data.data;
  if (!group) {
    return null;
  }
  
  // Fetch members for this group
  try {
    const membersRes = await fetch(`/api/DistributionGroupMembers?distributionGroupId=${id}`);
    const membersData = await membersRes.json();
    return {
      ...group,
      members: membersData.data || []
    };
  } catch (error) {
    console.error(`Error fetching members for group ${id}:`, error);
    return {
      ...group,
      members: []
    };
  }
}

export async function addDistributionGroup(dto) {
  const groupModel = {
    groupName: dto.GroupName
  };

  console.log("in addDistributionGroup model: ", groupModel);

  const res = await fetch("/api/DistributionGroups", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(groupModel),
  });

  console.log("in addDistributionGroup dto: ", dto);
  const responseData = await res.json();
  console.log("Got back from distribution group fetch: ", responseData);

  if (res.status === 200 || res.status === 201) {
    return responseData.data;
  }

  throw new Error(responseData.message || "Something went wrong");
}

export async function updateDistributionGroup(dto) {
  const groupModel = {
    id: dto.GroupID,
    groupName: dto.GroupName
  };

  const res = await fetch("/api/DistributionGroups", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "PUT",
    body: JSON.stringify(groupModel),
  });

  const responseData = await res.json();

  if (res.status === 200) {
    return responseData.data;
  }

  throw new Error(responseData.message || "Something went wrong");
}

export async function deleteDistributionGroup(id) {
  const res = await fetch(`/api/DistributionGroups?id=${id}`, {
    method: "DELETE",
  });

  const responseData = await res.json();

  if (res.status === 200) {
    return responseData.data;
  }

  throw new Error(responseData.message || "Something went wrong");
}
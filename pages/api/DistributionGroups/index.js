export async function listDistributionGroups() {
  const res = await fetch("https://localhost:7001/api/DistributionGroups");
  const data = await res.json();
  console.log("data:", data);
  return data;
}

export async function updateDistributionGroup(dto) {
  let url = "https://localhost:7001/api/DistributionGroups";
  const method = dto.DistributionGroupID == -1 ? "POST" : "PUT";
  
  const distributionGroupEditModel = {
    groupName: dto.GroupName,
  };
  
  if(method=="PUT"){
    url = url + `/${dto.DistributionGroupID}`
    distributionGroupEditModel.id = dto.DistributionGroupID
    distributionGroupEditModel.rowstamp = "nonce"

  }

  console.log(
    "in updateDistributionGroup distributionGroupEditModel: ",
    distributionGroupEditModel
  );
  console.warn("using Method: ", method);
  console.warn("target URL:", url);
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method,
    body: JSON.stringify(distributionGroupEditModel),
  });
  console.log("in updateDistributionGroups dto: ", dto);
  const status = await res.status;
  console.log("Got back from fetch: ", res);
  if (status == 200) {
    const data = await listDistributionGroups();
    return data;
  }
  return "Erm - something went wrong";
}

export async function deleteDistributionGroup(groupID){
  let url = `https://localhost:7001/api/DistributionGroups/${groupID}`
  const method = "DELETE"
  const res = await fetch(url,{method});
}

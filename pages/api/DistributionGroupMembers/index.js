export async function addDistributionGroupMember(dto) {
    const DGM  ={
        // distributionGroup_id: dto.distributionGroup_id,
        // emailAddress: dto.emailAddress,
        // isActive: dto.isActive? 1:0
        distributionGroup_id: dto.GroupID,
        emailAddress: dto.EmailAddress,
        isActive: dto.isActive? 1:0
      }

    
    const res = await fetch(`https://localhost:7001/api/DistributionGroupMembers`
    ,  {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(DGM),
      }
    );
    const data = await res.json();
    console.log("data:", data);
    return data;
  }
  
  export async function updateDistributionGroupMember(dto) {
    const DGM = {
      id: dto.MemberID,
      emailAddress: dto.EmailAddress,
      isActive: dto.isActive? 1:0
    };
  
    console.log(
      "in updateDistributionGroupMember editmodel: ",
      DGM
    );
    const method = "PUT";
    console.warn("using Method: ", method);
   // console.warn("sDistributionGroupID: ", dto.id);
    const res = await fetch(`https://localhost:7001/api/DistributionGroupMembers/${dto.MemberID}`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method,
      body: JSON.stringify(DGM),
    });
    console.log("in updateDistributionGroupsmembers dto: ", dto);
    const status = await res.status;
    console.log("Got back from fetch: ", res);
    if (status == 200) {
      const data = await listDistributionGroup();
      return data;
    }
    return "Erm - something went wrong";
  }

  export async function deleteDistributionGroupMember(member_id){
    let url = `https://localhost:7001/api/DistributionGroupMembers/${member_id}`
    const method = "DELETE"
    const res = await fetch(url,{method});
  }
  
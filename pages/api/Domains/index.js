export async function listDomains(){

  const res = await fetch(
    'https://localhost:7001/api/domains'
    ,
    {
      method:'GET'
    })
    const data = await res.json();
    console.log("data:", data);
    return data;
}

export async function getDomainByID(DomainID ){
  const res = await fetch(
    `https://localhost:7001/api/domains/` + DomainID,
    {
      method:'GET'
    }
  )
  const data = await res.json();
  console.log("data from api:", data);
  return data;
}

export async function addDomain(dto){
  const domainModel = {
    sourceSystem_ID: dto.SourceSystemID,
    domainName: dto.DomainName
  }
  
  const res = await fetch(
    'https://localhost:7001/api/domains',
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        method:'POST',
        body: JSON.stringify(domainModel)
      }
  )

  return res.formData;
}


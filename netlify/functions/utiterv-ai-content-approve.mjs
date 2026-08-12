const headers={"Content-Type":"application/json; charset=utf-8"};
const reply=(statusCode,payload)=>({statusCode,headers,body:JSON.stringify(payload)});

const allowedPath=path=>
  typeof path==="string" &&
  /^content\/.+\.json$/.test(path) &&
  !path.endsWith("/index.json") &&
  !["content/project.json","content/content.json","content/content.schema.json","content/ai-editable-files.json"].includes(path);

async function github(url,options={}){
  const response=await fetch(`https://api.github.com${url}`,{
    ...options,
    headers:{
      Accept:"application/vnd.github+json",
      Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version":"2022-11-28",
      "Content-Type":"application/json",
      ...(options.headers||{})
    }
  });
  const text=await response.text();
  let data;try{data=JSON.parse(text)}catch{data={message:text}}
  if(!response.ok) throw new Error(`GitHub API ${response.status}: ${data?.message||text}`);
  return data;
}

export const handler=async(event)=>{
  if(event.httpMethod!=="POST") return reply(405,{error:"Method Not Allowed"});
  try{
    for(const key of["GITHUB_TOKEN","GITHUB_OWNER","GITHUB_REPO"]){
      if(!process.env[key]) return reply(501,{error:`A GitHub jóváhagyáshoz hiányzik: ${key}.`});
    }

    const {filePath,updatedContent,prompt}=JSON.parse(event.body||"{}");
    if(!allowedPath(filePath)) return reply(400,{error:"Ez a fájl biztonsági okból nem commitolható az AI szerkesztőből."});
    if(!updatedContent || typeof updatedContent!=="object" || Array.isArray(updatedContent)) return reply(400,{error:"Érvénytelen JSON tartalom."});

    const owner=process.env.GITHUB_OWNER.trim();
    const repo=process.env.GITHUB_REPO.trim();
    const branch=(process.env.GITHUB_BRANCH||"main").trim();
    const encodedPath=filePath.split("/").map(encodeURIComponent).join("/");

    const current=await github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`);
    const content=Buffer.from(JSON.stringify(updatedContent,null,2)+"\n","utf8").toString("base64");

    const result=await github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`,{
      method:"PUT",
      body:JSON.stringify({
        message:`content: AI szerkesztés – ${String(prompt||"tartalmi módosítás").slice(0,100)}`,
        content,
        sha:current.sha,
        branch
      })
    });

    return reply(200,{
      ok:true,
      commitUrl:result?.commit?.html_url||null,
      commitSha:result?.commit?.sha||null,
      message:"A módosított JSON GitHub commitja elkészült. A Netlify deploy automatikusan elindulhat."
    });
  }catch(error){
    console.error("Útiterv AI Approve hiba:",error);
    return reply(500,{error:error?.message||String(error)});
  }
};

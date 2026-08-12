const headers={"Content-Type":"application/json; charset=utf-8"};
const reply=(statusCode,payload)=>({statusCode,headers,body:JSON.stringify(payload)});

const allowedPath=path=>
  typeof path==="string" &&
  /^content\/.+\.json$/.test(path) &&
  !["content/project.json","content/content.json","content/content.schema.json","content/ai-editable-files.json"].includes(path) &&
  (!path.endsWith("/index.json") || /^content\/modules\/[^/]+\/index\.json$/.test(path));

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

    // Modul index bővítésnél az új section JSON fájlokat is létrehozzuk,
    // különben a következő deployban a modul betöltése 404-gyel elhasalna.
    const createdFiles=[];
    if(filePath.endsWith("/index.json") && Array.isArray(updatedContent.sections)){
      let currentJson={};
      try{currentJson=JSON.parse(Buffer.from(current.content||"","base64").toString("utf8"))}catch{}
      const oldFiles=new Set((currentJson.sections||[]).map(x=>x?.file).filter(Boolean));
      const baseDir=filePath.slice(0,filePath.lastIndexOf("/")+1);
      for(const section of updatedContent.sections){
        if(!section?.file || oldFiles.has(section.file)) continue;
        if(!/^[A-Za-z0-9_-]+\.json$/.test(section.file)) throw new Error(`Érvénytelen új szekciófájl: ${section.file}`);
        const childPath=baseDir+section.file;
        const childEncoded=childPath.split("/").map(encodeURIComponent).join("/");
        const childJson={schema:"utiterv-section-v5",id:String(section.id||section.file.replace(/\.json$/,"")),title:String(section.title||section.id||"Új oldal"),data:{}};
        const childContent=Buffer.from(JSON.stringify(childJson,null,2)+"\n","utf8").toString("base64");
        await github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${childEncoded}`,{
          method:"PUT",
          body:JSON.stringify({
            message:`content: új aloldal – ${String(section.title||section.id||"section").slice(0,80)}`,
            content:childContent,
            branch
          })
        });
        createdFiles.push(childPath);
      }
    }

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
      createdFiles,
      message:createdFiles.length
        ? `A módosítás GitHubra került, és ${createdFiles.length} új üres aloldalfájl létrejött.`
        : "A módosított JSON GitHub commitja elkészült. A Netlify deploy automatikusan elindulhat."
    });
  }catch(error){
    console.error("Útiterv AI Approve hiba:",error);
    return reply(500,{error:error?.message||String(error)});
  }
};

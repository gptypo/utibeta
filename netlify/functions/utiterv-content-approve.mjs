import { json } from "./_shared.mjs";
const CONTENT_PATH="content/content.json";
function validateContent(content){
  if(!content||typeof content!=="object"||Array.isArray(content))throw new Error("A tartalom nem JSON objektum.");
  if(!Number.isInteger(content.schemaVersion))throw new Error("Hiányzik vagy hibás a schemaVersion.");
  if(typeof content.appVersion!=="string")throw new Error("Hiányzik az appVersion.");
  if(!content.modules||typeof content.modules!=="object"||Array.isArray(content.modules))throw new Error("Hiányzik a modules objektum.");
  return true;
}
async function gh(url,opts={}){
  const resp=await fetch(`https://api.github.com${url}`,{...opts,headers:{
    accept:"application/vnd.github+json",authorization:`Bearer ${process.env.GITHUB_TOKEN}`,
    "x-github-api-version":"2022-11-28","content-type":"application/json",...(opts.headers||{})
  }});
  const raw=await resp.text();let data;try{data=JSON.parse(raw)}catch{data={raw}}
  if(!resp.ok)throw new Error(`GitHub API hiba (${resp.status}): ${data?.message||raw}`);
  return data;
}
export default async(req)=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    for(const key of["GITHUB_TOKEN","GITHUB_OWNER","GITHUB_REPO"])if(!process.env[key])return json({error:`Hiányzik a ${key} Netlify environment variable.`},500);
    const body=await req.json(),content=body?.content,summary=String(body?.summary||"AI tartalomfrissítés").trim();
    validateContent(content);
    const owner=process.env.GITHUB_OWNER.trim(),repo=process.env.GITHUB_REPO.trim(),branch=(process.env.GITHUB_BRANCH||"main").trim();
    const current=await gh(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${CONTENT_PATH}?ref=${encodeURIComponent(branch)}`);
    const encoded=Buffer.from(JSON.stringify(content,null,2)+"\n","utf8").toString("base64");
    const commit=await gh(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${CONTENT_PATH}`,{
      method:"PUT",body:JSON.stringify({message:`content: ${summary}`.slice(0,200),content:encoded,sha:current.sha,branch})
    });
    return json({ok:true,commitSha:commit?.commit?.sha||null,commitUrl:commit?.commit?.html_url||null,contentPath:CONTENT_PATH,message:"A content.json commit elkészült. A GitHub push elindítja a Netlify deployt."});
  }catch(error){console.error("Content approve error:",error);return json({error:error?.message||String(error)},500)}
};

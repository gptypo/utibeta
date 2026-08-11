import { id, json, writeJob, artifacts } from "./_shared.mjs";

export default async (req, context) => {
  if(req.method!=="POST") return json({error:"Method not allowed"},405);

  try{
    const form=await req.formData();
    const requestPart=form.get("request");
    if(!requestPart) return json({error:"Hiányzik a request mező."},400);

    const requestMeta=JSON.parse(await requestPart.text());
    if(!requestMeta.prompt?.trim()) return json({error:"Adj meg utasítást az AI-nak."},400);

    const jobId=id();
    const files=form.getAll("files").filter(x=>x && typeof x.arrayBuffer==="function");
    const uploadStore=artifacts();
    const uploadRefs=[];

    for(let i=0;i<files.length;i++){
      const f=files[i];
      const key=`${jobId}/upload-${i}`;
      await uploadStore.set(key, new Uint8Array(await f.arrayBuffer()), {
        metadata:{name:f.name||`file-${i}`,type:f.type||"application/octet-stream"}
      });
      uploadRefs.push({key,name:f.name||`file-${i}`,type:f.type||"application/octet-stream",size:f.size||0});
    }

    await writeJob(jobId,{
      status:"queued",
      stage:"analyze",
      version:requestMeta.requestedVersion||"BETA 3.1.1",
      request:requestMeta,
      uploads:uploadRefs,
      summary:"A kérés sorba állítva.",
      changes:[],
      checks:[]
    });

    const runUrl=new URL("/.netlify/functions/utiterv-agent-run-background", req.url);
    const runResp=await fetch(runUrl,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({jobId})
    });

    if(!runResp.ok && runResp.status!==202){
      await writeJob(jobId,{status:"failed",summary:`A háttérfolyamat nem indult el (HTTP ${runResp.status}).`});
      return json({error:"A háttérfolyamat nem indult el.",jobId},500);
    }

    return json({jobId,status:"queued",stage:"analyze",version:requestMeta.requestedVersion||"BETA 3.1.1"},202);
  }catch(error){
    return json({error:error?.message||String(error)},500);
  }
};

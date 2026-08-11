import { json, readJob, writeJob, artifacts } from "./_shared.mjs";

export default async (req) => {
  if(req.method!=="POST") return json({error:"Method not allowed"},405);
  const body=await req.json().catch(()=>({}));
  const jobId=body.jobId;
  if(!jobId) return json({error:"Hiányzik a jobId."},400);

  const job=await readJob(jobId);
  if(!job) return json({error:"Nincs ilyen job."},404);
  if(job.status!=="ready" && job.status!=="approved") return json({error:"A build még nem jóváhagyható."},409);

  const token=process.env.NETLIFY_AUTH_TOKEN;
  const siteId=process.env.NETLIFY_SITE_ID;

  // Alapértelmezés: emberi jóváhagyás + letölthető build.
  if(!token || !siteId){
    const next=await writeJob(jobId,{
      status:"approved",
      stage:"release",
      summary:job.summary,
      releaseMessage:"Jóváhagyva. Automatikus Netlify production deploy nincs bekapcsolva; töltsd le a ZIP-et és töltsd fel manuálisan."
    });
    return json({
      ...next,
      artifactUrl:`/.netlify/functions/utiterv-agent-artifact?id=${encodeURIComponent(jobId)}`
    });
  }

  const store=artifacts();
  const zip=await store.get(`${jobId}/build.zip`,{type:"arrayBuffer",consistency:"strong"});
  if(!zip) return json({error:"A build ZIP nem található."},404);

  const resp=await fetch(`https://api.netlify.com/api/v1/sites/${encodeURIComponent(siteId)}/deploys`,{
    method:"POST",
    headers:{
      "Authorization":`Bearer ${token}`,
      "Content-Type":"application/zip"
    },
    body:zip
  });
  const deploy=await resp.json().catch(()=>({}));
  if(!resp.ok){
    await writeJob(jobId,{status:"failed",stage:"release",releaseMessage:`Netlify deploy hiba: ${resp.status}`});
    return json({error:"Netlify deploy sikertelen.",details:deploy},502);
  }

  const next=await writeJob(jobId,{
    status:"released",
    stage:"release",
    deployId:deploy.id,
    deployUrl:deploy.ssl_url||deploy.url||deploy.deploy_ssl_url||deploy.deploy_url,
    releaseMessage:"A jóváhagyott build production deployként elküldve a Netlify-nak."
  });
  return json({
    ...next,
    artifactUrl:`/.netlify/functions/utiterv-agent-artifact?id=${encodeURIComponent(jobId)}`
  });
};

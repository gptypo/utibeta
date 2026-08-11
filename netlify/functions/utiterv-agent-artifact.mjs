import { artifacts } from "./_shared.mjs";

export default async (req) => {
  const url=new URL(req.url);
  const jobId=url.searchParams.get("id");
  if(!jobId) return new Response("Hiányzik az id.",{status:400});

  const store=artifacts();
  const zip=await store.get(`${jobId}/build.zip`, {type:"arrayBuffer",consistency:"strong"});
  if(!zip) return new Response("A build még nem érhető el.",{status:404});

  return new Response(zip,{
    headers:{
      "content-type":"application/zip",
      "content-disposition":`attachment; filename="utiterv-studio-${jobId}.zip"`,
      "cache-control":"private, no-store"
    }
  });
};

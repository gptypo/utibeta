import { json, readJob } from "./_shared.mjs";

export default async (req) => {
  const url=new URL(req.url);
  const jobId=url.searchParams.get("id");
  if(!jobId) return json({error:"Hiányzik az id."},400);
  const job=await readJob(jobId);
  if(!job) return json({error:"Nincs ilyen job."},404);
  return json(job);
};

import { getStore } from "@netlify/blobs";

export const JOB_STORE = "utiterv-ai-jobs";
export const ARTIFACT_STORE = "utiterv-ai-artifacts";

export function json(data, status=200){
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type":"application/json; charset=utf-8",
      "cache-control":"no-store"
    }
  });
}

export function id(){
  return `job_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
}

export function jobs(){
  return getStore({name: JOB_STORE, consistency:"strong"});
}

export function artifacts(){
  return getStore({name: ARTIFACT_STORE, consistency:"strong"});
}

export async function readJob(jobId){
  const store=jobs();
  const raw=await store.get(`${jobId}.json`, {consistency:"strong"});
  return raw ? JSON.parse(raw) : null;
}

export async function writeJob(jobId, patch){
  const store=jobs();
  const current=await readJob(jobId) || {jobId, createdAt:new Date().toISOString()};
  const next={...current,...patch,updatedAt:new Date().toISOString()};
  await store.set(`${jobId}.json`, JSON.stringify(next));
  return next;
}

export function safePath(p){
  return typeof p==="string" &&
    !p.includes("..") &&
    !p.startsWith("/") &&
    !p.startsWith("\\") &&
    /^[A-Za-z0-9_./()\- áéíóöőúüűÁÉÍÓÖŐÚÜŰ]+$/.test(p);
}

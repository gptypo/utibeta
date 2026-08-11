import OpenAI from "openai";
import AdmZip from "adm-zip";
import mammoth from "mammoth";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { artifacts, readJob, writeJob, safePath } from "./_shared.mjs";

const __dirname=dirname(fileURLToPath(import.meta.url));
const BASE_ZIP=join(__dirname,"_assets","utiterv-base.zip");

const TEXT_EXT=new Set([".js",".mjs",".css",".html",".json",".md",".txt",".webmanifest"]);
const EDITABLE_PREFIXES=["content/","js/","css/","assets/","index.html","editor.html","agent.html","manifest"];

function ext(name){
  const i=name.lastIndexOf(".");
  return i>=0 ? name.slice(i).toLowerCase() : "";
}
function stripFences(text){
  return String(text||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"").trim();
}
function parseJson(text,label){
  try{return JSON.parse(stripFences(text))}
  catch{throw new Error(`${label}: az AI nem érvényes JSON-t adott vissza.`)}
}
function entryIndex(zip){
  return zip.getEntries()
    .filter(e=>!e.isDirectory)
    .map(e=>e.entryName)
    .filter(p=>TEXT_EXT.has(ext(p)))
    .filter(p=>!p.startsWith("node_modules/"))
    .filter(p=>!p.startsWith("netlify/functions/_assets/"))
    .filter(p=>!p.startsWith("RELEASE-NOTES-"))
    .slice(0,800);
}
function readText(zip,path){
  const e=zip.getEntry(path);
  if(!e) return null;
  return e.getData().toString("utf8");
}
async function attachmentContext(job){
  const store=artifacts();
  const chunks=[];
  for(const u of job.uploads||[]){
    const buf=await store.get(u.key,{type:"arrayBuffer",consistency:"strong"});
    if(!buf)continue;
    const b=Buffer.from(buf);
    const e=ext(u.name||"");
    try{
      if(e===".docx"){
        const r=await mammoth.extractRawText({buffer:b});
        chunks.push(`### ${u.name}\n${r.value.slice(0,50000)}`);
      }else if([".txt",".md",".json",".csv"].includes(e)){
        chunks.push(`### ${u.name}\n${b.toString("utf8").slice(0,50000)}`);
      }else{
        chunks.push(`### ${u.name}\n[Bináris melléklet: ${u.type||e}. A példa backend DOCX/TXT/MD/JSON szöveget olvas közvetlenül.]`);
      }
    }catch(err){
      chunks.push(`### ${u.name}\n[Feldolgozási hiba: ${err.message}]`);
    }
  }
  return chunks.join("\n\n");
}
function bumpVersionInKnownFiles(zip,version){
  const targets=["index.html","js/app.js","sw.js","package.json"];
  for(const p of targets){
    const e=zip.getEntry(p); if(!e)continue;
    let t=e.getData().toString("utf8");
    if(p==="index.html"){
      t=t.replace(/>BETA [^<]+<\/button>/,`>${version}</button>`);
      t=t.replace(/(\?v=)beta-[^"' ]+/g,`$1${version.toLowerCase().replace(/\s+/g,"-")}`);
    }else if(p==="js/app.js"){
      t=t.replace(/BETA \d+(?:\.\d+){1,2}/g,version);
    }else if(p==="sw.js"){
      t=t.replace(/var VERSION = '[^']+';/,`var VERSION = '${version.toLowerCase().replace(/\s+/g,"-")}-ai-agent';`);
    }else if(p==="package.json"){
      try{
        const j=JSON.parse(t);j.version=version.replace(/^BETA\s*/i,"").replace(/[^0-9.]/g,"")||j.version;t=JSON.stringify(j,null,2)+"\n";
      }catch{}
    }
    zip.updateFile(p,Buffer.from(t,"utf8"));
  }
}
function simpleChecks(zip,changed){
  const checks=[];
  for(const p of changed){
    const e=zip.getEntry(p);
    if(!e){checks.push({name:`${p} létezik`,ok:false,message:"A módosított fájl hiányzik."});continue}
    if(ext(p)===".json"||ext(p)===".webmanifest"){
      try{JSON.parse(e.getData().toString("utf8"));checks.push({name:`${p} JSON`,ok:true})}
      catch(err){checks.push({name:`${p} JSON`,ok:false,message:err.message})}
    }
  }
  checks.push({name:"Tiltott útvonal ellenőrzés",ok:changed.every(safePath)});
  checks.push({name:"Build ZIP létrehozás",ok:true});
  return checks;
}

export default async (req, context) => {
  let jobId;
  try{
    const payload=await req.json();
    jobId=payload.jobId;
    if(!jobId) return;

    const job=await readJob(jobId);
    if(!job) return;

    if(!process.env.OPENAI_API_KEY){
      await writeJob(jobId,{
        status:"failed",
        stage:"analyze",
        summary:"Hiányzik az OPENAI_API_KEY Netlify environment variable.",
        checks:[{name:"OPENAI_API_KEY",ok:false,message:"Állítsd be a Netlify projekt Environment variables részében."}]
      });
      return;
    }

    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const model=process.env.OPENAI_MODEL||"gpt-5";
    const zip=new AdmZip(await readFile(BASE_ZIP));
    const files=entryIndex(zip);
    const attachments=await attachmentContext(job);

    await writeJob(jobId,{status:"running",stage:"analyze",summary:"Az AI azonosítja az érintett fájlokat."});

    const selection=await client.responses.create({
      model,
      input:[
        {
          role:"developer",
          content:[{type:"input_text",text:
`Útiterv Studio kódmódosító ügynök vagy.
A feladatod első lépése CSAK az érintett forrásfájlok kiválasztása.
Ne módosíts semmit. Legfeljebb 10 útvonalat válassz.
Elsősorban content/*.json, js/app.js, css/*.css, index.html fájlokat válassz.
Kizárólag a megadott fájllistából választhatsz.
Csak JSON-t adj vissza ebben a formában:
{"paths":["..."],"reason":"..."}` }]
        },
        {
          role:"user",
          content:[{type:"input_text",text:
`Kérés:
${job.request.prompt}

Módosítás típusa: ${job.request.scope}
Célverzió: ${job.version}

Mellékletek:
${attachments||"(nincs)"}

Elérhető fájlok:
${files.join("\n")}` }]
        }
      ]
    });
    const picked=parseJson(selection.output_text,"Fájlkiválasztás");
    const paths=(picked.paths||[]).filter(p=>files.includes(p)&&safePath(p)).slice(0,10);
    if(!paths.length) throw new Error("Az AI nem választott módosítható fájlt.");

    await writeJob(jobId,{status:"running",stage:"edit",summary:`Az AI ${paths.length} fájlt vizsgál és módosít.`});

    const sources=paths.map(p=>`===== FILE: ${p} =====\n${readText(zip,p)}`).join("\n\n");
    const editResp=await client.responses.create({
      model,
      input:[
        {
          role:"developer",
          content:[{type:"input_text",text:
`Te az Útiterv Studio kiadási ügynöke vagy.
A megadott teljes fájltartalmakból készíts biztonságos módosítást.
Kövesd pontosan a felhasználó kérését, őrizd meg az app vizuális rendszerét és a működő funkciókat.
Ne találj ki fájlútvonalat; csak a bemenetben szereplő fájlokat módosíthatod.
A "files" tömbbe CSAK a ténylegesen módosított fájlok kerüljenek, teljes új tartalmukkal.
A válasz KIZÁRÓLAG érvényes JSON legyen:
{
 "summary":"rövid magyar összefoglaló",
 "changes":["..."],
 "files":[{"path":"content/...json","content":"TELJES ÚJ FÁJLTARTALOM"}]
}
Ne használj markdown code fence-t.` }]
        },
        {
          role:"user",
          content:[{type:"input_text",text:
`Kérés:
${job.request.prompt}

Célverzió: ${job.version}

Mellékletek:
${attachments||"(nincs)"}

FORRÁSFÁJLOK:
${sources}` }]
        }
      ]
    });

    const edit=parseJson(editResp.output_text,"Kódmódosítás");
    const changed=[];
    for(const f of edit.files||[]){
      if(!paths.includes(f.path)||!safePath(f.path)||typeof f.content!=="string")continue;
      zip.updateFile(f.path,Buffer.from(f.content,"utf8"));
      changed.push(f.path);
    }
    if(!changed.length) throw new Error("Az AI nem adott alkalmazható fájlmódosítást.");

    bumpVersionInKnownFiles(zip,job.version);

    await writeJob(jobId,{status:"running",stage:"test",summary:"A módosítások alapellenőrzése fut."});
    const checks=simpleChecks(zip,changed);
    if(checks.some(c=>c.ok===false)) throw new Error("Az automatikus ellenőrzés hibát talált.");

    await writeJob(jobId,{status:"running",stage:"build",summary:"Az új ZIP build készül."});
    const build=zip.toBuffer();
    const store=artifacts();
    await store.set(`${jobId}/build.zip`,build,{metadata:{version:job.version}});

    const releaseNote=`# ${job.version}\n\n${edit.summary||""}\n\n${(edit.changes||[]).map(x=>`- ${x}`).join("\n")}\n`;
    await store.set(`${jobId}/release-notes.md`,releaseNote);

    await writeJob(jobId,{
      status:"ready",
      stage:"review",
      summary:edit.summary||"A módosítás elkészült.",
      changes:edit.changes||changed.map(p=>`${p} módosítva`),
      changedFiles:changed,
      checks,
      artifactUrl:`/.netlify/functions/utiterv-agent-artifact?id=${encodeURIComponent(jobId)}`,
      previewUrl:null
    });
  }catch(error){
    if(jobId){
      await writeJob(jobId,{
        status:"failed",
        summary:error?.message||String(error),
        checks:[{name:"AI kiadási folyamat",ok:false,message:error?.message||String(error)}]
      }).catch(()=>{});
    }
  }
};

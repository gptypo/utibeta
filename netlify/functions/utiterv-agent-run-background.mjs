import AdmZip from "adm-zip";
import mammoth from "mammoth";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { artifacts, readJob, writeJob, safePath } from "./_shared.mjs";

const FUNCTION_DIR=dirname(fileURLToPath(import.meta.url));
const BASE_ZIP=join(FUNCTION_DIR,"_assets","utiterv-base.zip");

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

    if(!process.env.GEMINI_API_KEY){
      await writeJob(jobId,{
        status:"failed",
        stage:"analyze",
        summary:"Hiányzik a GEMINI_API_KEY Netlify environment variable.",
        checks:[{name:"GEMINI_API_KEY",ok:false,message:"Állítsd be a Netlify projekt Environment variables részében."}]
      });
      return;
    }

    const requestedModel=(process.env.GEMINI_MODEL||"gemini-2.5-flash")
      .trim()
      .replace(/^models\//,"");
    let model=requestedModel;
    const usageTotal={input_tokens:0,output_tokens:0,total_tokens:0};

    function addGeminiUsage(data){
      const u=data?.usageMetadata||{};
      usageTotal.input_tokens+=(u.promptTokenCount||0);
      usageTotal.output_tokens+=(u.candidatesTokenCount||0);
      usageTotal.total_tokens+=(u.totalTokenCount||((u.promptTokenCount||0)+(u.candidatesTokenCount||0)));
    }

    function geminiText(data){
      return (data?.candidates?.[0]?.content?.parts||[])
        .map(part=>part?.text||"")
        .join("")
        .trim();
    }

    function friendlyGeminiError(status,body){
      const msg=body?.error?.message||body?.message||`HTTP ${status}`;
      if(status===400) return `Gemini API kérési hiba: ${msg}`;
      if(status===401 || status===403) return `Gemini API kulcs/jogosultsági hiba: ${msg}`;
      if(status===404) return `Gemini API 404: ${msg} (kért modell: ${model})`;
      if(status===429) return `A Gemini Free Tier ideiglenes limitjét elértük. Próbáld újra később. (${msg})`;
      if(status>=500) return `A Gemini szolgáltatás átmenetileg hibázik. (${msg})`;
      return `Gemini API hiba: ${msg}`;
    }

    async function listGeminiModels(){
      const response=await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
        {headers:{"x-goog-api-key":process.env.GEMINI_API_KEY}}
      );
      const raw=await response.text();
      let data;
      try{data=JSON.parse(raw)}catch{data={raw}}
      if(!response.ok){
        const msg=data?.error?.message||raw||`HTTP ${response.status}`;
        throw new Error(`Gemini modell-listázási hiba (${response.status}): ${msg}`);
      }
      return (data.models||[])
        .filter(m=>(m.supportedGenerationMethods||[]).includes("generateContent"))
        .map(m=>({
          id:String(m.name||"").replace(/^models\//,""),
          name:m.displayName||m.name||"",
          methods:m.supportedGenerationMethods||[]
        }))
        .filter(m=>m.id);
    }

    function chooseGeminiModel(available,requested){
      const ids=available.map(m=>m.id);
      if(ids.includes(requested)) return requested;

      const preferred=[
        "gemini-2.5-flash",
        "gemini-flash-latest",
        "gemini-2.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.6-flash"
      ];
      for(const id of preferred){
        if(ids.includes(id)) return id;
      }

      const flash=ids.find(id=>/^gemini-.*flash/i.test(id) && !/image|tts|audio/i.test(id));
      if(flash) return flash;

      return ids.find(id=>/^gemini-/i.test(id))||null;
    }

    const availableModels=await listGeminiModels();
    console.log(`[${jobId}] Gemini generateContent modellek (${availableModels.length}): ${availableModels.map(m=>m.id).join(", ")}`);

    const resolvedModel=chooseGeminiModel(availableModels,requestedModel);
    if(!resolvedModel){
      throw new Error("A Gemini API-kulcshoz nem található generateContent-et támogató Gemini modell.");
    }
    model=resolvedModel;
    if(model!==requestedModel){
      console.warn(`[${jobId}] A kért modell (${requestedModel}) nem érhető el ezzel a kulccsal; automatikus fallback: ${model}`);
    }else{
      console.log(`[${jobId}] Gemini modell ellenőrizve: ${model}`);
    }

    async function geminiJson({system,prompt,schema,label}){
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),90000);
      try{
        console.log(`[${jobId}] Gemini indul: ${label} | model=${model}`);
        const response=await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method:"POST",
            headers:{
              "x-goog-api-key":process.env.GEMINI_API_KEY,
              "content-type":"application/json"
            },
            signal:controller.signal,
            body:JSON.stringify({
              contents:[{
                role:"user",
                parts:[{text:`${system}\n\n--- FELADAT ---\n${prompt}`}]
              }],
              generationConfig:{
                responseMimeType:"application/json",
                responseSchema:schema
              }
            })
          }
        );
        const raw=await response.text();
        let data;
        try{data=JSON.parse(raw)}catch{data={raw}}
        if(!response.ok){
          throw new Error(friendlyGeminiError(response.status,data));
        }
        addGeminiUsage(data);
        const text=geminiText(data);
        if(!text) throw new Error(`${label}: a Gemini nem adott szöveges választ.`);
        console.log(`[${jobId}] Gemini kész: ${label} | tokens=${data?.usageMetadata?.totalTokenCount||"?"}`);
        return parseJson(text,label);
      }catch(error){
        if(error?.name==="AbortError") throw new Error(`${label}: a Gemini API-hívás 90 másodperc után időtúllépéssel leállt.`);
        throw error;
      }finally{
        clearTimeout(timeout);
      }
    }

    const selectionSchema={
      type:"object",
      properties:{
        paths:{type:"array",items:{type:"string"}},
        reason:{type:"string"}
      },
      required:["paths","reason"]
    };

    const editSchema={
      type:"object",
      properties:{
        summary:{type:"string"},
        changes:{type:"array",items:{type:"string"}},
        files:{
          type:"array",
          items:{
            type:"object",
            properties:{
              path:{type:"string"},
              content:{type:"string"}
            },
            required:["path","content"]
          }
        }
      },
      required:["summary","changes","files"]
    };

    const zip=new AdmZip(await readFile(BASE_ZIP));
    const files=entryIndex(zip);
    const attachments=await attachmentContext(job);

    await writeJob(jobId,{status:"running",stage:"analyze",summary:"Az AI azonosítja az érintett fájlokat."});

    const picked=await geminiJson({
      label:"Fájlkiválasztás",
      schema:selectionSchema,
      system:`Útiterv Studio kódmódosító ügynök vagy.
A feladatod első lépése CSAK az érintett forrásfájlok kiválasztása.
Ne módosíts semmit. Legfeljebb 10 útvonalat válassz.
Elsősorban content/*.json, js/app.js, css/*.css, index.html fájlokat válassz.
Kizárólag a megadott fájllistából választhatsz.`,
      prompt:`Kérés:
${job.request.prompt}

Módosítás típusa: ${job.request.scope}
Célverzió: ${job.version}

Mellékletek:
${attachments||"(nincs)"}

Elérhető fájlok:
${files.join("\n")}`
    });
    const paths=(picked.paths||[]).filter(p=>files.includes(p)&&safePath(p)).slice(0,10);
    if(!paths.length) throw new Error("Az AI nem választott módosítható fájlt.");

    await writeJob(jobId,{status:"running",stage:"edit",summary:`Az AI ${paths.length} fájlt vizsgál és módosít.`});

    const sources=paths.map(p=>`===== FILE: ${p} =====\n${readText(zip,p)}`).join("\n\n");
    const edit=await geminiJson({
      label:"Kódmódosítás",
      schema:editSchema,
      system:`Te az Útiterv Studio kiadási ügynöke vagy.
A megadott teljes fájltartalmakból készíts biztonságos módosítást.
Kövesd pontosan a felhasználó kérését, őrizd meg az app vizuális rendszerét és a működő funkciókat.
Ne találj ki fájlútvonalat; csak a bemenetben szereplő fájlokat módosíthatod.
A "files" tömbbe CSAK a ténylegesen módosított fájlok kerüljenek, teljes új tartalmukkal.`,
      prompt:`Kérés:
${job.request.prompt}

Célverzió: ${job.version}

Mellékletek:
${attachments||"(nincs)"}

FORRÁSFÁJLOK:
${sources}`
    });
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
      previewUrl:null,
      aiUsage:{
        provider:"Gemini",
        model,
        inputTokens:usageTotal.input_tokens,
        outputTokens:usageTotal.output_tokens,
        totalTokens:usageTotal.total_tokens,
        freeTierEligible:true,
        cost:null
      }
    });
  }catch(error){
    console.error(`[${jobId||"no-job"}] AI Agent hiba:`,error);
    if(jobId){
      await writeJob(jobId,{
        status:"failed",
        stage:"analyze",
        summary:error?.message||String(error),
        checks:[{name:"Gemini AI kiadási folyamat",ok:false,message:error?.message||String(error)}]
      }).catch(()=>{});
    }
  }
};

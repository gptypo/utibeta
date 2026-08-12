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

    const requestedModel=(process.env.GEMINI_MODEL||"gemini-3.6-flash")
      .trim()
      .replace(/^models\//,"");
    const requestedAnalysisModel=(process.env.GEMINI_ANALYSIS_MODEL||"gemini-3.5-flash-lite")
      .trim()
      .replace(/^models\//,"");
    let model=requestedModel;
    let analysisModel=requestedAnalysisModel;
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
        console.warn(`[${jobId}] Gemini models.list hiba (${response.status}): ${msg}`);
        return [];
      }
      return (data.models||[])
        .map(m=>String(m.name||"").replace(/^models\//,""))
        .filter(Boolean);
    }

    function chooseGeminiModel(available,requested){
      if(available.includes(requested)) return requested;
      const preferred=[
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite"
      ];
      for(const id of preferred){
        if(available.includes(id)) return id;
      }
      const flash=available.find(id=>/^gemini-3.*flash/i.test(id) && !/image|tts|audio/i.test(id));
      return flash||requested;
    }

    const availableModels=await listGeminiModels();
    if(availableModels.length){
      console.log(`[${jobId}] Gemini modellek (${availableModels.length}): ${availableModels.join(", ")}`);
      const resolvedModel=chooseGeminiModel(availableModels,requestedModel);
      if(resolvedModel!==requestedModel){
        console.warn(`[${jobId}] A kért kódmodell (${requestedModel}) nem látható; fallback: ${resolvedModel}`);
      }
      model=resolvedModel;

      if(availableModels.includes(requestedAnalysisModel)){
        analysisModel=requestedAnalysisModel;
      }else{
        analysisModel=availableModels.find(id=>id==="gemini-3.5-flash-lite")
          || availableModels.find(id=>/flash-lite/i.test(id))
          || model;
        if(analysisModel!==requestedAnalysisModel){
          console.warn(`[${jobId}] A kért elemzőmodell (${requestedAnalysisModel}) nem látható; fallback: ${analysisModel}`);
        }
      }
    }else{
      console.warn(`[${jobId}] A models.list nem adott használható listát; közvetlen modellek: analysis=${analysisModel}, edit=${model}`);
    }

    const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

    function retryDelayMs(attempt,response,data){
      const retryAfter=Number(response?.headers?.get?.("retry-after"));
      if(Number.isFinite(retryAfter) && retryAfter>0) return Math.min(30000,retryAfter*1000);
      const retryInfo=(data?.error?.details||[]).find(x=>String(x?.["@type"]||"").includes("RetryInfo"));
      const match=String(retryInfo?.retryDelay||"").match(/^([\d.]+)s$/);
      if(match) return Math.min(30000,Math.ceil(Number(match[1])*1000));
      const base=Math.min(16000,2000*(2**attempt));
      return base+Math.floor(Math.random()*900);
    }

    async function heartbeat(stage,message,extra={}){
      await writeJob(jobId,{
        status:"running",
        stage,
        heartbeatAt:new Date().toISOString(),
        heartbeatMessage:message,
        ...extra
      });
    }

    async function geminiJson({system,prompt,schema,label,useModel=model,stage="analyze"}){
      const maxAttempts=4;
      let lastError;

      for(let attempt=0;attempt<maxAttempts;attempt++){
        const controller=new AbortController();
        const timeout=setTimeout(()=>controller.abort(),90000);
        try{
          const attemptNo=attempt+1;
          await heartbeat(stage,
            attempt===0
              ? `${label}: kapcsolódás a Geminihez…`
              : `${label}: újrapróbálás ${attemptNo}/${maxAttempts}…`,
            {retryAttempt:attemptNo,retryMax:maxAttempts,activeModel:useModel}
          );
          console.log(`[${jobId}] Gemini Interactions indul: ${label} | model=${useModel} | attempt=${attemptNo}/${maxAttempts}`);

          const response=await fetch(
            "https://generativelanguage.googleapis.com/v1beta/interactions",
            {
              method:"POST",
              headers:{
                "x-goog-api-key":process.env.GEMINI_API_KEY,
                "content-type":"application/json"
              },
              signal:controller.signal,
              body:JSON.stringify({
                model:useModel,
                system_instruction:system,
                input:prompt,
                response_format:{
                  type:"text",
                  mime_type:"application/json",
                  schema
                },
                store:false
              })
            }
          );

          const raw=await response.text();
          let data;
          try{data=JSON.parse(raw)}catch{data={raw}}

          if(!response.ok){
            const msg=data?.error?.message||data?.message||raw||`HTTP ${response.status}`;
            const transient=response.status===408||response.status===429||response.status>=500;
            if(transient && attempt<maxAttempts-1){
              const waitMs=retryDelayMs(attempt,response,data);
              console.warn(`[${jobId}] ${label}: átmeneti Gemini hiba HTTP ${response.status}; retry ${attemptNo+1}/${maxAttempts} ${waitMs}ms múlva. ${msg}`);
              await heartbeat(stage,`${label}: átmeneti API-hiba, újrapróbálás ${Math.ceil(waitMs/1000)} mp múlva…`,{
                retryAttempt:attemptNo,
                retryMax:maxAttempts,
                lastHttpStatus:response.status
              });
              await sleep(waitMs);
              continue;
            }
            if(response.status===400) throw new Error(`Gemini Interactions kérési hiba: ${msg}`);
            if(response.status===401||response.status===403) throw new Error(`Gemini API kulcs/jogosultsági hiba: ${msg}`);
            if(response.status===404) throw new Error(`Gemini Interactions 404: ${msg} (modell: ${useModel})`);
            if(response.status===429) throw new Error(`A Gemini Free Tier limitje most nem enged újabb kérést. Többszöri automatikus újrapróbálás után is 429 érkezett. (${msg})`);
            if(response.status>=500) throw new Error(`A Gemini szolgáltatás többszöri automatikus újrapróbálás után is hibázik. (${msg})`);
            throw new Error(`Gemini Interactions API hiba: ${msg}`);
          }

          if(data?.status && data.status!=="completed"){
            throw new Error(`A Gemini Interactions nem completed állapotban tért vissza: ${data.status}`);
          }

          const text=(data?.steps||[])
            .filter(step=>step?.type==="model_output")
            .flatMap(step=>step?.content||[])
            .filter(block=>block?.type==="text")
            .map(block=>block?.text||"")
            .join("")
            .trim();

          const usage=data?.usage||{};
          usageTotal.input_tokens+=(usage.total_input_tokens||0);
          usageTotal.output_tokens+=(usage.total_output_tokens||0);
          usageTotal.total_tokens+=(usage.total_tokens||((usage.total_input_tokens||0)+(usage.total_output_tokens||0)));

          if(!text) throw new Error(`${label}: a Gemini Interactions API nem adott szöveges választ.`);
          console.log(`[${jobId}] Gemini Interactions kész: ${label} | model=${useModel} | tokens=${usage.total_tokens||"?"}`);
          await heartbeat(stage,`${label}: válasz megérkezett.`,{
            retryAttempt:attempt+1,
            retryMax:maxAttempts,
            activeModel:useModel
          });
          return parseJson(text,label);

        }catch(error){
          lastError=error;
          if(error?.name==="AbortError"){
            if(attempt<maxAttempts-1){
              const waitMs=retryDelayMs(attempt,null,null);
              console.warn(`[${jobId}] ${label}: 90s timeout; retry ${attempt+2}/${maxAttempts} ${waitMs}ms múlva.`);
              await heartbeat(stage,`${label}: az AI-válasz késett, újrapróbálás ${Math.ceil(waitMs/1000)} mp múlva…`,{
                retryAttempt:attempt+1,
                retryMax:maxAttempts,
                lastErrorType:"timeout"
              });
              await sleep(waitMs);
              continue;
            }
            throw new Error(`${label}: a Gemini négyszer is időtúllépéssel állt le. Próbáld újra később.`);
          }

          const transientNetwork=/fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|network/i.test(String(error?.message||error));
          if(transientNetwork && attempt<maxAttempts-1){
            const waitMs=retryDelayMs(attempt,null,null);
            console.warn(`[${jobId}] ${label}: hálózati hiba; retry ${attempt+2}/${maxAttempts} ${waitMs}ms múlva. ${error.message}`);
            await heartbeat(stage,`${label}: átmeneti hálózati hiba, újrapróbálás…`,{
              retryAttempt:attempt+1,
              retryMax:maxAttempts,
              lastErrorType:"network"
            });
            await sleep(waitMs);
            continue;
          }
          throw error;
        }finally{
          clearTimeout(timeout);
        }
      }
      throw lastError||new Error(`${label}: ismeretlen Gemini hiba.`);
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

    await writeJob(jobId,{
      status:"running",
      stage:"analyze",
      summary:"Az AI azonosítja az érintett fájlokat.",
      heartbeatAt:new Date().toISOString(),
      heartbeatMessage:"Elemzés előkészítése…"
    });

    const picked=await geminiJson({
      label:"Fájlkiválasztás",
      stage:"analyze",
      useModel:analysisModel,
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

    await writeJob(jobId,{
      status:"running",
      stage:"edit",
      summary:`Az AI ${paths.length} fájlt vizsgál és módosít.`,
      heartbeatAt:new Date().toISOString(),
      heartbeatMessage:"A kiválasztott fájlok módosítása következik.",
      analysisModel,
      editModel:model
    });

    const sources=paths.map(p=>`===== FILE: ${p} =====\n${readText(zip,p)}`).join("\n\n");
    const edit=await geminiJson({
      label:"Kódmódosítás",
      stage:"edit",
      useModel:model,
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

    await writeJob(jobId,{
      status:"running",
      stage:"test",
      summary:"A módosítások alapellenőrzése fut.",
      heartbeatAt:new Date().toISOString(),
      heartbeatMessage:"Automatikus ellenőrzések futnak."
    });
    const checks=simpleChecks(zip,changed);
    if(checks.some(c=>c.ok===false)) throw new Error("Az automatikus ellenőrzés hibát talált.");

    await writeJob(jobId,{
      status:"running",
      stage:"build",
      summary:"Az új ZIP build készül.",
      heartbeatAt:new Date().toISOString(),
      heartbeatMessage:"Az új ZIP build készül."
    });
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
        provider:"Gemini Interactions API",
        model,
        inputTokens:usageTotal.input_tokens,
        outputTokens:usageTotal.output_tokens,
        totalTokens:usageTotal.total_tokens,
        freeTierEligible:true,
        cost:null
      }
    });
  }catch(error){
    console.error(`[${jobId||"no-job"}] AI Agent / Gemini Interactions hiba:`,error);
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

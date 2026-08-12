import { json } from "./_shared.mjs";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function extractText(data){return(data?.steps||[]).filter(s=>s?.type==="model_output").flatMap(s=>s?.content||[]).filter(b=>b?.type==="text").map(b=>b?.text||"").join("").trim()}
async function callGemini({apiKey,model,input,system,schema}){
  let lastError;
  for(let attempt=0;attempt<3;attempt++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
    try{
      const resp=await fetch("https://generativelanguage.googleapis.com/v1beta/interactions",{
        method:"POST",
        headers:{"x-goog-api-key":apiKey,"content-type":"application/json"},
        signal:controller.signal,
        body:JSON.stringify({model,system_instruction:system,input,response_format:{type:"text",mime_type:"application/json",schema},store:false})
      });
      const raw=await resp.text();let data;try{data=JSON.parse(raw)}catch{data={raw}}
      if(!resp.ok){
        const msg=data?.error?.message||raw||`HTTP ${resp.status}`;
        if((resp.status===429||resp.status>=500)&&attempt<2){await sleep((2**attempt)*1500);continue}
        throw new Error(`Gemini hiba (${resp.status}): ${msg}`);
      }
      const text=extractText(data);
      if(!text)throw new Error("A Gemini nem adott JSON választ.");
      return{data:JSON.parse(text),usage:data?.usage||null,model};
    }catch(err){
      lastError=err;
      if(err?.name==="AbortError"&&attempt<2){await sleep((2**attempt)*1500);continue}
      throw err;
    }finally{clearTimeout(timer)}
  }
  throw lastError||new Error("Ismeretlen Gemini hiba.");
}
export default async(req)=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    if(!process.env.GEMINI_API_KEY)return json({error:"Hiányzik a GEMINI_API_KEY."},500);
    const body=await req.json(),prompt=String(body?.prompt||"").trim(),current=body?.content;
    if(!prompt)return json({error:"Hiányzik a módosítási kérés."},400);
    if(!current||typeof current!=="object"||Array.isArray(current))return json({error:"Hiányzik az aktuális content JSON."},400);
    const model=(process.env.GEMINI_CONTENT_MODEL||process.env.GEMINI_ANALYSIS_MODEL||"gemini-3.5-flash-lite").trim();
    const result=await callGemini({
      apiKey:process.env.GEMINI_API_KEY,model,
      system:`Te az Útiterv Studio tartalomszerkesztője vagy.
Kizárólag a megadott JSON tartalmat módosíthatod.
A struktúrát, kulcsokat és nem érintett tartalmakat őrizd meg.
Ne adj magyarázó szöveget a JSON-on kívül.
Ha a kérés tartalom helyett kód-, CSS-, HTML- vagy funkciómódosítás, ne találj ki megoldást: a "requiresDeveloperMode" mezőt állítsd true értékre és hagyd a content objektumot változatlanul.`,
      input:`Felhasználói kérés:\n${prompt}\n\nAKTUÁLIS KÖZPONTI TARTALOM:\n${JSON.stringify(current)}`,
      schema:{type:"object",properties:{summary:{type:"string"},requiresDeveloperMode:{type:"boolean"},content:{type:"object"}},required:["summary","requiresDeveloperMode","content"]}
    });
    return json({ok:true,summary:result.data.summary||"Tartalmi módosítás elkészült.",requiresDeveloperMode:!!result.data.requiresDeveloperMode,content:result.data.content,usage:result.usage,model:result.model});
  }catch(error){console.error("Fast content agent error:",error);return json({error:error?.message||String(error)},500)}
};

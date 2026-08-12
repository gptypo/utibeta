import OpenAI from "openai";

const headers={"Content-Type":"application/json; charset=utf-8"};
const reply=(statusCode,payload)=>({statusCode,headers,body:JSON.stringify(payload)});

function sameShape(original,updated,path="$"){
  if(Array.isArray(original)){
    if(!Array.isArray(updated)) throw new Error(`A JSON struktúra megváltozott: ${path} tömb volt.`);
    return;
  }
  if(original && typeof original==="object"){
    if(!updated || typeof updated!=="object" || Array.isArray(updated)){
      throw new Error(`A JSON struktúra megváltozott: ${path} objektum volt.`);
    }
    for(const key of Object.keys(original)){
      if(!(key in updated)) throw new Error(`A Gemini eltávolított egy meglévő kulcsot: ${path}.${key}`);
      sameShape(original[key],updated[key],`${path}.${key}`);
    }
  }
}

function assertProtectedFields(original,updated){
  const protectedKeys=["schema","id"];
  const walk=(a,b,path="$")=>{
    if(!a || typeof a!=="object" || Array.isArray(a)) return;
    for(const key of Object.keys(a)){
      if(protectedKeys.includes(key) && JSON.stringify(a[key])!==JSON.stringify(b?.[key])){
        throw new Error(`Védett mező módosult: ${path}.${key}`);
      }
      walk(a[key],b?.[key],`${path}.${key}`);
    }
  };
  walk(original,updated);
}

export const handler=async(event)=>{
  if(event.httpMethod!=="POST") return reply(405,{error:"Method Not Allowed"});

  try{
    if(!process.env.GEMINI_API_KEY) return reply(500,{error:"Hiányzik a GEMINI_API_KEY Netlify environment variable."});

    const {prompt,currentContent,filePath}=JSON.parse(event.body||"{}");
    if(!prompt || typeof prompt!=="string" || !prompt.trim()) return reply(400,{error:"Hiányzik a módosítási kérés."});
    if(!currentContent || typeof currentContent!=="object" || Array.isArray(currentContent)) return reply(400,{error:"Az aktuális tartalom nem érvényes JSON objektum."});
    if(!filePath || typeof filePath!=="string" || !/^content\/.+\.json$/.test(filePath)) return reply(400,{error:"Érvénytelen tartalomfájl."});

    const model=(process.env.GEMINI_MODEL||"gemini-3.6-flash").trim();
    const openai=new OpenAI({
      apiKey:process.env.GEMINI_API_KEY,
      baseURL:"https://generativelanguage.googleapis.com/v1beta/openai/",
      timeout:45000,
      maxRetries:1
    });

    const response=await openai.chat.completions.create({
      model,
      messages:[
        {
          role:"system",
          content:`Az Útiterv Studio PWA tartalomszerkesztő asszisztense vagy.

Kizárólag a kapott JSON TARTALMÁT szerkesztheted a felhasználó kérése alapján.

SZABÁLYOK:
1. Kizárólag érvényes, szigorú JSON objektumot adj vissza.
2. Ne használj markdownot vagy kódblokkot.
3. Minden meglévő JSON kulcsot tarts meg.
4. A meglévő objektum/tömb struktúrát ne alakítsd át más típussá.
5. A "schema" és a meglévő "id" mezőket soha ne módosítsd.
6. Csak a kéréshez szükséges értékeket módosítsd; minden más maradjon változatlan.
7. Új tartalmi elemet csak akkor adj hozzá, ha a felhasználó ezt kifejezetten kéri.
8. Ha a szerkesztett fájl egy modul index.json fájlja, a "sections" tömb új elemmel BŐVÍTHETŐ. Új szekciónál adj stabil, kisbetűs ASCII id-t, a kért címet és az id alapján egy .json fájlnevet. Példa: {"id":"uj-szekcio","title":"Új szekció","file":"uj-szekcio.json"}. Meglévő szekciót ne törölj.
9. Ha a kérés HTML-, CSS-, JavaScript- vagy animációmódosítás, a JSON-t változtatás nélkül add vissza. Egy modul új aloldala/füle/szekciója viszont index.json tartalmi-struktúra módosításnak számít, tehát végezd el.
10. A célközönség 13–18 éves fiatal; a hangnem közvetlen, támogató és könnyen érthető legyen.`
        },
        {
          role:"user",
          content:`Szerkesztett fájl: ${filePath}

Jelenlegi tartalom:
${JSON.stringify(currentContent)}

Módosítási kérés:
${prompt.trim()}`
        }
      ],
      response_format:{type:"json_object"},
      temperature:0.2
    });

    const raw=response?.choices?.[0]?.message?.content;
    if(!raw) throw new Error("A Gemini nem adott vissza tartalmat.");

    let updatedContent;
    try{updatedContent=JSON.parse(raw)}
    catch{throw new Error("A Gemini válasza nem volt érvényes JSON.");}

    if(!updatedContent || typeof updatedContent!=="object" || Array.isArray(updatedContent)){
      throw new Error("A Gemini hibás JSON-struktúrát adott vissza.");
    }

    sameShape(currentContent,updatedContent);
    assertProtectedFields(currentContent,updatedContent);

    const unchanged=JSON.stringify(currentContent)===JSON.stringify(updatedContent);

    return reply(200,{
      updatedContent,
      unchanged,
      model,
      usage:response.usage||null
    });
  }catch(error){
    console.error("Útiterv AI Content hiba:",error);
    const status=Number(error?.status)||500;
    let message=error?.message||String(error);
    if(status===429) message="A Gemini API pillanatnyi limitet ért el. Próbáld újra rövid idő múlva.";
    else if(status===401||status===403) message="A Gemini API-kulcs vagy jogosultság nem megfelelő.";
    else if(error?.name==="APIConnectionTimeoutError") message="A Gemini 45 másodpercen belül nem válaszolt. Próbáld újra.";
    return reply(status>=400&&status<600?status:500,{error:message});
  }
};

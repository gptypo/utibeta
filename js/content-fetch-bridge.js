(()=>{
  const nativeFetch=window.fetch.bind(window);
  let centralPromise=null;
  function ensureCentral(){
    if(!centralPromise)centralPromise=window.UtitervContentState.load().catch(err=>{console.warn("Central content fallback:",err);return null});
    return centralPromise;
  }
  window.fetch=async function(input,init){
    const url=typeof input==="string"?input:input?.url;
    if(typeof url==="string"){
      const clean=url.split("?")[0].replace(/^\.?\//,"");
      const match=clean.match(/^content\/([^/]+)\.json$/);
      if(match&&match[1]!=="content"&&match[1]!=="content.schema"){
        const central=await ensureCentral();
        const moduleValue=central?.modules?.[match[1]];
        if(moduleValue!==undefined)return new Response(JSON.stringify(moduleValue),{status:200,headers:{"content-type":"application/json; charset=utf-8"}});
      }
    }
    return nativeFetch(input,init);
  };
})();

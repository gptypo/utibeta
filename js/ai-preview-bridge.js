(()=>{
  if(new URLSearchParams(location.search).get("aiPreview")!=="1") return;

  const KEY_PATH="utiterv-ai-preview-path";
  const KEY_JSON="utiterv-ai-preview-json";
  const nativeFetch=window.fetch.bind(window);

  window.fetch=async function(input,init){
    const url=typeof input==="string"?input:input?.url;
    const previewPath=sessionStorage.getItem(KEY_PATH);
    const raw=sessionStorage.getItem(KEY_JSON);

    if(url && previewPath && raw){
      try{
        const resolved=new URL(url,location.href);
        const target=new URL(previewPath,location.href);
        if(resolved.pathname===target.pathname){
          JSON.parse(raw);
          return new Response(raw,{
            status:200,
            headers:{"Content-Type":"application/json; charset=utf-8"}
          });
        }
      }catch(err){
        console.warn("AI preview bridge:",err);
      }
    }
    return nativeFetch(input,init);
  };
})();

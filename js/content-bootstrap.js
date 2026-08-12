document.addEventListener("DOMContentLoaded",()=>{
  window.UtitervContentState?.load("content/content.json").catch(err=>console.warn("Központi content.json nem tölthető:",err));
});

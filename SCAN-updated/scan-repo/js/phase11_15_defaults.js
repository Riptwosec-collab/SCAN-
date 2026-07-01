(function(){
  const key='riptwosec.scan.phase11_15';
  const defaults={quality:true,layout:true,router:true,feedback:true,autoRoute:true,benchmark:true,open:false};
  try{
    const saved=JSON.parse(localStorage.getItem(key)||'null');
    localStorage.setItem(key,JSON.stringify(saved?{...defaults,...saved}:defaults));
  }catch(e){localStorage.setItem(key,JSON.stringify(defaults));}
  function run(){
    try{if(typeof injectPhasePanel==='function')injectPhasePanel();if(typeof phaseRenderAll==='function')phaseRenderAll();}catch(e){}
  }
  const timer=setInterval(()=>{if(typeof injectPhasePanel==='function'){run();clearInterval(timer);}},300);
  setTimeout(()=>clearInterval(timer),6000);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else setTimeout(run,0);
})();

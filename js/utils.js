const $=id=>document.getElementById(id);

function setStatus(message,type=''){
  const el=$('status');
  if(!el)return;
  el.textContent=message;
  el.className='status '+type;
}

function setProgress(value){
  const el=$('progressBar');
  if(!el)return;
  el.style.width=Math.max(0,Math.min(100,value))+'%';
}

function escapeHtml(text){
  return String(text).replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));
}

function showOutput(text){
  AppState.lastText=(text||'').trim();
  $('output').textContent=AppState.lastText||'ไม่พบข้อความ';
  if(AppState.lastText)saveHistory(AppState.lastText);
}

function clearOutput(){
  AppState.lastText='';
  $('output').textContent='ผลลัพธ์จะแสดงที่นี่';
  setProgress(0);
  setStatus('ล้างผลลัพธ์แล้ว','ok');
}

function downloadFile(filename,content,mime){
  const blob=new Blob([content||''],{type:mime+';charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),800);
}

function dataUrlToImage(url){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src=url;
  });
}

window.addEventListener('error',e=>setStatus('Error: '+e.message,'err'));
window.addEventListener('unhandledrejection',e=>setStatus('Error: '+((e.reason&&e.reason.message)||e.reason),'err'));

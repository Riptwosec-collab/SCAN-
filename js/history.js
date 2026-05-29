const HISTORY_KEY='riptwosec.scan.history';

function saveHistory(text){
  const clean=(text||'').trim();
  if(!clean)return;
  const items=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
  items.unshift({time:new Date().toLocaleString('th-TH'),text:clean.slice(0,5000)});
  localStorage.setItem(HISTORY_KEY,JSON.stringify(items.slice(0,12)));
  renderHistory();
}

function renderHistory(){
  const box=$('history');
  if(!box)return;
  const items=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
  box.innerHTML='';
  if(!items.length){
    box.innerHTML='<div class="hint">ยังไม่มีประวัติ</div>';
    return;
  }
  items.forEach(item=>{
    const div=document.createElement('div');
    div.className='hist';
    div.textContent=item.time+' · '+item.text.slice(0,80).replace(/\n/g,' ');
    div.onclick=()=>showOutput(item.text);
    box.appendChild(div);
  });
}

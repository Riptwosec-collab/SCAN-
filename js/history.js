const HISTORY_KEY='riptwosec.scan.history';

function getLegacyHistory(){
  try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch{return []}
}

function saveHistory(text){
  const clean=(text||'').trim();
  if(!clean)return;
  if(typeof saveScanProHistoryRecord==='function'){
    saveScanProHistoryRecord({rawText:AppState.rawText||clean,cleanedText:clean});
    return;
  }
  const items=getLegacyHistory();
  items.unshift({time:new Date().toLocaleString('th-TH'),text:clean.slice(0,5000)});
  localStorage.setItem(HISTORY_KEY,JSON.stringify(items.slice(0,12)));
  renderHistory();
}

function renderHistory(){
  const box=$('history');
  if(!box)return;
  if(typeof getScanProHistory==='function'){
    const items=getScanProHistory();
    box.innerHTML=
      '<div class="history-tools">'+
        '<input id="historySearch" type="search" placeholder="Search history">'+
        '<button class="btn small" id="historyExportBtn" type="button">Export</button>'+
        '<button class="btn small danger" id="historyClearBtn" type="button">Clear</button>'+
      '</div>'+
      '<div id="historyList"></div>';
    const input=$('historySearch');
    const list=$('historyList');
    const renderList=()=>{
      const query=(input?.value||'').trim().toLowerCase();
      const filtered=items.filter(item=>{
        const haystack=[item.fileName,item.cleanedText,item.rawText,item.mode,item.language].join(' ').toLowerCase();
        return !query||haystack.includes(query);
      });
      if(!filtered.length){
        list.innerHTML='<div class="hint">No OCR history yet</div>';
        return;
      }
      list.innerHTML=filtered.slice(0,50).map(item=>
        '<div class="hist">'+
          '<b>'+escapeHtml(item.fileName||'untitled')+'</b>'+
          '<small>'+new Date(item.createdAt).toLocaleString('th-TH')+' · '+(item.charCount||0)+' chars · '+escapeHtml(item.mode||'-')+'</small>'+
          '<small>'+escapeHtml((item.cleanedText||item.rawText||'').replace(/\s+/g,' ').slice(0,110))+'</small>'+
          '<div class="hist-actions">'+
            '<button type="button" data-history-open="'+escapeHtml(item.id)+'">Open</button>'+
            '<button type="button" data-history-delete="'+escapeHtml(item.id)+'">Delete</button>'+
          '</div>'+
        '</div>'
      ).join('');
      list.querySelectorAll('[data-history-open]').forEach(button=>button.onclick=()=>loadScanProHistoryItem(button.dataset.historyOpen));
      list.querySelectorAll('[data-history-delete]').forEach(button=>button.onclick=()=>deleteScanProHistoryItem(button.dataset.historyDelete));
    };
    input?.addEventListener('input',renderList);
    $('historyExportBtn').onclick=()=>downloadFile('scan-pro-history.json',JSON.stringify(items,null,2),'application/json');
    $('historyClearBtn').onclick=()=>clearScanProHistory();
    renderList();
    return;
  }

  const items=getLegacyHistory();
  box.innerHTML='';
  if(!items.length){
    box.innerHTML='<div class="hint">No history yet</div>';
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

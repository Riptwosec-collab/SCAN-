function searchOutput(){
  const q=$('searchInput').value.trim();
  const text=AppState.lastText||$('output').innerText;
  if(!q){showOutput(text);return;}
  const safe=escapeHtml(text);
  const escaped=q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp(escaped,'gi');
  $('output').innerHTML=safe.replace(re,m=>'<mark>'+m+'</mark>');
  setStatus('พบคำค้นหา: '+q,'ok');
}

function clearSearch(){
  $('searchInput').value='';
  $('output').textContent=AppState.lastText||'ผลลัพธ์จะแสดงที่นี่';
}

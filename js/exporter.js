async function copyOutput(){
  const text=AppState.lastText||$('output').innerText;
  if(!text.trim())return;
  await navigator.clipboard.writeText(text);
  setStatus('คัดลอกแล้ว','ok');
}

function exportTxt(){
  downloadFile('riptwosec-scan.txt',AppState.lastText||$('output').innerText,'text/plain');
}

function exportDoc(){
  const body='<pre style="font-family:Sarabun,Arial;white-space:pre-wrap;line-height:1.7">'+escapeHtml(AppState.lastText||$('output').innerText)+'</pre>';
  const html='<!doctype html><meta charset="utf-8"><title>RIPTWOSEC.SCAN</title>'+body;
  downloadFile('riptwosec-scan.doc',html,'application/msword');
}

function exportCsv(){
  const text=AppState.lastText||$('output').innerText;
  const csv=text.split('\n').map(line=>'"'+line.replace(/"/g,'""')+'"').join('\n');
  downloadFile('riptwosec-scan.csv',csv,'text/csv');
}

function exportPrintPdf(){
  const text=escapeHtml(AppState.lastText||$('output').innerText);
  const html='<!doctype html><html><head><meta charset="utf-8"><title>RIPTWOSEC.SCAN PDF</title><style>body{font-family:Sarabun,Arial;padding:28px;line-height:1.7;white-space:pre-wrap}</style></head><body>'+text+'</body></html>';
  downloadFile('riptwosec-scan-print.html',html,'text/html');
  setStatus('ดาวน์โหลดไฟล์ HTML แล้ว เปิดไฟล์และเลือก Print > Save as PDF','ok');
}

// RIPTWOSEC.SCAN Benchmark Lab
const BENCH_KEY='riptwosec.scan.benchmarkRuns';
function benchStore(){try{return JSON.parse(localStorage.getItem(BENCH_KEY)||'[]')}catch{return []}}
function benchSave(items){localStorage.setItem(BENCH_KEY,JSON.stringify((items||[]).slice(-150)))}
function qs(id){return document.getElementById(id)}
function safeHtml(v){return String(v||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function setBenchStatus(msg,type='ok'){const el=qs('benchStatus');if(el){el.textContent=msg;el.className='bench-status '+type}}
function benchProgress(n){const bar=qs('benchProgressBar');if(bar)bar.style.width=Math.max(0,Math.min(100,n))+'%'}

function fileToCanvas(file){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);resolve(c)};
    img.onerror=reject;
    img.src=URL.createObjectURL(file);
  });
}
function simplePreprocess(source){
  const scale=Math.min(4,Math.max(1,1600/Math.max(source.width,source.height)));
  const c=document.createElement('canvas');c.width=Math.round(source.width*scale);c.height=Math.round(source.height*scale);
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;ctx.drawImage(source,0,0,c.width,c.height);
  const img=ctx.getImageData(0,0,c.width,c.height);const d=img.data;
  let sum=0;for(let i=0;i<d.length;i+=4)sum+=.299*d[i]+.587*d[i+1]+.114*d[i+2];
  const avg=sum/(d.length/4);
  for(let i=0;i<d.length;i+=4){let v=.299*d[i]+.587*d[i+1]+.114*d[i+2];v=(v-128)*1.55+128;if(avg>190)v=(v-140)*1.8+140;d[i]=d[i+1]=d[i+2]=Math.max(0,Math.min(255,v));}
  ctx.putImageData(img,0,0);return c;
}
function benchCleanText(text){
  let out=String(text||'');
  if(typeof cleanText==='function')out=cleanText(out);
  if(typeof applyAdvancedThaiSpell==='function')out=applyAdvancedThaiSpell(out);
  if(typeof applyCustomRules==='function')out=applyCustomRules(out);
  return out.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
function cer(ref,hyp){
  ref=String(ref||'');hyp=String(hyp||'');if(!ref)return null;
  const a=[...ref],b=[...hyp];const dp=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++)dp[i][0]=i;for(let j=0;j<=b.length;j++)dp[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return Math.round((dp[a.length][b.length]/Math.max(1,a.length))*1000)/10;
}
function wordError(ref,hyp){
  ref=String(ref||'').trim().split(/\s+/).filter(Boolean);hyp=String(hyp||'').trim().split(/\s+/).filter(Boolean);if(!ref.length)return null;
  const dp=Array.from({length:ref.length+1},()=>Array(hyp.length+1).fill(0));
  for(let i=0;i<=ref.length;i++)dp[i][0]=i;for(let j=0;j<=hyp.length;j++)dp[0][j]=j;
  for(let i=1;i<=ref.length;i++)for(let j=1;j<=hyp.length;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(ref[i-1]===hyp[j-1]?0:1));
  return Math.round((dp[ref.length][hyp.length]/Math.max(1,ref.length))*1000)/10;
}
function textQuality(text){
  if(typeof scoreOcrText==='function')return Math.round(scoreOcrText(text,80));
  const thai=(String(text).match(/[ก-ฮ]/g)||[]).length;const bad=(String(text).match(/[�{}<>~`^|]/g)||[]).length;return Math.max(0,thai*2-bad*8);
}
function renderBenchHistory(){
  const box=qs('benchHistory');if(!box)return;const runs=benchStore().slice().reverse();
  if(!runs.length){box.innerHTML='<p class="muted">ยังไม่มี Benchmark</p>';return;}
  box.innerHTML='<table><thead><tr><th>เวลา</th><th>ไฟล์</th><th>Quality</th><th>CER</th><th>WER</th><th>Engine</th></tr></thead><tbody>'+runs.map(r=>'<tr><td>'+safeHtml(new Date(r.createdAt).toLocaleString())+'</td><td>'+safeHtml(r.name)+'</td><td>'+safeHtml(r.qualityScore)+'</td><td>'+safeHtml(r.cer??'-')+'</td><td>'+safeHtml(r.wer??'-')+'</td><td>'+safeHtml(r.engine)+'</td></tr>').join('')+'</tbody></table>';
}
async function runBenchmarkFile(file,groundTruth){
  if(!file.type.startsWith('image/'))throw new Error('Benchmark Lab ตอนนี้รองรับรูปภาพก่อน');
  const canvas=await fileToCanvas(file);
  const quality=typeof phaseAnalyzeQuality==='function'?phaseAnalyzeQuality(canvas):null;
  benchProgress(12);setBenchStatus('กำลัง OCR raw: '+file.name);
  const rawResult=await Tesseract.recognize(canvas,'tha+eng',{logger:m=>{if(m.progress)benchProgress(12+m.progress*38)}});
  const raw=rawResult.data.text||'';
  const prepared=simplePreprocess(canvas);
  benchProgress(55);setBenchStatus('กำลัง OCR enhanced: '+file.name);
  const enhResult=await Tesseract.recognize(prepared,'tha+eng',{logger:m=>{if(m.progress)benchProgress(55+m.progress*35)}});
  const enhanced=enhResult.data.text||'';
  const rawClean=benchCleanText(raw);
  const enhancedClean=benchCleanText(enhanced);
  const final=textQuality(enhancedClean)>=textQuality(rawClean)?enhancedClean:rawClean;
  const item={id:'bench_'+Date.now(),createdAt:new Date().toISOString(),name:file.name,engine:'tesseract raw + enhanced',qualityScore:quality?.score||'-',qualityWarnings:quality?.warnings||[],rawScore:textQuality(rawClean),finalScore:textQuality(final),cer:cer(groundTruth,final),wer:wordError(groundTruth,final),rawText:raw,finalText:final};
  const runs=benchStore();runs.push(item);benchSave(runs);
  const phases=window.RIPTWOSEC_PHASES;
  if(phases&&typeof phases.saveThaiDataset==='function'){
    const ds=phases.getThaiDataset();
    ds.push({...item,sourceName:item.name,layoutType:(typeof phaseDetectLayout==='function'?phaseDetectLayout(final).type:'plain'),reason:'benchmark'});
    phases.saveThaiDataset(ds);
  }
  return item;
}
function renderBenchResult(item){
  const box=qs('benchResult');if(!box)return;
  box.innerHTML='<div class="result-grid"><div class="metric"><b>'+safeHtml(item.qualityScore)+'</b><span>Image Quality</span></div><div class="metric"><b>'+safeHtml(item.finalScore)+'</b><span>Text Score</span></div><div class="metric"><b>'+(item.cer??'-')+'</b><span>CER %</span></div><div class="metric"><b>'+(item.wer??'-')+'</b><span>WER %</span></div></div><h3>Final Output</h3><pre>'+safeHtml(item.finalText)+'</pre><h3>Raw OCR</h3><pre>'+safeHtml(item.rawText)+'</pre>';
}
async function runBenchmark(){
  try{
    const files=[...(qs('benchInput')?.files||[])];if(!files.length){setBenchStatus('เลือกไฟล์ก่อน','err');return;}
    const gt=qs('groundTruth')?.value||'';
    let last=null;
    for(const file of files){last=await runBenchmarkFile(file,gt)}
    benchProgress(100);setBenchStatus('Benchmark เสร็จแล้ว','ok');if(last)renderBenchResult(last);renderBenchHistory();
  }catch(e){setBenchStatus('Benchmark error: '+e.message,'err');benchProgress(0)}
}
document.addEventListener('DOMContentLoaded',()=>{
  qs('runBenchBtn')?.addEventListener('click',runBenchmark);
  qs('clearBenchBtn')?.addEventListener('click',()=>{benchSave([]);renderBenchHistory();setBenchStatus('ล้าง Benchmark แล้ว','ok')});
  qs('exportBenchBtn')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify(benchStore(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='riptwosec-benchmark.json';a.click();URL.revokeObjectURL(url)});
  renderBenchHistory();
});

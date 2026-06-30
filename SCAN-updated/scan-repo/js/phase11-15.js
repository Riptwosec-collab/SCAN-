// RIPTWOSEC.SCAN Phases 11-15
// Phase 11: OCR Quality Gate
// Phase 12: Layout & Table Engine
// Phase 13: Multi-Engine OCR Router
// Phase 14: Benchmark hooks
// Phase 15: Thai OCR Dataset & Feedback Loop

const PHASE_KEY='riptwosec.scan.phase11_15';
const DATASET_KEY='riptwosec.scan.thaiDataset';

function phaseSettings(){try{return JSON.parse(localStorage.getItem(PHASE_KEY)||'{}')}catch{return {}}}
function savePhaseSettings(next){localStorage.setItem(PHASE_KEY,JSON.stringify({...phaseSettings(),...next}))}
function getThaiDataset(){try{return JSON.parse(localStorage.getItem(DATASET_KEY)||'[]')}catch{return []}}
function saveThaiDataset(items){localStorage.setItem(DATASET_KEY,JSON.stringify((items||[]).slice(-300)))}

function injectPhaseStyles(){
  if(document.getElementById('phase1115Style'))return;
  const style=document.createElement('style');
  style.id='phase1115Style';
  style.textContent=`
    .phase-lab{border:1px solid rgba(147,197,253,.25);background:linear-gradient(135deg,rgba(8,18,32,.9),rgba(4,10,14,.88));border-radius:18px;padding:14px;margin:12px 0;box-shadow:0 14px 42px rgba(0,0,0,.24)}
    .phase-lab summary{cursor:pointer;font-weight:800}.phase-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.phase-grid label{display:flex;gap:8px;align-items:center;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px}.phase-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.phase-report{display:grid;gap:8px;margin-top:12px}.quality-card,.layout-card,.router-card,.dataset-card{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);border-radius:14px;padding:12px}.quality-card.good{border-color:rgba(134,239,172,.45)}.quality-card.warn{border-color:rgba(250,204,21,.45)}.quality-card.bad{border-color:rgba(248,113,113,.55)}.q-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}.q-metrics span{font:12px/1.3 Space Mono,monospace;background:rgba(0,0,0,.22);padding:7px;border-radius:10px}.q-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.q-tags i{font-style:normal;font-size:12px;border-radius:999px;background:rgba(250,204,21,.13);color:#fde68a;border:1px solid rgba(250,204,21,.24);padding:4px 8px}.block-list{display:grid;gap:7px;margin-top:8px}.block-item{border-left:3px solid #93c5fd;background:rgba(0,0,0,.18);padding:8px;border-radius:10px}.block-item b{color:#bfdbfe}.router-pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 10px;background:rgba(134,239,172,.12);border:1px solid rgba(134,239,172,.25);color:#bbf7d0}.dataset-mini{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.dataset-mini span{border-radius:999px;padding:5px 9px;background:rgba(255,255,255,.07);font-size:12px}@media(max-width:780px){.phase-grid,.q-metrics{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function injectPhasePanel(){
  injectPhaseStyles();
  if($('phase1115Panel'))return;
  const anchor=$('accuracyPanel')||$('aiReviewPanel')||document.querySelector('.dictionary-box')||document.querySelector('.action-row');
  if(!anchor)return;
  const s={quality:true,layout:true,router:true,feedback:true,autoRoute:true,benchmark:true,...phaseSettings()};
  const panel=document.createElement('details');
  panel.id='phase1115Panel';
  panel.className='phase-lab';
  panel.open=!!s.open;
  panel.innerHTML=`
    <summary>Phase 11-15 OCR Lab <span style="color:#93c5fd;font-size:12px">Quality · Layout · Router · Benchmark · Dataset</span></summary>
    <div class="phase-grid">
      <label><input id="phaseQuality" type="checkbox" ${s.quality?'checked':''}> Phase 11 Quality Gate ก่อน/หลัง OCR</label>
      <label><input id="phaseLayout" type="checkbox" ${s.layout?'checked':''}> Phase 12 Layout & Table Engine</label>
      <label><input id="phaseRouter" type="checkbox" ${s.router?'checked':''}> Phase 13 Multi-Engine Router</label>
      <label><input id="phaseAutoRoute" type="checkbox" ${s.autoRoute?'checked':''}> Auto เลือก Engine/Preset ตามเอกสาร</label>
      <label><input id="phaseFeedback" type="checkbox" ${s.feedback?'checked':''}> Phase 15 เก็บ Feedback เป็น Dataset</label>
      <label><input id="phaseBenchmark" type="checkbox" ${s.benchmark?'checked':''}> Phase 14 เก็บคะแนนไป Benchmark</label>
    </div>
    <div class="phase-actions">
      <button class="btn small" id="savePhase1115Btn" type="button">บันทึก Phase</button>
      <button class="btn small" id="rerunQualityGateBtn" type="button">ตรวจ Quality ตอนนี้</button>
      <button class="btn small" id="rerunLayoutBtn" type="button">วิเคราะห์ Layout ตอนนี้</button>
      <button class="btn small" id="exportDatasetBtn" type="button">Export Dataset</button>
      <button class="btn small danger" id="clearDatasetBtn" type="button">ล้าง Dataset</button>
    </div>
    <div id="phaseReport" class="phase-report"></div>
  `;
  anchor.insertAdjacentElement('afterend',panel);
  const save=()=>savePhaseSettings({open:panel.open,quality:$('phaseQuality').checked,layout:$('phaseLayout').checked,router:$('phaseRouter').checked,autoRoute:$('phaseAutoRoute').checked,feedback:$('phaseFeedback').checked,benchmark:$('phaseBenchmark').checked});
  $('savePhase1115Btn').onclick=()=>{save();phaseRenderAll();setStatus('บันทึก Phase 11-15 แล้ว','ok')};
  $('rerunQualityGateBtn').onclick=()=>{save();phaseRunQualityNow();};
  $('rerunLayoutBtn').onclick=()=>{save();phaseRunLayoutNow();};
  $('exportDatasetBtn').onclick=exportThaiDataset;
  $('clearDatasetBtn').onclick=()=>{saveThaiDataset([]);phaseRenderAll();setStatus('ล้าง Thai OCR Dataset แล้ว','ok')};
  panel.addEventListener('toggle',()=>{savePhaseSettings({open:panel.open})});
  phaseRenderAll();
}

document.addEventListener('DOMContentLoaded',injectPhasePanel);

function phaseAnalyzeQuality(canvas){
  if(!canvas)return null;
  const base=typeof analyzeCanvasQuality==='function'?analyzeCanvasQuality(canvas):null;
  const probe=document.createElement('canvas');
  const scale=Math.min(1,620/Math.max(canvas.width,canvas.height));
  probe.width=Math.max(1,Math.round(canvas.width*scale));
  probe.height=Math.max(1,Math.round(canvas.height*scale));
  const ctx=probe.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(canvas,0,0,probe.width,probe.height);
  const img=ctx.getImageData(0,0,probe.width,probe.height);
  const d=img.data;
  const gray=new Uint8Array(probe.width*probe.height);
  let sum=0,sum2=0,dark=0,light=0;
  for(let i=0,p=0;i<d.length;i+=4,p++){
    const v=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);gray[p]=v;sum+=v;sum2+=v*v;if(v<60)dark++;if(v>235)light++;
  }
  const pixels=gray.length||1;
  const avg=sum/pixels;
  const contrast=Math.sqrt(Math.max(0,sum2/pixels-avg*avg));
  let edge=0,vertical=0,horizontal=0,count=0;
  for(let y=1;y<probe.height-1;y++)for(let x=1;x<probe.width-1;x++){
    const i=y*probe.width+x;
    const gx=Math.abs(gray[i+1]-gray[i-1]);
    const gy=Math.abs(gray[i+probe.width]-gray[i-probe.width]);
    edge+=gx+gy;vertical+=gx;horizontal+=gy;count++;
  }
  const blur=edge/Math.max(1,count);
  const borderSample=[];
  const step=Math.max(1,Math.floor(Math.min(probe.width,probe.height)/80));
  for(let x=0;x<probe.width;x+=step){borderSample.push(gray[x],gray[(probe.height-1)*probe.width+x]);}
  for(let y=0;y<probe.height;y+=step){borderSample.push(gray[y*probe.width],gray[y*probe.width+probe.width-1]);}
  const borderDark=borderSample.filter(v=>v<55).length/Math.max(1,borderSample.length);
  const skewRatio=horizontal?vertical/horizontal:1;
  const skew=Math.abs(Math.log(Math.max(.2,Math.min(5,skewRatio))))*8;
  const smallText=canvas.width<1200||canvas.height<900||blur<28;
  const warnings=[];
  let score=100;
  const minSide=Math.min(canvas.width,canvas.height);
  if(minSide<900){warnings.push('ความละเอียดต่ำ / ตัวอักษรเล็ก');score-=18;}
  if(blur<22){warnings.push('ภาพเบลอ เสี่ยงอ่านสระไทยผิด');score-=20;}
  if(contrast<38){warnings.push('Contrast ต่ำ');score-=14;}
  if(avg<78){warnings.push('ภาพมืด');score-=10;}
  if(avg>226){warnings.push('ภาพสว่าง/จางเกิน');score-=10;}
  if(borderDark>.28){warnings.push('มีขอบดำ/ขอบภาพเยอะ ควร Crop');score-=12;}
  if(skew>7){warnings.push('ภาพอาจเอียง ควร Deskew');score-=10;}
  if(smallText){warnings.push('ตัวอักษรเล็ก แนะนำใช้ PaddleOCR หรือเทียบภาพต้นฉบับ');score-=8;}
  const level=score>=82?'good':score>=62?'warn':'bad';
  return {width:canvas.width,height:canvas.height,avg,contrast,blur,borderDark,skew,smallText,darkRatio:dark/pixels,lightRatio:light/pixels,score:Math.max(20,Math.min(99,Math.round(score))),level,warnings,base};
}

function getPhaseCanvas(){return AppState.preparedCanvas||AppState.processedCanvas||AppState.imageCanvas||$('imgPreview')||$('pdfPreview')||null}

function renderPhaseQuality(report){
  AppState.phaseQuality=report||null;
  const host=$('phaseReport');
  if(!host||!phaseSettings().quality)return;
  const old=$('phaseQualityCard');if(old)old.remove();
  if(!report)return;
  const card=document.createElement('div');
  card.id='phaseQualityCard';
  card.className='quality-card '+report.level;
  const label=report.level==='good'?'ผ่าน Quality Gate':report.level==='warn'?'ควรตรวจ/ปรับภาพ':'เสี่ยง OCR ผิดสูง';
  card.innerHTML='<b>Phase 11 · OCR Quality Gate</b><div class="router-pill">'+report.score+'% · '+label+'</div>'+       
    '<div class="q-metrics"><span>size '+report.width+'x'+report.height+'</span><span>blur '+Math.round(report.blur)+'</span><span>contrast '+Math.round(report.contrast)+'</span><span>skew '+report.skew.toFixed(1)+'</span><span>border '+Math.round(report.borderDark*100)+'%</span><span>brightness '+Math.round(report.avg)+'</span></div>'+       
    '<div class="q-tags">'+(report.warnings.length?report.warnings.map(w=>'<i>'+escapeHtml(w)+'</i>').join(''):'<i>คุณภาพพร้อม OCR</i>')+'</div>';
  host.prepend(card);
  if(typeof renderFileQualityReport==='function')renderFileQualityReport({score:report.score,level:report.level,warnings:report.warnings,width:report.width,height:report.height,blur:report.blur,contrast:report.contrast,avg:report.avg,darkRatio:report.darkRatio,lightRatio:report.lightRatio});
}

function phaseRunQualityNow(){
  const report=phaseAnalyzeQuality(getPhaseCanvas());
  renderPhaseQuality(report);
  if(report)setStatus('Quality Gate: '+report.score+'% · '+(report.warnings[0]||'พร้อม OCR'),report.level==='bad'?'err':'ok');
  else setStatus('ยังไม่มีภาพให้ตรวจ Quality','err');
  return report;
}

function phaseDetectLayout(text){
  const value=String(text||'').replace(/\r/g,'');
  const lines=value.split('\n').map((line,i)=>({text:line.trim(),i})).filter(x=>x.text);
  const blocks=[];
  const type=(typeof detectLayoutType==='function'?detectLayoutType(value):'plain')||'plain';
  const add=(kind,title,items)=>{if(items&&items.length)blocks.push({kind,title,items})};
  add('header','Header / หัวเอกสาร',lines.slice(0,Math.min(5,lines.length)).map(x=>x.text));
  const tableLines=lines.filter(x=>/\t|\|/.test(x.text)||x.text.split(/\s{2,}/).length>=3);
  add('table','Table-like Rows / แถวตาราง',tableLines.slice(0,12).map(x=>x.text.replace(/\s{3,}/g,' | ')));
  const kv=lines.filter(x=>/^[^:：]{2,40}[:：]\s*.+/.test(x.text)||/(วันที่|เรื่อง|เรียน|อ้างอิง|จาก|ถึง|โทรศัพท์|Email|URL|Ticket|เลขที่)\s*[:： ]/.test(x.text));
  add('keyvalue','Key-Value / ช่องข้อมูล',kv.slice(0,18).map(x=>x.text));
  const form=lines.filter(x=>/[_]{3,}|\[\s*\]|\(\s*\)|□|☐|☑|✓/.test(x.text));
  add('form','Form Fields / ช่องฟอร์ม',form.slice(0,12).map(x=>x.text));
  add('footer','Footer / ท้ายเอกสาร',lines.slice(Math.max(0,lines.length-5)).map(x=>x.text));
  const hasTable=tableLines.length>=2;
  const hasKv=kv.length>=2;
  return {type,lines:lines.length,hasTable,hasKv,blocks};
}

function renderPhaseLayout(layout){
  AppState.phaseLayout=layout||null;
  const host=$('phaseReport');
  if(!host||!phaseSettings().layout)return;
  const old=$('phaseLayoutCard');if(old)old.remove();
  if(!layout)return;
  const card=document.createElement('div');
  card.id='phaseLayoutCard';
  card.className='layout-card';
  card.innerHTML='<b>Phase 12 · Layout & Table Engine</b> <span class="router-pill">'+escapeHtml(layout.type)+' · '+layout.lines+' lines</span>'+       
    '<div class="block-list">'+layout.blocks.map(block=>'<div class="block-item"><b>'+escapeHtml(block.title)+'</b><div>'+block.items.map(x=>escapeHtml(x)).join('<br>')+'</div></div>').join('')+'</div>';
  host.appendChild(card);
}

function phaseRunLayoutNow(){
  const text=$('output')?.innerText||AppState.lastText||AppState.rawText||'';
  const layout=phaseDetectLayout(text);
  renderPhaseLayout(layout);
  phaseAutoApplyLayoutPreset(layout);
  setStatus('Layout Engine วิเคราะห์แล้ว: '+layout.type,'ok');
  return layout;
}

function phaseAutoApplyLayoutPreset(layout){
  const s=phaseSettings();
  if(!s.autoRoute||!layout)return;
  if(layout.hasTable&&$('ocrPreset')){$('ocrPreset').value='table';AppState.ocrPreset='table'}
  if(layout.type==='email'&&$('modeSelect'))$('modeSelect').value='email';
  if(layout.type==='letter'&&$('modeSelect'))$('modeSelect').value='document';
  if(layout.type==='table'&&$('modeSelect'))$('modeSelect').value='table';
  if(typeof syncQuickModeButtons==='function')syncQuickModeButtons();
}

function phaseRecommendEngine(canvas,textHint=''){
  const quality=phaseAnalyzeQuality(canvas);
  const layout=phaseDetectLayout(textHint||AppState.lastText||AppState.rawText||'');
  let engine='auto';
  let preset=$('ocrPreset')?.value||'auto';
  let reason='เอกสารทั่วไป ใช้ Auto Router';
  if(quality?.level==='bad'){
    engine='tesseract-accurate';reason='คุณภาพภาพเสี่ยงสูง ใช้ Tesseract Accurate + หลาย pass';
  }
  if(quality?.smallText){engine='tesseract-accurate';reason='ตัวอักษรเล็ก ต้องใช้ pass ละเอียด';}
  if(layout.hasTable||layout.type==='table'){preset='table';engine='tesseract-accurate';reason='พบตาราง/ฟอร์ม ใช้ Table preset';}
  if(/IPv4|Gateway|DHCP|DNS|VLAN|Interface|MAC/i.test(textHint)){preset='screenshot';reason='พบข้อมูล Network ใช้ Screenshot/IT OCR';}
  if(quality?.darkRatio>.45){preset='screenshot';reason='ภาพมืดคล้าย Screenshot ใช้ Dark/UI passes';}
  return {engine,preset,reason,quality,layout};
}

function renderPhaseRouter(route){
  AppState.phaseRoute=route||null;
  const host=$('phaseReport');
  if(!host||!phaseSettings().router)return;
  const old=$('phaseRouterCard');if(old)old.remove();
  if(!route)return;
  const card=document.createElement('div');
  card.id='phaseRouterCard';
  card.className='router-card';
  card.innerHTML='<b>Phase 13 · Multi-Engine OCR Router</b><div style="margin-top:8px"><span class="router-pill">Engine: '+escapeHtml(route.engine)+'</span> <span class="router-pill">Preset: '+escapeHtml(route.preset)+'</span></div><p class="side-verify-note">'+escapeHtml(route.reason)+'</p>';
  host.appendChild(card);
}

function phaseApplyRouter(route){
  const s=phaseSettings();
  if(!route||!s.autoRoute)return;
  if($('ocrEngine')){$('ocrEngine').value=route.engine;AppState.ocrEngine=route.engine;}
  if($('ocrPreset')&&route.preset){$('ocrPreset').value=route.preset;AppState.ocrPreset=route.preset;if(typeof applyProfessionalPreset==='function')applyProfessionalPreset(route.preset);}
}

function phaseCollectDataset(reason='auto'){
  const s=phaseSettings();
  if(!s.feedback&&!s.benchmark)return;
  const raw=AppState.rawText||'';
  const finalText=$('output')?.innerText||AppState.lastText||'';
  if(!raw&&!finalText)return;
  const dataset=getThaiDataset();
  const quality=AppState.phaseQuality||phaseAnalyzeQuality(getPhaseCanvas());
  const layout=AppState.phaseLayout||phaseDetectLayout(finalText||raw);
  const item={id:'ds_'+Date.now(),createdAt:new Date().toISOString(),reason,sourceName:AppState.sourceName||AppState.imageFile?.name||AppState.pdfFile?.name||'unknown',rawText:raw,finalText,confidence:AppState.confidence||null,qualityScore:quality?.score||null,qualityWarnings:quality?.warnings||[],layoutType:layout?.type||'plain',lines:layout?.lines||0,engine:AppState.ocrEngine||$('ocrEngine')?.value||'auto',preset:AppState.ocrPreset||$('ocrPreset')?.value||'auto'};
  dataset.push(item);
  saveThaiDataset(dataset);
  renderPhaseDataset();
}

function renderPhaseDataset(){
  const host=$('phaseReport');
  if(!host)return;
  const old=$('phaseDatasetCard');if(old)old.remove();
  const data=getThaiDataset();
  const card=document.createElement('div');
  card.id='phaseDatasetCard';
  card.className='dataset-card';
  const last=data[data.length-1];
  card.innerHTML='<b>Phase 15 · Thai OCR Dataset & Feedback Loop</b><div class="dataset-mini"><span>'+data.length+' samples</span><span>last: '+escapeHtml(last?.layoutType||'-')+'</span><span>avg quality: '+phaseAvg(data.map(x=>x.qualityScore).filter(Boolean))+'%</span></div><p class="side-verify-note">เก็บ Raw OCR + Final Output + Quality + Layout เพื่อทำชุดทดสอบและสร้าง rule ใหม่ในอนาคต</p>';
  host.appendChild(card);
}

function phaseAvg(nums){if(!nums.length)return '-';return Math.round(nums.reduce((a,b)=>a+b,0)/nums.length)}

function exportThaiDataset(){
  const data=getThaiDataset();
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='riptwosec-thai-ocr-dataset.json';a.click();URL.revokeObjectURL(url);
  setStatus('Export Thai OCR Dataset แล้ว','ok');
}

function phaseRenderAll(){
  const host=$('phaseReport');if(host)host.innerHTML='';
  const canvas=getPhaseCanvas();
  if(canvas)renderPhaseQuality(phaseAnalyzeQuality(canvas));
  const text=$('output')?.innerText||AppState.lastText||AppState.rawText||'';
  if(text)renderPhaseLayout(phaseDetectLayout(text));
  if(canvas)renderPhaseRouter(phaseRecommendEngine(canvas,text));
  renderPhaseDataset();
}

function phasePatchPipeline(){
  if(window.__phase1115Patched)return;
  window.__phase1115Patched=true;
  const patchHandle=()=>{
    if(typeof window.handleImageFile==='function'&&!window.__phaseHandleImagePatched){
      const original=window.handleImageFile;
      window.handleImageFile=async function(file){
        await original(file);
        const s=phaseSettings();
        if(s.quality!==false)renderPhaseQuality(phaseAnalyzeQuality(getPhaseCanvas()));
        if(s.router!==false){const route=phaseRecommendEngine(getPhaseCanvas(),'');renderPhaseRouter(route);phaseApplyRouter(route);}
      };
      window.__phaseHandleImagePatched=true;
    }
    if(typeof window.updateProcessedPreview==='function'&&!window.__phasePreviewPatched){
      const originalPreview=window.updateProcessedPreview;
      window.updateProcessedPreview=function(){
        const result=originalPreview.apply(this,arguments);
        const s=phaseSettings();
        const canvas=getPhaseCanvas();
        if(s.quality!==false&&canvas)renderPhaseQuality(phaseAnalyzeQuality(canvas));
        if(s.router!==false&&canvas){const route=phaseRecommendEngine(canvas,AppState.rawText||AppState.lastText||'');renderPhaseRouter(route);}
        return result;
      };
      window.__phasePreviewPatched=true;
    }
    if(typeof window.scanCurrent==='function'&&!window.__phaseScanPatched){
      const originalScan=window.scanCurrent;
      window.scanCurrent=async function(){
        const s=phaseSettings();
        const canvas=getPhaseCanvas();
        if(s.quality!==false&&canvas){
          const q=phaseAnalyzeQuality(canvas);renderPhaseQuality(q);
          if(q.level==='bad')setStatus('Quality Gate เตือน: '+q.warnings.join(' · ')+' · จะพยายาม OCR ต่อ','err');
        }
        if(s.router!==false&&canvas){const route=phaseRecommendEngine(canvas,AppState.rawText||'');renderPhaseRouter(route);phaseApplyRouter(route);}
        await originalScan.apply(this,arguments);
        phaseAfterOutput('scan');
      };
      window.__phaseScanPatched=true;
    }
    if(typeof window.showCleanedResult==='function'&&!window.__phaseShowPatched){
      const originalShow=window.showCleanedResult;
      window.showCleanedResult=async function(raw,animate){
        await originalShow.apply(this,arguments);
        phaseAfterOutput('showCleaned');
      };
      window.__phaseShowPatched=true;
    }
  };
  const timer=setInterval(()=>{patchHandle();if(window.__phaseHandleImagePatched&&window.__phaseScanPatched&&window.__phaseShowPatched)clearInterval(timer)},300);
  setTimeout(()=>clearInterval(timer),9000);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patchHandle);else patchHandle();
  document.addEventListener('DOMContentLoaded',()=>{$('output')?.addEventListener('blur',()=>phaseCollectDataset('user-edit'))});
}

function phaseAfterOutput(reason){
  const s=phaseSettings();
  const text=$('output')?.innerText||AppState.lastText||'';
  if(s.layout!==false&&text){const layout=phaseDetectLayout(text);renderPhaseLayout(layout);phaseAutoApplyLayoutPreset(layout);}
  if(s.router!==false){const route=phaseRecommendEngine(getPhaseCanvas(),text);renderPhaseRouter(route);}
  if(s.feedback!==false||s.benchmark!==false)phaseCollectDataset(reason);
}

phasePatchPipeline();

window.RIPTWOSEC_PHASES={phaseAnalyzeQuality,phaseDetectLayout,phaseRecommendEngine,getThaiDataset,saveThaiDataset,exportThaiDataset,phaseCollectDataset};

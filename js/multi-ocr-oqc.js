(function(){
  'use strict';

  const OCR_TEAM=[
    {engineId:'ocr-1',engineName:'OCR #1',label:'OCR #1',color:'sky',mode:'pdf-like',psm:'6',dpi:'360',description:'เดิม + Document pass'},
    {engineId:'ocr-2',engineName:'OCR #2',label:'OCR #2',color:'green',mode:'thai-sharp',psm:'6',dpi:'390',description:'Thai sharp pass'},
    {engineId:'ocr-3',engineName:'OCR #3',label:'OCR #3',color:'violet',mode:'doc-clean',psm:'6',dpi:'400',description:'Clean binary pass'},
    {engineId:'ocr-4',engineName:'OCR #4',label:'OCR #4',color:'orange',mode:'ui-adaptive',psm:'11',dpi:'420',description:'Sparse adaptive pass'},
    {engineId:'ocr-5',engineName:'OCR #5',label:'OCR #5',color:'pink',mode:'receipt',psm:'4',dpi:'380',description:'Receipt / dense block pass'}
  ];

  const OQC_TEAM=[
    {oqcId:'oqc-1',oqcName:'OQC #1',color:'gold',focus:'majority-vote'},
    {oqcId:'oqc-2',oqcName:'OQC #2',color:'emerald',focus:'document-logic'}
  ];

  const initialCardState={status:'idle',confidence:null,durationMs:null,progress:0,uncertainWords:[],error:''};

  function byId(id){return document.getElementById(id)}
  function html(text){return typeof escapeHtml==='function'?escapeHtml(text):String(text).replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]))}
  function nowMs(){return performance&&performance.now?performance.now():Date.now()}
  function clampPct(value){return Math.max(0,Math.min(100,Math.round(Number(value)||0)))}
  function normalizeComparable(value){return String(value||'').toLowerCase().replace(/[\s\u200B]+/g,'').replace(/[|]+/g,'').trim()}
  function simpleWords(value){return String(value||'').split(/\s+/).map(x=>x.trim()).filter(Boolean)}
  function getLang(){return byId('langSelect')?.value||'tha+eng'}
  function avg(numbers){const list=numbers.filter(n=>Number.isFinite(n));return list.length?list.reduce((a,b)=>a+b,0)/list.length:0}
  function safeClean(text){
    let output=String(text||'').trim();
    if(typeof cleanText==='function'){
      const fixedBackup=Array.isArray(AppState?.fixedWords)?[...AppState.fixedWords]:[];
      const confidenceBackup=AppState?.confidence;
      try{output=cleanText(output)}catch(error){}
      finally{
        if(window.AppState){
          AppState.fixedWords=Array.isArray(AppState.fixedWords)?AppState.fixedWords:fixedBackup;
          AppState.confidence=confidenceBackup;
        }
      }
    }
    if(typeof finalOcrReview==='function'){
      try{output=finalOcrReview(output)}catch(error){}
    }
    return output.trim();
  }

  function setTimeline(step){
    document.querySelectorAll('[data-scan-step]').forEach(item=>{
      const index=Number(item.dataset.scanStep);
      item.classList.toggle('active',index===step);
      item.classList.toggle('done',index<step);
    });
  }

  function toast(message,type='ok'){
    let box=byId('multiOcrToast');
    if(!box){
      box=document.createElement('div');
      box.id='multiOcrToast';
      box.className='multi-toast';
      document.body.appendChild(box);
    }
    box.textContent=message;
    box.className='multi-toast show '+type;
    clearTimeout(box._timer);
    box._timer=setTimeout(()=>box.classList.remove('show'),3200);
  }

  function setCard(engineId,patch){
    const card=byId('card-'+engineId);
    if(!card)return;
    const state={...initialCardState,...patch};
    card.dataset.status=state.status;
    card.querySelector('[data-ocr-status]').textContent=state.status;
    card.querySelector('[data-ocr-progress]').style.width=clampPct(state.progress)+'%';
    card.querySelector('[data-ocr-confidence]').textContent=state.confidence==null?'--':clampPct(state.confidence)+'%';
    card.querySelector('[data-ocr-time]').textContent=state.durationMs==null?'--':Math.round(state.durationMs)+' ms';
    const issue=card.querySelector('[data-ocr-issue]');
    if(issue)issue.textContent=state.error||((state.uncertainWords||[]).length?'ไม่มั่นใจ: '+state.uncertainWords.slice(0,5).join(', '):'พร้อมทำงาน');
  }

  function setOqcCard(oqcId,patch){
    const card=byId('card-'+oqcId);
    if(!card)return;
    card.dataset.status=patch.status||'idle';
    card.querySelector('[data-oqc-status]').textContent=patch.status||'idle';
    card.querySelector('[data-oqc-confidence]').textContent=patch.confidence==null?'--':clampPct(patch.confidence)+'%';
    card.querySelector('[data-oqc-issues]').textContent=(patch.issuesFound||[]).length?patch.issuesFound.slice(0,3).join(' · '):(patch.message||'รอผล OCR');
  }

  function renderIdleDashboard(){
    const ocrBox=byId('ocrTeamStatus');
    if(ocrBox){
      ocrBox.innerHTML=OCR_TEAM.map(engine=>
        '<article class="ocr-worker-card '+engine.color+'" id="card-'+engine.engineId+'" data-status="idle">'+
          '<div class="worker-top"><span class="robot">🤖</span><div><b>'+engine.label+'</b><small>'+html(engine.description)+'</small></div></div>'+
          '<div class="worker-bar"><i data-ocr-progress></i></div>'+
          '<div class="worker-meta"><span class="status-badge" data-ocr-status>idle</span><span>Confidence <b data-ocr-confidence>--</b></span><span>Time <b data-ocr-time>--</b></span></div>'+
          '<p class="worker-issue" data-ocr-issue>พร้อมทำงาน</p>'+
          '<button class="btn small ghost" type="button" data-show-ocr="'+engine.engineId+'">ดูผลลัพธ์</button>'+
        '</article>'
      ).join('');
    }
    const oqcBox=byId('oqcPanel');
    if(oqcBox){
      oqcBox.innerHTML=OQC_TEAM.map(oqc=>
        '<article class="oqc-card '+oqc.color+'" id="card-'+oqc.oqcId+'" data-status="idle">'+
          '<div class="worker-top"><span class="robot inspector">🛡️</span><div><b>'+oqc.oqcName+'</b><small>'+html(oqc.focus)+'</small></div></div>'+
          '<div class="worker-meta"><span class="status-badge" data-oqc-status>idle</span><span>Confidence <b data-oqc-confidence>--</b></span></div>'+
          '<p class="worker-issue" data-oqc-issues>รอผล OCR</p>'+
        '</article>'
      ).join('');
    }
    const compare=byId('ocrComparisonTable');
    if(compare)compare.innerHTML='<div class="empty-oqc"><b>ยังไม่มีผลเปรียบเทียบ</b><span>อัปโหลดรูป/PDF แล้วกดแปลง ระบบจะแสดง OCR #1-#5 และ OQC Decision ตรงนี้</span></div>';
    const final=byId('finalResultBox');
    if(final)final.innerHTML='<div class="empty-oqc"><b>Final Text จะขึ้นตรงนี้</b><span>ระบบจะเลือกข้อความที่น่าเชื่อถือที่สุดหลัง OQC ตรวจครบ 2 ตัว</span></div>';
    setTimeline(1);
  }

  function attachDashboardButtons(){
    byId('oqcExplainBtn')?.addEventListener('click',()=>{
      const panel=byId('oqcExplainPanel');
      if(panel)panel.classList.toggle('hide');
    });
    byId('multiCopyBtn')?.addEventListener('click',copyOutput);
    byId('multiTxtBtn')?.addEventListener('click',exportTxt);
    byId('multiDocxBtn')?.addEventListener('click',()=>typeof exportDocx==='function'?exportDocx():exportDoc());
    byId('multiPdfBtn')?.addEventListener('click',exportPrintPdf);
    byId('multiScanAgainBtn')?.addEventListener('click',()=>window.runMultiOqcScan?.());
    byId('multiClearBtn')?.addEventListener('click',()=>{clearOutput?.();renderIdleDashboard();});
    byId('scanAgainBtn')?.addEventListener('click',()=>window.runMultiOqcScan?.());
  }

  function updateGlobalProgress(progressMap){
    const values=Object.values(progressMap);
    if(values.length&&typeof setProgress==='function')setProgress(10+(avg(values)*0.55));
  }

  async function recognizeWithEngine(engine,sourceCanvas,profile='image',progressMap={}){
    const started=nowMs();
    setCard(engine.engineId,{status:'scanning',progress:5});
    if(!window.Tesseract)throw new Error('โหลด Tesseract.js ไม่สำเร็จ');
    const processed=typeof preprocessCanvas==='function'?preprocessCanvas(sourceCanvas,engine.mode):sourceCanvas;
    const result=await Tesseract.recognize(processed,getLang(),{
      logger:message=>{
        const pct=clampPct((message.progress||0)*100);
        progressMap[engine.engineId]=pct;
        setCard(engine.engineId,{status:message.status?'scanning':'scanning',progress:pct});
        updateGlobalProgress(progressMap);
      },
      tessedit_pageseg_mode:engine.psm,
      preserve_interword_spaces:'1',
      user_defined_dpi:engine.dpi,
      tessedit_do_invert:'0'
    });
    const text=(typeof getTesseractLineText==='function'?getTesseractLineText(result):'')||result?.data?.text||'';
    const words=result?.data?.words||[];
    const confidence=typeof extractAverageConfidence==='function'?extractAverageConfidence(result):Math.round(avg(words.map(w=>Number(w.confidence))));
    const uncertainWords=words
      .filter(word=>String(word.text||'').trim()&&(Number(word.confidence)<70||/[�|{}<>~`_^]/.test(word.text)))
      .sort((a,b)=>Number(a.confidence)-Number(b.confidence))
      .slice(0,12)
      .map(word=>String(word.text).trim());
    const durationMs=nowMs()-started;
    return {
      engineId:engine.engineId,
      engineName:engine.engineName,
      text:String(text||'').trim(),
      confidence:clampPct(confidence||0),
      durationMs,
      status:'success',
      uncertainWords,
      error:'',
      mode:engine.mode,
      profile
    };
  }

  function createFailedResult(engine,error){
    return {
      engineId:engine.engineId,
      engineName:engine.engineName,
      text:'',
      confidence:0,
      durationMs:0,
      status:'failed',
      uncertainWords:[],
      error:error?.message||String(error||'OCR failed'),
      mode:engine.mode
    };
  }

  async function runFiveOcr(sourceCanvas,profile='image'){
    setTimeline(2);
    const progressMap={};
    OCR_TEAM.forEach(engine=>setCard(engine.engineId,{status:'scanning',progress:2,confidence:null,durationMs:null,uncertainWords:[]}));
    const settled=await Promise.allSettled(OCR_TEAM.map(engine=>recognizeWithEngine(engine,sourceCanvas,profile,progressMap)));
    const results=settled.map((item,index)=>{
      const engine=OCR_TEAM[index];
      if(item.status==='fulfilled'){
        setCard(engine.engineId,{status:'success',progress:100,confidence:item.value.confidence,durationMs:item.value.durationMs,uncertainWords:item.value.uncertainWords});
        return item.value;
      }
      const failed=createFailedResult(engine,item.reason);
      setCard(engine.engineId,{status:'failed',progress:100,confidence:0,durationMs:0,error:failed.error});
      return failed;
    });
    return results;
  }

  function splitLines(text){return String(text||'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean)}

  function lineScore(line,ocr){
    const text=line||'';
    let score=0;
    score+=(ocr.confidence||0)*0.8;
    score+=Math.min(35,text.replace(/\s/g,'').length*.22);
    score+=(/[0-9]/.test(text)?5:0);
    score+=(/[ก-ฮ]/.test(text)?12:0);
    score+=(/[A-Za-z]/.test(text)?6:0);
    score-=((text.match(/[�{}<>~`_^|]/g)||[]).length*8);
    if(typeof scoreOcrText==='function')score+=Math.min(45,Math.max(-20,scoreOcrText(text,ocr.confidence)/8));
    return score;
  }

  function chooseBestLine(candidates){
    const normalizedCount=new Map();
    candidates.forEach(item=>{
      const key=normalizeComparable(item.text);
      if(!key)return;
      normalizedCount.set(key,(normalizedCount.get(key)||0)+1);
    });
    const majority=[...normalizedCount.entries()].find(([,count])=>count>=3);
    if(majority){
      const match=candidates.find(item=>normalizeComparable(item.text)===majority[0]);
      return {text:match.text,decision:'Majority vote '+majority[1]+'/5',confidence:Math.min(99,86+(majority[1]*2))};
    }
    const best=candidates.slice().sort((a,b)=>lineScore(b.text,b.ocr)-lineScore(a.text,a.ocr))[0]||{text:'',ocr:{confidence:0}};
    const confidence=clampPct((best.ocr?.confidence||0)-8+Math.min(18,normalizeComparable(best.text).length/8));
    return {text:best.text,decision:'OQC reviewed best candidate',confidence};
  }

  function buildComparison(ocrResults){
    setTimeline(3);
    const successful=ocrResults.filter(item=>item.status==='success'&&item.text.trim());
    const lineSets=OCR_TEAM.map(engine=>splitLines(ocrResults.find(result=>result.engineId===engine.engineId)?.text||''));
    const maxLines=Math.max(1,...lineSets.map(lines=>lines.length));
    const rows=[];
    for(let index=0;index<maxLines;index++){
      const candidates=OCR_TEAM.map((engine,engineIndex)=>({
        engineId:engine.engineId,
        engineName:engine.engineName,
        text:lineSets[engineIndex][index]||'',
        ocr:ocrResults.find(result=>result.engineId===engine.engineId)||{confidence:0,status:'failed'}
      }));
      const choice=chooseBestLine(candidates);
      rows.push({line:index+1,values:candidates,decision:choice.text,decisionReason:choice.decision,confidence:choice.confidence});
    }
    if(!successful.length){
      rows[0]={line:1,values:OCR_TEAM.map(engine=>({engineId:engine.engineId,engineName:engine.engineName,text:'',ocr:{confidence:0,status:'failed'}})),decision:'',decisionReason:'No OCR success',confidence:0};
    }
    return rows;
  }

  function detectDocumentIssues(text,comparison,ocrResults){
    const issues=[];
    const mismatchCount=comparison.filter(row=>new Set(row.values.map(v=>normalizeComparable(v.text)).filter(Boolean)).size>1).length;
    const failed=ocrResults.filter(result=>result.status==='failed').length;
    const uncertain=ocrResults.reduce((sum,result)=>sum+(result.uncertainWords?.length||0),0);
    if(mismatchCount)issues.push('พบคำ/บรรทัดที่ OCR อ่านไม่ตรงกัน '+mismatchCount+' จุด');
    if(failed)issues.push('OCR failed '+failed+' ตัว แต่ระบบยังทำงานต่อ');
    if(uncertain)issues.push('พบคำไม่มั่นใจรวม '+uncertain+' คำ');
    if(/ใบเสร็จ|ใบกำกับ|ราคา|ยอดรวม|รวมทั้งสิ้น|บาท|ภาษี/i.test(text)){
      if(!/\d+[,.]?\d*/.test(text))issues.push('เอกสารคล้ายใบเสร็จ/ราคา แต่ยังไม่พบตัวเลขชัดเจน');
      if(!/วันที่|date|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/i.test(text))issues.push('ควรตรวจวันที่ในเอกสารอีกครั้ง');
    }
    if(!text.trim())issues.push('ไม่พบข้อความที่ผ่าน OQC');
    return issues;
  }

  function confidenceFromComparison(comparison,ocrResults,issuesPenalty=0){
    const rowConfidence=avg(comparison.map(row=>row.confidence));
    const successful=ocrResults.filter(result=>result.status==='success');
    const ocrConfidence=avg(successful.map(result=>result.confidence));
    const successBonus=successful.length>=5?6:successful.length>=3?2:-8;
    return clampPct((rowConfidence*.56)+(ocrConfidence*.44)+successBonus-issuesPenalty);
  }

  async function runOqc(ocrResults,comparison){
    setTimeline(4);
    OQC_TEAM.forEach(oqc=>setOqcCard(oqc.oqcId,{status:'Reviewing',confidence:null,message:'กำลังเปรียบเทียบ OCR #1-#5'}));
    await new Promise(resolve=>setTimeout(resolve,120));
    const baseText=comparison.map(row=>row.decision).filter(Boolean).join('\n');
    const cleaned=safeClean(baseText);
    const issues=detectDocumentIssues(cleaned,comparison,ocrResults);
    const mismatchPenalty=Math.min(18,issues.length*4);
    const oqc1={
      oqcId:'oqc-1',
      oqcName:'OQC #1',
      decisionText:cleaned,
      confidence:confidenceFromComparison(comparison,ocrResults,mismatchPenalty),
      issuesFound:issues,
      corrections:[],
      status:'Completed'
    };
    setOqcCard('oqc-1',{status:'Completed',confidence:oqc1.confidence,issuesFound:issues});
    await new Promise(resolve=>setTimeout(resolve,120));
    const docIssues=detectDocumentIssues(cleaned,comparison,ocrResults).filter(issue=>!/failed/i.test(issue));
    const oqc2={
      oqcId:'oqc-2',
      oqcName:'OQC #2',
      decisionText:cleaned,
      confidence:clampPct(oqc1.confidence+(docIssues.length? -3:4)),
      issuesFound:docIssues,
      corrections:[],
      status:'Completed'
    };
    setOqcCard('oqc-2',{status:'Completed',confidence:oqc2.confidence,issuesFound:docIssues});
    return [oqc1,oqc2];
  }

  function finalizeScan(ocrResults,oqcResults,comparison){
    setTimeline(5);
    const finalText=safeClean(oqcResults[1]?.decisionText||oqcResults[0]?.decisionText||comparison.map(row=>row.decision).join('\n'));
    const finalConfidence=clampPct(avg(oqcResults.map(item=>item.confidence)));
    return {
      finalText,
      finalConfidence,
      ocrResults,
      oqcResults,
      comparison,
      createdAt:new Date().toISOString()
    };
  }

  function renderTextModal(result){
    let dialog=byId('ocrResultDialog');
    if(!dialog){
      dialog=document.createElement('dialog');
      dialog.id='ocrResultDialog';
      dialog.className='ocr-result-dialog';
      document.body.appendChild(dialog);
    }
    dialog.innerHTML='<form method="dialog"><button class="dialog-close">×</button></form><h3>'+html(result.engineName)+'</h3><div class="dialog-meta">'+html(result.status)+' · confidence '+html(result.confidence)+'% · '+Math.round(result.durationMs||0)+' ms</div><pre>'+html(result.text||result.error||'ไม่มีข้อความ')+'</pre>';
    if(typeof dialog.showModal==='function')dialog.showModal();
    else dialog.setAttribute('open','open');
  }

  function diffClass(value,decision){
    if(!value&&!decision)return '';
    return normalizeComparable(value)===normalizeComparable(decision)?'match':'mismatch';
  }

  function renderDiffWords(value,decision){
    const decisionWords=new Set(simpleWords(decision).map(normalizeComparable));
    return simpleWords(value).map(word=>{
      const cls=decisionWords.has(normalizeComparable(word))?'word-ok':'word-diff';
      return '<mark class="'+cls+'">'+html(word)+'</mark>';
    }).join(' ')||'<span class="muted">-</span>';
  }

  function renderComparisonTable(comparison){
    const box=byId('ocrComparisonTable');
    if(!box)return;
    const header='<thead><tr><th>บรรทัด</th>'+OCR_TEAM.map(engine=>'<th>'+engine.label+'</th>').join('')+'<th>OQC Decision</th><th>Confidence</th></tr></thead>';
    const rows=comparison.map(row=>{
      const values=row.values.map(item=>'<td class="'+diffClass(item.text,row.decision)+'">'+renderDiffWords(item.text,row.decision)+'</td>').join('');
      return '<tr><td><b>'+row.line+'</b></td>'+values+'<td><b>'+html(row.decision||'-')+'</b><small>'+html(row.decisionReason||'')+'</small></td><td><span class="confidence-pill">'+clampPct(row.confidence)+'%</span></td></tr>';
    }).join('');
    box.innerHTML='<div class="comparison-scroll"><table class="ocr-compare-table">'+header+'<tbody>'+rows+'</tbody></table></div>';
  }

  function renderFinalResult(result){
    const box=byId('finalResultBox');
    if(!box)return;
    box.innerHTML='<div class="final-score"><span>'+result.finalConfidence+'%</span><div><b>Final Confidence Score</b><small>รวมผลจาก OCR #1-#5 + OQC #1-#2</small></div></div>'+
      '<pre class="final-text-preview">'+html(result.finalText||'ไม่พบข้อความ')+'</pre>'+
      '<div class="final-actions">'+
        '<button class="btn primary" id="multiCopyBtn" type="button">Copy</button>'+
        '<button class="btn" id="multiTxtBtn" type="button">Download .TXT</button>'+
        '<button class="btn" id="multiDocxBtn" type="button">Download .DOCX</button>'+
        '<button class="btn" id="multiPdfBtn" type="button">Download .PDF</button>'+
        '<button class="btn subtle" id="multiScanAgainBtn" type="button">Scan Again</button>'+
      '</div>';
    attachDashboardButtons();
  }

  function renderFinalScan(result){
    window.AppState.multiOcrOqc=result;
    renderComparisonTable(result.comparison);
    renderFinalResult(result);
    document.querySelectorAll('[data-show-ocr]').forEach(button=>{
      button.onclick=()=>{
        const resultItem=(window.AppState?.multiOcrOqc?.ocrResults||[]).find(item=>item.engineId===button.dataset.showOcr);
        if(resultItem)renderTextModal(resultItem);
      };
    });
    setTimeline(6);
  }

  async function runCanvasMultiScan(canvas,profile){
    const ocrResults=await runFiveOcr(canvas,profile);
    const comparison=buildComparison(ocrResults);
    const oqcResults=await runOqc(ocrResults,comparison);
    return finalizeScan(ocrResults,oqcResults,comparison);
  }

  async function getPreparedImageCanvas(){
    if(!AppState?.imageFile||!AppState?.imageCanvas)throw new Error('ยังไม่ได้เลือกรูปภาพ');
    const base=typeof cropCanvas==='function'?cropCanvas(AppState.imageCanvas):AppState.imageCanvas;
    const prepared=typeof prepareImageForOcr==='function'?prepareImageForOcr(base):base;
    AppState.preparedCanvas=prepared;
    const preview=typeof preprocessCanvas==='function'?preprocessCanvas(prepared,'pdf-like'):prepared;
    AppState.processedCanvas=preview;
    if(typeof drawCanvasTo==='function')drawCanvasTo(byId('processedPreview'),preview);
    return prepared;
  }

  async function runPdfMultiScan(){
    if(!AppState?.pdfDoc)throw new Error('ยังไม่ได้เลือก PDF');
    const pages=typeof getSelectedPdfPages==='function'?getSelectedPdfPages():[1];
    if(!pages.length)throw new Error('ยังไม่ได้เลือกหน้า PDF');
    const pageResults=[];
    const finalParts=[];
    for(let i=0;i<pages.length;i++){
      const pageNo=pages[i];
      if(typeof setStatus==='function')setStatus('Multi OCR PDF หน้า '+pageNo+' ('+(i+1)+'/'+pages.length+')');
      const canvas=await pdfPageToCanvas(pageNo);
      const pageScan=await runCanvasMultiScan(canvas,'pdf');
      pageResults.push({page:pageNo,...pageScan});
      finalParts.push(typeof formatPageBlock==='function'?formatPageBlock(pageNo,pageScan.finalText):('[หน้า '+pageNo+']\n'+pageScan.finalText));
    }
    const mergedText=finalParts.join('\n\n');
    const mergedConfidence=clampPct(avg(pageResults.map(item=>item.finalConfidence)));
    const last=pageResults[pageResults.length-1];
    return {
      finalText:mergedText,
      finalConfidence:mergedConfidence,
      ocrResults:last?.ocrResults||[],
      oqcResults:last?.oqcResults||[],
      comparison:last?.comparison||[],
      pages:pageResults,
      createdAt:new Date().toISOString()
    };
  }

  async function runBatchFallback(){
    if(typeof scanBatch!=='function')throw new Error('Batch OCR ยังไม่พร้อม');
    setTimeline(2);
    const raw=await scanBatch();
    const cleaned=safeClean(raw);
    const mockOcr=OCR_TEAM.map((engine,index)=>({
      engineId:engine.engineId,
      engineName:engine.engineName,
      text:cleaned,
      confidence:Math.max(72,92-index),
      durationMs:0,
      status:'success',
      uncertainWords:[],
      error:'',
      mode:'batch-wrapper'
    }));
    mockOcr.forEach(item=>setCard(item.engineId,{status:'success',progress:100,confidence:item.confidence,durationMs:item.durationMs,uncertainWords:[]}));
    const comparison=buildComparison(mockOcr);
    const oqcResults=await runOqc(mockOcr,comparison);
    return finalizeScan(mockOcr,oqcResults,comparison);
  }

  async function runMultiOqcScan(){
    try{
      renderIdleDashboard();
      setTimeline(1);
      if(typeof setProgress==='function')setProgress(0);
      if(typeof setOutputProcessing==='function')setOutputProcessing();
      if(typeof setStatus==='function')setStatus('Multi OCR + OQC กำลังเริ่มทำงาน...','ok');
      const dashboard=byId('multiOqcDashboard');
      dashboard?.scrollIntoView({block:'start',behavior:'smooth'});
      let result;
      if(AppState.tab==='img'){
        const canvas=await getPreparedImageCanvas();
        result=await runCanvasMultiScan(canvas,'image');
      }else if(AppState.tab==='pdf'){
        result=await runPdfMultiScan();
      }else{
        result=await runBatchFallback();
      }
      AppState.rawText=result.finalText;
      AppState.confidence=result.finalConfidence;
      await showCleanedResult(result.finalText,true);
      AppState.lastText=result.finalText;
      if(byId('output'))byId('output').textContent=result.finalText||'ไม่พบข้อความ';
      renderFinalScan(result);
      if(typeof renderConfidence==='function')renderConfidence(result.finalConfidence);
      if(typeof setProgress==='function')setProgress(100);
      if(typeof setStatus==='function')setStatus('Multi OCR + OQC เสร็จแล้ว · final confidence '+result.finalConfidence+'%','ok');
      if(typeof scheduleAutoDelete==='function')scheduleAutoDelete();
      toast('สแกนเสร็จแล้ว · OQC เลือก Final Text ให้แล้ว','ok');
      return result.finalText;
    }catch(error){
      if(typeof clearOutputState==='function')clearOutputState();
      if(typeof setStatus==='function')setStatus('Multi OCR + OQC ล้มเหลว: '+error.message,'err');
      if(typeof setProgress==='function')setProgress(0);
      toast('สแกนไม่สำเร็จ: '+error.message,'err');
      throw error;
    }
  }

  function boot(){
    renderIdleDashboard();
    attachDashboardButtons();
    const scanButton=byId('scanBtn');
    if(scanButton){
      scanButton.onclick=()=>runMultiOqcScan().catch(()=>{});
      scanButton.textContent='⚡ Multi OCR + OQC Scan';
    }
    ['imgInput','pdfInput','batchInput'].forEach(id=>byId(id)?.addEventListener('change',()=>setTimeout(renderIdleDashboard,80)));
    document.addEventListener('click',event=>{
      const opener=event.target.closest?.('[data-show-ocr]');
      if(!opener)return;
      const result=(window.AppState?.multiOcrOqc?.ocrResults||[]).find(item=>item.engineId===opener.dataset.showOcr);
      if(result)renderTextModal(result);
    });
  }

  window.runMultiOqcScan=runMultiOqcScan;
  window.renderMultiOcrDashboard=renderFinalScan;
  document.addEventListener('DOMContentLoaded',boot);
})();

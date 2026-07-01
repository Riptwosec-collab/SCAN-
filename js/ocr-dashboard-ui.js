(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const q=(selector,root=document)=>root.querySelector(selector);
  const qa=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const getFile=()=>q('input[type="file"]')?.files?.[0]||window.AppState?.file||null;

  function ensurePanel(){
    if($('advancedOcrBrainPanel'))return;
    const host=$('systemUpgradePanel')||$('multiOqcDashboard')||q('.tool-shell')||q('main');
    if(!host)return;
    const panel=document.createElement('section');
    panel.id='advancedOcrBrainPanel';
    panel.className='system-upgrade-panel advanced-ocr-brain-panel';
    panel.innerHTML=''+
      '<div class="system-upgrade-head"><div><b>Advanced AI OCR Ensemble + OQC Brain</b><span>OCR 5 pass จริง + Image Analyzer + OQC Brain + Extracted Data + Explain Decision</span></div><div class="upgrade-version">Brain</div></div>'+ 
      '<div class="upgrade-actions">'+
        '<button class="btn small" id="advancedRunBtn" type="button">🚀 Run Advanced Ensemble</button>'+ 
        '<button class="btn small" id="advancedExplainBtn" type="button">🧠 ดูวิธีระบบตัดสินผลลัพธ์</button>'+ 
        '<button class="btn small" id="advancedReviewBtn" type="button">✍️ Human Review</button>'+ 
        '<button class="btn small" id="advancedJsonBtn" type="button">⬇️ Export JSON</button>'+ 
      '</div>'+ 
      '<div id="advancedBrainStatus" class="upgrade-log">พร้อมทำงาน · เลือกไฟล์แล้วกด Run Advanced Ensemble</div>'+ 
      '<div id="advancedOcrCards" class="advanced-ocr-cards"></div>'+ 
      '<div id="extractedDataPanel" class="extracted-data-panel"></div>'+ 
      '<dialog id="advancedExplainDialog" class="advanced-dialog"><form method="dialog"><button class="btn small" value="close">ปิด</button></form><pre id="advancedExplainText"></pre></dialog>'+ 
      '<dialog id="humanReviewDialog" class="advanced-dialog"><form method="dialog"><button class="btn small" value="close">ปิด</button></form><div id="humanReviewBody"></div></dialog>';
    host.after(panel);
    $('advancedRunBtn').onclick=runAdvancedFromCurrentFile;
    $('advancedExplainBtn').onclick=openExplainDecision;
    $('advancedReviewBtn').onclick=openHumanReviewPanel;
    $('advancedJsonBtn').onclick=exportAdvancedJson;
  }

  function setStatus(text,type='info'){
    const el=$('advancedBrainStatus');
    if(el){el.textContent=text;el.dataset.type=type;}
    if(window.setStatus)window.setStatus(text,type==='error'?'err':'ok');
  }

  function updateOCRCard(result){
    ensurePanel();
    const host=$('advancedOcrCards');
    if(!host)return;
    let card=$('advanced-'+result.engineId);
    if(!card){
      card=document.createElement('article');
      card.id='advanced-'+result.engineId;
      card.className='upgrade-card advanced-ocr-card';
      host.appendChild(card);
    }
    const rank=result.ranking?.rank?('#'+result.ranking.rank):'';
    const best=result.isBest?'<span class="best-badge">BEST OCR</span>':'';
    const retry=result.retryUsed?'<span class="retry-badge">RETRY</span>':'';
    card.dataset.status=result.status;
    card.innerHTML='<b>'+result.engineName+' '+rank+' '+best+' '+retry+'</b><span>Status: '+result.status+' · Confidence '+Math.round(result.confidence||0)+'% · '+(result.durationMs||0)+'ms</span><small>Preprocess: '+(result.preprocessingUsed||[]).join(', ')+'</small>'+(result.error?'<em>'+result.error+'</em>':'');
  }

  function updateOQCCard(id,result){
    ensurePanel();
    const host=$('advancedOcrCards');
    if(!host)return;
    let card=$('advanced-'+id);
    if(!card){card=document.createElement('article');card.id='advanced-'+id;card.className='upgrade-card advanced-oqc-card';host.appendChild(card);}
    card.dataset.status=result.status||'done';
    card.innerHTML='<b>'+id.toUpperCase()+'</b><span>Confidence '+Math.round(result.confidence||0)+'% · '+(result.documentType||'')+'</span><small>Conflicts '+(result.conflictCount||0)+' · Resolved '+(result.resolvedCount||0)+' · Warnings '+(result.warnings?.length||0)+'</small>';
  }

  function renderExtractedFields(finalResult){
    const panel=$('extractedDataPanel');
    if(!panel)return;
    const fields=finalResult.oqc2?.extractedFields||{};
    panel.innerHTML='<h3>Extracted Data</h3><pre>'+escapeHtml(JSON.stringify(fields,null,2))+'</pre>';
  }

  function renderFinalResult(finalResult){
    window.AppState=window.AppState||{};
    AppState.advancedOcr=finalResult;
    AppState.multiOcrOqc={...(AppState.multiOcrOqc||{}),finalText:finalResult.finalText,finalConfidence:finalResult.finalConfidence,ocrResults:finalResult.ocrResults,oqcResults:[finalResult.oqc1,finalResult.oqc2],imageAnalysis:finalResult.imageAnalysis,extractedFields:finalResult.oqc2?.extractedFields,explain:finalResult.explain};
    AppState.lastText=finalResult.finalText;
    AppState.rawText=finalResult.finalText;
    AppState.confidence=finalResult.finalConfidence;
    if($('output'))$('output').textContent=finalResult.finalText||'ไม่พบข้อความ';
    if(window.ensureFormattedOcrLayout)setTimeout(window.ensureFormattedOcrLayout,80);
    renderExtractedFields(finalResult);
  }

  async function runAdvancedFromCurrentFile(){
    ensurePanel();
    const file=getFile();
    if(!file){setStatus('ยังไม่พบไฟล์ · กรุณาอัปโหลดก่อน','error');return null;}
    try{
      setStatus('กำลังวิเคราะห์ภาพ/PDF...');
      const imageAnalysis=await window.ImageAnalyzer.analyzeImageQuality(file);
      setStatus('กำลังรัน OCR 5 pass จริง...');
      const multi=await window.MultiOCRService.runMultiOCR(file,{imageAnalysis,autoRetry:true});
      multi.ocrResults.forEach(updateOCRCard);
      setStatus('OQC #1 กำลังทำ majority + fuzzy similarity...');
      const oqc1=window.OQCBrain.runOQC1MajoritySimilarity(multi.ocrResults);
      updateOQCCard('oqc1',oqc1);
      setStatus('OQC #2 กำลังตรวจ document logic...');
      const oqc2=window.OQCBrain.runOQC2DocumentLogic(multi.ocrResults,oqc1,imageAnalysis);
      updateOQCCard('oqc2',oqc2);
      const finalResult=window.OQCBrain.buildFinalResult({...multi,oqc1,oqc2,bestOCR:multi.bestOCR});
      renderFinalResult(finalResult);
      setStatus('Advanced Ensemble เสร็จแล้ว · Final confidence '+finalResult.finalConfidence+'%','ok');
      return finalResult;
    }catch(error){
      setStatus('Advanced Ensemble error: '+(error.message||error),'error');
      return null;
    }
  }

  function renderExplainDecision(){
    const data=window.AppState?.advancedOcr||window.AppState?.multiOcrOqc;
    if(!data)return 'ยังไม่มีผลลัพธ์ให้ explain';
    const explain=data.explain||{};
    return JSON.stringify({bestOCR:explain.bestOCR||'',finalSource:explain.finalSource||'',confidenceParts:explain.confidenceParts||data.confidenceParts||{},warnings:explain.warnings||[],conflicts:(explain.conflicts||[]).slice(0,30)},null,2);
  }

  function openExplainDecision(){
    ensurePanel();
    const dialog=$('advancedExplainDialog');
    $('advancedExplainText').textContent=renderExplainDecision();
    if(dialog?.showModal)dialog.showModal();else alert($('advancedExplainText').textContent);
  }

  function openHumanReviewPanel(){
    ensurePanel();
    const data=window.AppState?.advancedOcr||window.AppState?.multiOcrOqc;
    const body=$('humanReviewBody');
    if(!data){body.innerHTML='<p>ยังไม่มีผล OCR</p>';return $('humanReviewDialog')?.showModal?.();}
    const conflicts=(data.explain?.conflicts||data.oqc1?.decisions||[]).slice(0,40);
    body.innerHTML='<h3>Human Review</h3>'+(conflicts.length?conflicts.map((item,index)=>'<div class="review-row"><b>จุด '+(index+1)+'</b><p>เลือกแล้ว: '+escapeHtml(item.selected||'')+'</p><small>Candidates: '+escapeHtml((item.candidates||[]).join(' | '))+'</small><input data-wrong="'+escapeHtml(item.selected||'')+'" placeholder="แก้เป็นคำที่ถูก"><button class="btn small" data-apply-review>Apply</button></div>').join(''):'<p>ไม่มี conflict ที่ต้องแก้</p>');
    body.querySelectorAll('[data-apply-review]').forEach(btn=>btn.onclick=()=>{
      const input=btn.previousElementSibling;
      const wrong=input.dataset.wrong||'';
      const correct=input.value.trim();
      if(correct){window.UserLearning?.saveUserCorrection?.(wrong,correct);if(window.runSystemUpgradeCleanup)window.runSystemUpgradeCleanup(true);setStatus('บันทึก User Learned Correction แล้ว','ok');}
    });
    const dialog=$('humanReviewDialog');
    if(dialog?.showModal)dialog.showModal();
  }

  function resetDashboard(){
    ['advancedOcrCards','extractedDataPanel'].forEach(id=>{const el=$(id);if(el)el.innerHTML='';});
    setStatus('Reset Advanced Dashboard แล้ว');
  }

  function exportAdvancedJson(){
    const data=window.AppState?.advancedOcr||window.AppState?.multiOcrOqc;
    if(!data){setStatus('ยังไม่มีข้อมูลสำหรับ export JSON','error');return;}
    const payload={sourceFile:getFile()?.name||'',createdAt:new Date().toISOString(),imageAnalysis:data.imageAnalysis,ocrResults:data.ocrResults,oqc1:data.oqc1||data.oqcResults?.[0],oqc2:data.oqc2||data.oqcResults?.[1],finalText:data.finalText,finalConfidence:data.finalConfidence,extractedFields:data.oqc2?.extractedFields||data.extractedFields,corrections:data.oqc2?.corrections||[],warnings:data.oqc2?.warnings||[]};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='scan-advanced-ocr.json';a.click();URL.revokeObjectURL(a.href);
  }

  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}

  function boot(){ensurePanel();}
  document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,520));
  window.OCRDashboardUI={ensurePanel,updateOCRCard,updateOQCCard,renderFinalResult,renderExtractedFields,renderExplainDecision,openHumanReviewPanel,resetDashboard,runAdvancedFromCurrentFile,exportAdvancedJson};
})();

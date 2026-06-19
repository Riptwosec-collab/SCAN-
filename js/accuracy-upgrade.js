// RIPTWOSEC.SCAN Phase 10 Verified OCR Workflow
// Implements near-100% workflow except: no new domain dictionary pack, no pre-upload quality gate.
// Features included: Verified OCR Mode, Vision Recheck, side-by-side verify, confidence scoring, user correction learning.
const ACCURACY_KEY='riptwosec.scan.accuracy';
const LEARN_KEY='riptwosec.scan.learnedRules';

function getAccuracySettings(){try{return JSON.parse(localStorage.getItem(ACCURACY_KEY)||'{}')}catch{return {}}}
function saveAccuracySettings(next){localStorage.setItem(ACCURACY_KEY,JSON.stringify({...getAccuracySettings(),...next}))}
function getLearnedRules(){try{return JSON.parse(localStorage.getItem(LEARN_KEY)||'[]')}catch{return []}}
function saveLearnedRules(rules){localStorage.setItem(LEARN_KEY,JSON.stringify((rules||[]).slice(-500)))}

function injectVerifiedStyles(){
  if(document.getElementById('verifiedOcrStyle'))return;
  const style=document.createElement('style');
  style.id='verifiedOcrStyle';
  style.textContent=`
    .verified-panel,.side-verify-panel{border:1px solid rgba(134,239,172,.24);background:linear-gradient(135deg,rgba(7,22,18,.88),rgba(8,10,18,.86));border-radius:18px;padding:14px;margin:12px 0;box-shadow:0 14px 42px rgba(0,0,0,.22)}
    .verified-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.verified-score{font:700 28px/1 Space Mono,monospace;color:#bbf7d0}.verified-score.warn{color:#fde68a}.verified-score.bad{color:#fecaca}.verified-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.verified-chip{border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:5px 9px;background:rgba(255,255,255,.05);font-size:12px}.verified-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.uncertain-mark{background:rgba(250,204,21,.26);outline:1px solid rgba(250,204,21,.5);border-radius:4px;padding:0 2px}.uncertain-mark.bad{background:rgba(248,113,113,.24);outline-color:rgba(248,113,113,.58)}
    .side-verify-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.side-verify-image{max-height:520px;overflow:auto;border-radius:14px;background:rgba(255,255,255,.04);padding:10px}.side-verify-image img{max-width:100%;display:block;border-radius:10px}.side-verify-editor{width:100%;min-height:420px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(2,6,12,.72);color:#e5f9ef;padding:12px;font:14px/1.65 Sarabun,system-ui;resize:vertical}.side-verify-note{color:#9fb2bf;font-size:12px;line-height:1.55;margin-top:6px}@media(max-width:860px){.side-verify-grid{grid-template-columns:1fr}.side-verify-editor{min-height:300px}}`;
  document.head.appendChild(style);
}

function injectAccuracyPanel(){
  injectVerifiedStyles();
  if($('accuracyPanel'))return;
  const anchor=$('aiReviewPanel')||document.querySelector('.dictionary-box')||document.querySelector('.action-row');
  if(!anchor)return;
  const s=getAccuracySettings();
  const panel=document.createElement('details');
  panel.id='accuracyPanel';
  panel.className='ai-review-box';
  panel.open=!!s.open;
  panel.innerHTML=`
    <summary>Verified OCR Mode <span style="color:#93c5fd;font-size:12px">Vision + Human Check</span></summary>
    <div class="ai-review-inner">
      <label class="ai-review-toggle"><input id="accVerified" type="checkbox" ${s.verified!==false?'checked':''}> Verified OCR Mode: ตรวจจุดไม่มั่นใจก่อน Export</label>
      <label class="ai-review-toggle"><input id="accVision" type="checkbox" ${s.vision?'checked':''}> Smart Vision Recheck จากภาพจริง</label>
      <label class="ai-review-toggle"><input id="accAutoVision" type="checkbox" ${s.autoVision?'checked':''}> Auto Vision Recheck หลังแปลงเสร็จ</label>
      <label class="ai-review-toggle"><input id="accVoting" type="checkbox" ${s.voting!==false?'checked':''}> Multi-Pass OCR Voting</label>
      <label class="ai-review-toggle"><input id="accThaiSpell" type="checkbox" ${s.thaiSpell!==false?'checked':''}> Thai Spell + Phrase Correction</label>
      <label class="ai-review-toggle"><input id="accLayout" type="checkbox" ${s.layout!==false?'checked':''}> Layout / Table / Header Parser</label>
      <label class="ai-review-toggle"><input id="accLearn" type="checkbox" ${s.learn!==false?'checked':''}> จำคำที่ผู้ใช้แก้เอง</label>
      <div class="ai-review-grid"><input id="accAccessCode" type="password" placeholder="Donate Access Code สำหรับ Vision Recheck" value="${escapeHtml(s.accessCode||'')}"><input id="accVisionModel" placeholder="Vision model เช่น gpt-4o-mini" value="${escapeHtml(s.model||'gpt-4o-mini')}"></div>
      <div class="ai-review-actions"><button class="btn small" id="saveAccuracyBtn" type="button">บันทึก Verified OCR</button><button class="btn small" id="runVisionVerifyBtn" type="button">Vision Recheck ตอนนี้</button><button class="btn small" id="openSideVerifyBtn" type="button">Side-by-side Verify</button><button class="btn small danger" id="clearLearnBtn" type="button">ล้างคำที่จำ</button></div>
      <div class="hint">โหมดนี้ไม่รับประกัน 100% แบบอัตโนมัติ แต่ช่วยเข้าใกล้ 100% ด้วย AI Vision + Highlight จุดไม่มั่นใจ + ให้คนตรวจเฉพาะจุดเสี่ยง</div>
    </div>`;
  anchor.insertAdjacentElement('afterend',panel);
  $('saveAccuracyBtn').onclick=()=>{saveAccuracyFromUi(panel);setStatus('บันทึก Verified OCR Mode แล้ว','ok')};
  $('runVisionVerifyBtn').onclick=async()=>{saveAccuracyFromUi(panel);await runManualVisionRecheck()};
  $('openSideVerifyBtn').onclick=()=>{saveAccuracyFromUi(panel);openSideBySideVerify()};
  $('clearLearnBtn').onclick=()=>{saveLearnedRules([]);setStatus('ล้างคำที่ระบบจำแล้ว','ok');renderVerifiedStatus(AppState.rawText,AppState.lastText)};
  panel.addEventListener('toggle',()=>saveAccuracySettings({open:panel.open}));
}
function saveAccuracyFromUi(panel){
  saveAccuracySettings({open:panel?.open??true,verified:$('accVerified')?.checked,vision:$('accVision')?.checked,autoVision:$('accAutoVision')?.checked,voting:$('accVoting')?.checked,thaiSpell:$('accThaiSpell')?.checked,layout:$('accLayout')?.checked,learn:$('accLearn')?.checked,accessCode:$('accAccessCode')?.value.trim(),model:$('accVisionModel')?.value.trim()||'gpt-4o-mini'});
}
document.addEventListener('DOMContentLoaded',injectAccuracyPanel);

function applyAdvancedThaiSpell(text){
  let out=String(text||'');
  const pairs=[
    ['ผ้้ใช้','ผู้ใช้'],['ผูใช้','ผู้ใช้'],['เจ้าของเว ้ บ','เจ้าของเว็บ'],['เจาของเว็บ','เจ้าของเว็บ'],['เวบ ็','เว็บ'],['เวบ็','เว็บ'],
    ['ขอความ ้','ข้อความ'],['ขอมูล','ข้อมูล'],['ขออมผล','ข้อมูล'],['ทĕำ','ทำ'],['คĕำ','คำ'],['จĕำ','จำ'],['สาหร ૖ ับ','สำหรับ'],
    ['กอน','ก่อน'],['สงข่','ส่ง'],['แกแล้ ว','แก้แล้ว'],['ทังย้ อหน ่ ้า','ทั้งย่อหน้า'],['ยอหน ่ ้า','ย่อหน้า'],
    ['ร้ป','รูป'],['รู ป','รูป'],['ไฟล ์','ไฟล์'],['หน ้า','หน้า'],['แมนกว ่ า ่','แม่นกว่า'],['เขาใจ','เข้าใจ'],
    ['หนังสอบร ื ิษัท','หนังสือบริษัท'],['ใบกาก૖ ับภาษี','ใบกำกับภาษี'],['ใบกาํ กับภาษี','ใบกำกับภาษี'],
    ['จจากษด','จำกัด'],['บรอษษท','บริษัท'],['เรรรอง','เรื่อง'],['วษนทรร','วันที่'],['ปรษบปรคง','ปรับปรุง'],
    ['ผผอใชอบรอการ','ผู้ใช้บริการ'],['จจงเรรยนมาเพรรอโปรดทราบ','จึงเรียนมาเพื่อโปรดทราบ'],['โทรศษทพร','โทรศัพท์'],['เพอรมเตอม','เพิ่มเติม']
  ];
  for(const p of pairs)out=out.split(p[0]).join(p[1]);
  out=out.replace(/([เแโใไ])\s+([ก-ฮ])/g,'$1$2').replace(/([ก-ฮ])\s+([ะาำิีึืุูั็่้๊๋์])/g,'$1$2').replace(/OpenAI\s+API\s+Key/gi,'OpenAI API Key').replace(/Access\s+Code/gi,'Access Code').replace(/Rule\s*-\s*based/gi,'Rule-based').replace(/Text\s+Layer/gi,'Text Layer').replace(/AI\s+Review\s+Pro/gi,'AI Review Pro');
  for(const rule of getLearnedRules())if(rule.from&&rule.to)out=out.split(rule.from).join(rule.to);
  return out.trim();
}
function detectLayoutType(text){const v=String(text||'');if(/Network Connection Details|IPv4|Subnet Mask|Default Gateway|DHCP|DNS/i.test(v))return 'network';if(/From:|To:|Subject:|จาก:|ถึง:|เรื่อง:/i.test(v)&&/@/.test(v))return 'email';if(/วันที่|เรื่อง|เรียน|อ้างอิง|ขอแสดงความนับถือ/.test(v))return 'letter';if(/ใบกำกับภาษี|ใบเสร็จ|จำนวนเงิน|ราคาสุทธิ|ภาษี/.test(v))return 'invoice';if(v.split('\n').filter(line=>line.split(/\s{2,}|\t|\|/).length>=3).length>=2)return 'table';return 'plain'}
function parseDocumentLayout(text){const type=detectLayoutType(text);let out=String(text||'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();if(type==='email')out=out.replace(/^(From|Fron)\s*[:：]?/gmi,'จาก:').replace(/^To\s*[:：]?/gmi,'ถึง:').replace(/^(Subject|Subj)\s*[:：]?/gmi,'เรื่อง:').replace(/^(Date|Dale|Audi)\s*[:：]?/gmi,'วันที่:');if(type==='letter')out=out.replace(/\s*(วันที่|เรื่อง|เรียน|อ้างอิง)\s*[:：]?\s*/g,'\n$1 ').replace(/\n{3,}/g,'\n\n').trim();if(type==='table')out=out.split('\n').map(line=>line.replace(/\s{3,}/g,' | ')).join('\n');return out}
function lineQualityScore(line){const v=String(line||'').trim();if(!v)return -999;let s=v.length;s+=(v.match(/[ก-ฮ]/g)||[]).length*2;s+=(v.match(/[A-Za-z0-9]/g)||[]).length*.8;s-=(v.match(/[�{}<>~`^|]/g)||[]).length*8;s-=(v.match(/(.)\1{4,}/g)||[]).length*10;return s}
function textScoreForAccuracy(text){return typeof scoreOcrText==='function'?scoreOcrText(text,90)-(typeof ocrRiskScore==='function'?ocrRiskScore(text)*2:0):lineQualityScore(text)}
function ocrVotingMerge(candidates){const list=(candidates||[]).filter(c=>c&&c.text&&c.text.trim()).sort((a,b)=>(b.score||0)-(a.score||0));if(!list.length)return '';const lines=[];const seen=new Set();for(const cand of list){for(const raw of String(cand.text).split('\n')){const fixed=applyAdvancedThaiSpell(raw).trim();const key=fixed.replace(/\s+/g,'').toLowerCase();if(!fixed||seen.has(key)||lineQualityScore(fixed)<2)continue;lines.push(fixed);seen.add(key)}}return parseDocumentLayout(applyAdvancedThaiSpell(lines.join('\n')))}
function getCurrentSourceCanvas(){return AppState.preparedCanvas||AppState.processedCanvas||AppState.imageCanvas||$('imgPreview')||$('pdfPreview')||null}
function canvasToJpegDataUrl(canvas,maxSide=1800,quality=.82){if(!canvas||!canvas.width||!canvas.height)return '';const sc=Math.min(1,maxSide/Math.max(canvas.width,canvas.height));const out=document.createElement('canvas');out.width=Math.max(1,Math.round(canvas.width*sc));out.height=Math.max(1,Math.round(canvas.height*sc));out.getContext('2d').drawImage(canvas,0,0,out.width,out.height);return out.toDataURL('image/jpeg',quality)}
async function visionRecheckIfEnabled(rawText,cleanedText,baseText){const s=getAccuracySettings();if(!s.vision||!s.autoVision)return baseText;return await runVisionRecheck(rawText,cleanedText,baseText)}
async function runVisionRecheck(rawText=AppState.rawText,cleanedText=AppState.lastText,baseText=AppState.lastText){
  const s=getAccuracySettings();const accessCode=(s.accessCode||'').trim();if(!accessCode){setStatus('Vision Recheck ข้าม: ต้องใส่ Donate Access Code','err');return baseText}
  const canvas=getCurrentSourceCanvas();if(!canvas){setStatus('Vision Recheck ข้าม: ไม่พบภาพต้นฉบับ','err');return baseText}
  setStatus('Vision Recheck กำลังอ่านจากภาพจริง...','ok');setProgress(98);
  const res=await fetch('/api/vision-ocr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessCode,imageDataUrl:canvasToJpegDataUrl(canvas),rawText:rawText||'',cleanedText:cleanedText||'',model:(s.model||'gpt-4o-mini').trim()})});
  const data=await res.json();if(!res.ok)throw new Error(data.error||'Vision OCR error');
  const rawVision=data.reviewedText||data.text||'';const vision=parseDocumentLayout(applyAdvancedThaiSpell(rawVision));
  AppState.verifiedVision={text:vision,confidence:data.confidence||null,uncertain:data.uncertain||[],model:data.model};
  return textScoreForAccuracy(vision)>textScoreForAccuracy(baseText)+5?vision:baseText;
}
async function runManualVisionRecheck(){try{const before=$('output')?.innerText||AppState.lastText||'';const after=await runVisionRecheck(AppState.rawText,before,before);if(after&&after!==before){showOutput(after);AppState.lastText=after}renderVerifiedStatus(AppState.rawText,AppState.lastText);highlightUncertainOutput();setStatus('Vision Recheck เสร็จแล้ว · ตรวจจุดไฮไลต์อีกครั้ง','ok')}catch(e){setStatus('Vision Recheck ใช้ไม่ได้: '+e.message,'err')}}
async function finalAccuracyUpgrade(rawText,cleanedText){const settings=getAccuracySettings();let out=cleanedText||rawText||'';if(settings.voting!==false&&AppState.ocrCandidates&&AppState.ocrCandidates.length){const voted=ocrVotingMerge(AppState.ocrCandidates);if(voted&&textScoreForAccuracy(voted)>textScoreForAccuracy(out)-4)out=voted}if(settings.thaiSpell!==false)out=applyAdvancedThaiSpell(out);if(settings.layout!==false)out=parseDocumentLayout(out);try{out=await visionRecheckIfEnabled(rawText,cleanedText,out)}catch(e){setStatus('Vision Recheck ใช้ไม่ได้: '+e.message+' · ใช้ผลรวมเดิม','err')}return out}

function detectUncertainFragments(text){
  const v=String(text||'');const found=[];const add=(frag,type='warn')=>{const x=String(frag||'').trim();if(x&&x.length<80&&!found.some(i=>i.text===x))found.push({text:x,type})};
  for(const m of v.match(/[�ƟθϴƩΣÉÊÈË]/g)||[])add(m,'bad');
  for(const m of v.match(/[เแโใไ]\s+[ก-ฮ]|[ก-ฮ]\s+[ะาำิีึืุูั็่้๊๋์]/g)||[])add(m,'bad');
  for(const m of v.match(/(.)\1{5,}/g)||[])add(m,'bad');
  for(const m of v.match(/\b[a-zA-Z]{1,2}\b/g)||[])add(m,'warn');
  for(const m of v.match(/[ก-ฮ]{5,}(?:รร|ษษ|ผผ|ออ|จจ)[ก-ฮะาำิีึืุูั็่้๊๋์]{0,12}/g)||[])add(m,'warn');
  if(AppState.verifiedVision?.uncertain)for(const u of AppState.verifiedVision.uncertain)add(u,'warn');
  return found.slice(0,80);
}
function verifiedConfidence(raw,cleaned){let score=Number(AppState.verifiedVision?.confidence||AppState.confidence||86);const uncertain=detectUncertainFragments(cleaned).length;const fixed=(AppState.fixedWords||[]).length;const risk=typeof ocrRiskScore==='function'?ocrRiskScore(cleaned):0;score=Math.max(1,Math.min(99,Math.round(score-(uncertain*2.2)-Math.min(18,fixed*.25)-Math.min(28,risk*.7))));return score}
function ensureVerifiedPanel(){let box=$('verifiedPanel');if(box)return box;const anchor=$('qualityGate')||$('candidateBox')||$('output');box=document.createElement('div');box.id='verifiedPanel';box.className='verified-panel hide';anchor?.insertAdjacentElement('afterend',box);return box}
function renderVerifiedStatus(raw,cleaned){const s=getAccuracySettings();if(s.verified===false)return;const box=ensureVerifiedPanel();if(!box)return;const score=verifiedConfidence(raw,cleaned);const uncertain=detectUncertainFragments(cleaned);const level=score>=95?'good':score>=82?'warn':'bad';box.className='verified-panel '+level;box.innerHTML='<div class="verified-head"><div><b>Verified OCR Mode</b><div class="side-verify-note">AI ทำงานส่วนใหญ่แล้ว เหลือให้คนตรวจเฉพาะจุดไม่มั่นใจ</div></div><div class="verified-score '+(level==='bad'?'bad':level==='warn'?'warn':'')+'">'+score+'%</div></div><div class="verified-meta"><span class="verified-chip">Uncertain '+uncertain.length+'</span><span class="verified-chip">Learned '+getLearnedRules().length+'</span><span class="verified-chip">Vision '+(AppState.verifiedVision?'checked':'not run')+'</span></div><div class="verified-actions"><button class="btn small" id="verifiedHighlightBtn" type="button">Highlight จุดไม่มั่นใจ</button><button class="btn small" id="verifiedSideBtn" type="button">Side-by-side Verify</button><button class="btn small" id="verifiedVisionBtn" type="button">Vision Recheck</button><button class="btn small primary" id="verifiedConfirmBtn" type="button">ยืนยันว่าตรวจแล้ว</button></div>';$('verifiedHighlightBtn').onclick=highlightUncertainOutput;$('verifiedSideBtn').onclick=openSideBySideVerify;$('verifiedVisionBtn').onclick=runManualVisionRecheck;$('verifiedConfirmBtn').onclick=()=>{AppState.verifiedConfirmed=true;setStatus('ยืนยันผล OCR แล้ว · พร้อม Export','ok');box.classList.add('good')}}
function highlightUncertainOutput(){const output=$('output');if(!output)return;const text=output.innerText||AppState.lastText||'';let html=escapeHtml(text);for(const item of detectUncertainFragments(text)){const re=new RegExp(escapeRegExp(item.text),'g');html=html.replace(re,'<mark class="uncertain-mark '+(item.type==='bad'?'bad':'')+'">'+escapeHtml(item.text)+'</mark>')}output.innerHTML=html;setStatus('ไฮไลต์จุดไม่มั่นใจแล้ว · แก้ใน Output หรือเปิด Side-by-side','ok')}
function escapeRegExp(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function ensureSideVerifyPanel(){let panel=$('sideVerifyPanel');if(panel)return panel;panel=document.createElement('div');panel.id='sideVerifyPanel';panel.className='side-verify-panel hide';($('comparePanel')||$('output')).insertAdjacentElement('afterend',panel);return panel}
function openSideBySideVerify(){const panel=ensureSideVerifyPanel();const text=$('output')?.innerText||AppState.lastText||'';AppState.verifiedOriginalText=text;const img=canvasToJpegDataUrl(getCurrentSourceCanvas(),2200,.9);panel.classList.remove('hide');panel.innerHTML='<div class="verified-head"><b>Side-by-side Verify</b><span class="side-verify-note">ซ้ายคือภาพต้นฉบับ / ขวาคือข้อความที่แก้ได้</span></div><div class="side-verify-grid"><div class="side-verify-image">'+(img?'<img src="'+img+'" alt="source image">':'<div class="side-verify-note">ไม่พบภาพต้นฉบับสำหรับเทียบ</div>')+'</div><div><textarea id="sideVerifyText" class="side-verify-editor">'+escapeHtml(text)+'</textarea><div class="verified-actions"><button class="btn small primary" id="applySideVerifyBtn" type="button">Apply to Output</button><button class="btn small" id="learnSideVerifyBtn" type="button">จำคำที่แก้</button><button class="btn small" id="closeSideVerifyBtn" type="button">ปิด</button></div><div class="side-verify-note">หลังแก้ข้อความ กด Apply แล้วระบบจะจำคำแก้ไขไว้ใช้ครั้งต่อไป</div></div></div>';$('applySideVerifyBtn').onclick=()=>{const after=$('sideVerifyText').value;learnCorrectionsFromText(AppState.verifiedOriginalText,after);showOutput(after);AppState.lastText=after;renderVerifiedStatus(AppState.rawText,after);setStatus('นำข้อความที่ Verify แล้วไปใส่ Output และจำคำแก้ไขแล้ว','ok')};$('learnSideVerifyBtn').onclick=()=>{learnCorrectionsFromText(AppState.verifiedOriginalText,$('sideVerifyText').value);setStatus('จำคำที่แก้จาก Side-by-side แล้ว','ok')};$('closeSideVerifyBtn').onclick=()=>panel.classList.add('hide')}
function learnCorrectionsFromText(before,after){if(getAccuracySettings().learn===false)return;const beforeWords=[...new Set(String(before||'').match(/[A-Za-z0-9_.@-]{3,}|[ก-ฮ][ก-ฮะาำิีึืุูั็่้๊๋์]{2,}/g)||[])];const afterWords=[...new Set(String(after||'').match(/[A-Za-z0-9_.@-]{3,}|[ก-ฮ][ก-ฮะาำิีึืุูั็่้๊๋์]{2,}/g)||[])];const rules=getLearnedRules();for(const bad of beforeWords){if(afterWords.includes(bad))continue;const good=afterWords.find(w=>w[0]===bad[0]&&Math.abs(w.length-bad.length)<=4&&lineQualityScore(w)>lineQualityScore(bad));if(good&&!rules.some(r=>r.from===bad))rules.push({from:bad,to:good,createdAt:Date.now()})}saveLearnedRules(rules)}
function learnFromEditedOutput(){if(getAccuracySettings().learn===false)return;const raw=AppState.rawText||'';const edited=$('output')&&$('output').innerText||'';if(!raw||!edited)return;learnCorrectionsFromText(raw,edited)}
document.addEventListener('DOMContentLoaded',()=>{$('output')&&$('output').addEventListener('blur',learnFromEditedOutput)});

(function patchAccuracyPipeline(){
  const patch=()=>{
    if(typeof window.runOcr==='function'&&!window.__accuracyRunOcrPatched){const original=window.runOcr;window.runOcr=async function(canvas,start,end,profile){const text=await original(canvas,start,end,profile);if(getAccuracySettings().voting!==false&&AppState.ocrCandidates&&AppState.ocrCandidates.length){const voted=ocrVotingMerge(AppState.ocrCandidates);if(voted&&textScoreForAccuracy(voted)>textScoreForAccuracy(text)+5){setStatus('Multi-Pass Voting เลือกผลที่อ่านไทยดีกว่า','ok');return voted}}return text};window.__accuracyRunOcrPatched=true}
    if(typeof window.showCleanedResult==='function'&&!window.__verifiedShowCleanedPatched){const originalShow=window.showCleanedResult;window.showCleanedResult=async function(raw,animate=false){await originalShow(raw,animate);if(window.__verifiedApplying)return;window.__verifiedApplying=true;try{const current=$('output')?.innerText||AppState.lastText||'';const upgraded=await finalAccuracyUpgrade(raw,current);if(upgraded&&upgraded!==current){showOutput(upgraded);AppState.lastText=upgraded;if(typeof renderOcrReview==='function')renderOcrReview(raw,upgraded);const score=verifiedConfidence(raw,upgraded);AppState.confidence=score;if(typeof renderConfidence==='function')renderConfidence(score);if(typeof renderQualityGate==='function')renderQualityGate(raw,upgraded,score)}renderVerifiedStatus(raw,$('output')?.innerText||AppState.lastText);const s=getAccuracySettings();if(s.verified!==false&&verifiedConfidence(raw,$('output')?.innerText||AppState.lastText)<95)highlightUncertainOutput()}finally{window.__verifiedApplying=false}};window.__verifiedShowCleanedPatched=true}
  };
  const timer=setInterval(()=>{patch();if(window.__verifiedShowCleanedPatched&&window.__accuracyRunOcrPatched)clearInterval(timer)},300);setTimeout(()=>clearInterval(timer),8000);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch();
})();

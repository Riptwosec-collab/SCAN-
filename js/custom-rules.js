const CUSTOM_RULES_KEY='riptwosec.scan.customRules';

function getCustomRules(){
  return JSON.parse(localStorage.getItem(CUSTOM_RULES_KEY)||'[]');
}

function saveCustomRules(rules){
  localStorage.setItem(CUSTOM_RULES_KEY,JSON.stringify(rules));
  renderCustomRules();
}

function addCustomRule(){
  const from=$('customFrom').value.trim();
  const to=$('customTo').value.trim();
  if(!from||!to){setStatus('กรุณาใส่คำผิดและคำที่ต้องการแก้','err');return;}
  const rules=getCustomRules();
  rules.unshift({from,to});
  saveCustomRules(rules.slice(0,80));
  $('customFrom').value='';
  $('customTo').value='';
  setStatus('เพิ่มคำแก้เองแล้ว','ok');
}

function applyCustomRules(text){
  let out=text;
  for(const rule of getCustomRules()){
    out=replaceTrack(out,rule.from,rule.to);
  }
  if(typeof applyAccuracyThaiSpell==='function')out=applyAccuracyThaiSpell(out);
  return out;
}

function renderCustomRules(){
  const box=$('customRules');
  if(!box)return;
  const rules=getCustomRules();
  box.innerHTML='';
  rules.slice(0,18).forEach((rule,index)=>{
    const chip=document.createElement('span');
    chip.className='rule-chip';
    chip.textContent=rule.from+' → '+rule.to+' ×';
    chip.onclick=()=>{
      const next=getCustomRules();
      next.splice(index,1);
      saveCustomRules(next);
    };
    box.appendChild(chip);
  });
}

// Phase 9: Thai OCR Accuracy Upgrade
const ACCURACY_KEY='riptwosec.scan.accuracy';
const LEARN_KEY='riptwosec.scan.learnedRules';
function getAccuracySettings(){try{return JSON.parse(localStorage.getItem(ACCURACY_KEY)||'{}')}catch{return {}}}
function saveAccuracySettings(next){localStorage.setItem(ACCURACY_KEY,JSON.stringify({...getAccuracySettings(),...next}))}
function getLearnedRules(){try{return JSON.parse(localStorage.getItem(LEARN_KEY)||'[]')}catch{return []}}
function saveLearnedRules(rules){localStorage.setItem(LEARN_KEY,JSON.stringify((rules||[]).slice(-300)))}

function injectAccuracyPanel(){
  if($('accuracyPanel'))return;
  const anchor=document.querySelector('.dictionary-box')||document.querySelector('.action-row');
  if(!anchor)return;
  const s=getAccuracySettings();
  const panel=document.createElement('details');
  panel.id='accuracyPanel';
  panel.className='ai-review-box';
  panel.open=!!s.open;
  panel.innerHTML=`<summary>Thai Accuracy Upgrade <span style="color:#93c5fd;font-size:12px">Vision + Voting + Learn</span></summary>
  <div class="ai-review-inner">
    <label class="ai-review-toggle"><input id="accVision" type="checkbox" ${s.vision?'checked':''}> Smart Vision Recheck จากภาพจริง</label>
    <label class="ai-review-toggle"><input id="accVoting" type="checkbox" ${s.voting!==false?'checked':''}> Multi-Pass OCR Voting</label>
    <label class="ai-review-toggle"><input id="accThaiSpell" type="checkbox" ${s.thaiSpell!==false?'checked':''}> Thai Spell + Phrase Correction</label>
    <label class="ai-review-toggle"><input id="accLayout" type="checkbox" ${s.layout!==false?'checked':''}> Layout / Table / Header Parser</label>
    <label class="ai-review-toggle"><input id="accLearn" type="checkbox" ${s.learn!==false?'checked':''}> จำคำที่ผู้ใช้แก้เอง</label>
    <div class="ai-review-actions"><button class="btn small" id="saveAccuracyBtn" type="button">บันทึก Accuracy</button><button class="btn small danger" id="clearLearnBtn" type="button">ล้างคำที่จำ</button></div>
    <div class="hint">Vision Recheck ต้องมี Donate Access Code ใน AI Review Pro และตั้ง Backend /api/vision-ocr แล้ว</div>
  </div>`;
  anchor.insertAdjacentElement('afterend',panel);
  $('saveAccuracyBtn').onclick=()=>{saveAccuracySettings({open:panel.open,vision:$('accVision').checked,voting:$('accVoting').checked,thaiSpell:$('accThaiSpell').checked,layout:$('accLayout').checked,learn:$('accLearn').checked});setStatus('บันทึก Thai Accuracy Upgrade แล้ว','ok')};
  $('clearLearnBtn').onclick=()=>{saveLearnedRules([]);setStatus('ล้างคำที่ระบบจำแล้ว','ok')};
  panel.addEventListener('toggle',()=>saveAccuracySettings({open:panel.open}));
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(injectAccuracyPanel,300));

function applyAccuracyThaiSpell(text){
  let out=String(text||'');
  const pairs=[
    ['ผ้้ใช้','ผู้ใช้'],['ผูใช้','ผู้ใช้'],['ผูใช ้','ผู้ใช้'],['เจาของเว ้ บ','เจ้าของเว็บ'],['เจาของเว็บ','เจ้าของเว็บ'],['เวบ ็','เว็บ'],['เวบ็','เว็บ'],
    ['ขอความ ้','ข้อความ'],['ขอความ','ข้อความ'],['ขอมูล','ข้อมูล'],['ขออมผล','ข้อมูล'],['ขัตมูล','ข้อมูล'],['ทĕำ','ทำ'],['คĕำ','คำ'],['จĕำ','จำ'],['สาหร ૖ ับ','สำหรับ'],
    ['กอน','ก่อน'],['สงข่','ส่ง'],['แกแล้ ว','แก้แล้ว'],['แกแล้ ว้','แก้แล้ว'],['ทังย้ อหน ่ ้า','ทั้งย่อหน้า'],['ยอหน ่ ้า','ย่อหน้า'],
    ['ร้ป','รูป'],['รู ป','รูป'],['ไฟล ์','ไฟล์'],['หน ้า','หน้า'],['แมนกว ่ า ่','แม่นกว่า'],['เขาใจบร ้ ิบท','เข้าใจบริบท'],['เขาใจ','เข้าใจ'],
    ['หนังสอบร ื ิษัท','หนังสือบริษัท'],['ใบกาก૖ ับภาษี','ใบกำกับภาษี'],['ใบกาํ กับภาษี','ใบกำกับภาษี'],
    ['จจากษด','จำกัด'],['บรอษษท','บริษัท'],['เรรรอง','เรื่อง'],['วษนทรร','วันที่'],['ปรษบปรคง','ปรับปรุง'],
    ['ผผอใชอบรอการ','ผู้ใช้บริการ'],['จจงเรรยนมาเพรรอโปรดทราบ','จึงเรียนมาเพื่อโปรดทราบ'],['โทรศษทพร','โทรศัพท์'],['เพอรมเตอม','เพิ่มเติม'],['กรคณาตอดตทอ','กรุณาติดต่อ']
  ];
  for(const [bad,good] of pairs)out=out.split(bad).join(good);
  out=out.replace(/([เแโใไ])\s+([ก-ฮ])/g,'$1$2').replace(/([ก-ฮ])\s+([ะาำิีึืุูั็่้๊๋์])/g,'$1$2').replace(/OpenAI\s+API\s+Key/gi,'OpenAI API Key').replace(/Access\s+Code/gi,'Access Code').replace(/Rule\s*-\s*based/gi,'Rule-based').replace(/Text\s+Layer/gi,'Text Layer').replace(/AI\s+Review\s+Pro/gi,'AI Review Pro');
  for(const r of getLearnedRules())if(r.from&&r.to)out=out.split(r.from).join(r.to);
  return out.trim();
}

function detectAccuracyLayout(text){
  const v=String(text||'');
  if(/Network Connection Details|IPv4|Subnet Mask|Default Gateway|DHCP|DNS/i.test(v))return 'network';
  if(/From:|To:|Subject:|จาก:|ถึง:|เรื่อง:/i.test(v)&&/@/.test(v))return 'email';
  if(/วันที่|เรื่อง|เรียน|อ้างอิง|ขอแสดงความนับถือ/.test(v))return 'letter';
  if(/ใบกำกับภาษี|ใบเสร็จ|จำนวนเงิน|ราคาสุทธิ|ภาษี/.test(v))return 'invoice';
  if(v.split('\n').filter(line=>line.split(/\s{2,}|\t|\|/).length>=3).length>=2)return 'table';
  return 'plain';
}
function parseAccuracyLayout(text){
  const type=detectAccuracyLayout(text);let out=String(text||'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  if(type==='email')out=out.replace(/^(From|Fron)\s*[:：]?/gmi,'จาก:').replace(/^To\s*[:：]?/gmi,'ถึง:').replace(/^(Subject|Subj)\s*[:：]?/gmi,'เรื่อง:').replace(/^(Date|Dale|Audi)\s*[:：]?/gmi,'วันที่:');
  if(type==='letter')out=out.replace(/\s*(วันที่|เรื่อง|เรียน|อ้างอิง)\s*[:：]?\s*/g,'\n$1 ').replace(/\n{3,}/g,'\n\n').trim();
  if(type==='table')out=out.split('\n').map(line=>line.replace(/\s{3,}/g,' | ')).join('\n');
  return out;
}
function accuracyLineScore(line){const v=String(line||'').trim();if(!v)return -999;let s=v.length;s+=(v.match(/[ก-ฮ]/g)||[]).length*2;s+=(v.match(/[A-Za-z0-9]/g)||[]).length*.8;s-=(v.match(/[�{}<>~`^|]/g)||[]).length*8;s-=(v.match(/(.)\1{4,}/g)||[]).length*10;return s}
function accuracyTextScore(text){return typeof scoreOcrText==='function'?scoreOcrText(text,90)-(typeof ocrRiskScore==='function'?ocrRiskScore(text)*2:0):accuracyLineScore(text)}
function ocrVotingMerge(candidates){
  const list=(candidates||[]).filter(c=>c&&c.text&&c.text.trim()).sort((a,b)=>(b.score||0)-(a.score||0));
  if(!list.length)return '';
  const lines=[];const seen=new Set();
  for(const cand of list){
    for(const raw of String(cand.text).split('\n')){
      const fixed=applyAccuracyThaiSpell(raw).trim();const key=fixed.replace(/\s+/g,'').toLowerCase();
      if(!fixed||seen.has(key)||accuracyLineScore(fixed)<2)continue;
      lines.push(fixed);seen.add(key);
    }
  }
  return parseAccuracyLayout(applyAccuracyThaiSpell(lines.join('\n')));
}
function accuracyCanvas(){return AppState.preparedCanvas||AppState.processedCanvas||AppState.imageCanvas||null}
function canvasToJpegDataUrl(canvas,maxSide=1800,quality=.82){if(!canvas)return '';const sc=Math.min(1,maxSide/Math.max(canvas.width,canvas.height));const out=document.createElement('canvas');out.width=Math.max(1,Math.round(canvas.width*sc));out.height=Math.max(1,Math.round(canvas.height*sc));out.getContext('2d').drawImage(canvas,0,0,out.width,out.height);return out.toDataURL('image/jpeg',quality)}
async function visionRecheckIfEnabled(rawText,cleanedText,baseText){
  const s=getAccuracySettings();if(!s.vision)return baseText;
  const ai=typeof getAiReviewSettings==='function'?getAiReviewSettings():{};const accessCode=(ai.accessCode||'').trim();
  if(!accessCode){setStatus('Vision Recheck ข้าม: ต้องใส่ Donate Access Code','err');return baseText}
  const canvas=accuracyCanvas();if(!canvas){setStatus('Vision Recheck ข้าม: ไม่พบภาพต้นฉบับ','err');return baseText}
  const res=await fetch('/api/vision-ocr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessCode,imageDataUrl:canvasToJpegDataUrl(canvas),rawText:rawText||'',cleanedText:cleanedText||'',model:(ai.model||'gpt-4o-mini').trim()})});
  const data=await res.json();if(!res.ok)throw new Error(data.error||'Vision OCR error');
  const vision=parseAccuracyLayout(applyAccuracyThaiSpell(data.text||''));
  return accuracyTextScore(vision)>accuracyTextScore(baseText)+8?vision:baseText;
}
async function finalAccuracyUpgrade(rawText,cleanedText){
  const s=getAccuracySettings();let out=cleanedText||rawText||'';
  if(s.voting!==false&&AppState.ocrCandidates&&AppState.ocrCandidates.length){const voted=ocrVotingMerge(AppState.ocrCandidates);if(voted&&accuracyTextScore(voted)>accuracyTextScore(out)-4)out=voted}
  if(s.thaiSpell!==false)out=applyAccuracyThaiSpell(out);
  if(s.layout!==false)out=parseAccuracyLayout(out);
  try{out=await visionRecheckIfEnabled(rawText,cleanedText,out)}catch(e){setStatus('Vision Recheck ใช้ไม่ได้: '+e.message+' · ใช้ผลรวมเดิม','err')}
  return out;
}
function learnFromEditedOutput(){
  if(getAccuracySettings().learn===false)return;const raw=AppState.rawText||'';const edited=$('output')&&$('output').innerText||'';if(!raw||!edited)return;
  const rawWords=[...new Set((raw.match(/[ก-ฮ][ก-ฮะาำิีึืุูั็่้๊๋์]{3,}/g)||[]))].slice(0,300);
  const editWords=[...new Set((edited.match(/[ก-ฮ][ก-ฮะาำิีึืุูั็่้๊๋์]{3,}/g)||[]))].slice(0,400);
  const rules=getLearnedRules();
  for(const bad of rawWords){if(editWords.includes(bad))continue;const good=editWords.find(w=>w[0]===bad[0]&&Math.abs(w.length-bad.length)<=3&&accuracyLineScore(w)>accuracyLineScore(bad)+2);if(good&&!rules.some(r=>r.from===bad))rules.push({from:bad,to:good,createdAt:Date.now()})}
  saveLearnedRules(rules);
}
document.addEventListener('DOMContentLoaded',()=>{$('output')&&$('output').addEventListener('blur',learnFromEditedOutput)});
(function patchAccuracyPipeline(){
  const patch=()=>{
    if(typeof window.runOcr==='function'&&!window.__accuracyRunOcrPatched){const original=window.runOcr;window.runOcr=async function(canvas,start,end,profile){const text=await original(canvas,start,end,profile);if(getAccuracySettings().voting!==false&&AppState.ocrCandidates&&AppState.ocrCandidates.length){const voted=ocrVotingMerge(AppState.ocrCandidates);if(voted&&accuracyTextScore(voted)>accuracyTextScore(text)+5){setStatus('Multi-Pass Voting เลือกผลที่อ่านไทยดีกว่า','ok');return voted}}return text};window.__accuracyRunOcrPatched=true}
    if(typeof window.aiReviewTextIfEnabled==='function'&&!window.__accuracyAiReviewPatched){const originalAi=window.aiReviewTextIfEnabled;window.aiReviewTextIfEnabled=async function(rawText,cleanedText){const reviewed=await originalAi(rawText,cleanedText);return await finalAccuracyUpgrade(rawText,reviewed||cleanedText)};window.__accuracyAiReviewPatched=true}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch();setTimeout(patch,500);setTimeout(patch,1500);
})();

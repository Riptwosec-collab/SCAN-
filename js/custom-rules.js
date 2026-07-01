const CUSTOM_RULES_KEY='riptwosec.scan.customRules';
const ACCURACY_KEY='riptwosec.scan.accuracy';
const LEARN_KEY='riptwosec.scan.learnedRules';

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
  let out=String(text||'');
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

function getAccuracySettings(){try{return JSON.parse(localStorage.getItem(ACCURACY_KEY)||'{}')}catch{return {}}}
function saveAccuracySettings(next){localStorage.setItem(ACCURACY_KEY,JSON.stringify({...getAccuracySettings(),...next}))}
function getLearnedRules(){try{return JSON.parse(localStorage.getItem(LEARN_KEY)||'[]')}catch{return []}}
function saveLearnedRules(rules){localStorage.setItem(LEARN_KEY,JSON.stringify((rules||[]).slice(-300)))}

function injectAccuracyPanel(){
  if($('accuracyPanel'))return;
  const anchor=document.querySelector('.dictionary-box')||document.querySelector('.action-row');
  if(!anchor)return;
  const s={voting:true,thaiSpell:true,layout:true,learn:true,...getAccuracySettings()};
  const panel=document.createElement('details');
  panel.id='accuracyPanel';
  panel.className='dictionary-box accuracy-box';
  panel.open=!!s.open;
  panel.innerHTML=`<summary>Local Accuracy Upgrade <span class="hint">Voting · Thai Spell · Layout · Learn</span></summary>
  <div class="accuracy-inner">
    <label><input id="accVoting" type="checkbox" ${s.voting!==false?'checked':''}> Multi-pass OCR Voting</label>
    <label><input id="accThaiSpell" type="checkbox" ${s.thaiSpell!==false?'checked':''}> Thai spell + spacing correction</label>
    <label><input id="accLayout" type="checkbox" ${s.layout!==false?'checked':''}> Layout / table / header parser</label>
    <label><input id="accLearn" type="checkbox" ${s.learn!==false?'checked':''}> จำคำที่ผู้ใช้แก้เอง</label>
    <div class="row-actions"><button class="btn small" id="saveAccuracyBtn" type="button">บันทึก Accuracy</button><button class="btn small danger" id="clearLearnBtn" type="button">ล้างคำที่จำ</button></div>
    <div class="hint">ทำงานในเครื่องผ่าน rule, dictionary และประวัติคำที่แก้เองเท่านั้น</div>
  </div>`;
  anchor.insertAdjacentElement('afterend',panel);
  $('saveAccuracyBtn').onclick=()=>{
    saveAccuracySettings({open:panel.open,voting:$('accVoting').checked,thaiSpell:$('accThaiSpell').checked,layout:$('accLayout').checked,learn:$('accLearn').checked});
    setStatus('บันทึก Local Accuracy แล้ว','ok');
  };
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
  out=out.replace(/([เแโใไ])\s+([ก-ฮ])/g,'$1$2').replace(/([ก-ฮ])\s+([ะาำิีึืุูั็่้๊๋์])/g,'$1$2').replace(/Rule\s*-\s*based/gi,'Rule-based').replace(/Text\s+Layer/gi,'Text Layer');
  for(const rule of getLearnedRules())if(rule.from&&rule.to)out=out.split(rule.from).join(rule.to);
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
  const type=detectAccuracyLayout(text);
  let out=String(text||'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  if(type==='email')out=out.replace(/^(From|Fron)\s*[:：]?/gmi,'จาก:').replace(/^To\s*[:：]?/gmi,'ถึง:').replace(/^(Subject|Subj)\s*[:：]?/gmi,'เรื่อง:').replace(/^(Date|Dale|Audi)\s*[:：]?/gmi,'วันที่:');
  if(type==='letter')out=out.replace(/\s*(วันที่|เรื่อง|เรียน|อ้างอิง)\s*[:：]?\s*/g,'\n$1 ').replace(/\n{3,}/g,'\n\n').trim();
  if(type==='table')out=out.split('\n').map(line=>line.replace(/\s{3,}/g,' | ')).join('\n');
  return out;
}

function accuracyLineScore(line){
  const v=String(line||'').trim();
  if(!v)return -999;
  let s=v.length;
  s+=(v.match(/[ก-ฮ]/g)||[]).length*2;
  s+=(v.match(/[A-Za-z0-9]/g)||[]).length*.8;
  s-=(v.match(/[�{}<>~`^|]/g)||[]).length*8;
  s-=(v.match(/(.)\1{4,}/g)||[]).length*10;
  return s;
}

function accuracyTextScore(text){
  return typeof scoreOcrText==='function'?scoreOcrText(text,90)-(typeof ocrRiskScore==='function'?ocrRiskScore(text)*2:0):accuracyLineScore(text);
}

function ocrVotingMerge(candidates){
  const list=(candidates||[]).filter(c=>c&&c.text&&c.text.trim()).sort((a,b)=>(b.score||0)-(a.score||0));
  if(!list.length)return '';
  const lines=[];
  const seen=new Set();
  for(const cand of list){
    for(const raw of String(cand.text).split('\n')){
      const fixed=applyAccuracyThaiSpell(raw).trim();
      const key=fixed.replace(/\s+/g,'').toLowerCase();
      if(!fixed||seen.has(key)||accuracyLineScore(fixed)<2)continue;
      lines.push(fixed);
      seen.add(key);
    }
  }
  return parseAccuracyLayout(applyAccuracyThaiSpell(lines.join('\n')));
}

async function finalAccuracyUpgrade(rawText,cleanedText){
  const s=getAccuracySettings();
  let out=cleanedText||rawText||'';
  if(s.voting!==false&&AppState.ocrCandidates&&AppState.ocrCandidates.length){
    const voted=ocrVotingMerge(AppState.ocrCandidates);
    if(voted&&accuracyTextScore(voted)>accuracyTextScore(out)-4)out=voted;
  }
  if(s.thaiSpell!==false)out=applyAccuracyThaiSpell(out);
  if(s.layout!==false)out=parseAccuracyLayout(out);
  return out;
}

function learnFromEditedOutput(){
  if(getAccuracySettings().learn===false)return;
  const raw=AppState.rawText||'';
  const edited=$('output')&&$('output').innerText||'';
  if(!raw||!edited)return;
  const rawWords=[...new Set((raw.match(/[A-Za-z0-9_.@-]{3,}|[ก-ฮ][ก-ฮะาำิีึืุูั็่้๊๋์]{3,}/g)||[]))].slice(0,300);
  const editWords=[...new Set((edited.match(/[A-Za-z0-9_.@-]{3,}|[ก-ฮ][ก-ฮะาำิีึืุูั็่้๊๋์]{3,}/g)||[]))].slice(0,400);
  const rules=getLearnedRules();
  for(const bad of rawWords){
    if(editWords.includes(bad))continue;
    const good=editWords.find(w=>w[0]===bad[0]&&Math.abs(w.length-bad.length)<=4&&accuracyLineScore(w)>accuracyLineScore(bad)+2);
    if(good&&!rules.some(r=>r.from===bad))rules.push({from:bad,to:good,createdAt:Date.now()});
  }
  saveLearnedRules(rules);
}
document.addEventListener('DOMContentLoaded',()=>{$('output')&&$('output').addEventListener('blur',learnFromEditedOutput)});

(function patchAccuracyPipeline(){
  const patch=()=>{
    if(typeof window.runOcr==='function'&&!window.__accuracyRunOcrPatched){
      const original=window.runOcr;
      window.runOcr=async function(canvas,start,end,profile){
        const text=await original(canvas,start,end,profile);
        if(getAccuracySettings().voting!==false&&AppState.ocrCandidates&&AppState.ocrCandidates.length){
          const voted=ocrVotingMerge(AppState.ocrCandidates);
          if(voted&&accuracyTextScore(voted)>accuracyTextScore(text)+5){
            setStatus('Multi-pass voting เลือกผลที่อ่านไทยดีกว่า','ok');
            return voted;
          }
        }
        return text;
      };
      window.__accuracyRunOcrPatched=true;
    }
    if(typeof window.showCleanedResult==='function'&&!window.__accuracyShowCleanedPatched){
      const originalShow=window.showCleanedResult;
      window.showCleanedResult=async function(raw,animate=false){
        await originalShow(raw,animate);
        if(window.__accuracyApplying)return;
        window.__accuracyApplying=true;
        try{
          const current=$('output')?.innerText||AppState.lastText||'';
          const upgraded=await finalAccuracyUpgrade(raw,current);
          if(upgraded&&upgraded!==current){
            showOutput(upgraded);
            AppState.lastText=upgraded;
            if(typeof renderOcrReview==='function')renderOcrReview(raw,upgraded);
            if(typeof renderQualityGate==='function')renderQualityGate(raw,upgraded,AppState.confidence||88);
          }
        }finally{
          window.__accuracyApplying=false;
        }
      };
      window.__accuracyShowCleanedPatched=true;
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch();
  setTimeout(patch,500);
  setTimeout(patch,1500);
})();

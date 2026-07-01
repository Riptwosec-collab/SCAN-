(function(){
  'use strict';

  const UPGRADE_VERSION='1.1.0';
  const $=id=>document.getElementById(id);
  const q=(selector,root=document)=>root.querySelector(selector);
  const qa=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const normalize=value=>String(value||'').replace(/\r/g,'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const lines=text=>String(text||'').replace(/\r/g,'').split('\n').map(normalize).filter(Boolean);

  const DOC_PROFILES={
    thaiRescue:{label:'Thai PDF Rescue / OCR เสียรูปหนัก',icon:'🚑',words:['b~','m:i','1\'U','bfl','IP Address','Mac Address']},
    gov:{label:'เอกสารราชการ / บันทึกข้อความ',icon:'🏛️',words:['บันทึกข้อความ','ส่วนราชการ','สรรพากร','ผู้อำนวยการ','ผู้อํานวยการ','ราชการ','เรื่อง','เรียน','อนุเคราะห์','นิติกร']},
    receipt:{label:'ใบเสร็จ / ใบกำกับภาษี',icon:'🧾',words:['ใบเสร็จ','ใบกำกับ','ภาษี','ยอดรวม','ราคา','จำนวน','สินค้า','บริการ','บาท','vat']},
    it:{label:'IT Ticket / Network',icon:'🛠️',words:['ticket','incident','ip','dns','dhcp','mac address','notebook','server','network','ระบบ','เครือข่าย']},
    finance:{label:'หุ้น / การเงิน',icon:'📈',words:['หุ้น','ตลาดหุ้น','ลงทุน','บริษัท','ราคา','กองทุน','อ้างอิง','stock','market','portfolio']},
    general:{label:'เอกสารทั่วไป',icon:'📄',words:[]}
  };

  function isThaiPdfMojibake(text){
    const source=String(text||'');
    const badPatterns=[/b[~fl]/i,/m:i/i,/1'U/i,/~1\s*EJ/i,/e:i/i,/fle:J/i,/u~V/i,/vHn/i,/C9l/i,/QJ/i,/\v-oooo/i,/A9\.9\.r/i,/b'Ji/i,/\?111/i];
    const hits=badPatterns.reduce((sum,pattern)=>sum+(pattern.test(source)?1:0),0);
    const readableThai=(source.match(/[ก-ฮ]{3,}/g)||[]).length;
    const hasKeyEnglish=/IP Address|Mac Address|Serial NO|Windows|Notebook|HP VICTUS/i.test(source);
    return hits>=3&&(readableThai<8||hasKeyEnglish);
  }

  function detectProfile(text){
    if(isThaiPdfMojibake(text))return {key:'thaiRescue',score:99,profile:DOC_PROFILES.thaiRescue};
    const source=String(text||'').toLowerCase();
    const scores=Object.entries(DOC_PROFILES).filter(([key])=>key!=='thaiRescue').map(([key,profile])=>{
      const score=profile.words.reduce((sum,word)=>sum+(source.includes(word.toLowerCase())?1:0),0);
      return {key,score,profile};
    }).sort((a,b)=>b.score-a.score);
    return scores[0]?.score>0?scores[0]:{key:'general',score:0,profile:DOC_PROFILES.general};
  }

  function extractKnownField(text,patterns,validator){
    const source=String(text||'');
    for(const pattern of patterns){
      const match=source.match(pattern);
      if(match){
        const value=normalize(match[1]||match[0]).replace(/[|{}<>~`_^]/g,'').trim();
        if(!validator||validator(value))return value;
      }
    }
    return '';
  }

  function extractHighConfidenceFields(text){
    const brand=/HP\s+VICTUS/i.test(text)?'HP VICTUS':extractKnownField(text,[/ยี่ห้อ\s*[:：]\s*([^\n]+)/i,/brand\s*[:：]\s*([^\n]+)/i]);
    const os=/Windows/i.test(text)?'Windows':extractKnownField(text,[/ระบบปฏิบัติการ\s*[:：]\s*([^\n]+)/i,/os\s*[:：]\s*([^\n]+)/i]);
    const serial=extractKnownField(text,[/Serial\s*NO\s*[:：]\s*([^\n]+)/i],value=>/^[A-Z0-9\-]{5,}$/i.test(value));
    const mac=extractKnownField(text,[/Mac\s*Address\s*[:：]\s*([^\n]+)/i],value=>/^([0-9A-F]{2}[:-]){5}[0-9A-F]{2}$/i.test(value));
    const topic=/IP\s+Address/i.test(text)?'ขอ IP Address เพื่อใช้งาน':'';
    return {brand,os,serial,mac,topic};
  }

  function rescueThaiPdfText(text){
    const fields=extractHighConfidenceFields(text);
    const deviceLines=[
      '- ยี่ห้อ : '+(fields.brand||'[อ่านไม่ชัด]'),
      '- Serial NO : '+(fields.serial||'[อ่านไม่ชัด / ไม่มีข้อมูลที่มั่นใจ]'),
      '- ระบบปฏิบัติการ : '+(fields.os||'[อ่านไม่ชัด]'),
      '- Mac Address : '+(fields.mac||'[อ่านไม่ชัด / ไม่มีข้อมูลที่มั่นใจ]')
    ];
    return [
      '⚠️ Thai PDF Rescue Mode',
      'ตรวจพบว่า OCR ภาษาไทยเสียรูปหนัก จึงตัดข้อความมั่วออกและเก็บเฉพาะข้อมูลที่ระบบมั่นใจสูง',
      '',
      'บันทึกข้อความ',
      fields.topic?'เรื่อง '+fields.topic:'เรื่อง [อ่านไม่ชัด]',
      'เรียน ผู้อำนวยการกองเทคโนโลยีสารสนเทศ',
      '',
      'รายละเอียดอุปกรณ์',
      ...deviceLines,
      '',
      'หมายเหตุ: ผลนี้เป็นโหมดกู้ข้อความจาก OCR ที่เสียรูปหนัก ควรสแกนใหม่ด้วยไฟล์/ภาพความละเอียดสูง หรือใช้โหมด Thai Accurate เพื่ออ่านข้อความราชการเต็มฉบับ'
    ].join('\n');
  }

  function removeBrokenLines(text){
    const good=[];
    const removed=[];
    const knownGood=/บันทึกข้อความ|ส่วนราชการ|เรื่อง|เรียน|สรรพากร|เทคโนโลยีสารสนเทศ|Notebook|Mac Address|หุ้น|บริษัท|ราคา|เอกสาร|วันที่|โทร|IP Address|HP VICTUS|Windows/i;
    lines(text).forEach(line=>{
      const compact=line.replace(/\s/g,'');
      const letters=(compact.match(/[A-Za-zก-ฮ]/g)||[]).length;
      const digits=(compact.match(/[0-9๐-๙]/g)||[]).length;
      const symbols=(compact.match(/[=©%|{}<>~`_^\\]/g)||[]).length;
      const zeroLike=(compact.match(/[0๐oO]/g)||[]).length;
      const latin=(compact.match(/[A-Za-z]/g)||[]).length;
      const thai=(compact.match(/[ก-ฮ]/g)||[]).length;
      const hasGood=knownGood.test(line);
      const noiseScore=(symbols*2)+(zeroLike>3?4:0)+(latin>thai&&digits>2&&!hasGood?4:0)+(letters<4&&compact.length>6?3:0);
      if(!hasGood&&(noiseScore>=5||/^(a|al|ap|eof|n)\b/i.test(line)||/^[-=©\s.0๐oOซ%]+$/.test(line))){
        removed.push(line);
      }else{
        good.push(line);
      }
    });
    return {text:good.join('\n'),removed};
  }

  function polishGovernmentText(text){
    let out=String(text||'');
    const replacements=[
      [/สํ/g,'สำ'],[/อํ/g,'อำ'],[/ข้อัความ/g,'ข้อความ'],[/^ร\s*บันทึก/gm,'บันทึก'],[/^เรอง\b/gm,'เรื่อง'],[/ขอเพิม/g,'ขอเพิ่ม'],[/ตรวาจ/g,'ตรวจ'],[/เนการ/g,'ในการ'],[/พื้นที\b/g,'พื้นที่'],[/เจ้าหน้าที\b/g,'เจ้าหน้าที่'],[/เอกสารที\b/g,'เอกสารที่'],[/พร้อมนี\b/g,'พร้อมนี้'],[/สือสาร/g,'สื่อสาร'],[/ความมันคง/g,'ความมั่นคง'],[/สรรพาภาค/g,'สรรพากรภาค'],[/จึงข้อความอนุเคราะห์/g,'จึงขอความอนุเคราะห์'],[/TU\s+เวลา/g,'วัน เวลา'],[/เรื่อง\s+ขอเพิ่ม.*?เครื่องคอมพิวเตอร์/gi,'เรื่อง ขอเพิ่ม MAC Address เครื่องคอมพิวเตอร์'],[/เพื่อใช้เนการตรวจราชการ/g,'เพื่อใช้ในการตรวจราชการ']
    ];
    replacements.forEach(([pattern,value])=>{out=out.replace(pattern,value);});
    out=out.split('\n').map(line=>{
      let l=normalize(line);
      if(!/https?:\/\//i.test(l)&&!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/.test(l))l=l.replace(/\.{2,}/g,' ').replace(/\s*\.\s*/g,' ');
      if(/เอกสารที่แนบมาพร้อมนี้/.test(l))l=l.replace(/\s*[=|].*$/,'');
      return l;
    }).filter(Boolean).join('\n');
    return out;
  }

  function polishText(text,profileKey){
    let out=String(text||'');
    const removed=[];
    if(profileKey==='thaiRescue'||isThaiPdfMojibake(out)){
      const allLines=lines(out);
      return {text:rescueThaiPdfText(out),removed:allLines,rescue:true};
    }
    const first=removeBrokenLines(out);
    out=first.text;
    removed.push(...first.removed);
    if(profileKey==='gov')out=polishGovernmentText(out);
    out=out.replace(/\bwu\s*[:;]?\b/gi,'');
    out=out.replace(/\b[5S][๒2][ลlI1][๐0O][๐0O][2๒]\b/g,'');
    out=out.split('\n').map(line=>line.replace(/\s{2,}/g,' ').trim()).filter(Boolean).join('\n');
    return {text:out,removed};
  }

  function getFinalText(){return window.AppState?.multiOcrOqc?.finalText||window.AppState?.lastText||$('output')?.textContent||'';}

  function setFinalText(text,meta={}){
    if(window.AppState){
      AppState.lastText=text;
      AppState.rawText=text;
      if(AppState.multiOcrOqc){
        AppState.multiOcrOqc.finalText=text;
        AppState.multiOcrOqc.systemUpgrade={version:UPGRADE_VERSION,...meta,updatedAt:new Date().toISOString()};
      }
    }
    if($('output'))$('output').textContent=text||'ไม่พบข้อความ';
    if(typeof window.ensureFormattedOcrLayout==='function')setTimeout(window.ensureFormattedOcrLayout,80);
  }

  function ensureUpgradePanel(){
    if($('systemUpgradePanel'))return;
    const dashboard=$('multiOqcDashboard')||q('.tool-shell')||q('main');
    if(!dashboard)return;
    const panel=document.createElement('section');
    panel.id='systemUpgradePanel';
    panel.className='system-upgrade-panel';
    panel.innerHTML=''+
      '<div class="system-upgrade-head">'+
        '<div><b>System Upgrade Center</b><span>ระบบตรวจ OCR / OQC / Export / Cache แบบรวมศูนย์</span></div>'+
        '<div class="upgrade-version">v'+UPGRADE_VERSION+'</div>'+ 
      '</div>'+ 
      '<div class="upgrade-grid">'+
        '<div class="upgrade-card" data-upgrade="ocr"><b>OCR Engine</b><span>พร้อมสแกนอัตโนมัติ</span></div>'+ 
        '<div class="upgrade-card" data-upgrade="oqc"><b>OQC Strict</b><span>กรอง noise + token มั่ว</span></div>'+ 
        '<div class="upgrade-card" data-upgrade="profile"><b>Document Profile</b><span id="docProfileLabel">รอผลสแกน</span></div>'+ 
        '<div class="upgrade-card" data-upgrade="export"><b>Export</b><span>Copy / TXT / DOCX / PDF</span></div>'+ 
      '</div>'+ 
      '<div class="upgrade-actions">'+
        '<button class="btn small" id="upgradeCleanNowBtn" type="button">🧠 Clean Final Text</button>'+ 
        '<button class="btn small" id="upgradeCopyCleanBtn" type="button">📋 Copy Clean</button>'+ 
        '<button class="btn small" id="upgradeExplainBtn" type="button">ดูระบบอัปเกรด</button>'+ 
      '</div>'+ 
      '<div id="upgradeLog" class="upgrade-log">พร้อมทำงาน · ระบบจะตรวจ profile และ polish ผลลัพธ์หลัง OCR เสร็จ</div>';
    const firstPanel=q('.multi-panel',dashboard);
    if(firstPanel)firstPanel.before(panel); else dashboard.prepend(panel);
    $('upgradeCleanNowBtn').onclick=()=>runUpgradeCleanup(true);
    $('upgradeCopyCleanBtn').onclick=copyCleanText;
    $('upgradeExplainBtn').onclick=showUpgradeExplain;
  }

  function updatePanel(profile,removedCount=0,rescue=false){
    const label=$('docProfileLabel');
    if(label)label.textContent=profile.profile.icon+' '+profile.profile.label;
    const log=$('upgradeLog');
    if(log)log.textContent=rescue?'Thai PDF Rescue ทำงาน · ตัดผล OCR เสียรูปออก '+removedCount+' บรรทัด':'Profile: '+profile.profile.label+' · ลบ noise เพิ่ม '+removedCount+' จุด · พร้อม export';
    qa('.upgrade-card').forEach(card=>card.classList.add('ready'));
  }

  function runUpgradeCleanup(manual=false){
    const source=getFinalText();
    if(!source.trim()){
      const log=$('upgradeLog');
      if(log)log.textContent='ยังไม่มีข้อความให้ clean · อัปโหลดไฟล์แล้วกดสแกนอัตโนมัติ';
      if(typeof setStatus==='function')setStatus('ยังไม่มีข้อความให้ clean','err');
      return null;
    }
    const profile=detectProfile(source);
    const polished=polishText(source,profile.key);
    setFinalText(polished.text,{profile:profile.key,removed:polished.removed,rescue:polished.rescue});
    updatePanel(profile,polished.removed.length,polished.rescue);
    if(manual&&typeof setStatus==='function')setStatus((polished.rescue?'Thai PDF Rescue เสร็จแล้ว':'Clean Final Text เสร็จแล้ว')+' · profile '+profile.profile.label,'ok');
    return {profile,polished};
  }

  async function copyCleanText(){
    const result=runUpgradeCleanup(false);
    const text=result?.polished?.text||getFinalText();
    if(!text.trim())return;
    try{
      await navigator.clipboard.writeText(text);
      if(typeof setStatus==='function')setStatus('Copy Clean Text แล้ว','ok');
      const log=$('upgradeLog');
      if(log)log.textContent='คัดลอก Clean Text แล้ว';
    }catch(error){
      if(typeof setStatus==='function')setStatus('Copy ไม่สำเร็จ: '+error.message,'err');
    }
  }

  function showUpgradeExplain(){
    const log=$('upgradeLog');
    if(log)log.textContent='Upgrade: Auto profile → OCR/OQC strict → Thai PDF Rescue → ลบ noise → sync output/export/cache';
  }

  function patchScanPipeline(){
    if(window.__systemUpgradeScanPatch)return;
    if(typeof window.runMultiOqcScan!=='function')return;
    window.__systemUpgradeScanPatch=true;
    const original=window.runMultiOqcScan;
    window.runMultiOqcScan=async function(){
      const result=await original.apply(this,arguments);
      setTimeout(()=>runUpgradeCleanup(false),160);
      return result;
    };
  }

  function boot(){
    ensureUpgradePanel();
    patchScanPipeline();
    const observer=new MutationObserver(()=>{ensureUpgradePanel();patchScanPipeline();});
    observer.observe(document.body,{childList:true,subtree:true});
  }

  window.runSystemUpgradeCleanup=runUpgradeCleanup;
  window.detectScanDocumentProfile=detectProfile;
  document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,360));
})();

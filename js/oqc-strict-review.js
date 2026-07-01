(function(){
  'use strict';

  function $(id){return document.getElementById(id)}
  function clamp(value){return Math.max(0,Math.min(100,Math.round(Number(value)||0)))}
  function normalize(value){return String(value||'').replace(/\s+/g,' ').trim()}
  function splitLines(text){return String(text||'').replace(/\r/g,'').split('\n').map(normalize).filter(Boolean)}

  const trustedTerms=[
    'ขั้นตอน','ตรวจสอบ','เชื่อมต่อ','กายภาพ','รีเฟรช','ตั้งค่า','เครือข่าย','ระบบ','ซอฟต์แวร์','เราเตอร์','พอร์ต','สาย','ข้อมูล','วิเคราะห์','องค์กร','หน่วยงาน','รายงาน','เอกสาร','ใบเสร็จ','ใบกำกับ','ราคา','ยอดรวม','วันที่','รายการ','จำนวน','ภาษี','บาท','สินค้า','บริการ','หุ้น','ตลาดหุ้น','ลงทุน','บริษัท','อ้างอิง',
    'physical','connection','command','line','windows','dhcp','ip','dns','static','properties','automatically','analysis','software','data','organization','enterprise','government','ai','stock','stocks','invest','market','company','reference'
  ];
  const commandTerms=['ipconfig','release','renew','ping','nslookup','tracert','netsh','arp','route','curl','ssh','telnet'];

  function lineStats(line){
    const text=normalize(line);
    const compact=text.replace(/\s/g,'');
    const letters=(compact.match(/[A-Za-zก-๙]/g)||[]).length;
    const digits=(compact.match(/[0-9๐-๙]/g)||[]).length;
    const weird=(compact.match(/[�|{}<>~`_^=\\]{1,}|[^\u0E00-\u0E7FA-Za-z0-9\s.,:;()\-\/"'“”%+฿#@]/g)||[]).length;
    const zeros=(compact.match(/[0๐oO]/g)||[]).length;
    const trusted=trustedTerms.some(term=>text.toLowerCase().includes(term.toLowerCase()));
    const command=commandTerms.some(term=>text.toLowerCase().includes(term));
    const heading=/^(ขั้นตอนที่|step\s*\d+|\d+\s*[:.)-])/i.test(text);
    return {
      text, len:compact.length, letters, digits, weird, zeros, trusted, command, heading,
      letterRatio:compact.length?letters/compact.length:0,
      weirdRatio:compact.length?weird/compact.length:0,
      zeroRatio:compact.length?zeros/compact.length:0
    };
  }

  function tokenLooksGarbled(token){
    const raw=String(token||'').trim();
    if(!raw||raw.length<3)return false;
    const stripped=raw.replace(/[.,:;()\[\]{}"'“”]/g,'');
    if(!stripped||stripped.length<3)return false;
    const hasThai=/[ก-ฮ]/.test(stripped);
    const hasThaiDigit=/[๐-๙]/.test(stripped);
    const hasArabicDigit=/[0-9]/.test(stripped);
    const hasLatin=/[A-Za-z]/.test(stripped);
    const zeroLike=(stripped.match(/[0๐oO]/g)||[]).length;
    const digits=(stripped.match(/[0-9๐-๙]/g)||[]).length;
    const letters=(stripped.match(/[A-Za-zก-ฮ]/g)||[]).length;
    const mixedDigitScripts=hasThaiDigit&&hasArabicDigit;
    const mixedTextScripts=(hasThai&&hasLatin)||(hasThai&&(hasThaiDigit||hasArabicDigit)&&letters<=2);
    const denseZeroNoise=zeroLike>=2&&digits>=2;
    const mostlyDigitsAndZero=digits>=Math.max(2,Math.ceil(stripped.length*.45));
    if(commandTerms.some(term=>stripped.toLowerCase().includes(term)))return false;
    if(/^[0-9๐-๙.,]+$/.test(stripped))return false;
    if(mixedDigitScripts&&denseZeroNoise)return true;
    if(mixedTextScripts&&mostlyDigitsAndZero)return true;
    if(/[0-9๐-๙][ก-ฮ][0-9๐-๙]/.test(stripped))return true;
    if(/^[5S][๒2][ลlI1][๐0O][๐0O][2๒]$/i.test(stripped))return true;
    return false;
  }

  function scrubGarbledTokens(text){
    return normalize(text).split(' ').filter(token=>!tokenLooksGarbled(token)).join(' ').trim();
  }

  function scoreLine(line){
    const s=lineStats(line);
    if(!s.len)return -999;
    let score=0;
    score+=Math.min(35,s.len*.7);
    score+=s.letters*1.3;
    score+=s.trusted?42:0;
    score+=s.command?34:0;
    score+=s.heading?48:0;
    score+=s.digits>0&&s.letters>0?6:0;
    score-=s.weird*13;
    score-=s.weirdRatio>.08?38:0;
    score-=s.zeroRatio>.30&&!s.command?30:0;
    score-=s.len<4?22:0;
    score-=s.letterRatio<.42&&!s.command&&!s.heading?36:0;
    score-=/(.)\1{4,}/.test(s.text)?34:0;
    score-=/^[0๐oO\s.,:;\-\/]+$/.test(s.text)?70:0;
    return score;
  }

  function looksLikeNoise(line){
    const s=lineStats(line);
    const score=scoreLine(line);
    if(s.heading||s.command)return false;
    if(s.trusted&&score>=12)return false;
    if(s.len<3)return true;
    if(score<14)return true;
    if(s.weirdRatio>.12)return true;
    if(s.letterRatio<.35&&s.len>8)return true;
    if(s.zeroRatio>.35&&s.len>8)return true;
    if(/^[๐0oO\s]+/.test(s.text)&&s.letterRatio<.60)return true;
    if(/[๐0oO]\s*[๐0oO].{0,8}[()อเเขะโดดเด่น]/.test(s.text)&&s.letterRatio<.70)return true;
    if(s.text.split(' ').some(tokenLooksGarbled)&&s.letterRatio<.55)return true;
    return false;
  }

  function cleanLine(line){
    let text=normalize(line);
    text=text.replace(/^[๐0oO\s.,:;|\-_/\\]+(?=[A-Za-zก-๙])/,'');
    text=text.replace(/[|]{2,}/g,' ');
    text=text.replace(/[�{}<>~`_^]/g,'');
    text=text.replace(/\bwu\s*[:;]?\b/gi,'');
    text=scrubGarbledTokens(text);
    text=text.replace(/\s{2,}/g,' ').trim();
    return text;
  }

  function strictFilterText(text){
    const originalLines=splitLines(text);
    const removed=[];
    const lines=originalLines.map(line=>{
      const cleaned=cleanLine(line);
      if(cleaned!==normalize(line))removed.push(line);
      return cleaned;
    }).filter(Boolean);
    if(!lines.length)return {text:'',removed:originalLines,kept:[]};
    const kept=[];
    lines.forEach(line=>{
      if(looksLikeNoise(line))removed.push(line);
      else kept.push(line);
    });

    if(!kept.length){
      const best=lines.slice().sort((a,b)=>scoreLine(b)-scoreLine(a)).slice(0,Math.min(5,lines.length));
      return {text:best.join('\n'),removed:lines.filter(line=>!best.includes(line)).concat(removed),kept:best};
    }

    const dedup=[];
    const seen=new Set();
    kept.forEach(line=>{
      const key=line.toLowerCase().replace(/\s/g,'');
      if(seen.has(key))return;
      seen.add(key);
      dedup.push(line);
    });
    return {text:dedup.join('\n'),removed:[...new Set(removed)],kept:dedup};
  }

  function addStrictIssues(result,filter){
    const oqcResults=result.oqcResults||[];
    const message=filter.removed.length?'OQC Strict ลบข้อความมั่ว/Noise '+filter.removed.length+' จุด':'OQC Strict ไม่พบ noise รุนแรง';
    oqcResults.forEach(oqc=>{
      oqc.issuesFound=Array.isArray(oqc.issuesFound)?oqc.issuesFound:[];
      if(!oqc.issuesFound.includes(message))oqc.issuesFound.unshift(message);
      oqc.corrections=Array.isArray(oqc.corrections)?oqc.corrections:[];
      filter.removed.slice(0,8).forEach(line=>oqc.corrections.push({from:line,to:'',reason:'strict-noise-filter'}));
      oqc.confidence=clamp((oqc.confidence||0)+(filter.removed.length?-6:3));
      oqc.status='Completed';
    });
  }

  function renderStrictNotice(filter,result){
    let notice=$('oqcStrictNotice');
    const finalBox=$('finalResultBox')||$('output')?.parentNode;
    if(!finalBox)return;
    if(!notice){
      notice=document.createElement('div');
      notice.id='oqcStrictNotice';
      notice.className='oqc-strict-notice';
      finalBox.parentNode.insertBefore(notice,finalBox);
    }
    const removed=filter.removed.length;
    notice.innerHTML='<b>OQC Strict Review</b><span>'+ (removed?'ลบข้อความมั่ว/Noise ออก '+removed+' จุด · confidence ใหม่ '+result.finalConfidence+'%':'ตรวจเข้มแล้ว ไม่พบ noise รุนแรง · confidence '+result.finalConfidence+'%') +'</span>';
  }

  function applyStrictReview(){
    const result=window.AppState?.multiOcrOqc;
    if(!result||result.__strictReviewed)return null;
    const before=result.finalText||'';
    const filter=strictFilterText(before);
    if(!filter.text.trim())return null;

    result.__strictReviewed=true;
    result.strictOqc={removedLines:filter.removed,keptLines:filter.kept,reviewedAt:new Date().toISOString()};
    result.finalText=filter.text;
    const penalty=Math.min(24,filter.removed.length*4);
    const boost=filter.removed.length?0:4;
    result.finalConfidence=clamp((result.finalConfidence||0)-penalty+boost);
    addStrictIssues(result,filter);

    window.AppState.rawText=result.finalText;
    window.AppState.lastText=result.finalText;
    window.AppState.confidence=result.finalConfidence;
    if($('output'))$('output').textContent=result.finalText||'ไม่พบข้อความ';
    if(typeof window.renderMultiOcrDashboard==='function')window.renderMultiOcrDashboard(result);
    if(typeof window.ensureFormattedOcrLayout==='function')setTimeout(window.ensureFormattedOcrLayout,80);
    renderStrictNotice(filter,result);
    return result;
  }

  function patchScan(){
    if(window.__oqcStrictPatchApplied)return;
    if(typeof window.runMultiOqcScan!=='function')return;
    window.__oqcStrictPatchApplied=true;
    const original=window.runMultiOqcScan;
    window.runMultiOqcScan=async function(){
      const text=await original.apply(this,arguments);
      const reviewed=applyStrictReview();
      return reviewed?.finalText||text;
    };
  }

  function boot(){
    patchScan();
    const observer=new MutationObserver(()=>patchScan());
    observer.observe(document.body,{childList:true,subtree:true});
  }

  window.applyOqcStrictReview=applyStrictReview;
  document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,260));
})();

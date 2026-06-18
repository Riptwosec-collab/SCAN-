const PDF_SKILLS=[
  {
    id:'auto-pdf',
    title:'Auto PDF',
    label:'ตรวจ PDF อัตโนมัติ',
    description:'เลือก text layer หรือ OCR รายหน้า เหมาะกับ PDF ผสม',
    config:{strategy:'auto',language:'tha+eng',layout_detection:'auto-page',output:['TXT','DOC','PDF','CSV','JSON','MD'],confidence_threshold:74,skip_blank:true,store_images:false,clean:true}
  },
  {
    id:'text-extract',
    title:'PDF Text Extract',
    label:'ดึง Text Layer',
    description:'ดึงข้อความโดยตรงจาก PDF ที่มี text layer เพื่อความเร็วและความแม่น',
    config:{strategy:'text-first',language:'tha+eng',layout_detection:'text-layer',output:['TXT','DOC','CSV','JSON','MD'],confidence_threshold:92,skip_blank:true,store_images:false,clean:false}
  },
  {
    id:'scanned-ocr',
    title:'Scanned PDF OCR',
    label:'OCR PDF สแกน',
    description:'เรนเดอร์แต่ละหน้าเป็นภาพแล้วอ่านด้วย OCR สำหรับเอกสารสแกน',
    config:{strategy:'ocr',language:'tha+eng',layout_detection:'scan-page',output:['TXT','DOC','PDF','JSON'],confidence_threshold:70,skip_blank:true,store_images:true,clean:true}
  },
  {
    id:'searchable-pdf',
    title:'Searchable PDF',
    label:'PDF ค้นหาได้',
    description:'สร้าง HTML สำหรับ Print/Save as PDF พร้อมภาพต้นฉบับและ text overlay',
    config:{strategy:'auto',language:'tha+eng',layout_detection:'page-overlay',output:['Searchable PDF','PDF','TXT','JSON'],confidence_threshold:76,skip_blank:true,store_images:true,clean:true}
  },
  {
    id:'pdf-table',
    title:'PDF Table',
    label:'ตาราง PDF',
    description:'รักษาแถว/คอลัมน์ และเตรียมส่งออกเป็น Excel, CSV และ JSON',
    config:{strategy:'auto',language:'tha+eng',layout_detection:'table',output:['Excel','CSV','JSON','MD'],confidence_threshold:74,skip_blank:true,store_images:false,clean:true,mode:'table',orientation:'landscape'}
  },
  {
    id:'pdf-form',
    title:'PDF Form',
    label:'แบบฟอร์ม PDF',
    description:'ดึงข้อมูลเป็น key-value เช่น ชื่อ วันที่ เลขเอกสาร และหมายเหตุ',
    config:{strategy:'auto',language:'tha+eng',layout_detection:'key-value',output:['JSON','CSV','DOC','TXT'],confidence_threshold:74,skip_blank:true,store_images:false,clean:true,mode:'keyvalue'}
  },
  {
    id:'pdf-clean',
    title:'PDF Clean Text',
    label:'จัดข้อความ PDF',
    description:'จัดข้อความ OCR ให้อ่านง่ายและแก้คำไทยเพี้ยนแบบ local cleanup',
    config:{strategy:'auto',language:'tha+eng',layout_detection:'paragraphs',output:['TXT','DOC','PDF','MD'],confidence_threshold:78,skip_blank:true,store_images:false,clean:true,mode:'document',cleanup:'strict'}
  },
  {
    id:'pdf-summary',
    title:'PDF Summary',
    label:'สรุป PDF',
    description:'สรุปเนื้อหา PDF หลัง OCR ด้วย rule-based summary ใน browser',
    config:{strategy:'auto',language:'tha+eng',layout_detection:'sections',output:['TXT','DOC','MD','JSON'],confidence_threshold:72,skip_blank:true,store_images:false,clean:true,mode:'summary'}
  },
  {
    id:'pdf-compare',
    title:'PDF Compare',
    label:'เปรียบเทียบ 2 PDF',
    description:'เปรียบเทียบข้อความของ PDF ปัจจุบันกับ PDF อีกไฟล์แบบ line-by-line',
    config:{strategy:'compare',language:'tha+eng',layout_detection:'diff',output:['TXT','JSON','MD'],confidence_threshold:76,skip_blank:true,store_images:false,clean:false}
  }
];

function getPdfSkill(id){
  return PDF_SKILLS.find(skill=>skill.id===id)||PDF_SKILLS[0];
}

function getActivePdfSkill(){
  return getPdfSkill(AppState.pdfSkill||'auto-pdf');
}

function applyPdfSkill(id,{silent=false}={}){
  const skill=getPdfSkill(id);
  const cfg=skill.config;
  AppState.pdfSkill=skill.id;
  const ocrSkillMap={
    'text-extract':'general',
    'scanned-ocr':'document',
    'searchable-pdf':'searchable-pdf',
    'pdf-table':'table',
    'pdf-form':'form',
    'pdf-clean':'thai',
    'pdf-summary':'document',
    'pdf-compare':'general'
  };
  if(typeof applyOcrSkill==='function'&&ocrSkillMap[skill.id])applyOcrSkill(ocrSkillMap[skill.id],{silent:true});
  if($('pdfSkillSelect'))$('pdfSkillSelect').value=skill.id;
  if($('langSelect'))$('langSelect').value=cfg.language||'tha+eng';
  if($('skipBlankPdfPages'))$('skipBlankPdfPages').checked=cfg.skip_blank!==false;
  if($('modeSelect')&&cfg.mode)$('modeSelect').value=cfg.mode;
  if($('cleanupLevel')&&cfg.cleanup)$('cleanupLevel').value=cfg.cleanup;
  if($('pdfOrientation')&&cfg.orientation){
    $('pdfOrientation').value=cfg.orientation;
    AppState.pdfOrientation=cfg.orientation;
  }
  if(skill.id==='scanned-ocr'&&$('ocrOnlyNoText'))$('ocrOnlyNoText').checked=false;
  if(skill.id==='text-extract'&&$('ocrOnlyNoText'))$('ocrOnlyNoText').checked=true;
  if(skill.id==='pdf-compare')$('pdfCompareBox')?.classList.remove('hide');
  else $('pdfCompareBox')?.classList.add('hide');
  syncPdfSkillUi();
  if(typeof syncQuickModeButtons==='function')syncQuickModeButtons();
  if(!silent)setStatus('ตั้งค่า PDF Skill: '+skill.label,'ok');
}

function renderPdfSkillSelector(){
  const select=$('pdfSkillSelect');
  const cards=$('pdfSkillCards');
  if(select){
    select.innerHTML=PDF_SKILLS.map(skill=>'<option value="'+skill.id+'">'+skill.title+' · '+skill.label+'</option>').join('');
    select.value=AppState.pdfSkill||'auto-pdf';
  }
  if(cards){
    cards.innerHTML=PDF_SKILLS.map(skill=>
      '<button type="button" data-pdf-skill="'+skill.id+'"><b>'+skill.label+'</b><span>'+skill.title+'</span></button>'
    ).join('');
  }
  syncPdfSkillUi();
}

function bindPdfSkillSelector(){
  renderPdfSkillSelector();
  $('pdfSkillSelect')?.addEventListener('change',event=>applyPdfSkill(event.target.value));
  document.querySelectorAll('[data-pdf-skill]').forEach(button=>{
    button.onclick=()=>applyPdfSkill(button.dataset.pdfSkill);
  });
  $('pdfCompareInput')?.addEventListener('change',event=>handlePdfCompareFile(event.target.files[0]));
  $('pdfCompareBtn')?.addEventListener('click',comparePdfWithSelected);
  $('privacyMode')?.addEventListener('change',event=>{
    AppState.privacyMode=event.target.checked;
    setStatus(AppState.privacyMode?'Privacy Mode เปิดอยู่ · ไม่บันทึก History':'Privacy Mode ปิดแล้ว','ok');
  });
  $('autoDeleteMinutes')?.addEventListener('change',event=>{
    AppState.autoDeleteMinutes=Number(event.target.value)||0;
    setStatus(AppState.autoDeleteMinutes?'ตั้งลบข้อมูลอัตโนมัติ '+AppState.autoDeleteMinutes+' นาที':'ปิด auto-delete','ok');
  });
  applyPdfSkill(AppState.pdfSkill||'auto-pdf',{silent:true});
}

function syncPdfSkillUi(){
  const id=AppState.pdfSkill||'auto-pdf';
  if($('pdfSkillSelect'))$('pdfSkillSelect').value=id;
  document.querySelectorAll('[data-pdf-skill]').forEach(button=>button.classList.toggle('active',button.dataset.pdfSkill===id));
  const skill=getActivePdfSkill();
  const box=$('pdfSkillConfig');
  if(box){
    box.innerHTML='<b>'+skill.label+'</b><span>'+skill.description+'</span>'+
      '<div class="skill-config-grid">'+
      '<i>strategy: '+skill.config.strategy+'</i>'+
      '<i>layout: '+skill.config.layout_detection+'</i>'+
      '<i>threshold: '+skill.config.confidence_threshold+'%</i>'+
      '<i>export: '+skill.config.output.join(', ')+'</i>'+
      '</div>';
  }
}

function detectTextLanguage(text){
  const thai=(text.match(/[ก-ฮะาำิีึืุูั็่้๊๋์]/g)||[]).length;
  const eng=(text.match(/[A-Za-z]/g)||[]).length;
  if(thai&&eng)return 'ไทย + อังกฤษ';
  if(thai)return 'ไทย';
  if(eng)return 'อังกฤษ';
  return 'ไม่ชัดเจน';
}

function detectPdfLayout(text,items=[]){
  const lines=(text||'').split('\n').map(line=>line.trim()).filter(Boolean);
  const widths=items.map(item=>Number(item.x)||0);
  const xSpread=widths.length?(Math.max(...widths)-Math.min(...widths)):0;
  const tableLines=lines.filter(line=>/\t|\s{3,}|[,|].+[,|]/.test(line)).length;
  const keyValue=lines.filter(line=>/[:：]\s*\S+/.test(line)).length;
  const pageNo=lines.some(line=>/^(page|หน้า)\s*\d+|\d+\s*\/\s*\d+$/i.test(line));
  const headerFooter=lines.length>4&&lines[0].length<90&&lines[lines.length-1].length<90;
  if(tableLines>=Math.max(2,lines.length*.25))return 'table';
  if(keyValue>=3)return 'form/key-value';
  if(xSpread>320&&lines.length>8)return 'columns';
  if(headerFooter&&pageNo)return 'header/footer/page-number';
  if(lines.length>8)return 'paragraphs';
  return 'plain';
}

function lineConfidence(line,pageConfidence,method){
  let score=Number(pageConfidence)||76;
  if(method==='text-layer')score=Math.max(score,94);
  if(/[�ƟθϴƩΣÉÊÈË]/.test(line))score-=24;
  if(/[เแโใไ]\s+[ก-ฮ]|[ก-ฮ]\s+[ะาำิีึืุูั็่้๊๋์]/.test(line))score-=18;
  if((line.match(/[|{}<>~`_^=+*\\/]/g)||[]).length>Math.max(4,line.length*.18))score-=16;
  if(line.trim().length<3)score-=10;
  return Math.max(20,Math.min(99,Math.round(score)));
}

function buildPageConfidence(text,pageConfidence,method){
  const lines=(text||'').split('\n').map(line=>line.trim()).filter(Boolean);
  const lineItems=lines.map((line,index)=>({index:index+1,text:line,confidence:lineConfidence(line,pageConfidence,method)}));
  const words=lines.join(' ').split(/\s+/).filter(Boolean).slice(0,160).map(word=>({
    text:word,
    confidence:lineConfidence(word,pageConfidence,method)
  }));
  return {
    lines:lineItems,
    words,
    lowLines:lineItems.filter(item=>item.confidence<Math.max(65,(pageConfidence||76)-14)).slice(0,12),
    lowWords:words.filter(item=>item.confidence<Math.max(60,(pageConfidence||76)-18)).slice(0,20)
  };
}

function isPdfBlankText(text){
  const compact=(text||'').replace(/\s/g,'');
  if(!compact)return true;
  const meaningful=(compact.match(/[A-Za-z0-9ก-ฮ]/g)||[]).length;
  return meaningful<4;
}

function renderPdfPageResults(){
  const box=$('pdfPageResults');
  if(!box)return;
  const pages=AppState.pdfPageInfo||[];
  box.classList.toggle('hide',!pages.length);
  if(!pages.length){box.innerHTML='';return;}
  box.innerHTML='<div class="pdf-results-head"><b>PDF Page Results</b><span>'+pages.length+' หน้า · แยก Original OCR / Cleaned Text / Confidence</span></div>'+
    pages.map(page=>{
      const low=(page.lowConfidence?.lowWords||[]).slice(0,8).map(item=>'<mark title="word confidence '+item.confidence+'%">'+escapeHtml(item.text)+'</mark>').join(' ');
      const lowLines=(page.lowConfidence?.lowLines||[]).slice(0,3).map(item=>'<code title="line confidence '+item.confidence+'%">L'+item.index+' '+escapeHtml(item.text)+'</code>').join('');
      const layout=Array.isArray(page.layout)?page.layout.join(', '):page.layout;
      return '<details class="pdf-page-card '+(page.skippedBlank?'blank':'')+'">'+
        '<summary><span>หน้า '+page.page+'</span><b>'+escapeHtml(page.methodLabel||page.method||'PDF')+'</b><i>'+escapeHtml(page.language||'-')+' · '+escapeHtml(layout||'-')+' · '+(page.confidence??'-')+'%</i></summary>'+
        '<div class="pdf-page-meta">'+
          '<span>text layer: '+(page.hadTextLayer?'yes':'no')+'</span><span>OCR: '+(page.usedOcr?'yes':'no')+'</span><span>chars: '+(page.charCount||0)+'</span>'+
          (page.skippedBlank?'<span>blank skipped</span>':'')+
        '</div>'+
        (low||lowLines?'<div class="low-confidence"><b>Low confidence</b>'+(low?'<p>'+low+'</p>':'')+(lowLines?'<div>'+lowLines+'</div>':'')+'</div>':'')+
        '<div class="pdf-page-compare"><div><b>Original OCR</b><pre>'+escapeHtml(page.rawText||page.text||'')+'</pre></div><div><b>Cleaned Text</b><pre>'+escapeHtml(page.cleanedText||page.text||'')+'</pre></div></div>'+
      '</details>';
    }).join('');
}

function buildPdfMarkdown(items=AppState.pdfPageInfo||[]){
  if(items.length){
    return '# RIPTWOSEC.SCAN PDF OCR\n\n'+items.map(page=>
      '## หน้า '+page.page+'\n\n'+
      '- Method: '+(page.methodLabel||page.method||'-')+'\n'+
      '- Confidence: '+(page.confidence??'-')+'%\n'+
      '- Language: '+(page.language||'-')+'\n'+
      '- Layout: '+(Array.isArray(page.layout)?page.layout.join(', '):page.layout||'-')+'\n\n'+
      (page.cleanedText||page.text||'')
    ).join('\n\n');
  }
  return '# RIPTWOSEC.SCAN OCR\n\n'+(AppState.lastText||$('output')?.innerText||'');
}

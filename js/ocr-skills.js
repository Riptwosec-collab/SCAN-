const OCR_SKILLS=[
  {
    id:'general',
    title:'General Text',
    label:'ข้อความทั่วไป',
    description:'อ่านข้อความจากรูปภาพ ป้าย screenshot หรือรูปถ่ายทั่วไป และเรียงบรรทัดให้อ่านง่าย',
    config:{preprocessing_level:'balanced',ocr_engine:'auto',language:'tha+eng',layout_detection:'line-order',ai_postprocess:'local cleanup',export_options:['TXT','DOC','CSV','JSON','PDF'],confidence_threshold:70,preset:'auto',mode:'clean',cleanup:'normal',orientation:'portrait',upscale:true,threshold:true,cleanThai:true,itDictionary:true}
  },
  {
    id:'document',
    title:'Document',
    label:'เอกสารเต็มหน้า',
    description:'เอกสารราชการ เอกสารเรียน เอกสารบริษัท หรือเอกสารเต็มหน้า รักษาย่อหน้าให้ใกล้ต้นฉบับ',
    config:{preprocessing_level:'document-sharp',ocr_engine:'auto',language:'tha+eng',layout_detection:'paragraphs',ai_postprocess:'local document cleanup',export_options:['TXT','DOC','JSON','PDF'],confidence_threshold:76,preset:'document',mode:'document',cleanup:'normal',orientation:'portrait',upscale:true,threshold:true,cleanThai:true,itDictionary:true}
  },
  {
    id:'thai',
    title:'Thai Enhanced',
    label:'ไทยแม่นขึ้น',
    description:'เน้นภาษาไทย สระ วรรณยุกต์ ช่องว่าง และตัวอักษรไทยที่ OCR อ่านผิดบ่อย',
    config:{preprocessing_level:'thai-enhanced',ocr_engine:'auto',language:'tha+eng',layout_detection:'thai-lines',ai_postprocess:'local Thai correction',export_options:['TXT','DOC','JSON','PDF'],confidence_threshold:78,preset:'document',mode:'clean',cleanup:'strict',orientation:'portrait',upscale:true,threshold:true,cleanThai:true,itDictionary:true}
  },
  {
    id:'english-number',
    title:'English & Number',
    label:'อังกฤษ/ตัวเลข',
    description:'เลข invoice, serial, IP, MAC, code และอักขระ / - . : _ โดยลดการเดาคำไทย',
    config:{preprocessing_level:'symbol-preserve',ocr_engine:'auto',language:'eng',layout_detection:'line-order',ai_postprocess:'conservative symbol cleanup',export_options:['TXT','CSV','JSON','DOC'],confidence_threshold:82,preset:'screenshot',mode:'plain',cleanup:'light',orientation:'portrait',upscale:true,threshold:true,cleanThai:false,itDictionary:false}
  },
  {
    id:'table',
    title:'Table',
    label:'ตาราง',
    description:'อ่านข้อความจากตาราง รักษาแถว/คอลัมน์ และเตรียมส่งออก CSV หรือ Excel ต่อได้ง่าย',
    config:{preprocessing_level:'table-lines',ocr_engine:'auto',language:'tha+eng',layout_detection:'table',ai_postprocess:'local table cleanup',export_options:['CSV','JSON','DOC','PDF'],confidence_threshold:74,preset:'table',mode:'table',cleanup:'normal',orientation:'landscape',upscale:true,threshold:true,cleanThai:true,itDictionary:true}
  },
  {
    id:'receipt',
    title:'Receipt',
    label:'ใบเสร็จ/บิล',
    description:'ดึงชื่อร้าน วันที่ รายการ ราคา ภาษี ส่วนลด และยอดรวมในรูปแบบข้อความกับ JSON',
    config:{preprocessing_level:'receipt-detail',ocr_engine:'auto',language:'tha+eng',layout_detection:'key-value',ai_postprocess:'local receipt cleanup',export_options:['TXT','JSON','CSV','DOC'],confidence_threshold:72,preset:'invoice',mode:'keyvalue',cleanup:'strict',orientation:'portrait',upscale:true,threshold:true,cleanThai:true,itDictionary:true}
  },
  {
    id:'form',
    title:'Form',
    label:'แบบฟอร์ม',
    description:'อ่านข้อมูลแบบ key-value เช่น ชื่อ เบอร์โทร วันที่ เลขเอกสาร สถานที่ และหมายเหตุ',
    config:{preprocessing_level:'form-clean',ocr_engine:'auto',language:'tha+eng',layout_detection:'key-value',ai_postprocess:'local form cleanup',export_options:['JSON','CSV','DOC','TXT'],confidence_threshold:74,preset:'document',mode:'keyvalue',cleanup:'strict',orientation:'portrait',upscale:true,threshold:true,cleanThai:true,itDictionary:true}
  },
  {
    id:'screenshot',
    title:'Screenshot',
    label:'หน้าจอ/UI',
    description:'ภาพหน้าจอมือถือหรือคอม อ่าน UI, error, chat, web page และรักษาลำดับตามตำแหน่งบนจอ',
    config:{preprocessing_level:'dark-ui-aware',ocr_engine:'auto',language:'tha+eng',layout_detection:'screen-position',ai_postprocess:'local UI cleanup',export_options:['TXT','DOC','JSON','PDF'],confidence_threshold:70,preset:'screenshot',mode:'capture-list',cleanup:'normal',orientation:'portrait',upscale:true,threshold:true,cleanThai:true,itDictionary:true}
  },
  {
    id:'handwriting',
    title:'Handwriting',
    label:'ลายมือเบื้องต้น',
    description:'อ่านลายมือเบื้องต้น ความแม่นอาจต่ำกว่าเอกสารพิมพ์และควรตรวจ confidence ทุกครั้ง',
    warning:'ลายมือมีความเสี่ยงอ่านผิดสูง โปรดตรวจ Raw OCR และ Confidence ก่อนใช้งานจริง',
    config:{preprocessing_level:'soft-gray',ocr_engine:'tesseract-accurate',language:'tha+eng',layout_detection:'sparse-lines',ai_postprocess:'light local cleanup',export_options:['TXT','DOC','JSON'],confidence_threshold:60,preset:'mobile',mode:'clean',cleanup:'light',orientation:'portrait',upscale:true,threshold:true,cleanThai:true,itDictionary:false}
  },
  {
    id:'searchable-pdf',
    title:'Searchable PDF',
    label:'PDF ค้นหาได้',
    description:'เหมาะกับ PDF scan หรือรูปเอกสารที่ต้องส่งออกเป็นไฟล์สำหรับ Print/Save as PDF พร้อมข้อความให้คัดลอก',
    warning:'โหมดนี้สร้างไฟล์ Print PDF/HTML พร้อมข้อความ OCR ใน browser ไม่อัปโหลดไฟล์ไป backend',
    config:{preprocessing_level:'pdf-grade',ocr_engine:'auto',language:'tha+eng',layout_detection:'page',ai_postprocess:'local PDF cleanup',export_options:['PDF','DOC','TXT','JSON'],confidence_threshold:76,preset:'document',mode:'document',cleanup:'normal',orientation:'portrait',upscale:true,threshold:true,cleanThai:true,itDictionary:true}
  }
];

function getOcrSkill(id){
  return OCR_SKILLS.find(skill=>skill.id===id)||OCR_SKILLS[0];
}

function getActiveOcrSkill(){
  return getOcrSkill(AppState.ocrSkill||'general');
}

function setChecked(id,value){
  const el=$(id);
  if(el)el.checked=!!value;
}

function applyOcrSkill(id,{silent=false}={}){
  const skill=getOcrSkill(id);
  AppState.ocrSkill=skill.id;
  const cfg=skill.config;
  if($('ocrSkillSelect'))$('ocrSkillSelect').value=skill.id;
  if($('langSelect'))$('langSelect').value=cfg.language;
  if($('ocrPreset'))$('ocrPreset').value=cfg.preset;
  if(typeof applyProfessionalPreset==='function')applyProfessionalPreset(cfg.preset);
  if($('modeSelect'))$('modeSelect').value=cfg.mode;
  if($('cleanupLevel'))$('cleanupLevel').value=cfg.cleanup;
  if($('ocrEngine'))$('ocrEngine').value=cfg.ocr_engine;
  if($('pdfOrientation'))$('pdfOrientation').value=cfg.orientation;
  setChecked('upscale',cfg.upscale);
  setChecked('threshold',cfg.threshold);
  setChecked('cleanThai',cfg.cleanThai);
  setChecked('itDictionary',cfg.itDictionary);
  setChecked('removeNoise',true);
  setChecked('highlightFixes',true);
  AppState.cleanupLevel=cfg.cleanup;
  AppState.ocrPreset=cfg.preset;
  AppState.ocrEngine=cfg.ocr_engine;
  AppState.pdfOrientation=cfg.orientation;
  syncOcrSkillUi();
  if(typeof syncQuickModeButtons==='function')syncQuickModeButtons();
  if(typeof renderReadyChecklist==='function')renderReadyChecklist();
  if(typeof updateProcessedPreview==='function')updateProcessedPreview();
  if(!silent)setStatus('ตั้งค่า OCR Skill: '+skill.label,'ok');
  renderOcrSkillResult();
}

function renderOcrSkillSelector(){
  const select=$('ocrSkillSelect');
  const cards=$('ocrSkillCards');
  if(select){
    select.innerHTML=OCR_SKILLS.map(skill=>'<option value="'+skill.id+'">'+skill.title+' · '+skill.label+'</option>').join('');
    select.value=AppState.ocrSkill||'general';
  }
  if(cards){
    cards.innerHTML=OCR_SKILLS.map(skill=>
      '<button type="button" data-ocr-skill="'+skill.id+'">'+
        '<b>'+skill.label+'</b><span>'+skill.title+'</span>'+
      '</button>'
    ).join('');
  }
  syncOcrSkillUi();
  renderOcrSkillConfig();
}

function bindOcrSkillSelector(){
  renderOcrSkillSelector();
  $('ocrSkillSelect')?.addEventListener('change',event=>applyOcrSkill(event.target.value));
  document.querySelectorAll('[data-ocr-skill]').forEach(button=>{
    button.onclick=()=>applyOcrSkill(button.dataset.ocrSkill);
  });
  applyOcrSkill(AppState.ocrSkill||'general',{silent:true});
}

function syncOcrSkillUi(){
  const id=AppState.ocrSkill||'general';
  if($('ocrSkillSelect'))$('ocrSkillSelect').value=id;
  document.querySelectorAll('[data-ocr-skill]').forEach(button=>button.classList.toggle('active',button.dataset.ocrSkill===id));
  renderOcrSkillConfig();
}

function renderOcrSkillConfig(){
  const box=$('ocrSkillConfig');
  if(!box)return;
  const skill=getActiveOcrSkill();
  const cfg=skill.config;
  box.innerHTML=
    '<b>'+skill.label+'</b><span>'+skill.description+'</span>'+
    '<div class="skill-config-grid">'+
      '<i>preprocess: '+cfg.preprocessing_level+'</i>'+
      '<i>language: '+cfg.language+'</i>'+
      '<i>layout: '+cfg.layout_detection+'</i>'+
      '<i>threshold: '+cfg.confidence_threshold+'%</i>'+
      '<i>postprocess: '+cfg.ai_postprocess+'</i>'+
      '<i>export: '+cfg.export_options.join(', ')+'</i>'+
    '</div>'+
    (skill.warning?'<em>'+skill.warning+'</em>':'');
}

function renderOcrSkillResult(){
  const box=$('skillResultBar');
  if(!box)return;
  const skill=getActiveOcrSkill();
  const hasResult=(AppState.rawText||AppState.lastText||'').trim();
  box.classList.toggle('hide',!hasResult);
  if(!hasResult)return;
  const options=OCR_SKILLS.map(item=>'<option value="'+item.id+'" '+(item.id===skill.id?'selected':'')+'>'+item.title+' · '+item.label+'</option>').join('');
  box.innerHTML='<span><b>OCR Skill</b><strong>'+skill.label+'</strong><small>'+skill.title+' · confidence threshold '+skill.config.confidence_threshold+'%</small></span><div class="skill-result-actions"><select data-result-skill aria-label="เปลี่ยน OCR Skill">'+options+'</select><button class="btn small" type="button" data-skill-rescan>Re-scan</button></div>';
  box.querySelector('[data-result-skill]')?.addEventListener('change',event=>applyOcrSkill(event.target.value));
  box.querySelector('[data-skill-rescan]')?.addEventListener('click',()=>{
    if(typeof scanCurrent==='function')scanCurrent();
  });
}

function applySkillPassPriority(passes,darkPasses=[]){
  const skill=getActiveOcrSkill().id;
  const front={
    general:[{name:'Skill General Line Read',mode:'ui-sharp',psm:'6'}],
    document:[{name:'Skill Document Sharp',mode:'pdf-like',psm:'6'},{name:'Skill Document Adaptive',mode:'doc-adaptive',psm:'6'}],
    thai:[{name:'Skill Thai Enhanced',mode:'thai-sharp',psm:'6'},{name:'Skill Thai Adaptive',mode:'thai-adaptive',psm:'6'}],
    'english-number':[
      {name:'Skill English Number',mode:'gray',psm:'6',dpi:'420',whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/-.:_@#%+()[]{} '},
      {name:'Skill Code Sparse',mode:'ui-detail',psm:'11',dpi:'420',whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/-.:_@#%+()[]{} '}
    ],
    table:[{name:'Skill Table Lines',mode:'thai-line',psm:'6'},{name:'Skill Table Sparse',mode:'ui-detail',psm:'11'}],
    receipt:[{name:'Skill Receipt Detail',mode:'receipt',psm:'4'},{name:'Skill Receipt Sparse',mode:'ui-detail',psm:'11'}],
    form:[{name:'Skill Form Key Value',mode:'doc-adaptive',psm:'6'},{name:'Skill Form Sparse Fields',mode:'ui-detail',psm:'11'}],
    screenshot:[...darkPasses,{name:'Skill Screenshot UI',mode:'ui-sharp',psm:'6'},{name:'Skill Screenshot Sparse',mode:'ui-detail',psm:'11'}],
    handwriting:[{name:'Skill Handwriting Soft',mode:'soft',psm:'11'},{name:'Skill Handwriting Gray',mode:'gray',psm:'11'}],
    'searchable-pdf':[{name:'Skill Searchable PDF',mode:'pdf-like',psm:'6'},{name:'Skill PDF Clean Layer',mode:'doc-clean',psm:'6'}]
  }[skill]||[];
  const seen=new Set();
  return [...front,...passes].filter(pass=>{
    const key=pass.name+'|'+pass.mode+'|'+pass.psm;
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

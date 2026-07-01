/*
 * The OCR Skill system used to let the user manually pick a document-type
 * profile (Document/Thai/Table/Receipt/Screenshot/etc.) from a dropdown,
 * each biasing which OCR passes ran first. That selector UI has been
 * removed in favor of a single always-on "General Text / Auto" profile —
 * the underlying multi-pass scanning, confidence filtering, and per-line
 * voting (in ocr.js / custom-rules.js) already handle the variation
 * between document types automatically, without asking the user to
 * classify their own document first.
 */
const OCR_SKILLS=[
  {
    id:'general',
    title:'General Text',
    label:'ข้อความทั่วไป',
    description:'อ่านข้อความจากรูปภาพ ป้าย screenshot หรือรูปถ่ายทั่วไป และเรียงบรรทัดให้อ่านง่าย',
    config:{preprocessing_level:'balanced',ocr_engine:'auto',language:'tha+eng',layout_detection:'line-order',ai_postprocess:'local cleanup',export_options:['TXT','DOC','CSV','JSON','PDF'],confidence_threshold:70,preset:'auto',mode:'clean',cleanup:'normal',orientation:'portrait',upscale:true,threshold:true,cleanThai:true,itDictionary:true}
  }
];

function getActiveOcrSkill(){
  return OCR_SKILLS[0];
}

function applySkillPassPriority(passes){
  const front=[{name:'Skill General Line Read',mode:'ui-sharp',psm:'6'}];
  const seen=new Set();
  return [...front,...passes].filter(pass=>{
    const key=pass.name+'|'+pass.mode+'|'+pass.psm;
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

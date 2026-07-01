(function(){
  'use strict';

  const normalize=value=>String(value||'').replace(/\r/g,'').replace(/\s+/g,' ').trim();
  const splitLines=text=>String(text||'').replace(/\r/g,'').split('\n').map(normalize).filter(Boolean);
  const unique=items=>Array.from(new Set((items||[]).filter(Boolean)));

  const GOVERNMENT_TYPES=['government_memo','official_letter','internal_memo'];
  const GOVERNMENT_DICTIONARY=[
    'สำนักงาน','สํานักงาน','สรรพากร','กองเทคโนโลยีสารสนเทศ','ส่วนเทคโนโลยีสารสนเทศ','ความมั่นคงปลอดภัยสารสนเทศ','เครือข่ายสื่อสาร','ขอความอนุเคราะห์','ตรวจราชการ','ปฏิบัติงาน','เอกสารแนบ','รักษาราชการแทน','นิติกรชำนาญการพิเศษ','นิติกรชํานาญการพิเศษ','บันทึกข้อความ','ส่วนราชการ','วันที่','เรื่อง','เรียน','จึงเรียนมาเพื่อโปรดทราบและดำเนินการต่อไป','ดำเนินการต่อไป'
  ];
  const CORRECTION_RULES=[
    ['ข้อัความ','ข้อความ'],['เรอง','เรื่อง'],['เพิม','เพิ่ม'],['ขอเพิม','ขอเพิ่ม'],['ตรวาจ','ตรวจ'],['สือสาร','สื่อสาร'],['ความมันคง','ความมั่นคง'],['เจ้าหน้าที','เจ้าหน้าที่'],['เอกสารที','เอกสารที่'],['พร้อมนี','พร้อมนี้'],['สรรพาภาค','สรรพากรภาค'],['สํานักงาน','สำนักงาน'],['อํานวย','อำนวย'],['จําเป็น','จำเป็น'],['ดําเนิน','ดำเนิน'],['นํา','นำ'],['สําคัญ','สำคัญ']
  ];
  const SENSITIVE_PATTERNS=[
    {type:'เลขหนังสือ/รหัสเอกสาร',pattern:/(?:^|\s)(?:ที่\s*)?[ก-ฮA-Z]{0,6}\.?\s*\d+[\/\-.]\d+(?:[\/\-.]\d+)?/gi},
    {type:'เบอร์โทรศัพท์',pattern:/(?:โทร\.?|tel\.?|phone)?\s*[:：]?\s*(?:\+?66|0|[๐-๙])(?:[0-9๐-๙\-\s]){6,}/gi},
    {type:'MAC Address',pattern:/\b[0-9A-F]{2}(?:[:-][0-9A-F]{2}){5}\b/gi},
    {type:'ชื่อผู้ลงนาม',pattern:/\(([^()]{4,60})\)/g}
  ];

  function detectGovernmentDocumentType(text){
    const source=String(text||'');
    if(/บันทึกข้อความ|ส่วนราชการ|จึงเรียนมาเพื่อโปรดทราบ/.test(source))return 'government_memo';
    if(/หนังสือราชการ|เรียน\s+[^\n]+|ขอแสดงความนับถือ/.test(source))return 'official_letter';
    if(/internal memo|memo|แจ้งภายใน|บันทึกภายใน/i.test(source))return 'internal_memo';
    if(/สรรพากร|กองเทคโนโลยีสารสนเทศ|ส่วนเทคโนโลยีสารสนเทศ|รักษาราชการแทน/.test(source))return 'government_memo';
    return null;
  }

  function hasGovernmentStructure(text){
    const source=String(text||'');
    const fields=['บันทึกข้อความ','ส่วนราชการ','วันที่','เรื่อง','เรียน','จึงเรียนมาเพื่อโปรดทราบ','รักษาราชการแทน'];
    return fields.filter(item=>source.includes(item)).length>=3;
  }

  function preserveSensitive(text){
    const preserved=[];
    let output=String(text||'');
    SENSITIVE_PATTERNS.forEach(rule=>{
      output=output.replace(rule.pattern,match=>{
        const token='__GOV_KEEP_'+preserved.length+'__';
        preserved.push({token,value:match,type:rule.type,reviewRequired:true});
        return token;
      });
    });
    return {text:output,preserved};
  }

  function restoreSensitive(text,preserved){
    let output=String(text||'');
    preserved.forEach(item=>{output=output.split(item.token).join(item.value);});
    return output;
  }

  function applyGovernmentCorrections(text){
    const preservedState=preserveSensitive(text);
    let output=preservedState.text;
    const corrections=[];
    CORRECTION_RULES.forEach(([wrong,correct])=>{
      const before=output;
      output=output.split(wrong).join(correct);
      if(output!==before)corrections.push({wrong,correct,reason:'government-dictionary-rule'});
    });
    output=restoreSensitive(output,preservedState.preserved);
    return {text:output,corrections,preserved:preservedState.preserved};
  }

  function lineMeaningScore(line){
    const text=normalize(line);
    if(!text)return 0;
    let score=0;
    const thai=(text.match(/[ก-ฮ]/g)||[]).length;
    const latin=(text.match(/[A-Za-z]/g)||[]).length;
    const digits=(text.match(/[0-9๐-๙]/g)||[]).length;
    const symbols=(text.match(/[=©%|{}<>~`_^\\]/g)||[]).length;
    if(thai>=5)score+=thai*2;
    if(GOVERNMENT_DICTIONARY.some(word=>text.includes(word)))score+=60;
    if(/^(บันทึกข้อความ|ส่วนราชการ|ที่|วันที่|เรื่อง|เรียน)\b/.test(text))score+=70;
    if(digits>0&&/(ที่|วันที่|โทร|พ.ศ.|\d{1,2}\/\d{1,2})/.test(text))score+=25;
    score-=symbols*18;
    if(latin>thai&&thai<5)score-=35;
    if(/[~`_^=]{2,}|[A-Za-z]{1,3}\s+[A-Za-z]{1,3}\s+[0-9๐-๙]/.test(text))score-=40;
    return score;
  }

  function removeNoiseBeforeHeader(text){
    const lines=splitLines(text);
    const headerIndex=lines.findIndex(line=>/บันทึกข้อความ|หนังสือราชการ|ส่วนราชการ/.test(line));
    if(headerIndex<=0)return {lines,removedNoise:[],needsReview:[]};
    const kept=[];
    const removedNoise=[];
    const needsReview=[];
    lines.slice(0,headerIndex).forEach(line=>{
      const score=lineMeaningScore(line);
      const looksLikeDocumentCode=/\d+[\/\-.]\d+|[ก-ฮA-Z]{1,6}\.?\s*\d+|วันที่|โทร|พ.ศ.|๒๕[0-9๐-๙]{2}/.test(line);
      if(looksLikeDocumentCode)needsReview.push({text:line,reason:'บรรทัดก่อนหัวข้ออาจเป็นเลขหนังสือ/วันที่/รหัสเอกสาร'});
      else if(score<25)removedNoise.push(line);
      else needsReview.push({text:line,reason:'บรรทัดก่อนหัวข้อมีความหมายไม่ชัด ควรตรวจเอง'});
    });
    return {lines:[...kept,...lines.slice(headerIndex)],removedNoise,needsReview};
  }

  function extractStructure(text){
    const source=String(text||'');
    const get=(name,pattern)=>({name,value:normalize((source.match(pattern)||[])[1]||''),found:pattern.test(source)});
    const items=[
      get('บันทึกข้อความ',/(บันทึกข้อความ)/),
      get('ส่วนราชการ',/ส่วนราชการ\s*[:：]?\s*(.+?)(?:\s+ที่\s|\s+วันที่\s|\n|$)/),
      get('ที่',/(?:^|\n)\s*ที่\s*[:：]?\s*([^\n]+)/),
      get('วันที่',/วันที่\s*[:：]?\s*([^\n]+)/),
      get('เรื่อง',/เรื่อง\s*[:：]?\s*([^\n]+)/),
      get('เรียน',/เรียน\s*[:：]?\s*([^\n]+)/),
      get('จึงเรียนมาเพื่อโปรดทราบและดำเนินการต่อไป',/(จึงเรียนมาเพื่อโปรดทราบ(?:และดำเนินการต่อไป)?)/),
      get('ชื่อผู้ลงนาม',/\(([^()]{4,60})\)/),
      get('ตำแหน่ง',/\)\s*\n?\s*([^\n]*(?:รักษาราชการแทน|นิติกร|ผู้อำนวยการ|หัวหน้า)[^\n]*)/)
    ];
    return {items,foundCount:items.filter(item=>item.value||item.found).length,total:items.length};
  }

  function detectBudgetYearWarning(text){
    const warnings=[];
    const source=String(text||'');
    const docYears=Array.from(source.matchAll(/(?:วันที่|\b)(?:[^\n]{0,40})(25\d{2}|๒๕[๐-๙]{2})/g)).map(m=>m[1]);
    const budgetYears=Array.from(source.matchAll(/ปีงบประมาณ\s*(25\d{2}|๒๕[๐-๙]{2})/g)).map(m=>m[1]);
    function toNum(year){return Number(String(year).replace(/[๐-๙]/g,ch=>'๐๑๒๓๔๕๖๗๘๙'.indexOf(ch)));}
    const docMax=Math.max(...docYears.map(toNum).filter(Boolean));
    budgetYears.forEach(year=>{
      const n=toNum(year);
      if(docMax&&n&&Math.abs(docMax-n)>2)warnings.push('ปีงบประมาณอาจอ่านผิด กรุณาตรวจสอบจากภาพต้นฉบับ');
      if(String(year)==='๒๕๒๕'||String(year)==='2525')warnings.push('ปีงบประมาณอาจอ่านผิด กรุณาตรวจสอบจากภาพต้นฉบับ');
    });
    return unique(warnings);
  }

  function collectReviewRequired(text,preserved,needsReview){
    const review=[...(needsReview||[])];
    preserved.forEach(item=>review.push({text:item.value,type:item.type,reason:'ข้อมูลสำคัญ ห้ามแก้แบบเดาสุ่ม กรุณาตรวจจากภาพต้นฉบับ'}));
    const source=String(text||'');
    const phoneMatches=source.match(/(?:โทร\.?|tel\.?|phone)?\s*[:：]?\s*(?:\+?66|0|[๐-๙])(?:[0-9๐-๙\-\s]){6,}/gi)||[];
    phoneMatches.forEach(value=>review.push({text:normalize(value),type:'เบอร์โทรศัพท์',reason:'ควรตรวจจากภาพต้นฉบับ'}));
    const macMatches=source.match(/\b[0-9A-F]{2}(?:[:-][0-9A-F]{2}){5}\b/gi)||[];
    macMatches.forEach(value=>review.push({text:normalize(value),type:'MAC Address',reason:'ควรตรวจจากภาพต้นฉบับ'}));
    return unique(review.map(item=>JSON.stringify(item))).map(item=>JSON.parse(item));
  }

  function formatGovernmentFinal(cleanText,uncertain,corrections,reviewRequired){
    const fixedLines=splitLines(cleanText).join('\n');
    const uncertainLines=(uncertain||[]).map(item=>'- '+(item.text||item)+' · '+(item.reason||'ไม่มั่นใจ')).join('\n')||'- ไม่มี';
    const correctionLines=(corrections||[]).map(item=>'- '+item.wrong+' → '+item.correct).join('\n')||'- ไม่มี';
    const reviewLines=(reviewRequired||[]).map(item=>'- '+(item.type?item.type+': ':'')+(item.text||'')+' · '+(item.reason||'ตรวจสอบเอง')).join('\n')||'- ไม่มี';
    return [
      '1. ข้อความที่ OQC แก้แล้ว',fixedLines,'',
      '2. จุดที่ระบบไม่มั่นใจ',uncertainLines,'',
      '3. คำที่ถูกแก้',correctionLines,'',
      '4. ข้อมูลที่ต้องให้ผู้ใช้ตรวจเอง',reviewLines
    ].join('\n');
  }

  function reviewGovernmentText(text){
    const type=detectGovernmentDocumentType(text);
    if(!type)return null;
    const noise=removeNoiseBeforeHeader(text);
    const afterNoise=noise.lines.join('\n');
    const corrected=applyGovernmentCorrections(afterNoise);
    const structure=extractStructure(corrected.text);
    const warnings=detectBudgetYearWarning(corrected.text);
    const uncertain=[];
    structure.items.filter(item=>!item.value&&!item.found).forEach(item=>uncertain.push({text:item.name,reason:'ไม่พบหัวข้อ/โครงสร้างนี้ชัดเจน'}));
    warnings.forEach(warning=>uncertain.push({text:warning,reason:'warning'}));
    const reviewRequired=collectReviewRequired(corrected.text,corrected.preserved,noise.needsReview);
    const finalText=formatGovernmentFinal(corrected.text,uncertain,corrected.corrections,reviewRequired);
    const confidencePenalty=uncertain.length*4+reviewRequired.length*2;
    const confidence=Math.max(40,Math.min(96,60+structure.foundCount*5-corrected.corrections.length-confidencePenalty));
    return {
      documentType:type,
      cleanText:corrected.text,
      finalText,
      confidence,
      structure,
      corrections:corrected.corrections,
      removedNoise:noise.removedNoise,
      uncertain,
      reviewRequired,
      warnings
    };
  }

  window.GovernmentOQC={GOVERNMENT_TYPES,GOVERNMENT_DICTIONARY,CORRECTION_RULES,detectGovernmentDocumentType,hasGovernmentStructure,reviewGovernmentText,formatGovernmentFinal};
})();

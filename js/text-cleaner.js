function resetFixReport(){
  AppState.fixedWords=[];
}

function expandReplacement(replacement,args){
  return String(replacement).replace(/\$(\d+)/g,(full,n)=>{
    const index=Number(n);
    return args[index]!==undefined?args[index]:full;
  });
}

function replaceTrack(text,pattern,replacement){
  let out=text;
  if(pattern instanceof RegExp){
    out=out.replace(pattern,(...args)=>{
      const match=args[0];
      const fixed=typeof replacement==='function'?replacement(...args):expandReplacement(replacement,args);
      if(match!==fixed)AppState.fixedWords.push({from:match,to:fixed});
      return fixed;
    });
  }else{
    const from=String(pattern);
    if(!from)return out;
    const parts=out.split(from);
    if(parts.length>1){
      for(let i=1;i<parts.length;i++)AppState.fixedWords.push({from,to:replacement});
      out=parts.join(replacement);
    }
  }
  return out;
}

function spacedWordRegex(word){
  const chars=Array.from(word).map(ch=>ch.replace(/[.*+?^{}()|[\]\\]/g,'\\$&'));
  return new RegExp(chars.join('\\s*'),'g');
}

function applyKnownThaiWordJoin(text){
  let out=text;
  const words=[
    'เกี่ยวข้อง','เรื่องโทรศัพท์','ลิงก์ทดสอบ','อาการเจอบ่อย','ได้รับการยืนยัน','ชื่อส่วนงาน','Route Pattern',
    'โทรศัพท์','เปลี่ยน','เป้าหมาย','ส่วนงาน','ขั้นตอน','เอกสาร','อุปกรณ์','ประเมิน','ใช้งาน','ทดแทน','ยืนยัน','ข้อมูล','ข้อความ','ตัวอักษร','ช่องว่าง','เครื่อง','เชื่อม','เกี่ยว','เรื่อง','เพื่อ','แจ้ง','ระบุ','ระบบ','ลูกค้า','ทดสอบ','อาการ','บ่อย','ชื่อ','งาน','ปิด'
  ];
  words.sort((a,b)=>Array.from(b).length-Array.from(a).length);
  for(const word of words){
    out=replaceTrack(out,spacedWordRegex(word),word);
  }
  return out;
}

function cleanText(text){
  resetFixReport();
  const level=$('cleanupLevel')?.value||AppState.cleanupLevel||'normal';
  AppState.cleanupLevel=level;
  let result=(text||'')
    .replace(/\r/g,'')
    .replace(/\$1\$2/g,'')
    .replace(/[ \t]+/g,' ')
    .replace(/\n{3,}/g,'\n\n')
    .trim();

  if(level==='raw')return result;
  if($('removeNoise')?.checked)result=fixNoise(result);
  if(level==='light'){
    result=fixUiOcrWords(result);
    if($('itDictionary')?.checked)result=applyItDictionary(result);
    result=applyCustomRules(result);
    return result.split('\n').map(line=>line.trim()).filter(Boolean).join('\n');
  }
  if($('itDictionary')?.checked)result=applyItDictionary(result);
  result=applyCustomRules(result);
  if($('cleanThai')?.checked)result=fixThaiWords(result);
  result=fixUiOcrWords(result);
  result=postCleanThai(result);

  const mode=$('modeSelect')?.value||'clean';
  if(mode==='plain')return result;
  if(mode==='document')return toDocument(result);
  if(mode==='table')return toTable(result);
  if(mode==='summary')return summarize(result);
  return result.split('\n').map(line=>line.trim()).filter(Boolean).join('\n');
}

function fixNoise(text){
  let out=text;
  const rules=[
    [/[○●◦▪▫◆◇□■�💀]/g,''],
    [/[ÊÉÈË]/g,''],[/[Ɵθϴ]/g,'ti'],[/[ƩΣ]/g,'tt'],[/ํ(?=า)/g,''],
    [/ที\s*[ÉEÊ]/g,'ที่'],[/เกี\s*[ÉEÊ]\s*ยว/g,'เกี่ยว'],[/เพื\s*[ÉEÊ]?/g,'เพื่อ'],
    [/ขึ\s*น/g,'ขึ้น'],[/ขั\s*น/g,'ขั้น'],[/ป\s*ด/g,'ปิด'],[/ว่\s*า/g,'ว่า'],
    [/ประ\s*เมิ\s*น/g,'ประเมิน'],[/อุ\s*ปกร\s*ณ์/g,'อุปกรณ์'],[/ง\s*3\s*ระบบ/g,'ทั้ง 3 ระบบ']
  ];
  for(const [pattern,replacement] of rules)out=replaceTrack(out,pattern,replacement);
  return out;
}

function fixUiOcrWords(text){
  let out=text||'';
  const isUiGarbageLine=line=>{
    const compact=line.replace(/\s/g,'');
    if(!compact)return false;
    if(compact.length<=24&&/(?:utv|vut|\[=|=11|=๑๑)/i.test(compact))return true;
    return /^[vVdDutเอ\[\]=\-_,.01๑๒]+$/.test(compact)&&compact.length<=18;
  };
  out=out.split('\n').filter(line=>!isUiGarbageLine(line)).join('\n');
  const rules=[
    [/^\s*v(?:d)?\s+(?=\S)/gim,''],
    [/\s+v(?:d)?\s*$/gim,''],
    [/แป\s*ป\s*ลง/g,'แปลง'],
    [/scnan\s*แป\s*ป\s*ลง/gi,'แปลง'],
    [/สแกน\s*แป\s*ป\s*ลง/g,'สแกน แปลง'],
    [/ลบช่องว่างง/g,'ลบช่องว่าง'],
    [/ช่องว่างง/g,'ช่องว่าง'],
    [/สบอกษรแปลก/g,'ลบอักษรแปลก'],
    [/สบยกษรแปตาก/g,'ลบอักษรแปลก'],
    [/ส[บป]ย?กษรแป[ลต]าก/g,'ลบอักษรแปลก'],
    [/ลบอ[กั]ษรแปลก/g,'ลบอักษรแปลก'],
    [/รวมคาไทยผิดช่องว่าง/g,'รวมคำไทยผิดช่องว่าง'],
    [/รวมคศ์ฯไทยผิดซ่องว่าง/g,'รวมคำไทยผิดช่องว่าง'],
    [/รวมค\S{0,4}ไทยผิด[ซช]่องว่าง/g,'รวมคำไทยผิดช่องว่าง'],
    [/รวมคำไทยผิดช่องว่างง/g,'รวมคำไทยผิดช่องว่าง'],
    [/รายการศาทหแก/g,'รายการคำที่แก้'],
    [/รายคทารศาทหแก้/g,'รายการคำที่แก้'],
    [/ราย\S{0,4}ารศา\S{0,3}แก้/g,'รายการคำที่แก้'],
    [/รายการศา[ทที]่?แก/g,'รายการคำที่แก้'],
    [/Dictionary\s+ITNT/gi,'Dictionary IT/NOC'],
    [/Dictionary\s+IT\s*[/|\\]?\s*N[O0]C/gi,'Dictionary IT/NOC'],
    [/คาแก้เอง/g,'คำแก้เอง'],
    [/เพิ่มคาแก้เอง/g,'เพิ่มคำแก้เอง'],
    [/ขยายภาพ\s+Contrast/gi,'ขยายภาพ\nContrast'],
    [/Preset:\s*Auto\s*v/gi,'Preset: Auto'],
    [/Cleanup:\s*Balanced\s*\w*/gi,'Cleanup: Balanced'],
    [/ไทย\s*\+\s*อังกฤษ\s*[”"']/g,'ไทย + อังกฤษ'],
    [/ลบช่องว่าง\/อักษรแปลก\s*[”"']/g,'ลบช่องว่าง/อักษรแปลก']
  ];
  for(const [pattern,replacement] of rules)out=replaceTrack(out,pattern,replacement);
  out=out.split('\n').filter(line=>!isUiGarbageLine(line)).join('\n');
  return out;
}

function fixThaiWords(text){
  let out=text;
  const replacements=[
    ['เป้ําหมําย','เป้าหมาย'],['เป้าหมําย','เป้าหมาย'],['เป้ า หมาย','เป้าหมาย'],['เป้า หมาย','เป้าหมาย'],['เป้ าหมาย','เป้าหมาย'],
    ['ชื่อส่วนงําน','ชื่อส่วนงาน'],['ชื่อส่วน งาน','ชื่อส่วนงาน'],['ชื่อ ส่วนงาน','ชื่อส่วนงาน'],['ชื่อ ส่วน งาน','ชื่อส่วนงาน'],['ส่วนงําน','ส่วนงาน'],['ส่วน งาน','ส่วนงาน'],
    ['เพื่อ่ออ','เพื่อ'],['เพื่อ่อ','เพื่อ'],['เพื่่อ','เพื่อ'],['เพื อ','เพื่อ'],['เพื','เพื่อ'],
    ['เปลี ยน','เปลี่ยน'],['เปลี ่ยน','เปลี่ยน'],['เปลี่ ยน','เปลี่ยน'],
    ['ที เกี ยวข้อง','ที่เกี่ยวข้อง'],['ที เกี ยว','ที่เกี่ยว'],['ที่ เกี่ยวข้อง','ที่เกี่ยวข้อง'],['ที่ เกี่ยว','ที่เกี่ยว'],
    ['เกี ยวข้อง','เกี่ยวข้อง'],['เกี ยว','เกี่ยว'],['เกี่ย วข้อง','เกี่ยวข้อง'],
    ['เรื องโทรศัพท์','เรื่องโทรศัพท์'],['เรื อง โทรศัพท์','เรื่องโทรศัพท์'],['เรื่อง โทรศัพท์','เรื่องโทรศัพท์'],
    ['เรื อง','เรื่อง'],['โทร ศัพท์','โทรศัพท์'],['โทรศัพ ท์','โทรศัพท์'],['โทรศั พท์','โทรศัพท์'],['โทรศั พ ท์','โทรศัพท์'],
    ['เครื อง','เครื่อง'],['เชื อม','เชื่อม'],
    ['ข้ อมูล','ข้อมูล'],['ตั วอักษร','ตัวอักษร'],['ช่ องว่าง','ช่องว่าง'],['ช่องว่า','ช่องว่าง'],
    ['ขั นตอน','ขั้นตอน'],['ขั น','ขั้น'],['เอก สาร','เอกสาร'],['หเอกสาร','เอกสาร'],
    ['เจอ บ่อย','เจอบ่อย'],['อาการที่ เจอบ่อย','อาการที่เจอบ่อย'],['เข้ใจ','เข้าใจ'],['เข้ ใจ','เข้าใจ'],
    ['ลค ทดสอบ','ลิงก์ทดสอบ'],['ลค','ลูกค้า'],['ฟังก์ ชัน','ฟังก์ชัน'],['บรร ทัด','บรรทัด'],['หัว ข้อ','หัวข้อ'],
    ['ปิด Case','ปิด Case'],['ป ด Case','ปิด Case'],['แจ้ ง','แจ้ง'],['แจ้ง PM','แจ้ง PM'],['แจ้ง NOC','แจ้ง NOC'],
    ['ยื น ยั น','ยืนยัน'],['ได้รับการ ยืนยัน','ได้รับการยืนยัน'],['จัด ส่ง','จัดส่ง'],['ทดแทน','ทดแทน'],['Close Ticket','Close Ticket'],
    ['ระ บุ','ระบุ'],['อาการ เช่น','อาการ เช่น'],['ใช้งาน','ใช้งาน'],['ประเมิน','ประเมิน'],['Hardware เสีย','Hardware เสีย'],
    ['ง 3 ระบบ','ทั้ง 3 ระบบ'],['ทั ง 3 ระบบ','ทั้ง 3 ระบบ'],['ทั้ง 3 ระบบ','ทั้ง 3 ระบบ']
  ];
  for(const [from,to] of replacements)out=replaceTrack(out,from,to);
  out=applyKnownThaiWordJoin(out);
  out=replaceTrack(out,/([เแโใไ])\s+([ก-ฮ])/g,'$1$2');
  out=replaceTrack(out,/([ก-ฮ])\s+([ะาำิีึืุูั็่้๊๋์])/g,'$1$2');
  out=replaceTrack(out,/([ก-ฮ])\s+([ก-ฮ])(?=(?:ว่า|ที่|แล้ว|อยู่|ด้วย|จาก|ให้|ของ|การ|งาน|ระบบ|เครื่อง|เอกสาร|ขั้นตอน|บ่อย|ข้อมูล|ข้อความ|ลิงก์|ประเมิน|อุปกรณ์|ทดแทน|เพื่อ|เปลี่ยน|เกี่ยว|ข้อง|เรื่อง|โทรศัพท์|เป้าหมาย|ส่วนงาน))/g,'$1$2');
  return out;
}

function normalizeRepeatedThai(text){
  return (text||'')
    .replace(/([ะาำิีึืุูั็่้๊๋์])\1+/g,'$1')
    .replace(/([เแโใไ])\1+/g,'$1')
    .replace(/อ{3,}/g,'อ')
    .replace(/่{2,}/g,'่')
    .replace(/้{2,}/g,'้');
}

function postCleanThai(text){
  let out=(text||'')
    .replace(/\$1\$2/g,'')
    .replace(/[ÊÉÈË]/g,'')
    .replace(/ํ(?=า)/g,'')
    .replace(/เป้\s*า\s*หม\s*าย/g,'เป้าหมาย')
    .replace(/เป้าหม\s*าย/g,'เป้าหมาย')
    .replace(/ชื่อ\s*ส่วน\s*ง?าน/g,'ชื่อส่วนงาน')
    .replace(/ส่วน\s*ง?าน/g,'ส่วนงาน')
    .replace(/\bง\s*3\s*ระบบ\b/g,'ทั้ง 3 ระบบ')
    .replace(/ทั\s*ง\s*3\s*ระบบ/g,'ทั้ง 3 ระบบ')
    .replace(/เพื\s*อ/g,'เพื่อ')
    .replace(/เพื\s*$/gm,'เพื่อ')
    .replace(/เพื่อ[่้๊๋์]*อ+/g,'เพื่อ')
    .replace(/เพื่ออ+/g,'เพื่อ')
    .replace(/เปลี\s*ยน/g,'เปลี่ยน')
    .replace(/เปลี่\s*ยน/g,'เปลี่ยน')
    .replace(/ที\s+เกี\s*ยว/g,'ที่เกี่ยว')
    .replace(/ที่\s+เกี่ยว/g,'ที่เกี่ยว')
    .replace(/เกี\s*ยว\s*ข้อง/g,'เกี่ยวข้อง')
    .replace(/เกี\s*ยว/g,'เกี่ยว')
    .replace(/เรื\s*อง\s*โทร\s*ศัพท์/g,'เรื่องโทรศัพท์')
    .replace(/เรื\s*อง/g,'เรื่อง')
    .replace(/เรื่อง\s+โทรศัพท์/g,'เรื่องโทรศัพท์')
    .replace(/โทร\s*ศั\s*พ\s*ท์/g,'โทรศัพท์')
    .replace(/โทร\s*ศัพ\s*ท์/g,'โทรศัพท์')
    .replace(/โทร\s*ศัพท์/g,'โทรศัพท์')
    .replace(/\s+([ะาำิีึืุูั็่้๊๋์])/g,'$1')
    .replace(/([เแโใไ])\s+/g,'$1')
    .replace(/([ก-ฮ])\s+([่้๊๋์])/g,'$1$2')
    .replace(/แจ้ง\s+/g,'แจ้ง ')
    .replace(/เพื่อ\s+/g,'เพื่อ ')
    .replace(/ได้รับการ\s+ยืนยัน/g,'ได้รับการยืนยัน')
    .replace(/จัด\s*ส่ง/g,'จัดส่ง')
    .replace(/อุปกร\s*ณ์/g,'อุปกรณ์')
    .replace(/ประเมิ\s*น/g,'ประเมิน')
    .replace(/ใช้งา\s*น/g,'ใช้งาน')
    .replace(/ลิงก์ทดสอบ\s*ใช้งาน/g,'ลิงก์ทดสอบใช้งาน')
    .replace(/ATA\s+Hardware\s+เสีย/g,'ATA Hardware เสีย');
  out=applyKnownThaiWordJoin(out);
  out=normalizeRepeatedThai(out);
  return out
    .replace(/\s{2,}/g,' ')
    .replace(/\n\s+/g,'\n')
    .trim();
}

function toDocument(text){
  const lines=text.split('\n').map(x=>x.trim()).filter(Boolean);
  return lines.join('\n\n');
}

function toTable(text){
  const lines=text.split('\n').map(x=>x.trim()).filter(Boolean);
  return lines.map(line=>'| '+line.split(/\s{2,}|\t|,/).map(x=>x.trim()).filter(Boolean).join(' | ')+' |').join('\n');
}

function summarize(text){
  const lines=text.split('\n').map(x=>x.trim()).filter(x=>x.length>8);
  return lines.slice(0,12).map(line=>'- '+line).join('\n');
}

function renderFixReport(){
  const box=$('fixReport');
  if(!box)return;
  const items=AppState.fixedWords.slice(0,80);
  if(!items.length){box.textContent='ไม่มีรายการคำที่แก้';return;}
  box.innerHTML=items.map(x=>'<span class="fix-item">'+escapeHtml(x.from)+' → '+escapeHtml(x.to)+'</span>').join('');
}

function calculateConfidence(raw,cleaned){
  const rawLen=(raw||'').replace(/\s/g,'').length;
  if(!rawLen)return 0;
  const weird=((raw||'').match(/[�ƟθϴƩΣÉÊÈË○●$ํ]/g)||[]).length;
  const fixCount=AppState.fixedWords.length;
  const suspicious=typeof findSuspiciousOcrTokens==='function'?findSuspiciousOcrTokens(cleaned||''):[];
  const suspiciousCount=suspicious.reduce((sum,item)=>sum+(item.count||0),0);
  let score=100-Math.min(35,weird*3)-Math.min(25,fixCount*.8)-Math.min(18,suspiciousCount*1.4);
  if(cleaned.length<raw.length*.45)score-=10;
  return Math.max(35,Math.min(99,Math.round(score)));
}

function renderConfidence(score){
  const box=$('confidenceBox');
  if(!box)return;
  box.className='confidence '+(score>=80?'good':score>=60?'warn':'bad');
  box.textContent='Confidence: '+score+'% · Fixed: '+AppState.fixedWords.length+' จุด';
}

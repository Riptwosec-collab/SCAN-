function cleanText(text){
  let result=(text||'')
    .replace(/\r/g,'')
    .replace(/[ \t]+/g,' ')
    .replace(/\n{3,}/g,'\n\n')
    .trim();

  if($('removeNoise')?.checked)result=fixNoise(result);
  if($('cleanThai')?.checked)result=fixThaiWords(result);

  const mode=$('modeSelect')?.value||'clean';
  if(mode==='plain')return result;
  if(mode==='document')return toDocument(result);
  if(mode==='table')return toTable(result);
  if(mode==='summary')return summarize(result);
  return result.split('\n').map(line=>line.trim()).filter(Boolean).join('\n');
}

function fixNoise(text){
  return text
    .replace(/[○●◦▪▫◆◇□■�]/g,'')
    .replace(/[Ɵθϴ]/g,'ti')
    .replace(/[ƩΣ]/g,'tt')
    .replace(/ที\s*[ÉE]/g,'ที่')
    .replace(/เกี\s*[ÉE]\s*ยว/g,'เกี่ยว')
    .replace(/ขึ\s*น/g,'ขึ้น')
    .replace(/ขั\s*น/g,'ขั้น')
    .replace(/\bSD\s*WAN\b/gi,'SD-WAN')
    .replace(/\bCUCM\s*(\d+)\b/gi,'CUCM$1')
    .replace(/\bnoc\b/gi,'NOC')
    .replace(/\bcase\b/gi,'Case')
    .replace(/pa\s*tt\s*ern/gi,'pattern')
    .replace(/pa\s*[ƩΣ]\s*ern/gi,'pattern')
    .replace(/configura\s*ti\s*o?n?/gi,'configuration')
    .replace(/informa\s*ti\s*o?n?/gi,'information')
    .replace(/opera\s*ti\s*o?n?/gi,'operation')
    .replace(/loca\s*ti\s*o?n?/gi,'location')
    .replace(/destina\s*ti\s*o?n?/gi,'destination');
}

function fixThaiWords(text){
  const replacements=[
    ['เพื อ','เพื่อ'],['เปลี ยน','เปลี่ยน'],['เครื อง','เครื่อง'],['เรื อง','เรื่อง'],['เชื อม','เชื่อม'],
    ['ข้ อมูล','ข้อมูล'],['ตั วอักษร','ตัวอักษร'],['ช่ องว่าง','ช่องว่าง'],['ช่องว่า','ช่องว่าง'],
    ['ขั นตอน','ขั้นตอน'],['ขั น','ขั้น'],['เอก สาร','เอกสาร'],['หเอกสาร','เอกสาร'],
    ['เจอ บ่อย','เจอบ่อย'],['อาการที่ เจอบ่อย','อาการที่เจอบ่อย'],['เข้ใจ','เข้าใจ'],['เข้ ใจ','เข้าใจ'],
    ['ลค ทดสอบ','ลิงก์ทดสอบ'],['ฟังก์ ชัน','ฟังก์ชัน'],['บรร ทัด','บรรทัด'],['หัว ข้อ','หัวข้อ']
  ];
  for(const [from,to] of replacements)text=text.split(from).join(to);

  return text
    .replace(/([เแโใไ])\s+([ก-ฮ])/g,'$1$2')
    .replace(/([ก-ฮ])\s+([ะาำิีึืุูั็่้๊๋์])/g,'$1$2')
    .replace(/([ก-ฮ])\s+([ก-ฮ])(?=(?:ว่า|ที่|แล้ว|อยู่|ด้วย|จาก|ให้|ของ|การ|งาน|ระบบ|เครื่อง|เอกสาร|ขั้นตอน|บ่อย|ข้อมูล|ข้อความ))/g,'$1$2');
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

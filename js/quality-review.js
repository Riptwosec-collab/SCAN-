const OCR_REVIEW_WORDS=[
  'เป้าหมาย','ชื่อส่วนงาน','เกี่ยวข้อง','เรื่องโทรศัพท์','ลิงก์ทดสอบ','อาการเจอบ่อย','ได้รับการยืนยัน','Route Pattern',
  'Host assigned','Default Gateway','Network Connection Details','Ethernet','Wireless','IPv4 Address','Subnet Mask','DHCP Enabled','Lease Obtained','Lease Expires',
  'โทรศัพท์','เปลี่ยน','ขั้นตอน','เอกสาร','อุปกรณ์','ประเมิน','ใช้งาน','ทดแทน','ยืนยัน','ข้อมูล','ข้อความ','ตัวอักษร','ช่องว่าง','เครื่อง','เชื่อม','เกี่ยว','เรื่อง','เพื่อ','แจ้ง','ระบุ','ระบบ','ลูกค้า','ทดสอบ','อาการ','บ่อย','ชื่อ','งาน','ปิด'
];

function escapeReviewRegExp(value){
  return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}

function reviewWordRegex(word){
  return new RegExp(Array.from(word).map(ch=>escapeReviewRegExp(ch)).join('\\s*'),'g');
}

function removeOcrGarbageLines(text){
  return String(text||'')
    .split('\n')
    .map(line=>line.trim())
    .filter(line=>{
      if(!line)return false;
      const compact=line.replace(/\s/g,'');
      if(compact.length>18 && /(.)\1{10,}/.test(compact))return false;
      if(compact.length>18 && /(กร|รร){8,}/.test(compact))return false;
      return true;
    })
    .join('\n');
}

function normalizeBrowserNoise(text){
  let out=text||'';
  return out
    .replace(/งเ๑๐พ\s*15:11\s*4\s*2\s*อคด/gi,'')
    .replace(/NE\s*CE\s*INC/gi,'')
    .replace(/เ@\s*92\s*axaudit\.rdgoth\s*\(?1\)?/gi,'axaudit.rdgoth')
    .replace(/กรร{8,}5?/g,'')
    .replace(/(?:กร){8,}5?/g,'')
    .replace(/รร{8,}5?/g,'')
    .replace(/[“”«»]/g,'')
    .replace(/\s{2,}/g,' ');
}

function normalizeIpLikeText(text){
  let out=normalizeBrowserNoise(text||'');
  out=out
    .replace(/Host\s+assigned\s+to/gi,'Host assigned to')
    .replace(/assigned\s+to/gi,'assigned to')
    .replace(/10\s+39\s+20/g,'10.39.20')
    .replace(/0\s*\.\s*2\s*\.\s*32\s*\.\s*0\s*(?:ไท|งไส|งไส28|๓)*/g,'0.2.32.0')
    .replace(/(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/g,'$1.$2.$3.$4')
    .replace(/(\d{1,3})\s*\.\s*(\d{1,3})\s*\.\s*(\d{1,3})\s*\.\s*(\d{1,3})/g,'$1.$2.$3.$4')
    .replace(/(\d{1,3}(?:\.\d{1,3}){3})(?:\s*(?:ไท|งไส|งใส|งไส\d+|๓|๐|๕|๒|เทท|ไล|ท5|ว22|วไซษ์ี|รรุ5))+/g,'$1')
    .replace(/เทท|ไล|ท5|ว22|วไซษ์ี|รรุ5|งไส\d*|งใส\d*|ไท/g,'')
    .replace(/\s{2,}/g,' ');
  return removeOcrGarbageLines(out);
}

function finalOcrReview(text){
  let out=normalizeIpLikeText(text||'');

  const directRules=[
    [/ํ(?=า)/g,''],[/[ÊÉÈË]/g,''],[/\$1\$2/g,''],[/เพื่อ[่้๊๋์]*อ+/g,'เพื่อ'],[/เพื่ออ+/g,'เพื่อ'],
    [/เพื\s*อ/g,'เพื่อ'],[/เปลี\s*ยน/g,'เปลี่ยน'],[/เปลี่\s*ยน/g,'เปลี่ยน'],
    [/เป้\s*า\s*หม\s*าย/g,'เป้าหมาย'],[/เป้าหม\s*าย/g,'เป้าหมาย'],[/ชื่อ\s*ส่วน\s*ง?าน/g,'ชื่อส่วนงาน'],[/ส่วน\s*ง?าน/g,'ส่วนงาน'],
    [/ที\s+เกี\s*ยว/g,'ที่เกี่ยว'],[/ที่\s+เกี่ยว/g,'ที่เกี่ยว'],[/เกี\s*ยว\s*ข้อง/g,'เกี่ยวข้อง'],[/เกี\s*ยว/g,'เกี่ยว'],
    [/เรื\s*อง\s*โทร\s*ศัพท์/g,'เรื่องโทรศัพท์'],[/เรื\s*อง/g,'เรื่อง'],[/เรื่อง\s+โทรศัพท์/g,'เรื่องโทรศัพท์'],
    [/โทร\s*ศั\s*พ\s*ท์/g,'โทรศัพท์'],[/โทร\s*ศัพ\s*ท์/g,'โทรศัพท์'],[/โทร\s*ศัพท์/g,'โทรศัพท์'],
    [/อุ\s*ป\s*กร\s*ณ์/g,'อุปกรณ์'],[/ประ\s*เมิ\s*น/g,'ประเมิน'],[/ใช้\s*งา\s*น/g,'ใช้งาน'],[/ขั้?\s*น\s*ตอน/g,'ขั้นตอน']
  ];

  for(const [pattern,replacement] of directRules){
    out=replaceTrack(out,pattern,replacement);
  }

  const words=[...OCR_REVIEW_WORDS].sort((a,b)=>Array.from(b).length-Array.from(a).length);
  for(const word of words){
    out=replaceTrack(out,reviewWordRegex(word),word);
  }

  out=normalizeIpLikeText(out)
    .replace(/([ะาำิีึืุูั็่้๊๋์])\1+/g,'$1')
    .replace(/([เแโใไ])\1+/g,'$1')
    .replace(/อ{3,}/g,'อ')
    .replace(/\s+([ะาำิีึืุูั็่้๊๋์])/g,'$1')
    .replace(/([เแโใไ])\s+/g,'$1')
    .replace(/([ก-ฮ])\s+([่้๊๋์])/g,'$1$2')
    .replace(/\s{2,}/g,' ')
    .replace(/\n\s+/g,'\n')
    .trim();

  return removeOcrGarbageLines(out);
}

function findSuspiciousOcrTokens(text){
  const found=[];
  const checks=[
    {name:'อักษรแปลก',regex:/[�ƟθϴƩΣÉÊÈË]/g},
    {name:'ตัวแทน regex หลุด',regex:/\$\d+/g},
    {name:'สระ/วรรณยุกต์แยกจากคำ',regex:/\s+[ะาำิีึืุูั็่้๊๋์]/g},
    {name:'คำไทยมีช่องว่างกลางคำ',regex:/[เแโใไก-ฮ]\s+[ะาำิีึืุูั็่้๊๋์ก-ฮ]/g},
    {name:'นิคหิตผิดตำแหน่ง',regex:/ํ(?=า)/g}
  ];
  for(const check of checks){
    const matches=text.match(check.regex)||[];
    if(matches.length)found.push({name:check.name,count:matches.length,sample:matches.slice(0,5)});
  }
  return found;
}

function renderOcrReview(raw,cleaned){
  const issues=findSuspiciousOcrTokens(cleaned);
  const box=$('fixReport');
  if(!box)return;
  const fixed=(AppState.fixedWords||[]).slice(0,80).map(x=>'<span class="fix-item">'+escapeHtml(x.from)+' → '+escapeHtml(x.to)+'</span>').join('');
  const review=issues.length
    ? '<div class="hint">ยังพบจุดน่าสงสัย: '+issues.map(i=>i.name+' '+i.count+' จุด').join(' · ')+'</div>'
    : '<div class="hint">ตรวจละเอียดแล้ว ไม่พบรูปแบบ OCR แปลกที่พบบ่อย</div>';
  box.innerHTML=(fixed||'ไม่มีรายการคำที่แก้')+review;
}

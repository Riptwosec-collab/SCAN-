const OCR_REVIEW_WORDS=[
  'เป้าหมาย','ชื่อส่วนงาน','เกี่ยวข้อง','เรื่องโทรศัพท์','ลิงก์ทดสอบ','อาการเจอบ่อย','ได้รับการยืนยัน','Route Pattern',
  'Host assigned','Default Gateway','Network Connection Details','Ethernet','Wireless','IPv4 Address','Subnet Mask','DHCP Enabled','Lease Obtained','Lease Expires','email','e-mail','อีเมล','หรืออีเมล','ติดต่อได้','ผู้ติดต่อ',
  'โทรศัพท์','เปลี่ยน','ขั้นตอน','เอกสาร','อุปกรณ์','ประเมิน','ใช้งาน','ทดแทน','ยืนยัน','ข้อมูล','ข้อความ','ตัวอักษร','ช่องว่าง','เครื่อง','เชื่อม','เกี่ยว','เรื่อง','เพื่อ','แจ้ง','ระบุ','ระบบ','ลูกค้า','ทดสอบ','อาการ','บ่อย','ชื่อ','งาน','ปิด','ผู้'
];

const OCR_CORRECT_WORDS=[
  ...OCR_REVIEW_WORDS,
  'ลบอักษรแปลก','รวมคำไทยผิดช่องว่าง','รายการคำที่แก้','เพิ่มคำแก้เอง','ขยายภาพ','เลือกทั้งภาพ','ลากเมาส์บนภาพ','พื้นที่ OCR','ตั้งค่าไว้','พรีวิวรูปถูกซ่อน',
  'ใบกำกับภาษี','หนังสือมอบอำนาจ','เลขประจำตัว','จำนวนเงิน','สำคัญ','บริษัท','จำกัด','ที่อยู่','ใบเสร็จ','สัญญา','อนุมัติ','โหมด Incognito','รบกวน','ตรวจสอบ','ข้อมูลเพิ่มเติม','ขอแสดงความนับถือ',
  'ใบสำคัญจ่าย','ราคาสุทธิ','ผู้รับเงิน','ผู้ว่าจ้าง','สิ่งที่ส่งมาด้วย','เพื่อทราบ','ได้รับ','ยอดรวมทั้งหมด','ยอดรวมทั้งสิ้น',
  'เรียน','ท่าน','ผู้ใช้บริการ','อ้างอิง','ขอบพระคุณ','ความไว้วางใจ','ใช้บริการ','เช่าวงจร','สื่อสัญญาณ','ความเร็วสูง','ตระหนักถึง','ความสำคัญ','ดังกล่าว','จึงมีนโยบาย','พัฒนา','ประสิทธิภาพ','เครือข่าย','สัญญาณ','อย่างต่อเนื่อง','ทั้งนี้','เอกสารแนบท้าย','จึงเรียนมาเพื่อโปรดทราบ','ขออภัย','ความไม่สะดวก','ครั้งนี้','เป็นอย่างยิ่ง','ต้องการ','เพิ่มเติม','เปลี่ยนแปลง','ผู้รับ','กรุณาติดต่อ','ความนับถือ','ผู้อำนวยการ','ฝ่าย',
  'การจัดสรร','เพื่อรองรับ','โครงการปรับปรุง','ระบบควบคุมลูกหนี้ภาษีอากร','ลูกหนี้','ภาษีอากร',
  'วันที่','จาก','ถึง','เรื่อง','Ticket No.','URL','Domain','email','workd.go.th','network@dga.or.th',
  'IPv4','MAC Address','VLAN','Interface','Gateway','DNS','Serial Number','Options','Preset','Cleanup','Balanced','Dictionary','Contrast','Original','Crop','Search','Clear','Copy','Output','History','Confidence'
];

const OCR_WRONG_WORD_RULES=[
  [/ใบกาํ?\s*กับภาษี|ใบกากับภาษี/g,'ใบกำกับภาษี'],
  [/หนังสือมอมอำนาจ|หนงสือมอบอานาจ/g,'หนังสือมอบอำนาจ'],
  [/เลขประจาํ?\s*ตัว/g,'เลขประจำตัว'],
  [/จานว[นณ]เงิน/g,'จำนวนเงิน'],
  [/สาํ?\s*คัญ/g,'สำคัญ'],
  [/บริษท|บรีษัท/g,'บริษัท'],
  [/บรอษษท/g,'บริษัท'],
  [/จากัด|จากด|จจากษด/g,'จำกัด'],
  [/ที่อยู(?!่)|ทอยู/g,'ที่อยู่'],
  [/โทรศัพท(?!์)|โทรศพท์|โทรศษทพร/g,'โทรศัพท์'],
  [/ใบเสรจ็?|ใบเสรจ/g,'ใบเสร็จ'],
  [/สญญญา|สญญา/g,'สัญญา'],
  [/อนุมต(?!ิ)|อนมัติ/g,'อนุมัติ'],
  [/ใบสาํ?\s*คัญจ่าย|ใบสาคัญจ่าย/g,'ใบสำคัญจ่าย'],
  [/ราคาสทธ|ราคาสทุ\s*ธิ/g,'ราคาสุทธิ'],
  [/ผ้รับเงิน|ผูรับเงิน/g,'ผู้รับเงิน'],
  [/ผ้จ้าง|ผู้จ้าง/g,'ผู้ว่าจ้าง'],
  [/หนงสือ|หนังสอ/g,'หนังสือ'],
  [/สิงที่ส่งมาด้วย/g,'สิ่งที่ส่งมาด้วย'],
  [/เพือทราบ/g,'เพื่อทราบ'],
  [/ไดรับ/g,'ได้รับ'],
  [/ยอดรวมท[งั]หมด/g,'ยอดรวมทั้งหมด'],
  [/ยอดรวมทังสิ้น/g,'ยอดรวมทั้งสิ้น'],
  [/ข้อมล/g,'ข้อมูล'],
  [/ธีเมล/g,'อีเมล'],
  [/เหมศ|เหมเศิ/g,'โหมด'],
  [/หรัต/g,'หรือ'],
  [/ชีกครัง|อีกครัง/g,'อีกครั้ง'],
  [/รบกรน/g,'รบกวน'],
  [/ทตสอบ/g,'ทดสอบ'],
  [/ทาการ/g,'ทำการ'],
  [/เสืตกพตรป/g,'เลือกรูป'],
  [/ตรวจส[ขร]บ/g,'ตรวจสอบ'],
  [/ขัตมูลเพ็มเติม|ขอมูลเพิ่มเติม/g,'ข้อมูลเพิ่มเติม'],
  [/ทุกขั้น/g,'ทุกวัน'],
  [/ตลดต/g,'ตลอด'],
  [/ซั้วโมง/g,'ชั่วโมง'],
  [/ขตแสดงตวามนับถืต/g,'ขอแสดงความนับถือ'],
  [/เจลาๆ/g,'เวลา'],
  [/คสุณ/g,'คุณ'],
  [/วษนทรร/g,'วันที่'],
  [/เรรรอง|เรือ่ง/g,'เรื่อง'],
  [/แจอง/g,'แจ้ง'],
  [/กจาหนดการ/g,'กำหนดการ'],
  [/แจ้งกจาหนดการ|แจองกจาหนดการ/g,'แจ้งกำหนดการ'],
  [/ปรษบปรคง|ปรับปรง/g,'ปรับปรุง'],
  [/เรรยน/g,'เรียน'],
  [/ททาน/g,'ท่าน'],
  [/ผผอใชอบรอการ/g,'ผู้ใช้บริการ'],
  [/ออางออง/g,'อ้างอิง'],
  [/ขอบพระคคณ/g,'ขอบพระคุณ'],
  [/ความไวอวางใจ/g,'ความไว้วางใจ'],
  [/ใชอบรอการ/g,'ใช้บริการ'],
  [/เชทาวงจร/g,'เช่าวงจร'],
  [/สรรอสษญญาณ/g,'สื่อสัญญาณ'],
  [/ความเรตวสผง/g,'ความเร็วสูง'],
  [/ตระหนษกถจง/g,'ตระหนักถึง'],
  [/ความสจาคษญ/g,'ความสำคัญ'],
  [/ดษงกลทาว/g,'ดังกล่าว'],
  [/จจงมรนโยบาย/g,'จึงมีนโยบาย'],
  [/ทรรจะ/g,'ที่จะ'],
  [/พษฒนา/g,'พัฒนา'],
  [/ประสอทธอภาพ/g,'ประสิทธิภาพ'],
  [/เครรอขทาย/g,'เครือข่าย'],
  [/สษญญาณ/g,'สัญญาณ'],
  [/อยทางตทอเนรรอง/g,'อย่างต่อเนื่อง'],
  [/ทษรงนรร/g,'ทั้งนี้'],
  [/ใครทขอแจอง/g,'ใคร่ขอแจ้ง'],
  [/เอกสารแนบทอาย/g,'เอกสารแนบท้าย'],
  [/จจงเรรยนมาเพรรอโปรดทราบ/g,'จึงเรียนมาเพื่อโปรดทราบ'],
  [/ขออภษย/g,'ขออภัย'],
  [/ความไมทสะดวก/g,'ความไม่สะดวก'],
  [/ครษรงนรร/g,'ครั้งนี้'],
  [/เปปนอยทางยอรง/g,'เป็นอย่างยิ่ง'],
  [/ตอองการ/g,'ต้องการ'],
  [/ขออมผล/g,'ข้อมูล'],
  [/เพอรมเตอม/g,'เพิ่มเติม'],
  [/หรรอ/g,'หรือ'],
  [/เปลรรยนแปลง/g,'เปลี่ยนแปลง'],
  [/ผผอรษบ/g,'ผู้รับ'],
  [/กรคณาตอดตทอ/g,'กรุณาติดต่อ'],
  [/ความนษบถรอ/g,'ความนับถือ'],
  [/ผผออจานวยการ/g,'ผู้อำนวยการ'],
  [/ฝฝาย/g,'ฝ่าย'],
  [/การฉัดสรร/g,'การจัดสรร'],
  [/ฉัดสรร/g,'จัดสรร'],
  [/เพื่อรองรัน/g,'เพื่อรองรับ'],
  [/รองรัน/g,'รองรับ'],
  [/โครงการปฐับปรง/g,'โครงการปรับปรุง'],
  [/ปฐับปรง/g,'ปรับปรุง'],
  [/ระบบควบคุมลกหนี่กาษีอากร/g,'ระบบควบคุมลูกหนี้ภาษีอากร'],
  [/ลกหนี่|ลูกหนี่/g,'ลูกหนี้'],
  [/กาษีอากร/g,'ภาษีอากร'],
  [/คา(?=ไทย|แก้|ที่)/g,'คำ'],
  [/เป็นเปอร์เซ็นต[ด์]*ด้านล่าง|เป็นเปอร์เซ็นต[ด์]*้?านล่าง/g,'เป็นเปอร์เซ็นต์ด้านล่าง'],
  [/พววิวรปกกซอน่ตามทฑีตังค้่าไว้/g,'พรีวิวรูปถูกซ่อนตามที่ตั้งค่าไว้'],
  [/ตั้งค้่าไว้/g,'ตั้งค่าไว้'],
  [/ซ่องว่าง/g,'ช่องว่าง'],
  [/ช่อ\s*งว่าง/g,'ช่องว่าง'],
  [/ชอง่\s*ว่าง|ชอ\s*ง่\s*ว่าง/g,'ช่องว่าง'],
  [/อกษร|อักษ[นร]/g,'อักษร'],
  [/แปตาก|แปสก/g,'แปลก'],
  [/ศาทหแก้|ศาทหแก|คำทหแก้|คําทหแก้|คาหแก้?|คําหแก้?/g,'คำที่แก้'],
  [/พืนที|พืนที่/g,'พื้นที่'],
  [/เมาสับน|เมาส์บ\s*น/g,'เมาส์บน'],
  [/ตั้งคา/g,'ตั้งค่า'],
  [/แปปลง/g,'แปลง'],
  [/สแกนแปลง|scnan\s*แปลง/gi,'สแกน แปลง'],
  [/ITNT/g,'IT/NOC'],
  [/0CR/g,'OCR'],
  [/[tl1]Pv4/g,'IPv4'],
  [/รบnet\s*Mask/gi,'Subnet Mask'],
  [/Default\s+gateway/gi,'Default Gateway'],
  [/DHCP\s+Enabled\s+Yes/gi,'DHCP Enabled: Yes'],
  [/Lease\s+Obtained(?!:)/gi,'Lease Obtained:'],
  [/Lease\s+Expires(?!:)/gi,'Lease Expires:']
];

const THAI_DIGIT_MAP={'๐':'0','๑':'1','๒':'2','๓':'3','๔':'4','๕':'5','๖':'6','๗':'7','๘':'8','๙':'9'};

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
      if(/^(?:[;:=\-_=~`!|Il0oO.\[\]{}()<>\/\\]+\s*){4,}$/i.test(line))return false;
      if(/PERE|F——|oo\s*PERE|ซ่\s*Be|IRATE\s*--|=\s*=\s*=\s*F/i.test(line))return false;
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

function normalizeEmailOcrText(text){
  let out=text||'';
  out=out
    .replace(/รือซีเมลี่/g,'หรืออีเมลที่')
    .replace(/รือ\s*ซี\s*เม\s*ลี่/g,'หรืออีเมลที่')
    .replace(/หรือ\s*ซี\s*เมล(?:ี่|ี|ิ)?/g,'หรืออีเมล')
    .replace(/อี\s*เม\s*ล/g,'อีเมล')
    .replace(/e\s*-?\s*mail/gi,'email')
    .replace(/0อทไชอ018|๐อทไชอ๐18|อทไชอ/g,'ติดต่อ')
    .replace(/ติดต่อ\s*ได้/g,'ติดต่อได้')
    .replace(/ผู่/g,'ผู้')
    .replace(/ผู\s*้/g,'ผู้')
    .replace(/\s{2,}/g,' ');
  return out;
}

function normalizeDocumentEmailAndDomains(text){
  let out=String(text||'');
  out=out
    .replace(/^\s*(Audi|Dale|Date|วันที่|วนที่|ที่)\s*[:：]?\s*/gim,'วันที่: ')
    .replace(/^\s*(From|Fron|จาก)\s*[:：]?\s*/gim,'จาก: ')
    .replace(/^\s*(To|T0|ถึง)\s*[:：]?\s*/gim,'ถึง: ')
    .replace(/^\s*(Subject|Subj|เรื่อง|เรือง)\s*[:：]?\s*/gim,'เรื่อง: ')
    .replace(/Ticket\s*(Mo|N0|No|N๐)\s*[.:]?/gi,'Ticket No.');

  out=out.replace(/Ticket No\.\s*([๐-๙0-9\-]+)/g,(match,id)=>'Ticket No. '+thaiDigitsToArabic(id));
  out=out.replace(/([A-Za-z0-9_-]+)\s*[,，]\s*([A-Za-z]{2,})(?=\b|>)/g,'$1.$2');
  out=out.replace(/([A-Za-z0-9_-]+)\s*\.\s*([A-Za-z]{2,})(?=\b|>)/g,'$1.$2');
  out=out.replace(/([A-Za-z0-9._%+-]+)\s*@\s*([A-Za-z0-9.-]+)\s*\.\s*([A-Za-z]{2,})/g,'$1@$2.$3');
  out=out.replace(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+)\s*\.\s*([A-Za-z]{2,})/g,'$1.$2');
  out=out.replace(/workd\s*[,，.]\s*go\s*[,，.]?\s*th/gi,'workd.go.th');
  out=out.replace(/networkdrd\s*[,，.]\s*(?:oo|go|or)\s*[,，.]?\s*th/gi,'network@dga.or.th');
  out=out.replace(/network\s*@\s*dga\s*\.\s*or\s*\.\s*th/gi,'network@dga.or.th');
  out=out.replace(/cc_support_sis\s*@\s*uih\s*\.\s*co\s*\.\s*th/gi,'cc_support_sis@uih.co.th');
  out=out.replace(/<\s*([^<>\s]+)\s*>/g,'<$1>');
  out=repairThaiVowelOrder(out);
  return removeOcrGarbageLines(out);
}

function thaiDigitsToArabic(value){
  return String(value||'').replace(/[๐-๙]/g,ch=>THAI_DIGIT_MAP[ch]??ch);
}

function repairThaiVowelOrder(text){
  return String(text||'')
    .replace(/(^|[\s([{"'“”‘’])([่้๊๋์])([ก-ฮ])/g,'$1$3$2')
    .replace(/ใ็([ก-ฮ])/g,'ใ$1้')
    .replace(/เ็([ก-ฮ])/g,'เ$1็')
    .replace(/แ็([ก-ฮ])/g,'แ$1็');
}

function normalizeIpLikeText(text){
  let out=normalizeEmailOcrText(normalizeBrowserNoise(text||''));
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
  let out=normalizeDocumentEmailAndDomains(normalizeIpLikeText(text||''));

  const directRules=[
    [/ํ(?=า)/g,''],[/[ÊÉÈË]/g,''],[/\$1\$2/g,''],[/เพื่อ[่้๊๋์]*อ+/g,'เพื่อ'],[/เพื่ออ+/g,'เพื่อ'],
    [/เพื\s*อ/g,'เพื่อ'],[/เปลี\s*ยน/g,'เปลี่ยน'],[/เปลี่\s*ยน/g,'เปลี่ยน'],
    [/เป้\s*า\s*หม\s*าย/g,'เป้าหมาย'],[/เป้าหม\s*าย/g,'เป้าหมาย'],[/ชื่อ\s*ส่วน\s*ง?าน/g,'ชื่อส่วนงาน'],[/ส่วน\s*ง?าน/g,'ส่วนงาน'],
    [/ที\s+เกี\s*ยว/g,'ที่เกี่ยว'],[/ที่\s+เกี่ยว/g,'ที่เกี่ยว'],[/เกี\s*ยว\s*ข้อง/g,'เกี่ยวข้อง'],[/เกี\s*ยว/g,'เกี่ยว'],
    [/เรื\s*อง\s*โทร\s*ศัพท์/g,'เรื่องโทรศัพท์'],[/เรื\s*อง/g,'เรื่อง'],[/เรื่อง\s+โทรศัพท์/g,'เรื่องโทรศัพท์'],
    [/โทร\s*ศั\s*พ\s*ท์/g,'โทรศัพท์'],[/โทร\s*ศัพ\s*ท์/g,'โทรศัพท์'],[/โทร\s*ศัพท์/g,'โทรศัพท์'],
    [/อุ\s*ป\s*กร\s*ณ์/g,'อุปกรณ์'],[/ประ\s*เมิ\s*น/g,'ประเมิน'],[/ใช้\s*งา\s*น/g,'ใช้งาน'],[/ขั้?\s*น\s*ตอน/g,'ขั้นตอน'],
    [/รือซีเมลี่/g,'หรืออีเมลที่'],[/๐อทไชอ๐18/g,'ติดต่อ'],[/ผู่/g,'ผู้']
  ];

  for(const [pattern,replacement] of directRules){
    out=replaceTrack(out,pattern,replacement);
  }

  const words=[...OCR_REVIEW_WORDS].sort((a,b)=>Array.from(b).length-Array.from(a).length);
  for(const word of words){
    out=replaceTrack(out,reviewWordRegex(word),word);
  }

  out=normalizeDocumentEmailAndDomains(normalizeIpLikeText(out))
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

function applySpellingCorrections(text){
  let out=normalizeDocumentEmailAndDomains(text||'');
  for(const [pattern,replacement] of OCR_WRONG_WORD_RULES){
    out=replaceTrack(out,pattern,replacement);
  }
  for(const word of [...OCR_CORRECT_WORDS].sort((a,b)=>Array.from(b).length-Array.from(a).length)){
    if(/[ก-ฮ]/.test(word))out=replaceTrack(out,reviewWordRegex(word),word);
  }
  return normalizeDocumentEmailAndDomains(out);
}

function findSuspiciousOcrTokens(text){
  const found=[];
  const checks=[
    {name:'อักษรแปลก',regex:/[�ƟθϴƩΣÉÊÈË]/g},
    {name:'ตัวแทน regex หลุด',regex:/\$\d+/g},
    {name:'สระ/วรรณยุกต์แยกจากคำ',regex:/\s+[ะาำิีึืุูั็่้๊๋์]/g},
    {name:'คำไทยมีช่องว่างกลางคำ',regex:/[เแโใไ]\s+[ก-ฮ]|[ก-ฮ]\s+[ะาำิีึืุูั็่้๊๋์]/g},
    {name:'นิคหิตผิดตำแหน่ง',regex:/ํ(?=า)/g}
  ];
  for(const check of checks){
    const matches=text.match(check.regex)||[];
    if(matches.length)found.push({name:check.name,count:matches.length,sample:matches.slice(0,5)});
  }
  return found;
}

function analyzeThaiSpelling(text){
  const value=text||'';
  const correctWords=[];
  const suspiciousWords=[];
  const spacingIssues=[];
  const seenCorrect=new Set();
  const seenSuspicious=new Set();
  const seenSpacing=new Set();

  for(const word of OCR_CORRECT_WORDS){
    if(!word||seenCorrect.has(word))continue;
    const re=new RegExp(escapeReviewRegExp(word),'gi');
    const matches=value.match(re)||[];
    if(matches.length){
      seenCorrect.add(word);
      correctWords.push({word,count:matches.length});
    }
  }

  const wrongChecks=[
    {regex:/คา(?=ไทย|แก้|ที่)/g,suggest:'คำ'},
    {regex:/ซ่องว่าง|ช่อ\s*งว่าง|ชอง่\s*ว่าง|ชอ\s*ง่\s*ว่าง/g,suggest:'ช่องว่าง'},
    {regex:/อกษร|อักษ[นร]/g,suggest:'อักษร'},
    {regex:/แปตาก|แปสก/g,suggest:'แปลก'},
    {regex:/ศาทหแก้|ศาทหแก|คำทหแก้|คาหแก้?/g,suggest:'คำที่แก้'},
    {regex:/พืนที|พืนที่/g,suggest:'พื้นที่'},
    {regex:/เมาสับน|เมาส์บ\s*น/g,suggest:'เมาส์บน'},
    {regex:/ตั้งคา/g,suggest:'ตั้งค่า'},
    {regex:/แปปลง/g,suggest:'แปลง'},
    {regex:/[�ƟθϴƩΣÉÊÈË]/g,suggest:'ตรวจอักษรแปลก'}
  ];
  for(const check of wrongChecks){
    const matches=value.match(check.regex)||[];
    for(const match of matches.slice(0,8)){
      const key=match+'>'+check.suggest;
      if(seenSuspicious.has(key))continue;
      seenSuspicious.add(key);
      suspiciousWords.push({word:match,suggest:check.suggest});
    }
  }

  const spacingChecks=[
    {regex:/[เแโใไ]\s+[ก-ฮ]/g,suggest:'สระนำหน้าไม่ควรเว้น'},
    {regex:/[ก-ฮ]\s+[ะาำิีึืุูั็่้๊๋์]/g,suggest:'สระ/วรรณยุกต์ติดกับพยัญชนะ'},
    {regex:/[ก-ฮ]\s{2,}[ก-ฮ]/g,suggest:'ลดช่องว่างซ้ำ'},
    {regex:/\b(?:SD|S D)\s*[- ]?\s*WAN\b/gi,suggest:'SD-WAN'},
    {regex:/\bI\s*T\s*[/|\\]?\s*N\s*[O0]\s*C\b/gi,suggest:'IT/NOC'}
  ];
  for(const check of spacingChecks){
    const matches=value.match(check.regex)||[];
    for(const match of matches.slice(0,8)){
      const key=match+'>'+check.suggest;
      if(seenSpacing.has(key))continue;
      seenSpacing.add(key);
      spacingIssues.push({text:match,suggest:check.suggest});
    }
  }

  return {correctWords,suspiciousWords,spacingIssues};
}

function renderSpellReport(cleaned){
  const report=analyzeThaiSpelling(cleaned||'');
  const goodCount=report.correctWords.reduce((sum,item)=>sum+item.count,0);
  const badCount=report.suspiciousWords.length;
  const spacingCount=report.spacingIssues.length;
  const good=report.correctWords.slice(0,12).map(item=>'<span class="spell-chip ok">'+escapeHtml(item.word)+' '+item.count+'</span>').join('');
  const bad=report.suspiciousWords.slice(0,12).map(item=>'<span class="spell-chip bad">'+escapeHtml(item.word)+' → '+escapeHtml(item.suggest)+'</span>').join('');
  const spacing=report.spacingIssues.slice(0,12).map(item=>'<span class="spell-chip warn">'+escapeHtml(item.text)+' → '+escapeHtml(item.suggest)+'</span>').join('');
  return '<div class="spell-report">'+
    '<div class="spell-summary"><b>ตรวจคำ</b><span>คำถูก '+goodCount+'</span><span>คำน่าสงสัย '+badCount+'</span><span>ช่องว่าง '+spacingCount+'</span></div>'+
    '<div class="spell-group"><b>คำที่มั่นใจ</b>'+(good||'<span class="hint">ยังไม่พบคำใน dictionary</span>')+'</div>'+
    '<div class="spell-group"><b>คำผิด/น่าสงสัย</b>'+(bad||'<span class="hint">ไม่พบคำผิดที่รู้จัก</span>')+'</div>'+
    '<div class="spell-group"><b>ช่องว่าง</b>'+(spacing||'<span class="hint">ไม่พบช่องว่างผิดรูปแบบ</span>')+'</div>'+
  '</div>';
}

function renderOcrReview(raw,cleaned){
  const issues=findSuspiciousOcrTokens(cleaned);
  const box=$('fixReport');
  if(!box)return;
  const fixed=renderFixedWordsSummary(AppState.fixedWords||[]);
  const review=issues.length
    ? '<div class="hint">ยังพบจุดน่าสงสัย: '+issues.map(i=>i.name+' '+i.count+' จุด').join(' · ')+'</div>'
    : '<div class="hint">ตรวจละเอียดแล้ว ไม่พบรูปแบบ OCR แปลกที่พบบ่อย</div>';
  box.innerHTML=(fixed||'ไม่มีรายการคำที่แก้')+review+renderSpellReport(cleaned);
}

function renderFixedWordsSummary(items){
  if(!items.length)return '';
  const grouped=new Map();
  for(const item of items){
    const from=String(item.from??'');
    const to=String(item.to??'');
    const type=item.type||classifyFix?.(from,to)||'แก้คำ';
    const key=type+'|'+from+'|'+to;
    const current=grouped.get(key)||{type,from,to,count:0};
    current.count++;
    grouped.set(key,current);
  }
  const rows=[...grouped.values()].sort((a,b)=>b.count-a.count).slice(0,80);
  const typeCounts=rows.reduce((acc,row)=>{
    acc[row.type]=(acc[row.type]||0)+row.count;
    return acc;
  },{});
  const summary=Object.entries(typeCounts).map(([type,count])=>'<span class="fix-summary-chip">'+escapeHtml(type)+' '+count+'</span>').join('');
  const chips=rows.map(row=>{
    const to=row.to?escapeHtml(row.to):'<em>ลบออก</em>';
    return '<span class="fix-item grouped"><b>'+escapeHtml(row.type)+'</b> '+escapeHtml(row.from)+' → '+to+' <small>x'+row.count+'</small></span>';
  }).join('');
  return '<div class="fix-summary"><div class="fix-summary-head"><b>รายการคำที่แก้</b>'+summary+'</div><div class="fix-list">'+chips+'</div></div>';
}

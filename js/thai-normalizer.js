const THAI_EXACT_CORRECTIONS=[
  [/จานวนเงิน/g,'จำนวนเงิน'],
  [/จํานวนเงิน/g,'จำนวนเงิน'],
  [/ขอมูล/g,'ข้อมูล'],
  [/โทรศัพท(?!์)/g,'โทรศัพท์'],
  [/อีเมลล/g,'อีเมล'],
  [/อเมล/g,'อีเมล'],
  [/ใบกากับภาษี/g,'ใบกำกับภาษี'],
  [/จำนวนเงิน/g,'จำนวนเงิน'],
  [/บริษัท/g,'บริษัท'],
  [/จากัด/g,'จำกัด'],
  [/ข้อมูล/g,'ข้อมูล'],
  [/โทรศัพท์(?!์)/g,'โทรศัพท์'],
  [/อีเมลล/g,'อีเมล'],
  [/ใบกากับภาษี/g,'ใบกำกับภาษี'],
  [/สำคัญ/g,'สำคัญ'],
  [/วันที่/g,'วันที่'],
  [/เรื่อง/g,'เรื่อง']
];

function safeThaiNormalize(text){
  return String(text||'')
    .normalize('NFC')
    .replace(/\r/g,'')
    .replace(/\s+([\u0e30\u0e32\u0e33\u0e34-\u0e3a\u0e47-\u0e4e])/g,'$1')
    .replace(/([\u0e40-\u0e44])\s+([\u0e01-\u0e2e])/g,'$1$2')
    .replace(/([\u0e01-\u0e2e])\s+([\u0e34-\u0e3a\u0e47-\u0e4e])/g,'$1$2')
    .replace(/([\u0e01-\u0e2e])\s+([\u0e48-\u0e4e])/g,'$1$2')
    .replace(/([\u0e01-\u0e2e])\s+\u0e4c/g,'$1\u0e4c')
    .replace(/\u0e4d(?=\u0e32)/g,'')
    .replace(/[ \t]+\n/g,'\n')
    .replace(/\n[ \t]+/g,'\n')
    .replace(/[ \t]{2,}/g,' ')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
}

function applySafeExactThaiCorrections(text){
  let out=String(text||'');
  for(const [pattern,replacement] of THAI_EXACT_CORRECTIONS){
    out=typeof replaceTrack==='function'?replaceTrack(out,pattern,replacement):out.replace(pattern,replacement);
  }
  return out;
}

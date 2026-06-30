const IT_DICTIONARY_RULES=[
  // IT / NOC / Network
  [/\bSD\s*WAN\b/gi,'SD-WAN'],[/\bsdwan\b/gi,'SD-WAN'],[/\bN\s*O\s*C\b/gi,'NOC'],[/\bnoc\b/gi,'NOC'],
  [/\bcase\b/gi,'Case'],[/\bengineer\b/gi,'Engineer'],[/\bCUCM\s*(\d+)\b/gi,'CUCM$1'],
  [/route\s*pa\s*(?:tt|[ƩΣ])\s*ern/gi,'route pattern'],[/pa\s*(?:tt|[ƩΣ])\s*ern/gi,'pattern'],
  [/configura\s*(?:ti|[Ɵθϴ])\s*o?n?/gi,'configuration'],[/informa\s*(?:ti|[Ɵθϴ])\s*o?n?/gi,'information'],
  [/opera\s*(?:ti|[Ɵθϴ])\s*o?n?/gi,'operation'],[/loca\s*(?:ti|[Ɵθϴ])\s*o?n?/gi,'location'],
  [/destina\s*(?:ti|[Ɵθϴ])\s*o?n?/gi,'destination'],[/communica\s*(?:ti|[Ɵθϴ])\s*o?n?/gi,'communication'],
  [/\bV\s*L\s*A\s*N\b/gi,'VLAN'],[/\binterface\b/gi,'interface'],[/\bgateway\b/gi,'gateway'],[/\bendpoint\b/gi,'endpoint'],[/\btracker\b/gi,'tracker'],
  [/tPv4|lPv4|1Pv4|IPV4|IPvA/g,'IPv4'],[/รบnet\s*Mask/gi,'Subnet Mask'],[/Default\s+gateway/gi,'Default Gateway'],
  [/D\s*H\s*C\s*P/gi,'DHCP'],[/M\s*A\s*C\s*Address/gi,'MAC Address'],[/D\s*N\s*S/gi,'DNS'],

  // Email / Ticket / Support
  [/Ticket\s*(Mo|N0|N๐|No)\.?/gi,'Ticket No.'],[/ธีเมล|อี\s*เม\s*ล/g,'อีเมล'],
  [/รบกรน/g,'รบกวน'],[/ทตสอบ/g,'ทดสอบ'],[/ตรวจส[ขร]บ/g,'ตรวจสอบ'],[/ข้อมูลเพิ่?มเติม|ขัตมูลเพ็มเติม/g,'ข้อมูลเพิ่มเติม'],
  [/Subject|Subj|เรือง/g,'เรื่อง'],[/Fron/gi,'From'],[/T0/gi,'To'],

  // Accounting / Tax / Finance
  [/ใบกาํ?\s*กับภาษี|ใบกากับภาษี/g,'ใบกำกับภาษี'],[/ใบเสรจ็?|ใบเสรจ/g,'ใบเสร็จ'],
  [/เลขประจาํ?\s*ตัว/g,'เลขประจำตัว'],[/จานว[นณ]เงิน/g,'จำนวนเงิน'],[/สาํ?\s*คัญ/g,'สำคัญ'],
  [/ใบสาํ?\s*คัญจ่าย|ใบสาคัญจ่าย/g,'ใบสำคัญจ่าย'],[/ราคาสทธ|ราคาสทุ\s*ธิ/g,'ราคาสุทธิ'],
  [/ผ้รับเงิน|ผูรับเงิน/g,'ผู้รับเงิน'],[/ยอดรวมท[งั]หมด/g,'ยอดรวมทั้งหมด'],[/ยอดรวมทังสิ้น/g,'ยอดรวมทั้งสิ้น'],

  // Company / Legal / Government docs
  [/บริษท|บรีษัท|บรอษษท/g,'บริษัท'],[/จากัด|จากด|จจากษด/g,'จำกัด'],[/หนงสือ|หนังสอ/g,'หนังสือ'],
  [/หนังสือมอมอำนาจ|หนงสือมอบอานาจ/g,'หนังสือมอบอำนาจ'],[/สญญญา|สญญา/g,'สัญญา'],[/อนุมต(?!ิ)|อนมัติ/g,'อนุมัติ'],
  [/วษนทรร/g,'วันที่'],[/เรรรอง|เรือ่ง/g,'เรื่อง'],[/เรรยน/g,'เรียน'],[/ททาน/g,'ท่าน'],
  [/ออางออง/g,'อ้างอิง'],[/ขอแสดงตวามนับถืต|ขตแสดงตวามนับถืต/g,'ขอแสดงความนับถือ'],
  [/กรคณาตอดตทอ/g,'กรุณาติดต่อ'],[/ผผออจานวยการ/g,'ผู้อำนวยการ'],[/ฝฝาย/g,'ฝ่าย'],
  [/การฉัดสรร/g,'การจัดสรร'],[/ฉัดสรร/g,'จัดสรร'],[/เพื่อรองรัน/g,'เพื่อรองรับ'],[/รองรัน/g,'รองรับ'],
  [/ลกหนี่|ลูกหนี่/g,'ลูกหนี้'],[/กาษีอากร/g,'ภาษีอากร']
];

function applyItDictionary(text){
  let out=text;
  for(const [pattern,replacement] of IT_DICTIONARY_RULES){
    out=replaceTrack(out,pattern,replacement);
  }
  return out;
}

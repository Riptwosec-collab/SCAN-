// Thai OCR word bank for browser cleanup.
// Put generated PyThaiNLP words in window.THAI_WORD_BANK_GENERATED when available.
window.THAI_WORD_BANK_BASE = [
  'หรืออีเมลที่','หรืออีเมล','อีเมล','ติดต่อได้','ติดต่อ','ผู้ติดต่อ','ผู้ใช้งาน','ผู้ใช้','ผู้ดูแลระบบ',
  'เป้าหมาย','ชื่อส่วนงาน','ส่วนงาน','เกี่ยวข้อง','เรื่องโทรศัพท์','โทรศัพท์','ลิงก์ทดสอบ','อาการเจอบ่อย','ได้รับการยืนยัน',
  'ขั้นตอน','เอกสาร','อุปกรณ์','ประเมิน','ใช้งาน','ทดแทน','ยืนยัน','ข้อมูล','ข้อความ','ตัวอักษร','ช่องว่าง','เครื่อง','เชื่อม','เกี่ยว','เรื่อง','เพื่อ','แจ้ง','ระบุ','ระบบ','ลูกค้า','ทดสอบ','อาการ','บ่อย','ชื่อ','งาน','ปิด',
  'หมายเลข','เบอร์โทร','โทรออก','โทรเข้า','สัญญาณ','เครือข่าย','อินเทอร์เน็ต','อินเตอร์เน็ต','ปลายทาง','ต้นทาง','ทดสอบใช้งาน','ปิดเคส','เปิดเคส',
  'รายการ','สถานะ','สำเร็จ','ไม่สำเร็จ','ปัญหา','สาเหตุ','แนวทางแก้ไข','ตรวจสอบ','ดำเนินการ','ประสานงาน','โครงการ','ส่งอุปกรณ์','อุปกรณ์ทดแทน',
  'Host assigned','Default Gateway','Network Connection Details','Ethernet','Wireless','IPv4 Address','Subnet Mask','DHCP Enabled','Lease Obtained','Lease Expires','Route Pattern','email','e-mail'
];

function getThaiOcrWordBank(){
  const generated = Array.isArray(window.THAI_WORD_BANK_GENERATED) ? window.THAI_WORD_BANK_GENERATED : [];
  const base = Array.isArray(window.THAI_WORD_BANK_BASE) ? window.THAI_WORD_BANK_BASE : [];
  return [...new Set([...base, ...generated])].filter(Boolean);
}

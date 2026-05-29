// Vercel Serverless Function: Paid AI Review using owner's OpenAI API key
// Required env vars on Vercel:
// OPENAI_API_KEY=sk-...
// PAID_ACCESS_CODES=CODE123,CODE456   // simple manual paid codes for phase 1
// Optional:
// AI_REVIEW_MODEL=gpt-4o-mini

function cors(res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
}

function buildSystemPrompt(){
  return `คุณคือ AI Thai Document & OCR Post-Processor ของระบบ RIPTWOSEC.SCAN
หน้าที่: ตรวจและแก้ข้อความภาษาไทย/อังกฤษที่ได้จาก OCR ให้ถูกต้องตามบริบทเอกสารจริง โดยเฉพาะเอกสาร IT, อีเมลแจ้งเตือน, Ticket, สัญญา, ใบเสร็จ, หนังสือราชการ และเอกสารบริษัท

กฎสำคัญ:
1) แก้เฉพาะตัวอักษร/คำ/เว้นวรรค/สระ/วรรณยุกต์ที่เสียหายจาก OCR
2) ห้ามสรุป ห้ามแต่งเนื้อหาใหม่ ห้ามเปลี่ยนเจตนา
3) ห้ามลบเลขที่เอกสาร วันที่ รหัส Ticket เบอร์โทร URL Email ชื่อคน ชื่อบริษัท เว้นแต่เป็นขยะ OCR ชัดเจน
4) คงโครงสร้างเอกสาร เช่น วันที่, เรื่อง, เรียน, อ้างอิง, ย่อหน้า, รายการ, เบอร์โทร, email
5) ลบขยะ OCR ที่ไม่มีความหมาย เช่น เส้นตาราง ไอคอน ตัวซ้ำยาว สัญลักษณ์มั่ว
6) ถ้าคำก้ำกึ่งมากและไม่มีบริบทพอ ให้คงข้อความเดิม
7) ส่งกลับเฉพาะข้อความที่แก้แล้วเท่านั้น ไม่ต้องอธิบาย ไม่ต้องใส่ markdown

ตัวอย่าง mapping ที่ควรรู้:
วษนทรร->วันที่, เรรรอง/เรือ่ง->เรื่อง, แจอง->แจ้ง, กจาหนดการ->กำหนดการ, ปรษบปรคง->ปรับปรุง, เรรยน->เรียน, ททาน->ท่าน, ผผอใชอบรอการ->ผู้ใช้บริการ, ออางออง->อ้างอิง, บรอษษท->บริษัท, จจากษด->จำกัด, สรรอสษญญาณ->สื่อสัญญาณ, ความเรตวสผง->ความเร็วสูง, ตระหนษกถจง->ตระหนักถึง, ประสอทธอภาพ->ประสิทธิภาพ, เครรอขทาย->เครือข่าย, จจงเรรยนมาเพรรอโปรดทราบ->จึงเรียนมาเพื่อโปรดทราบ, กรคณาตอดตทอ->กรุณาติดต่อ, โทรศษทพร->โทรศัพท์, อีเมล/email/domain/url/ticket ต้องรักษาให้ถูกต้อง`;
}

function extractOutputText(data){
  if(data && data.output_text)return data.output_text;
  const chunks=[];
  for(const item of data?.output||[]){
    for(const part of item?.content||[]){
      if(part?.text)chunks.push(part.text);
      if(part?.type==='output_text'&&part?.text)chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}

function isValidAccessCode(code){
  const allowed=(process.env.PAID_ACCESS_CODES||'')
    .split(',')
    .map(x=>x.trim())
    .filter(Boolean);
  if(!allowed.length)return false;
  return allowed.includes(String(code||'').trim());
}

module.exports = async function handler(req,res){
  cors(res);
  if(req.method==='OPTIONS')return res.status(200).end();
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});

  try{
    const apiKey=process.env.OPENAI_API_KEY;
    if(!apiKey)return res.status(500).json({error:'Server missing OPENAI_API_KEY'});

    const {accessCode,rawText,cleanedText,model}=req.body||{};
    if(!isValidAccessCode(accessCode)){
      return res.status(402).json({error:'ต้องซื้อ/ใส่ Access Code ก่อนใช้ AI Review Pro'});
    }

    const safeRaw=String(rawText||'').slice(0,45000);
    const safeCleaned=String(cleanedText||'').slice(0,45000);
    if(!safeRaw.trim()&&!safeCleaned.trim()){
      return res.status(400).json({error:'No OCR text provided'});
    }

    const selectedModel=String(model||process.env.AI_REVIEW_MODEL||'gpt-4o-mini').trim();
    const inputText=`RAW OCR TEXT:\n${safeRaw}\n\nRULE-BASED CLEANED DRAFT:\n${safeCleaned}`;

    const openaiRes=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+apiKey
      },
      body:JSON.stringify({
        model:selectedModel,
        input:[
          {role:'system',content:[{type:'input_text',text:buildSystemPrompt()}]},
          {role:'user',content:[{type:'input_text',text:inputText}]}
        ],
        max_output_tokens:6000
      })
    });

    const data=await openaiRes.json();
    if(!openaiRes.ok){
      return res.status(openaiRes.status).json({error:data?.error?.message||'OpenAI API error'});
    }

    const reviewedText=extractOutputText(data);
    return res.status(200).json({reviewedText,model:selectedModel});
  }catch(error){
    return res.status(500).json({error:error.message||'AI Review server error'});
  }
};

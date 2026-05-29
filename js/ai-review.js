// RIPTWOSEC.SCAN Real AI Review
// Supports 2 modes:
// 1) Paid Owner Mode: user pays site owner, enters Access Code, backend uses owner's OPENAI_API_KEY
// 2) BYOK Mode: user enters their own OpenAI API key in browser
const AI_REVIEW_KEY='riptwosec.scan.aiReview';

function getAiReviewSettings(){
  try{
    return JSON.parse(localStorage.getItem(AI_REVIEW_KEY)||'{}');
  }catch{
    return {};
  }
}

function saveAiReviewSettings(next){
  localStorage.setItem(AI_REVIEW_KEY,JSON.stringify({...getAiReviewSettings(),...next}));
}

function injectAiReviewPanel(){
  if($('aiReviewPanel'))return;
  const anchor=document.querySelector('.dictionary-box')||document.querySelector('.action-row');
  if(!anchor)return;
  const settings=getAiReviewSettings();
  const mode=settings.mode||'paid';
  const panel=document.createElement('details');
  panel.id='aiReviewPanel';
  panel.className='ai-review-box';
  panel.open=!!settings.enabled;
  panel.innerHTML=`
    <summary>AI Review Pro หลัง OCR <span style="color:#86efac;font-size:12px">จ่ายเจ้าของเว็บ / ใช้โค้ด</span></summary>
    <div class="ai-review-inner">
      <label class="ai-review-toggle"><input id="aiReviewEnabled" type="checkbox" ${settings.enabled?'checked':''}> เปิด AI Review วิเคราะห์ทั้งย่อหน้า</label>
      <div class="ai-review-grid">
        <select id="aiReviewMode">
          <option value="paid" ${mode==='paid'?'selected':''}>Pro Mode: ใช้ Key เจ้าของเว็บ + Access Code</option>
          <option value="byok" ${mode==='byok'?'selected':''}>BYOK Mode: ใส่ OpenAI API Key เอง</option>
        </select>
        <input id="aiReviewModel" placeholder="Model เช่น gpt-4o-mini" value="${escapeHtml(settings.model||'gpt-4o-mini')}">
      </div>
      <div class="ai-review-grid" id="paidReviewFields">
        <input id="aiReviewAccessCode" type="password" placeholder="Access Code หลังชำระเงิน เช่น RIP-XXXX" value="${escapeHtml(settings.accessCode||'')}">
        <input disabled value="API Key เจ้าของเว็บถูกเก็บใน Backend ไม่โชว์หน้าเว็บ">
      </div>
      <div class="ai-review-grid" id="byokReviewFields">
        <input id="aiReviewApiKey" type="password" placeholder="OpenAI API Key ของผู้ใช้: sk-..." value="${escapeHtml(settings.apiKey||'')}">
        <input disabled value="ใช้เครดิต OpenAI ของผู้ใช้เอง">
      </div>
      <div class="ai-review-actions">
        <button class="btn small" id="saveAiReviewBtn" type="button">บันทึก AI Review</button>
        <button class="btn small danger" id="clearAiReviewKeyBtn" type="button">ลบ Key/Code</button>
      </div>
      <div class="hint">Pro Mode: ผู้ใช้จ่ายเงินให้เจ้าของเว็บ แล้วได้รับ Access Code จากเจ้าของเว็บ จากนั้นเว็บเรียก Backend /api/ai-review โดยใช้ API Key เจ้าของเว็บ</div>
      <div class="hint">ถ้าไม่มี Access Code หรือ Backend ยังไม่ตั้งค่า ระบบจะใช้ Rule-based เดิมแทน</div>
    </div>
  `;
  anchor.insertAdjacentElement('afterend',panel);

  const syncModeFields=()=>{
    const current=$('aiReviewMode').value;
    $('paidReviewFields').style.display=current==='paid'?'grid':'none';
    $('byokReviewFields').style.display=current==='byok'?'grid':'none';
  };
  syncModeFields();
  $('aiReviewMode').onchange=syncModeFields;

  $('saveAiReviewBtn').onclick=()=>{
    saveAiReviewSettings({
      enabled:$('aiReviewEnabled').checked,
      mode:$('aiReviewMode').value,
      accessCode:$('aiReviewAccessCode').value.trim(),
      apiKey:$('aiReviewApiKey').value.trim(),
      model:$('aiReviewModel').value.trim()||'gpt-4o-mini'
    });
    setStatus('บันทึก AI Review แล้ว','ok');
  };
  $('clearAiReviewKeyBtn').onclick=()=>{
    $('aiReviewApiKey').value='';
    $('aiReviewAccessCode').value='';
    saveAiReviewSettings({apiKey:'',accessCode:'',enabled:$('aiReviewEnabled').checked,mode:$('aiReviewMode').value,model:$('aiReviewModel').value.trim()||'gpt-4o-mini'});
    setStatus('ลบ API Key / Access Code ใน Browser แล้ว','ok');
  };
  $('aiReviewEnabled').onchange=()=>{
    saveAiReviewSettings({enabled:$('aiReviewEnabled').checked});
    setStatus($('aiReviewEnabled').checked?'เปิด AI Review แล้ว':'ปิด AI Review แล้ว','ok');
  };
}

document.addEventListener('DOMContentLoaded',injectAiReviewPanel);

function buildAiReviewPrompt(){
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

function extractOpenAiText(data){
  if(data?.output_text)return data.output_text;
  const chunks=[];
  for(const item of data?.output||[]){
    for(const part of item?.content||[]){
      if(part?.text)chunks.push(part.text);
      if(part?.type==='output_text'&&part?.text)chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}

async function reviewWithPaidBackend(rawText,cleanedText,settings){
  const accessCode=(settings.accessCode||'').trim();
  if(!accessCode){
    setStatus('AI Review Pro ยังไม่ทำงาน: ต้องใส่ Access Code หลังชำระเงิน','err');
    return cleanedText;
  }
  setStatus('AI Review Pro กำลังตรวจบริบททั้งย่อหน้า...','ok');
  setProgress(97);
  const res=await fetch('/api/ai-review',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      accessCode,
      rawText:rawText||'',
      cleanedText:cleanedText||'',
      model:(settings.model||'gpt-4o-mini').trim()
    })
  });
  const data=await res.json();
  if(!res.ok)throw new Error(data?.error||'AI Review Pro error');
  if(!data.reviewedText)throw new Error('AI ไม่ส่งข้อความกลับมา');
  setStatus('AI Review Pro สำเร็จ · ใช้เครดิตเจ้าของเว็บแล้ว','ok');
  return data.reviewedText;
}

async function reviewWithUserKey(rawText,cleanedText,settings){
  const apiKey=(settings.apiKey||'').trim();
  if(!apiKey){
    setStatus('BYOK ยังไม่ทำงาน: ยังไม่ได้ใส่ API Key','err');
    return cleanedText;
  }
  const model=(settings.model||'gpt-4o-mini').trim();
  const inputText=`RAW OCR TEXT:\n${rawText||''}\n\nRULE-BASED CLEANED DRAFT:\n${cleanedText||''}`;
  setStatus('AI Review BYOK กำลังตรวจบริบททั้งย่อหน้า...','ok');
  setProgress(97);
  const res=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},
    body:JSON.stringify({
      model,
      input:[
        {role:'system',content:[{type:'input_text',text:buildAiReviewPrompt()}]},
        {role:'user',content:[{type:'input_text',text:inputText}]}
      ],
      max_output_tokens:6000
    })
  });
  const data=await res.json();
  if(!res.ok)throw new Error(data?.error?.message||('HTTP '+res.status));
  const reviewed=extractOpenAiText(data).trim();
  if(!reviewed)throw new Error('AI ไม่ส่งข้อความกลับมา');
  setStatus('AI Review BYOK สำเร็จ','ok');
  return reviewed;
}

async function aiReviewTextIfEnabled(rawText,cleanedText){
  const settings=getAiReviewSettings();
  if(!settings.enabled)return cleanedText;
  try{
    if((settings.mode||'paid')==='paid'){
      return await reviewWithPaidBackend(rawText,cleanedText,settings);
    }
    return await reviewWithUserKey(rawText,cleanedText,settings);
  }catch(error){
    setStatus('AI Review ใช้งานไม่ได้: '+error.message+' · ใช้ Rule-based เดิม','err');
    return cleanedText;
  }
}

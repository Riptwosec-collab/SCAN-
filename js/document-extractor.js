(function(){
  'use strict';

  const normalize=value=>String(value||'').replace(/\r/g,'').replace(/\s+/g,' ').trim();
  const lines=text=>String(text||'').replace(/\r/g,'').split('\n').map(normalize).filter(Boolean);
  const unique=items=>Array.from(new Set(items.filter(Boolean)));

  function detectDocumentType(text,hint='general'){
    const source=String(text||'').toLowerCase();
    const govType=window.GovernmentOQC?.detectGovernmentDocumentType?.(text);
    if(govType)return govType;
    if(/บันทึกข้อความ|ส่วนราชการ|ผู้อำนวยการ|ผู้อํานวยการ|ราชการ|สรรพากร/.test(source))return 'government_memo';
    if(/หนังสือราชการ|ขอแสดงความนับถือ/.test(source))return 'official_letter';
    if(/internal memo|บันทึกภายใน|แจ้งภายใน/.test(source))return 'internal_memo';
    if(/ใบกำกับ|ใบกํากับ|tax invoice|invoice/.test(source))return 'invoice';
    if(/ใบเสร็จ|receipt|ยอดรวม|รวมเงิน|vat/.test(source))return 'receipt';
    if(/ticket|incident|vlan|gi\d|fa\d|macflap|dhcp|dns|arp|interface|router|switch|firewall/.test(source))return 'it-ticket';
    if(/^from:|^to:|subject:|@.+\./im.test(source))return 'email';
    if(/\|.+\||\t/.test(text)||hint==='table')return 'table';
    return hint||'general';
  }

  function firstMatch(text,patterns){
    for(const pattern of patterns){const match=String(text||'').match(pattern);if(match)return normalize(match[1]||match[0]);}
    return '';
  }

  function extractMoney(text){return unique((String(text||'').match(/(?:฿|THB)?\s*\d{1,3}(?:[, ]\d{3})*(?:\.\d{2})?|\d+\.\d{2}\s*(?:บาท|THB)?/g)||[]).map(normalize));}
  function extractDates(text){return unique((String(text||'').match(/\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b|\b\d{1,2}\s+[ก-ฮ]+\s+\d{4}\b|\b[๑-๙0-9]{1,2}\s+[ก-ฮ]+\s+[๑-๙0-9]{4}\b/g)||[]).map(normalize));}

  function extractReceiptFields(text){
    const rows=lines(text);const money=extractMoney(text);const date=extractDates(text)[0]||'';
    const receiptNo=firstMatch(text,[/(?:receipt|เลขที่|no\.?|เลขใบเสร็จ)\s*[:#：]?\s*([A-Z0-9\-\/]+)/i]);
    const total=firstMatch(text,[/(?:total|grand total|ยอดรวม|รวมทั้งสิ้น|สุทธิ)\s*[:：]?\s*(฿?\s*\d[\d,]*(?:\.\d{2})?)/i])||money[money.length-1]||'';
    const items=rows.filter(row=>/\d/.test(row)&&!/(total|ยอดรวม|vat|tax|change|cash)/i.test(row)).slice(0,30).map(row=>{const price=(row.match(/\d[\d,]*(?:\.\d{2})?\s*$/)||[''])[0];const qty=(row.match(/\b\d+(?:\.\d+)?\s*(?:x|ชิ้น|ea)?\b/i)||[''])[0];const name=normalize(row.replace(price,'').replace(qty,'')).slice(0,120);return {name,qty:normalize(qty),price:normalize(price)};}).filter(item=>item.name||item.price);
    return {storeName:rows[0]||'',receiptNo,date,items,subtotal:'',discount:'',total};
  }
  function extractInvoiceFields(text){const base=extractReceiptFields(text);return {...base,invoiceNo:firstMatch(text,[/(?:invoice|เลขที่ใบกำกับ|tax invoice no)\s*[:#：]?\s*([A-Z0-9\-\/]+)/i]),taxId:firstMatch(text,[/(?:tax id|เลขประจำตัวผู้เสียภาษี|เลขผู้เสียภาษี)\s*[:：]?\s*([0-9\-]{10,20})/i])};}
  function extractTicketFields(text){return {ticketNo:firstMatch(text,[/(?:ticket|incident|case)\s*(?:no|id|#)?\s*[:#：]?\s*([A-Z0-9\-]+)/i]),system:firstMatch(text,[/(?:system|ระบบ)\s*[:：]\s*([^\n]+)/i]),issue:firstMatch(text,[/(?:issue|problem|อาการ|ปัญหา)\s*[:：]\s*([^\n]+)/i]),ipAddress:unique(String(text||'').match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)||[]),vlan:unique(String(text||'').match(/\bVlan\s*\d+\b|\bVLAN\s*\d+\b/gi)||[]),device:unique(String(text||'').match(/\b(?:router|switch|firewall|server|ap|controller)\b/gi)||[]),interface:unique(String(text||'').match(/\b(?:Gi|Fa|Te|Eth|Po)\s*\d+(?:\/\d+){0,3}\b/gi)||[]),severity:firstMatch(text,[/(?:severity|priority|ความรุนแรง)\s*[:：]\s*([^\n]+)/i]),requester:firstMatch(text,[/(?:requester|ผู้แจ้ง|user)\s*[:：]\s*([^\n]+)/i]),time:extractDates(text)[0]||''};}
  function extractEmailFields(text){const urls=unique(String(text||'').match(/https?:\/\/[^\s)]+/g)||[]);const emails=unique(String(text||'').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[]);return {from:firstMatch(text,[/^from\s*[:：]\s*(.+)$/im]),to:firstMatch(text,[/^to\s*[:：]\s*(.+)$/im]),subject:firstMatch(text,[/^subject\s*[:：]\s*(.+)$/im]),date:extractDates(text)[0]||'',urls,actionItems:lines(text).filter(line=>/please|action|required|ดำเนินการ|กรุณา|โปรด/i.test(line)).slice(0,20),emails};}
  function extractTableFields(text){const rows=lines(text);const tableRows=rows.map(row=>row.includes('|')?row.split('|').map(normalize).filter(Boolean):row.split(/\t| {2,}/).map(normalize).filter(Boolean)).filter(cols=>cols.length>1);return {headers:tableRows[0]||[],rows:tableRows.slice(1),rowCount:Math.max(0,tableRows.length-1)};}

  function extractGovernmentFields(text){
    const govReview=window.GovernmentOQC?.reviewGovernmentText?.(text)||null;
    return {
      governmentType:govReview?.documentType||detectDocumentType(text),
      structure:govReview?.structure||null,
      department:firstMatch(text,[/ส่วนราชการ\s*[:：]?\s*(.+?)(?:\s+ที่\s|\s+วันที่\s|$)/i]),
      documentNo:firstMatch(text,[/(?:^|\n)\s*(?:ที่|เลขที่)\s*[:：]?\s*([^\n]+)/i]),
      date:extractDates(text)[0]||firstMatch(text,[/วันที่\s*[:：]?\s*([^\n]+)/i]),
      subject:firstMatch(text,[/เรื่อง\s*[:：]?\s*(.+)/i]),
      to:firstMatch(text,[/เรียน\s*[:：]?\s*(.+)/i]),
      phone:firstMatch(text,[/(?:โทร|tel)\s*[:：]?\s*([0-9๐-๙\- ]{3,})/i]),
      signer:firstMatch(text,[/\(([^()]{4,60})\)/]),
      position:firstMatch(text,[/\)\s*\n?\s*([^\n]*(?:รักษาราชการแทน|นิติกร|ผู้อำนวยการ|หัวหน้า)[^\n]*)/]),
      ipAddress:unique(String(text||'').match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)||[]),
      macAddress:unique(String(text||'').match(/\b[0-9A-F]{2}(?:[:-][0-9A-F]{2}){5}\b/gi)||[]),
      reviewRequired:govReview?.reviewRequired||[],
      warnings:govReview?.warnings||[],
      corrections:govReview?.corrections||[]
    };
  }

  function extractFields(text,typeHint){
    const documentType=detectDocumentType(text,typeHint);
    if(documentType==='receipt')return {documentType,fields:extractReceiptFields(text)};
    if(documentType==='invoice')return {documentType,fields:extractInvoiceFields(text)};
    if(documentType==='it-ticket')return {documentType,fields:extractTicketFields(text)};
    if(documentType==='email')return {documentType,fields:extractEmailFields(text)};
    if(documentType==='table')return {documentType,fields:extractTableFields(text)};
    if(['government_memo','official_letter','internal_memo','government'].includes(documentType))return {documentType,fields:extractGovernmentFields(text)};
    return {documentType:'general',fields:{dates:extractDates(text),money:extractMoney(text),emails:unique(String(text||'').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[])}};
  }

  window.DocumentExtractor={detectDocumentType,extractReceiptFields,extractInvoiceFields,extractTicketFields,extractEmailFields,extractTableFields,extractGovernmentFields,extractFields};
})();

(function(){
  'use strict';

  function $(id){return document.getElementById(id)}
  function esc(value){
    return String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  const commandPattern=/\b(?:ipconfig|ping|tracert|nslookup|netsh|route|arp|curl|ssh|telnet|hostname|whoami|systeminfo|gpupdate|flushdns|release|renew)\b(?:\s+[\w.\-/]+)*/gi;
  const quotedSettingPattern=/[“"]([^”"]{8,90})[”"]/g;

  function normalizeLines(text){
    return String(text||'')
      .replace(/\r/g,'')
      .replace(/\u00a0/g,' ')
      .split('\n')
      .map(line=>line.replace(/\s+/g,' ').trim())
      .filter(Boolean);
  }

  function isHeading(line){
    return /^(?:ขั้นตอนที่\s*)?\d+\s*[:.)-]/i.test(line)||/^ขั้นตอนที่\s*\d+/i.test(line)||/^step\s*\d+/i.test(line);
  }

  function extractStepNumber(line,fallback){
    const match=line.match(/(?:ขั้นตอนที่\s*|step\s*)?(\d+)/i);
    return match?match[1]:String(fallback);
  }

  function looksLikeHeading(line){
    if(isHeading(line))return true;
    if(line.length>120)return false;
    return /[:：]$/.test(line)||/(Physical Connection|Command Line|IP\/DNS|DHCP|Properties|Connection)/i.test(line);
  }

  function parseSections(text){
    const lines=normalizeLines(text);
    const sections=[];
    let current=null;

    lines.forEach(line=>{
      if(isHeading(line)){
        if(current)sections.push(current);
        current={number:extractStepNumber(line,sections.length+1),heading:line.replace(/^\d+\s*[:.)-]\s*/,''),body:[]};
        return;
      }
      if(!current&&looksLikeHeading(line)){
        current={number:String(sections.length+1),heading:line,body:[]};
        return;
      }
      if(!current)current={number:String(sections.length+1),heading:'ผลลัพธ์ OCR ที่จัดเรียงแล้ว',body:[]};
      current.body.push(line);
    });

    if(current)sections.push(current);
    return sections.length?sections:[{number:'1',heading:'ผลลัพธ์ OCR ที่จัดเรียงแล้ว',body:lines}];
  }

  function inlineHighlight(line){
    let output=esc(line);
    output=output.replace(commandPattern,match=>'<code class="ocr-code-pill">'+esc(match)+'</code>');
    output=output.replace(quotedSettingPattern,(full,inner)=>'<code class="ocr-code-pill">“'+esc(inner)+'”</code>');
    return output;
  }

  function splitLongParagraphs(body){
    const paragraphs=[];
    body.forEach(line=>{
      if(commandPattern.test(line)){
        commandPattern.lastIndex=0;
        paragraphs.push(line);
        return;
      }
      commandPattern.lastIndex=0;
      const chunks=line.match(/.{1,150}(?:\s|$)/g);
      if(chunks&&chunks.length>1)chunks.forEach(chunk=>paragraphs.push(chunk.trim()));
      else paragraphs.push(line);
    });
    return paragraphs.filter(Boolean);
  }

  function renderLayoutHtml(text){
    const sections=parseSections(text);
    return '<article class="ocr-layout-article" aria-label="Formatted OCR result">'+
      sections.map((section,index)=>{
        const body=splitLongParagraphs(section.body);
        return '<section class="ocr-layout-section">'+
          '<div class="ocr-step-badge">'+esc(section.number||index+1)+'</div>'+
          '<div class="ocr-layout-content">'+
            '<h2>'+inlineHighlight(section.heading)+'</h2>'+
            body.map(line=>'<p>'+inlineHighlight(line)+'</p>').join('')+
          '</div>'+
        '</section>';
      }).join('')+
    '</article>';
  }

  function plainFromText(text){
    return normalizeLines(text).join('\n');
  }

  function getFinalText(){
    const fromState=window.AppState?.multiOcrOqc?.finalText||window.AppState?.lastText||'';
    if(fromState.trim())return fromState;
    return $('output')?.textContent||'';
  }

  function buildFormatterBox(text){
    const box=document.createElement('section');
    box.id='ocrLayoutFormatter';
    box.className='ocr-layout-formatter';
    box.innerHTML=''+
      '<div class="ocr-layout-toolbar">'+
        '<div><b>จัดเรียงผล OCR แบบบทความ/ขั้นตอน</b><span>เหมือนภาพตัวอย่าง: หัวข้อใหญ่ ย่อหน้า และกล่องคำสั่ง</span></div>'+
        '<div class="ocr-layout-actions">'+
          '<button class="btn small" id="ocrLayoutCopyBtn" type="button">Copy แบบจัดเรียง</button>'+
          '<button class="btn small" id="ocrLayoutRawBtn" type="button">ดูข้อความดิบ</button>'+
        '</div>'+
      '</div>'+
      '<div class="ocr-layout-preview">'+renderLayoutHtml(text)+'</div>';
    return box;
  }

  function ensureFormattedLayout(){
    const text=getFinalText();
    if(!text.trim())return;
    const finalBox=$('finalResultBox');
    const output=$('output');
    if(!finalBox&&!output)return;

    let box=$('ocrLayoutFormatter');
    if(!box){
      box=buildFormatterBox(text);
      const target=finalBox||output;
      target.parentNode.insertBefore(box,target);
    }else{
      const preview=box.querySelector('.ocr-layout-preview');
      if(preview)preview.innerHTML=renderLayoutHtml(text);
    }

    const copyBtn=$('ocrLayoutCopyBtn');
    if(copyBtn)copyBtn.onclick=async()=>{
      const value=plainFromText(text);
      try{
        await navigator.clipboard.writeText(value);
        if(typeof setStatus==='function')setStatus('คัดลอกข้อความแบบจัดเรียงแล้ว','ok');
      }catch(error){
        if(typeof setStatus==='function')setStatus('คัดลอกไม่สำเร็จ: '+error.message,'err');
      }
    };

    const rawBtn=$('ocrLayoutRawBtn');
    if(rawBtn&&output)rawBtn.onclick=()=>{
      output.scrollIntoView({block:'center',behavior:'smooth'});
      output.classList.add('live-attention');
      setTimeout(()=>output.classList.remove('live-attention'),1200);
    };
  }

  function patchScan(){
    if(window.__ocrLayoutPatchApplied)return;
    if(typeof window.runMultiOqcScan!=='function')return;
    window.__ocrLayoutPatchApplied=true;
    const original=window.runMultiOqcScan;
    window.runMultiOqcScan=async function(){
      const result=await original.apply(this,arguments);
      setTimeout(ensureFormattedLayout,120);
      return result;
    };
  }

  function boot(){
    patchScan();
    ensureFormattedLayout();
    const observer=new MutationObserver(()=>{
      patchScan();
      if(window.AppState?.multiOcrOqc?.finalText)setTimeout(ensureFormattedLayout,60);
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  window.renderOcrLayoutHtml=renderLayoutHtml;
  window.ensureFormattedOcrLayout=ensureFormattedLayout;
  document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,160));
})();

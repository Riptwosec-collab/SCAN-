/*
 * The PDF Skill system used to let the user manually pick a PDF-handling
 * profile (Text Extract / Scanned OCR / Table / Form / Compare / etc.) from
 * a dropdown that largely duplicated the main OCR Skill selector. That UI
 * has been removed in favor of a single always-on "Auto PDF" profile: check
 * each page's text layer first, fall back to OCR per page when needed, skip
 * blank pages — which is what "auto" already meant for every other profile
 * anyway.
 */
const PDF_SKILLS=[
  {
    id:'auto-pdf',
    title:'Auto PDF',
    label:'ตรวจ PDF อัตโนมัติ',
    description:'เลือก text layer หรือ OCR รายหน้า เหมาะกับ PDF ผสม',
    config:{strategy:'auto',language:'tha+eng',layout_detection:'auto-page',output:['TXT','DOC','PDF','CSV','JSON','MD'],confidence_threshold:74,skip_blank:true,store_images:false,clean:true}
  }
];

function getActivePdfSkill(){
  return PDF_SKILLS[0];
}

function detectTextLanguage(text){
  const thai=(text.match(/[ก-ฮะาำิีึืุูั็่้๊๋์]/g)||[]).length;
  const eng=(text.match(/[A-Za-z]/g)||[]).length;
  if(thai&&eng)return 'ไทย + อังกฤษ';
  if(thai)return 'ไทย';
  if(eng)return 'อังกฤษ';
  return 'ไม่ชัดเจน';
}

function detectPdfLayout(text,items=[]){
  const lines=(text||'').split('\n').map(line=>line.trim()).filter(Boolean);
  const widths=items.map(item=>Number(item.x)||0);
  const xSpread=widths.length?(Math.max(...widths)-Math.min(...widths)):0;
  const tableLines=lines.filter(line=>/\t|\s{3,}|[,|].+[,|]/.test(line)).length;
  const keyValue=lines.filter(line=>/[:：]\s*\S+/.test(line)).length;
  const pageNo=lines.some(line=>/^(page|หน้า)\s*\d+|\d+\s*\/\s*\d+$/i.test(line));
  const headerFooter=lines.length>4&&lines[0].length<90&&lines[lines.length-1].length<90;
  if(tableLines>=Math.max(2,lines.length*.25))return 'table';
  if(keyValue>=3)return 'form/key-value';
  if(xSpread>320&&lines.length>8)return 'columns';
  if(headerFooter&&pageNo)return 'header/footer/page-number';
  if(lines.length>8)return 'paragraphs';
  return 'plain';
}

function lineConfidence(line,pageConfidence,method){
  let score=Number(pageConfidence)||76;
  if(method==='text-layer')score=Math.max(score,94);
  if(/[�ƟθϴƩΣÉÊÈË]/.test(line))score-=24;
  if(/[เแโใไ]\s+[ก-ฮ]|[ก-ฮ]\s+[ะาำิีึืุูั็่้๊๋์]/.test(line))score-=18;
  if((line.match(/[|{}<>~`_^=+*\\/]/g)||[]).length>Math.max(4,line.length*.18))score-=16;
  if(line.trim().length<3)score-=10;
  return Math.max(20,Math.min(99,Math.round(score)));
}

function buildPageConfidence(text,pageConfidence,method){
  const lines=(text||'').split('\n').map(line=>line.trim()).filter(Boolean);
  const lineItems=lines.map((line,index)=>({index:index+1,text:line,confidence:lineConfidence(line,pageConfidence,method)}));
  const words=lines.join(' ').split(/\s+/).filter(Boolean).slice(0,160).map(word=>({
    text:word,
    confidence:lineConfidence(word,pageConfidence,method)
  }));
  return {
    lines:lineItems,
    words,
    lowLines:lineItems.filter(item=>item.confidence<Math.max(65,(pageConfidence||76)-14)).slice(0,12),
    lowWords:words.filter(item=>item.confidence<Math.max(60,(pageConfidence||76)-18)).slice(0,20)
  };
}

function isPdfBlankText(text){
  const compact=(text||'').replace(/\s/g,'');
  if(!compact)return true;
  const meaningful=(compact.match(/[A-Za-z0-9ก-ฮ]/g)||[]).length;
  return meaningful<4;
}

function renderPdfPageResults(){
  const box=$('pdfPageResults');
  if(!box)return;
  const pages=AppState.pdfPageInfo||[];
  box.classList.toggle('hide',!pages.length);
  if(!pages.length){box.innerHTML='';return;}
  box.innerHTML='<div class="pdf-results-head"><b>PDF Page Results</b><span>'+pages.length+' หน้า · แยก Original OCR / Cleaned Text / Confidence</span></div>'+
    pages.map(page=>{
      const low=(page.lowConfidence?.lowWords||[]).slice(0,8).map(item=>'<mark title="word confidence '+item.confidence+'%">'+escapeHtml(item.text)+'</mark>').join(' ');
      const lowLines=(page.lowConfidence?.lowLines||[]).slice(0,3).map(item=>'<code title="line confidence '+item.confidence+'%">L'+item.index+' '+escapeHtml(item.text)+'</code>').join('');
      const layout=Array.isArray(page.layout)?page.layout.join(', '):page.layout;
      const report=page.accuracyReport;
      const review=report?.reviewRequired?'<div class="low-confidence"><b>Review required</b><p>fields '+report.fields+' · symbol '+report.symbolScore+'% · confidence '+(report.confidence??'-')+'%</p></div>':'';
      return '<details class="pdf-page-card '+(page.skippedBlank?'blank':'')+'">'+
        '<summary><span>หน้า '+page.page+'</span><b>'+escapeHtml(page.methodLabel||page.method||'PDF')+'</b><i>'+escapeHtml(page.language||'-')+' · '+escapeHtml(layout||'-')+' · '+(page.confidence??'-')+'%</i></summary>'+
        '<div class="pdf-page-meta">'+
          '<span>text layer: '+(page.hadTextLayer?'yes':'no')+'</span><span>OCR: '+(page.usedOcr?'yes':'no')+'</span><span>chars: '+(page.charCount||0)+'</span>'+
          (page.skippedBlank?'<span>blank skipped</span>':'')+
        '</div>'+
        review+
        (low||lowLines?'<div class="low-confidence"><b>Low confidence</b>'+(low?'<p>'+low+'</p>':'')+(lowLines?'<div>'+lowLines+'</div>':'')+'</div>':'')+
        '<div class="pdf-page-compare"><div><b>Original OCR</b><pre>'+escapeHtml(page.rawText||page.text||'')+'</pre></div><div><b>Cleaned Text</b><pre>'+escapeHtml(page.cleanedText||page.text||'')+'</pre></div></div>'+
      '</details>';
    }).join('');
}

function buildPdfMarkdown(items=AppState.pdfPageInfo||[]){
  if(items.length){
    return '# RIPTWOSEC.SCAN PDF OCR\n\n'+items.map(page=>
      '## หน้า '+page.page+'\n\n'+
      '- Method: '+(page.methodLabel||page.method||'-')+'\n'+
      '- Confidence: '+(page.confidence??'-')+'%\n'+
      '- Language: '+(page.language||'-')+'\n'+
      '- Layout: '+(Array.isArray(page.layout)?page.layout.join(', '):page.layout||'-')+'\n\n'+
      (page.cleanedText||page.text||'')
    ).join('\n\n');
  }
  return '# RIPTWOSEC.SCAN OCR\n\n'+(AppState.lastText||$('output')?.innerText||'');
}

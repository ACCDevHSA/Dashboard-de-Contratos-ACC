/* Contract Timeline - depende das variaveis globais schemas, state, norm, esc e parseDate do index.html */
(function(){
  'use strict';

  const byId=id=>document.getElementById(id);
  const dayStart=(date=new Date())=>new Date(date.getFullYear(),date.getMonth(),date.getDate());
  const dayDiff=(from,to)=>Math.round((Date.UTC(to.getFullYear(),to.getMonth(),to.getDate())-Date.UTC(from.getFullYear(),from.getMonth(),from.getDate()))/86400000);
  const labels={comodato:'Tooling Loan Agreement',fornecimento:'Supply Agreement',distrato:'Termination'};
  const safe=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=v=>typeof window.norm==='function'?window.norm(v):String(v??'').trim();
  const dateOf=v=>typeof window.parseDate==='function'?window.parseDate(v):(v?new Date(v):null);
  const dateText=v=>{const d=v instanceof Date?v:dateOf(v);return d&&!Number.isNaN(d.getTime())?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(d).replace('.',''):'Não informada'};

  function insertMarkup(){
    if(byId('contractTimeline'))return;
    const table=document.querySelector('.table-section');
    if(!table)return;
    table.insertAdjacentHTML('beforebegin',`
      <section id="contractTimeline" class="timeline-section">
        <div class="timeline-header"><div><h3>Contract Expiration Timeline</h3><p>Vigência e expiração de todos os tipos de contrato</p></div>
          <div class="timeline-controls">
            <div class="field"><label for="timelineCategory">Categoria</label><select id="timelineCategory"><option value="all">Todos os contratos</option><option value="comodato">Tooling Loan Agreements</option><option value="fornecimento">Supply Agreements</option><option value="distrato">Terminations</option></select></div>
            <div class="field"><label for="timelinePeriod">Período de expiração</label><select id="timelinePeriod"><option value="all">Todas as datas</option><option value="expired">Expirados</option><option value="30">Próximos 30 dias</option><option value="60">Próximos 60 dias</option><option value="90">Próximos 90 dias</option><option value="180">Próximos 180 dias</option><option value="365">Próximos 12 meses</option></select></div>
            <div class="field"><label for="timelineSearch">Pesquisar</label><input id="timelineSearch" type="search" placeholder="Contrato, fornecedor ou projeto"></div>
          </div>
        </div>
        <div class="timeline-summary">
          <div class="timeline-summary-card"><span class="summary-dot expired"></span><div><strong id="timelineExpired">0</strong><small>Expirados</small></div></div>
          <div class="timeline-summary-card"><span class="summary-dot critical"></span><div><strong id="timelineCritical">0</strong><small>Até 30 dias</small></div></div>
          <div class="timeline-summary-card"><span class="summary-dot warning"></span><div><strong id="timelineWarning">0</strong><small>31 a 90 dias</small></div></div>
          <div class="timeline-summary-card"><span class="summary-dot safe"></span><div><strong id="timelineSafe">0</strong><small>Acima de 90 dias</small></div></div>
        </div>
        <div class="timeline-table"><div class="timeline-table-head"><div>Contrato</div><div>Vigência do contrato</div><div>Alerta de expiração</div></div><div id="timelineBody" class="timeline-body"></div></div>
      </section>`);
    ['timelineCategory','timelinePeriod'].forEach(id=>byId(id).addEventListener('change',renderTimeline));
    byId('timelineSearch').addEventListener('input',renderTimeline);
  }

  function rows(){
    if(!window.state?.data||!window.schemas)return[];
    return Object.entries(window.state.data).flatMap(([category,list])=>(list||[]).map(row=>({
      row,category,number:clean(row[window.schemas[category].number])||'Contrato sem número',supplier:clean(row.Supplier)||'Fornecedor não informado',project:clean(row.Project),created:dateOf(row['Creation Date']),expires:dateOf(row['Expiration Date'])
    })));
  }
  function level(days){return days<0?'expired':days<=30?'critical':days<=90?'warning':'safe'}
  function alertText(days){if(days<0)return `Expirado há ${Math.abs(days)} dia${Math.abs(days)===1?'':'s'}`;if(days===0)return'Expira hoje';return `${days} dia${days===1?'':'s'} restante${days===1?'':'s'}`}
  function position(created,expires,today){
    if(!created||!expires)return{today:0,width:0,cls:''};
    const duration=expires-created;if(duration<=0||today>expires)return{today:98.5,width:98.5,cls:'expired'};
    if(today<created)return{today:1.5,width:1.5,cls:'not-started'};
    const p=Math.max(0,Math.min(100,((today-created)/duration)*100));return{today:p,width:Math.max(1.5,p),cls:''};
  }
  function accepted(item,today){
    const category=byId('timelineCategory')?.value||'all',period=byId('timelinePeriod')?.value||'all',q=clean(byId('timelineSearch')?.value).toLowerCase();
    if(category!=='all'&&item.category!==category)return false;
    if(q&&![item.number,item.supplier,item.project,item.row['General Status']].map(clean).join(' ').toLowerCase().includes(q))return false;
    if(period==='all')return true;if(!item.expires)return false;
    const days=dayDiff(today,item.expires);return period==='expired'?days<0:days>=0&&days<=Number(period);
  }
  function updateSummary(items,today){
    const count={expired:0,critical:0,warning:0,safe:0};items.forEach(item=>{if(item.expires)count[level(dayDiff(today,item.expires))]++});
    byId('timelineExpired').textContent=count.expired;byId('timelineCritical').textContent=count.critical;byId('timelineWarning').textContent=count.warning;byId('timelineSafe').textContent=count.safe;
  }
  function renderTimeline(){
    insertMarkup();const body=byId('timelineBody');if(!body)return;
    const today=dayStart(),all=rows();updateSummary(all,today);
    const list=all.filter(item=>accepted(item,today)).sort((a,b)=>a.expires&&b.expires?a.expires-b.expires:a.expires?-1:b.expires?1:a.number.localeCompare(b.number));
    if(!list.length){body.innerHTML='<div class="timeline-empty">Nenhum contrato encontrado para os filtros selecionados.</div>';return}
    body.innerHTML=list.map(item=>{
      const status=clean(item.row['General Status'])||'Status não informado';
      if(!item.expires)return `<div class="timeline-row"><div class="timeline-contract"><span class="timeline-contract-number">${safe(item.number)}</span><span class="timeline-supplier">${safe(item.supplier)}</span><span class="timeline-category ${safe(item.category)}">${safe(labels[item.category])}</span></div><div class="timeline-lifetime"><div class="timeline-date-row"><span>Criação: <strong>${safe(dateText(item.created))}</strong></span><span>Expiração: <strong>Não informada</strong></span></div><div class="timeline-track"></div><div class="timeline-duration-info">Complete a data de expiração para visualizar a vigência.</div></div><div class="timeline-alert warning"><strong>Sem data de expiração</strong><span>${safe(status)}</span></div></div>`;
      const days=dayDiff(today,item.expires),kind=level(days),pos=position(item.created||item.expires,item.expires,today),duration=item.created?dayDiff(item.created,item.expires):null;
      return `<div class="timeline-row"><div class="timeline-contract"><span class="timeline-contract-number" title="${safe(item.number)}">${safe(item.number)}</span><span class="timeline-supplier" title="${safe(item.supplier)}">${safe(item.supplier)}</span>${item.project?`<span class="timeline-supplier">${safe(item.project)}</span>`:''}<span class="timeline-category ${safe(item.category)}">${safe(labels[item.category])}</span></div><div class="timeline-lifetime"><div class="timeline-date-row"><span>Criação: <strong>${safe(dateText(item.created))}</strong></span><span>Expiração: <strong>${safe(dateText(item.expires))}</strong></span></div><div class="timeline-track"><div class="timeline-track-background"><div class="timeline-elapsed ${pos.cls}" style="width:${pos.width}%"></div></div><span class="timeline-today-marker" style="left:${pos.today}%"></span><span class="timeline-expiry-marker" style="left:98.5%" title="Data de expiração"></span></div><div class="timeline-duration-info">${duration===null?'Data de criação não cadastrada':duration<0?'Data de expiração anterior à criação':`Vigência cadastrada: ${duration} dias`}</div></div><div class="timeline-alert ${kind}"><strong>${safe(alertText(days))}</strong><span>${safe(status)}</span></div></div>`;
    }).join('');
  }

  window.renderContractTimeline=renderTimeline;
  insertMarkup();
  if(typeof window.loadDatabase==='function'){
    const originalLoad=window.loadDatabase;
    window.loadDatabase=async function(...args){const result=await originalLoad.apply(this,args);renderTimeline();return result};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',insertMarkup);
  window.addEventListener('load',()=>setTimeout(renderTimeline,0));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderTimeline()});
})();

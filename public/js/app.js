// MACTO AI CRM v2 — Full Sales Pipeline + Audit Portal

const CALL_STATUSES = [
  {value:'pending',label:'Pending',color:'#94a3b8'},
  {value:'called',label:'Called',color:'#3b82f6'},
  {value:'interested',label:'Interested ⭐',color:'#22c55e'},
  {value:'not_interested',label:'Not Interested',color:'#ef4444'},
  {value:'callback',label:'Call Back',color:'#f59e0b'},
  {value:'busy',label:'Busy',color:'#8b5cf6'},
  {value:'no_answer',label:'No Answer',color:'#f97316'},
  {value:'invalid',label:'Invalid No.',color:'#6b7280'},
];
const CALL_MAP = Object.fromEntries(CALL_STATUSES.map(s=>[s.value,s]));

const PIPELINE_STAGES = [
  {value:'interested',label:'Interested',color:'#60a5fa'},
  {value:'follow_up_1',label:'Follow-up 1',color:'#fbbf24'},
  {value:'follow_up_2',label:'Follow-up 2',color:'#fbbf24'},
  {value:'follow_up_3',label:'Follow-up 3',color:'#fbbf24'},
  {value:'meeting_scheduled',label:'Meeting Scheduled',color:'#a78bfa'},
  {value:'meeting_done',label:'Meeting Done',color:'#a78bfa'},
  {value:'proposal_shared',label:'Proposal Shared',color:'#06b6d4'},
  {value:'negotiation',label:'Negotiation',color:'#06b6d4'},
  {value:'invoice_shared',label:'Invoice Shared',color:'#fb923c'},
  {value:'advance_paid',label:'Advance Paid 💰',color:'#fb923c'},
  {value:'converted',label:'Converted ✓',color:'#22c55e'},
  {value:'work_started',label:'Work Started',color:'#22c55e'},
  {value:'in_progress',label:'In Progress',color:'#22c55e'},
  {value:'deployed',label:'Deployed 🚀',color:'#4ade80'},
  {value:'completed',label:'Completed ✅',color:'#4ade80'},
  {value:'lost',label:'Lost',color:'#ef4444'},
];
const STAGE_MAP = Object.fromEntries(PIPELINE_STAGES.map(s=>[s.value,s]));

const CATEGORIES = [
  {value:'ecommerce',label:'🛒 E-commerce'},
  {value:'real_estate',label:'🏢 Real Estate'},
  {value:'clinic',label:'🏥 Clinic'},
  {value:'study_abroad',label:'✈️ Study Abroad'},
  {value:'ads_lead',label:'📢 Ads Lead'},
  {value:'restaurant',label:'🍽 Restaurant'},
  {value:'retail',label:'🏪 Retail'},
  {value:'corporate',label:'🏛 Corporate'},
  {value:'other',label:'📦 Other'},
];
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c=>[c.value,c]));

const ACTIVITY_TYPES = [
  {value:'note',label:'📝 Note',color:'#94a3b8'},
  {value:'call',label:'📞 Call',color:'#3b82f6'},
  {value:'meeting',label:'🤝 Meeting',color:'#a78bfa'},
  {value:'followup',label:'🔔 Follow-up',color:'#fbbf24'},
  {value:'proposal',label:'📄 Proposal',color:'#06b6d4'},
  {value:'invoice',label:'🧾 Invoice',color:'#fb923c'},
  {value:'payment',label:'💰 Payment',color:'#22c55e'},
  {value:'stage_change',label:'🔄 Stage Change',color:'#6366f1'},
];
const ACT_MAP = Object.fromEntries(ACTIVITY_TYPES.map(a=>[a.value,a]));

const api = {
  async call(method,path,body){
    const opts={method,headers:{'Content-Type':'application/json'},credentials:'include'};
    if(body)opts.body=JSON.stringify(body);
    const r=await fetch('/api'+path,opts); return r.json();
  },
  get:(p)=>api.call('GET',p),
  post:(p,b)=>api.call('POST',p,b),
  put:(p,b)=>api.call('PUT',p,b),
  del:(p)=>api.call('DELETE',p),
  async upload(path,fd){const r=await fetch('/api'+path,{method:'POST',body:fd,credentials:'include'});return r.json();}
};

let STATE={user:null,tab:'dashboard'};

const h=(tag,attrs={})=>{
  const el=document.createElement(tag);
  for(const[k,v]of Object.entries(attrs)){
    if(k.startsWith('on'))el.addEventListener(k.slice(2).toLowerCase(),v);
    else if(k==='className')el.className=v;
    else if(k==='html')el.innerHTML=v;
    else el.setAttribute(k,v);
  }
  return el;
};
const app=(tag,attrs,...children)=>{
  const el=h(tag,attrs);
  for(const c of children.flat()){if(c==null)continue;el.appendChild(typeof c==='string'?document.createTextNode(c):c);}
  return el;
};
const fmt=(n)=>'₹'+Number(n||0).toLocaleString('en-IN');
const fmtDate=(d)=>{if(!d)return'—';return new Date(d).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});};
const fmtDateOnly=(d)=>{if(!d)return'—';return new Date(d).toLocaleDateString('en-IN',{dateStyle:'medium'});};

function stageBadge(stage){
  const s=STAGE_MAP[stage]||{label:stage,color:'#94a3b8'};
  const span=h('span',{className:`stage-badge stage-${stage}`});
  span.textContent=s.label; return span;
}
function callBadge(status){
  const s=CALL_MAP[status||'pending'];
  const span=h('span',{className:`badge badge-${status||'pending'}`});
  span.textContent=s.label; return span;
}
function catLabel(cat){return CAT_MAP[cat]?.label||cat||'—';}

function icon(name,size=16){
  const paths={
    phone:'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
    users:'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    chart:'M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z',
    upload:'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
    logout:'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
    plus:'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    search:'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    assign:'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
    money:'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z',
    pipeline:'M22 12l-4-4v3H3v2h15v3z',
    audit:'M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z',
    check:'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    dash:'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  };
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width',size);svg.setAttribute('height',size);svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','currentColor');
  const p=document.createElementNS('http://www.w3.org/2000/svg','path');
  p.setAttribute('d',paths[name]||'');svg.appendChild(p);return svg;
}

async function checkSession(){const r=await api.get('/me');if(r.ok)STATE.user=r.user;}
async function boot(){await checkSession();render();}

function render(){
  const container=document.getElementById('app');
  if(!STATE.user){container.innerHTML='';container.appendChild(renderLogin());return;}
  container.innerHTML='';container.appendChild(renderApp());
}

// ── LOGIN ──────────────────────────────────────────────────────────
function renderLogin(){
  const errDiv=h('div',{style:'display:none'});
  const uInp=h('input',{type:'text',className:'inp',placeholder:'Username'});
  const pInp=h('input',{type:'password',className:'inp',placeholder:'Password'});
  const btn=app('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:4px',onClick:doLogin},'Sign In');
  async function doLogin(){
    btn.disabled=true;btn.textContent='Signing in…';
    const r=await api.post('/login',{username:uInp.value,password:pInp.value});
    if(r.ok){STATE.user=r.user;render();}
    else{errDiv.className='alert alert-error';errDiv.textContent=r.error;errDiv.style.display='';btn.disabled=false;btn.textContent='Sign In';}
  }
  uInp.addEventListener('keydown',e=>e.key==='Enter'&&doLogin());
  pInp.addEventListener('keydown',e=>e.key==='Enter'&&doLogin());
  return app('div',{className:'login-page'},
    app('div',{className:'login-box'},
      app('div',{className:'login-logo'},
        app('div',{className:'brand-logo',style:'font-size:18px;display:inline-block;padding:10px 18px'},'🚀 Macto AI CRM'),
        app('p',{style:'color:var(--muted);font-size:13px;margin-top:8px'},'Full Sales Pipeline & Client Management')
      ),
      app('div',{className:'login-card'},
        app('h2',{},'Sign in'),
        errDiv,
        app('div',{className:'field'},app('label',{},'Username'),uInp),
        app('div',{className:'field'},app('label',{},'Password'),pInp),
        btn,
        app('p',{style:'color:var(--muted);font-size:12px;text-align:center;margin-top:12px'},'Default: admin / admin123')
      )
    )
  );
}

// ── APP SHELL ──────────────────────────────────────────────────────
function renderApp(){
  const user=STATE.user;
  const isAdmin=user.role==='admin';
  const isAuditor=user.role==='auditor';
  const isStaff=user.role==='staff';

  let tabs=[];
  if(isAdmin){
    tabs=[
      {section:'Overview'},
      {id:'dashboard',label:'Dashboard',icon:'dash'},
      {id:'revenue',label:'Revenue',icon:'money'},
      {section:'Sales'},
      {id:'pipeline',label:'Pipeline',icon:'pipeline'},
      {id:'clients',label:'All Clients',icon:'users'},
      {section:'Leads'},
      {id:'dialer',label:'📞 Dialer',icon:'phone'},
      {id:'leads',label:'All Leads',icon:'assign'},
      {id:'import',label:'Import',icon:'upload'},
      {section:'Audits'},
      {id:'audits',label:'Audit Reports',icon:'audit'},
      {section:'Admin'},
      {id:'staff',label:'Team',icon:'users'},
    ];
  } else if(isStaff){
    tabs=[
      {section:'Calls'},
      {id:'dialer',label:'📞 Dialer',icon:'phone'},
      {id:'my_leads',label:'My Leads',icon:'assign'},
      {section:'Clients'},
      {id:'my_clients',label:'My Clients',icon:'users'},
      {id:'followups',label:'Follow-ups',icon:'audit'},
      {section:'Stats'},
      {id:'my_stats',label:'My Stats',icon:'chart'},
    ];
  } else if(isAuditor){
    tabs=[
      {section:'Audit'},
      {id:'audit_dash',label:'Dashboard',icon:'dash'},
      {id:'new_audit',label:'+ New Audit',icon:'plus'},
      {id:'my_audits',label:'My Audits',icon:'audit'},
    ];
  }

  const flatTabs=tabs.filter(t=>t.id);
  if(!flatTabs.find(t=>t.id===STATE.tab)) STATE.tab=flatTabs[0]?.id||'dashboard';

  const topbar=app('div',{className:'topbar'},
    app('div',{className:'brand'},
      app('div',{className:'brand-logo'},'🚀 Macto AI CRM'),
      app('span',{className:`role-pill ${user.role}`},user.role.toUpperCase())
    ),
    app('div',{className:'topbar-right'},
      app('span',{className:'topbar-user'},'Hi, '+user.name),
      app('button',{className:'btn btn-ghost btn-sm',onClick:async()=>{await api.post('/logout');STATE.user=null;render();}},icon('logout',14),'Logout')
    )
  );

  const sidebar=app('div',{className:'sidebar'});
  tabs.forEach(t=>{
    if(t.section){sidebar.appendChild(app('div',{className:'nav-section'},t.section));}
    else{
      const btn=app('button',{className:'nav-item'+(STATE.tab===t.id?' active':''),onClick:()=>{STATE.tab=t.id;render();}},icon(t.icon,15),t.label);
      sidebar.appendChild(btn);
    }
  });

  const mobileNav=app('div',{className:'sidebar-mobile'});
  flatTabs.slice(0,5).forEach(t=>{
    const btn=app('button',{className:'nav-item-mob'+(STATE.tab===t.id?' active':''),onClick:()=>{STATE.tab=t.id;render();}},icon(t.icon,18),t.label);
    mobileNav.appendChild(btn);
  });

  const main=h('div',{className:'main',id:'main-content'});
  const shell=app('div',{},topbar,app('div',{className:'layout'},sidebar,main),mobileNav);

  requestAnimationFrame(()=>{
    if(isAdmin){
      if(STATE.tab==='dashboard')renderAdminDash(main);
      else if(STATE.tab==='revenue')renderRevenue(main);
      else if(STATE.tab==='pipeline')renderPipeline(main);
      else if(STATE.tab==='clients')renderAllClients(main);
      else if(STATE.tab==='dialer')renderDialer(main);
      else if(STATE.tab==='leads')renderAdminLeads(main);
      else if(STATE.tab==='import')renderImport(main);
      else if(STATE.tab==='audits')renderAudits(main,'admin');
      else if(STATE.tab==='staff')renderTeam(main);
    } else if(isStaff){
      if(STATE.tab==='dialer')renderDialer(main);
      else if(STATE.tab==='my_leads')renderMyLeads(main);
      else if(STATE.tab==='my_clients')renderMyClients(main);
      else if(STATE.tab==='followups')renderFollowups(main);
      else if(STATE.tab==='my_stats')renderMyStats(main);
    } else if(isAuditor){
      if(STATE.tab==='audit_dash')renderAuditDash(main);
      else if(STATE.tab==='new_audit')renderNewAudit(main);
      else if(STATE.tab==='my_audits')renderAudits(main,'auditor');
    }
  });
  return shell;
}

// ── ADMIN DASHBOARD ────────────────────────────────────────────────
async function renderAdminDash(container){
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const [statsR,pipeR]=await Promise.all([api.get('/leads/stats'),api.get('/analytics/pipeline')]);
  container.innerHTML='';
  container.appendChild(app('div',{className:'page-title'},'🏠 Dashboard'));

  const s=statsR.ok?statsR:{total:0,byStatus:[],todayCalls:0,monthCalls:0};
  const p=pipeR.ok?pipeR:{byStage:[],followups:[]};
  const byStatus=Object.fromEntries((s.byStatus||[]).map(x=>[x.status,parseInt(x.cnt)]));
  const byStage=Object.fromEntries((p.byStage||[]).map(x=>[x.pipeline_stage,parseInt(x.cnt)]));

  const grid=h('div',{className:'stats-grid'});
  [{label:'Calls Today',val:s.todayCalls||0,color:'#6366f1'},{label:'Calls Month',val:s.monthCalls||0,color:'#3b82f6'},{label:'Total Leads',val:s.total||0,color:'#8b5cf6'},{label:'Interested',val:byStatus['interested']||0,color:'#22c55e'},{label:'In Pipeline',val:Object.values(byStage).reduce((a,b)=>a+b,0),color:'#06b6d4'},{label:'Completed',val:byStage['completed']||0,color:'#4ade80'}].forEach(c=>{
    grid.appendChild(app('div',{className:'stat-card',style:`border-top-color:${c.color}`},app('div',{className:'stat-num',style:`color:${c.color}`},String(c.val)),app('div',{className:'stat-label'},c.label)));
  });
  container.appendChild(grid);

  // Pipeline summary
  if(p.byStage&&p.byStage.length){
    const pCard=app('div',{className:'card'},app('div',{className:'card-title'},'📊 Pipeline Overview'));
    const pRow=h('div',{style:'display:flex;gap:8px;overflow-x:auto;padding-bottom:8px'});
    PIPELINE_STAGES.filter(s=>byStage[s.value]>0).forEach(s=>{
      pRow.appendChild(app('div',{style:`flex-shrink:0;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;border-top:2px solid ${s.color}`},
        app('div',{style:`font-size:20px;font-weight:800;color:${s.color}`},String(byStage[s.value]||0)),
        app('div',{style:'font-size:11px;color:var(--muted);margin-top:2px'},s.label)
      ));
    });
    pCard.appendChild(pRow);
    container.appendChild(pCard);
  }

  // Pending followups
  if(p.followups&&p.followups.length){
    const fCard=app('div',{className:'card'},app('div',{className:'card-title'},'🔔 Overdue Follow-ups ('+p.followups.length+')'));
    p.followups.slice(0,5).forEach(c=>{
      fCard.appendChild(app('div',{style:'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)'},
        app('div',{},app('div',{style:'font-weight:600;font-size:13px'},c.name),app('div',{style:'color:var(--muted);font-size:11px'},catLabel(c.category))),
        app('div',{style:'text-align:right'},stageBadge(c.pipeline_stage),app('div',{style:'color:#ef4444;font-size:11px;margin-top:3px'},'📅 '+fmtDateOnly(c.next_followup)))
      ));
    });
    container.appendChild(fCard);
  }
}

// ── REVENUE ────────────────────────────────────────────────────────
async function renderRevenue(container){
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const r=await api.get('/analytics/revenue');
  container.innerHTML='';
  container.appendChild(app('div',{className:'page-title'},'💰 Revenue Dashboard'));
  if(!r.ok){container.appendChild(app('div',{className:'alert alert-error'},'Error loading revenue'));return;}

  const rGrid=h('div',{style:'display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:20px'});
  [{label:'Total Revenue',val:r.totalRevenue,color:'#4ade80'},{label:'This Month',val:r.monthRevenue,color:'#22c55e'},{label:'Pipeline Value',val:r.pipelineValue,color:'#06b6d4'},{label:'Advance Collected',val:r.advancePaid,color:'#fb923c'}].forEach(c=>{
    rGrid.appendChild(app('div',{className:'revenue-card',style:`border-top:3px solid ${c.color}`},
      app('div',{className:'revenue-amount',style:`color:${c.color}`},fmt(c.val)),
      app('div',{className:'revenue-label'},c.label)
    ));
  });
  container.appendChild(rGrid);

  // By stage
  if(r.byStage&&r.byStage.length){
    const sCard=app('div',{className:'card'},app('div',{className:'card-title'},'Revenue by Pipeline Stage'));
    const tw=app('div',{className:'table-wrap'},
      app('table',{},
        app('thead',{},app('tr',{},app('th',{},'Stage'),app('th',{},'Clients'),app('th',{},'Value'))),
        app('tbody',{id:'stage-tbody'})
      )
    );
    sCard.appendChild(tw);
    container.appendChild(sCard);
    const tbody=tw.querySelector('#stage-tbody');
    r.byStage.forEach(s=>{
      const st=STAGE_MAP[s.pipeline_stage]||{label:s.pipeline_stage,color:'#94a3b8'};
      const tr=app('tr',{},
        app('td',{}),
        app('td',{style:'color:var(--muted2)'},s.cnt),
        app('td',{style:'color:#4ade80;font-weight:600'},fmt(s.val||0))
      );
      const badgeEl=stageBadge(s.pipeline_stage);
      tr.children[0].appendChild(badgeEl);
      tbody.appendChild(tr);
    });
  }

  // By category
  if(r.byCategory&&r.byCategory.length){
    const cCard=app('div',{className:'card'},app('div',{className:'card-title'},'Clients by Category'));
    r.byCategory.forEach(c=>{
      cCard.appendChild(app('div',{style:'display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)'},
        app('span',{style:'color:var(--muted2);font-size:13px'},catLabel(c.category)),
        app('span',{style:'font-weight:700;color:var(--accent2)'},c.cnt+' clients')
      ));
    });
    container.appendChild(cCard);
  }
}

// ── PIPELINE ───────────────────────────────────────────────────────
async function renderPipeline(container){
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const [clientsR,usersR]=await Promise.all([api.get('/clients?limit=200'),api.get('/users')]);
  const clients=clientsR.ok?clientsR.data:[];
  const users=usersR.ok?usersR.data:[];
  container.innerHTML='';
  container.appendChild(app('div',{className:'page-title'},'📊 Sales Pipeline'));

  // Stage summary pills
  const pillsRow=h('div',{style:'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px'});
  const byStageCount={};
  clients.forEach(c=>{byStageCount[c.pipeline_stage]=(byStageCount[c.pipeline_stage]||0)+1;});
  PIPELINE_STAGES.forEach(s=>{
    const cnt=byStageCount[s.value]||0;
    if(!cnt)return;
    const pill=app('div',{style:`background:var(--bg3);border:1px solid ${s.color}44;border-radius:8px;padding:8px 12px;flex-shrink:0`},
      app('div',{style:`font-size:18px;font-weight:800;color:${s.color}`},String(cnt)),
      app('div',{style:'font-size:10px;color:var(--muted);margin-top:2px'},s.label)
    );
    pillsRow.appendChild(pill);
  });
  container.appendChild(app('div',{style:'overflow-x:auto;padding-bottom:8px'},pillsRow));

  // Filters
  const searchInp=h('input',{type:'search',className:'inp inp-sm',placeholder:'Search clients…',style:'flex:1;min-width:180px'});
  const stageSel=h('select',{className:'inp inp-sm'});
  [['all','All Stages'],...PIPELINE_STAGES.map(s=>[s.value,s.label])].forEach(([v,l])=>stageSel.appendChild(app('option',{value:v},l)));
  const catSel=h('select',{className:'inp inp-sm'});
  [['all','All Categories'],...CATEGORIES.map(c=>[c.value,c.label])].forEach(([v,l])=>catSel.appendChild(app('option',{value:v},l)));
  const staffSel=h('select',{className:'inp inp-sm'});
  [['all','All Staff'],...users.filter(u=>u.role==='staff').map(u=>[u.id,u.name])].forEach(([v,l])=>staffSel.appendChild(app('option',{value:v},l)));
  container.appendChild(app('div',{className:'filters-bar'},searchInp,stageSel,catSel,staffSel));

  const listArea=h('div',{});
  container.appendChild(listArea);
  let filters={search:'',stage:'all',category:'all',assigned:'all'};

  function renderList(){
    const filtered=clients.filter(c=>{
      if(filters.search&&![c.name,c.company,c.phone].some(v=>v&&v.toLowerCase().includes(filters.search.toLowerCase())))return false;
      if(filters.stage!=='all'&&c.pipeline_stage!==filters.stage)return false;
      if(filters.category!=='all'&&c.category!==filters.category)return false;
      if(filters.assigned!=='all'&&c.assigned_to!=filters.assigned)return false;
      return true;
    });
    listArea.innerHTML='';
    listArea.appendChild(app('p',{style:'color:var(--muted);font-size:12px;margin-bottom:10px'},filtered.length+' clients'));
    const tw=app('div',{className:'table-wrap'},
      app('table',{},
        app('thead',{},app('tr',{},app('th',{},'Client'),app('th',{},'Category'),app('th',{},'Stage'),app('th',{className:'hide-mobile'},'Value'),app('th',{className:'hide-mobile'},'Assigned'),app('th',{},'Action'))),
        app('tbody',{id:'pip-tbody'})
      )
    );
    const tbody=tw.querySelector('#pip-tbody');
    if(!filtered.length){tbody.appendChild(app('tr',{className:'empty-row'},app('td',{colSpan:6},'No clients found.')));}
    filtered.forEach(c=>{
      const staff=users.find(u=>u.id===c.assigned_to);
      const tr=app('tr',{style:'cursor:pointer'},
        app('td',{},app('div',{className:'td-name'},c.name),app('div',{className:'td-muted'},c.company||c.phone||'')),
        app('td',{style:'font-size:12px;color:var(--muted2)'},catLabel(c.category)),
        app('td',{}),
        app('td',{className:'hide-mobile',style:'color:#4ade80;font-weight:600'},fmt(c.project_value)),
        app('td',{className:'hide-mobile td-muted'},staff?staff.name:'—'),
        app('td',{},app('button',{className:'btn btn-ghost btn-xs',onClick:(e)=>{e.stopPropagation();openClientModal(c,users,()=>renderPipeline(container));}},'View'))
      );
      tr.children[2].appendChild(stageBadge(c.pipeline_stage));
      tr.addEventListener('click',()=>openClientModal(c,users,()=>renderPipeline(container)));
      tbody.appendChild(tr);
    });
    listArea.appendChild(tw);
  }

  let st;
  searchInp.addEventListener('input',()=>{clearTimeout(st);st=setTimeout(()=>{filters.search=searchInp.value;renderList();},300);});
  stageSel.addEventListener('change',()=>{filters.stage=stageSel.value;renderList();});
  catSel.addEventListener('change',()=>{filters.category=catSel.value;renderList();});
  staffSel.addEventListener('change',()=>{filters.assigned=staffSel.value;renderList();});
  renderList();
}

// ── CLIENT DETAIL MODAL ────────────────────────────────────────────
function openClientModal(client,users,onUpdate){
  let modal=null;
  async function load(){
    const r=await api.get('/clients/'+client.id);
    if(!r.ok)return;
    const c=r.data; const activities=r.activities||[];
    if(modal)modal.remove();

    const staff=users.find(u=>u.id===c.assigned_to);
    const mDiv=h('div',{});
    const stageNote=h('input',{type:'text',className:'inp inp-sm',placeholder:'Note about this stage change…'});
    const nextDateInp=h('input',{type:'date',className:'inp inp-sm'});
    if(c.next_followup)nextDateInp.value=c.next_followup;

    // Stage selector
    const stageSel=h('select',{className:'inp inp-sm'});
    PIPELINE_STAGES.forEach(s=>{
      const opt=app('option',{value:s.value},s.label);
      if(s.value===c.pipeline_stage)opt.selected=true;
      stageSel.appendChild(opt);
    });

    // Project value & payments
    const projVal=h('input',{type:'number',className:'inp inp-sm',value:c.project_value||0,placeholder:'Project value ₹'});
    const advVal=h('input',{type:'number',className:'inp inp-sm',value:c.advance_paid||0,placeholder:'Advance paid ₹'});

    const saveStageBtn=app('button',{className:'btn btn-primary btn-sm',onClick:async()=>{
      saveStageBtn.disabled=true;
      await api.put('/clients/'+c.id,{pipeline_stage:stageSel.value,stage_note:stageNote.value,next_followup:nextDateInp.value||null,project_value:parseFloat(projVal.value)||0,advance_paid:parseFloat(advVal.value)||0});
      if(onUpdate)onUpdate();
      load();
    }},'Update Stage & Save');

    // Activity form
    const actType=h('select',{className:'inp inp-sm'});
    ACTIVITY_TYPES.forEach(a=>{actType.appendChild(app('option',{value:a.value},a.label));});
    const actTitle=h('input',{type:'text',className:'inp inp-sm',placeholder:'Title (e.g. "Sent proposal via email")'});
    const actDesc=h('textarea',{className:'inp inp-sm',rows:2,placeholder:'Details…'});
    const actAmount=h('input',{type:'number',className:'inp inp-sm',placeholder:'Amount ₹ (for payments)'});
    const actNext=h('input',{type:'text',className:'inp inp-sm',placeholder:'Next action (e.g. "Follow up on Monday")'});
    const actNextDate=h('input',{type:'date',className:'inp inp-sm'});
    const addActBtn=app('button',{className:'btn btn-success btn-sm',onClick:async()=>{
      if(!actTitle.value){mDiv.className='alert alert-error';mDiv.textContent='Enter a title.';return;}
      addActBtn.disabled=true;
      await api.post('/clients/'+c.id+'/activity',{type:actType.value,title:actTitle.value,description:actDesc.value,amount:parseFloat(actAmount.value)||null,next_action:actNext.value,next_date:actNextDate.value||null});
      actTitle.value='';actDesc.value='';actAmount.value='';actNext.value='';
      if(onUpdate)onUpdate();
      load();
    }},'+ Add Activity');

    // Timeline
    const timeline=app('div',{className:'timeline'});
    activities.forEach(act=>{
      const at=ACT_MAP[act.type]||{label:act.type,color:'#94a3b8'};
      const item=app('div',{className:'timeline-item'},
        app('div',{className:'timeline-dot',style:`border-color:${at.color};color:${at.color}`},at.label.slice(0,2)),
        app('div',{className:'timeline-content'},
          app('div',{className:'timeline-header'},
            app('div',{className:'timeline-title'},act.title||at.label),
            app('div',{className:'timeline-date'},fmtDate(act.date)+(act.user?' · '+act.user.name:''))
          ),
          act.description?app('div',{className:'timeline-desc'},act.description):null,
          act.amount?app('div',{style:'color:#4ade80;font-size:12px;margin-top:4px;font-weight:600'},'💰 '+fmt(act.amount)):null,
          act.next_action?app('div',{style:'color:#06b6d4;font-size:11px;margin-top:4px'},'→ '+act.next_action+(act.next_date?' ('+fmtDateOnly(act.next_date)+')':'')):null
        )
      );
      timeline.appendChild(item);
    });
    if(!activities.length){timeline.appendChild(app('p',{style:'color:var(--muted);font-size:13px'},'No activity yet.'));}

    modal=app('div',{className:'modal-overlay center',onClick:(e)=>{if(e.target===modal)modal.remove();}},
      app('div',{className:'modal center-modal wide-modal'},
        app('div',{className:'modal-header'},
          app('div',{},
            app('div',{style:'font-weight:800;font-size:18px'},c.name+(c.company?' — '+c.company:'')),
            app('div',{style:'display:flex;gap:8px;align-items:center;margin-top:6px'},
              stageBadge(c.pipeline_stage),
              app('span',{style:'color:var(--muted);font-size:12px'},catLabel(c.category))
            )
          ),
          app('button',{className:'modal-close',onClick:()=>modal.remove()},'✕')
        ),
        mDiv,
        // Client info
        app('div',{style:'display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px'},
          app('div',{},app('div',{style:'font-size:11px;color:var(--muted)'},'PHONE'),app('a',{href:`tel:${c.phone}`,className:'tel-link'},c.phone||'—')),
          app('div',{},app('div',{style:'font-size:11px;color:var(--muted)'},'PROJECT VALUE'),app('div',{style:'font-weight:700;color:#4ade80;font-size:15px'},fmt(c.project_value))),
          app('div',{},app('div',{style:'font-size:11px;color:var(--muted)'},'RECEIVED'),app('div',{style:'font-weight:700;color:#22c55e;font-size:15px'},fmt(c.total_received)))
        ),
        // Stage update
        app('div',{className:'card',style:'margin-bottom:14px'},
          app('div',{className:'card-title',style:'margin-bottom:10px'},'Update Pipeline Stage'),
          app('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px'},
            app('div',{},app('label',{style:'display:block;font-size:11px;color:var(--muted);margin-bottom:4px'},'Stage'),stageSel),
            app('div',{},app('label',{style:'display:block;font-size:11px;color:var(--muted);margin-bottom:4px'},'Next Follow-up'),nextDateInp)
          ),
          app('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px'},
            app('div',{},app('label',{style:'display:block;font-size:11px;color:var(--muted);margin-bottom:4px'},'Project Value (₹)'),projVal),
            app('div',{},app('label',{style:'display:block;font-size:11px;color:var(--muted);margin-bottom:4px'},'Advance Paid (₹)'),advVal)
          ),
          stageNote,
          app('div',{style:'margin-top:8px'},saveStageBtn)
        ),
        // Add activity
        app('div',{className:'card',style:'margin-bottom:14px'},
          app('div',{className:'card-title',style:'margin-bottom:10px'},'Add Activity / Update'),
          app('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px'},
            app('div',{},app('label',{style:'display:block;font-size:11px;color:var(--muted);margin-bottom:4px'},'Type'),actType),
            app('div',{},app('label',{style:'display:block;font-size:11px;color:var(--muted);margin-bottom:4px'},'Title'),actTitle)
          ),
          actDesc,
          app('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0'},
            app('div',{},app('label',{style:'display:block;font-size:11px;color:var(--muted);margin-bottom:4px'},'Amount ₹'),actAmount),
            app('div',{},app('label',{style:'display:block;font-size:11px;color:var(--muted);margin-bottom:4px'},'Next Follow-up Date'),actNextDate)
          ),
          actNext,
          app('div',{style:'margin-top:8px'},addActBtn)
        ),
        // Timeline
        app('div',{className:'section-label',style:'margin-bottom:12px'},'ACTIVITY TIMELINE'),
        timeline
      )
    );
    document.body.appendChild(modal);
  }
  load();
}

// ── ALL CLIENTS (admin) ────────────────────────────────────────────
async function renderAllClients(container){
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const [r,usersR]=await Promise.all([api.get('/clients?limit=200'),api.get('/users')]);
  const clients=r.ok?r.data:[];
  const users=usersR.ok?usersR.data:[];
  container.innerHTML='';
  container.appendChild(app('div',{className:'page-title'},'👥 All Clients'));

  const addBtn=app('button',{className:'btn btn-primary',style:'margin-bottom:14px',onClick:()=>openAddClientModal(users,()=>renderAllClients(container))},icon('plus',14),'Add Client Manually');
  container.appendChild(addBtn);

  const searchInp=h('input',{type:'search',className:'inp inp-sm',placeholder:'Search…',style:'flex:1;min-width:180px'});
  const stageSel=h('select',{className:'inp inp-sm'});
  [['all','All Stages'],...PIPELINE_STAGES.map(s=>[s.value,s.label])].forEach(([v,l])=>stageSel.appendChild(app('option',{value:v},l)));
  const catSel=h('select',{className:'inp inp-sm'});
  [['all','All Categories'],...CATEGORIES.map(c=>[c.value,c.label])].forEach(([v,l])=>catSel.appendChild(app('option',{value:v},l)));
  container.appendChild(app('div',{className:'filters-bar'},searchInp,stageSel,catSel));

  const listArea=h('div',{});
  container.appendChild(listArea);
  let filters={search:'',stage:'all',category:'all'};

  function renderList(){
    const filtered=clients.filter(c=>{
      if(filters.search&&![c.name,c.company,c.phone].some(v=>v&&v.toLowerCase().includes(filters.search.toLowerCase())))return false;
      if(filters.stage!=='all'&&c.pipeline_stage!==filters.stage)return false;
      if(filters.category!=='all'&&c.category!==filters.category)return false;
      return true;
    });
    listArea.innerHTML='';
    const tw=app('div',{className:'table-wrap'},app('table',{},
      app('thead',{},app('tr',{},...['Client','Phone','Category','Stage','Value','Received','Actions'].map(h2=>app('th',{className:['Phone','Value','Received'].includes(h2)?'hide-mobile':''},h2)))),
      app('tbody',{id:'cl-tbody'})
    ));
    const tbody=tw.querySelector('#cl-tbody');
    if(!filtered.length){tbody.appendChild(app('tr',{className:'empty-row'},app('td',{colSpan:7},'No clients.')));}
    filtered.forEach(c=>{
      const tr=app('tr',{},
        app('td',{},app('div',{className:'td-name'},c.name),app('div',{className:'td-muted'},c.company||'')),
        app('td',{className:'hide-mobile td-muted',style:'font-family:monospace'},c.phone||'—'),
        app('td',{style:'font-size:12px;color:var(--muted2)'},catLabel(c.category)),
        app('td',{}),
        app('td',{className:'hide-mobile',style:'color:#4ade80;font-weight:600'},fmt(c.project_value)),
        app('td',{className:'hide-mobile',style:'color:#22c55e'},fmt(c.total_received)),
        app('td',{},app('button',{className:'btn btn-ghost btn-xs',onClick:()=>openClientModal(c,users,()=>renderAllClients(container))},'View'))
      );
      tr.children[3].appendChild(stageBadge(c.pipeline_stage));
      tbody.appendChild(tr);
    });
    listArea.appendChild(tw);
  }

  let st;
  searchInp.addEventListener('input',()=>{clearTimeout(st);st=setTimeout(()=>{filters.search=searchInp.value;renderList();},300);});
  stageSel.addEventListener('change',()=>{filters.stage=stageSel.value;renderList();});
  catSel.addEventListener('change',()=>{filters.category=catSel.value;renderList();});
  renderList();
}

function openAddClientModal(users,onSave){
  const mDiv=h('div',{});
  const fields={name:h('input',{type:'text',className:'inp',placeholder:'Client Name *'}),company:h('input',{type:'text',className:'inp',placeholder:'Company Name'}),phone:h('input',{type:'tel',className:'inp',placeholder:'Phone'}),email:h('input',{type:'email',className:'inp',placeholder:'Email'}),city:h('input',{type:'text',className:'inp',placeholder:'City'}),website:h('input',{type:'url',className:'inp',placeholder:'Website URL'})};
  const catSel=h('select',{className:'inp'});
  CATEGORIES.forEach(c=>catSel.appendChild(app('option',{value:c.value},c.label)));
  const stageSel=h('select',{className:'inp'});
  PIPELINE_STAGES.forEach(s=>stageSel.appendChild(app('option',{value:s.value},s.label)));
  const staffSel=h('select',{className:'inp'});
  staffSel.appendChild(app('option',{value:''},'Assign to (optional)'));
  users.filter(u=>u.role==='staff').forEach(u=>staffSel.appendChild(app('option',{value:u.id},u.name)));
  const srcSel=h('select',{className:'inp'});
  [['cold_call','Cold Call'],['ads','Ads Lead'],['referral','Referral'],['audit','Website Audit'],['manual','Manual']].forEach(([v,l])=>srcSel.appendChild(app('option',{value:v},l)));
  const projVal=h('input',{type:'number',className:'inp',placeholder:'Project Value ₹'});
  const notes=h('textarea',{className:'inp',rows:2,placeholder:'Initial notes…'});

  const modal=app('div',{className:'modal-overlay center',onClick:(e)=>{if(e.target===modal)modal.remove();}},
    app('div',{className:'modal center-modal wide-modal'},
      app('div',{className:'modal-header'},app('span',{className:'modal-title'},'Add Client'),app('button',{className:'modal-close',onClick:()=>modal.remove()},'✕')),
      mDiv,
      app('div',{className:'form-grid'},
        app('div',{className:'field',style:'margin:0'},app('label',{},'Name *'),fields.name),
        app('div',{className:'field',style:'margin:0'},app('label',{},'Company'),fields.company),
        app('div',{className:'field',style:'margin:0'},app('label',{},'Phone'),fields.phone),
        app('div',{className:'field',style:'margin:0'},app('label',{},'Email'),fields.email),
        app('div',{className:'field',style:'margin:0'},app('label',{},'City'),fields.city),
        app('div',{className:'field',style:'margin:0'},app('label',{},'Website'),fields.website)
      ),
      app('div',{style:'display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:10px'},
        app('div',{className:'field',style:'margin:0'},app('label',{},'Category'),catSel),
        app('div',{className:'field',style:'margin:0'},app('label',{},'Stage'),stageSel),
        app('div',{className:'field',style:'margin:0'},app('label',{},'Source'),srcSel)
      ),
      app('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px'},
        app('div',{className:'field',style:'margin:0'},app('label',{},'Assign to Staff'),staffSel),
        app('div',{className:'field',style:'margin:0'},app('label',{},'Project Value ₹'),projVal)
      ),
      app('div',{className:'field',style:'margin-top:10px'},app('label',{},'Notes'),notes),
      app('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:4px',onClick:async()=>{
        if(!fields.name.value){mDiv.className='alert alert-error';mDiv.textContent='Name required.';return;}
        const r=await api.post('/clients',{name:fields.name.value,company:fields.company.value,phone:fields.phone.value,email:fields.email.value,city:fields.city.value,website:fields.website.value,category:catSel.value,pipeline_stage:stageSel.value,source:srcSel.value,assigned_to:staffSel.value?parseInt(staffSel.value):null,project_value:parseFloat(projVal.value)||0,notes:notes.value});
        if(r.ok){modal.remove();if(onSave)onSave();}
        else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
      }},'Add Client')
    )
  );
  document.body.appendChild(modal);
}

// ── DIALER ─────────────────────────────────────────────────────────
async function renderDialer(container){
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const r=await api.get('/leads?limit=1&status=pending');
  container.innerHTML='';
  const leads=r.ok?r.data:[];
  if(!leads.length){
    container.appendChild(app('div',{style:'text-align:center;padding:60px'},app('div',{style:'font-size:48px'},'🎉'),app('div',{style:'font-size:20px;font-weight:700;margin-top:12px'},'All calls done!'),app('p',{style:'color:var(--muted);margin-top:8px'},'No pending leads.')));
    return;
  }
  let currentLead=leads[0],callCount=0;
  const dialerWrap=app('div',{style:'max-width:480px;margin:0 auto'});
  container.appendChild(dialerWrap);
  showLead(currentLead);

  function showLead(lead){
    dialerWrap.innerHTML='';
    const st=CALL_MAP[lead.status||'pending'];
    const notIntDiv=h('div',{style:'display:none'});
    const notIntInp=h('textarea',{className:'inp',rows:2,placeholder:'Why not interested? (helps improve our approach)'});
    notIntDiv.appendChild(app('div',{className:'field',style:'margin-top:8px'},app('label',{},'Reason not interested (optional)'),notIntInp));

    const cbRow=h('div',{style:'display:none'});
    const cbDate=h('input',{type:'date',className:'inp'});
    cbRow.appendChild(app('div',{className:'field'},app('label',{},'Call-back Date'),cbDate));

    const noteInp=h('textarea',{className:'inp',rows:2,placeholder:'Note about this call…'});
    const mDiv=h('div',{});

    let selectedStatus='';
    const statusGrid=app('div',{className:'status-grid'});
    const statusBtns={};
    CALL_STATUSES.filter(s=>s.value!=='pending').forEach(s=>{
      const btn=app('button',{className:'status-btn',style:`color:${s.color};border-color:${s.color}44`,onClick:()=>{
        selectedStatus=s.value;
        Object.values(statusBtns).forEach(b=>{b.style.background='var(--bg)';b.style.color=b._c;b.style.borderColor=b._c+'44';});
        btn.style.background=s.color;btn.style.color='#fff';btn.style.borderColor=s.color;
        cbRow.style.display=s.value==='callback'?'':'none';
        notIntDiv.style.display=s.value==='not_interested'?'':'none';
      }},s.label);
      btn._c=s.color;statusGrid.appendChild(btn);statusBtns[s.value]=btn;
    });

    const saveBtn=app('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;font-size:15px;padding:12px',onClick:saveAndNext},'Save & Next →');
    const skipBtn=app('button',{className:'btn btn-ghost',style:'width:100%;justify-content:center;margin-top:8px',onClick:skipLead},'Skip this lead');

    const histDiv=app('div',{className:'call-history',style:'min-height:30px'});
    api.get('/leads/'+lead.id+'/logs').then(r=>{
      if(r.ok&&r.data.length)r.data.forEach(log=>{
        const s=CALL_MAP[log.status||'pending'];
        histDiv.appendChild(app('div',{className:'call-entry'},
          app('div',{className:'call-entry-top'},app('span',{style:`color:${s.color};font-weight:600`},s.label),app('span',{style:'color:var(--muted)'},fmtDate(log.call_date))),
          log.note?app('div',{className:'call-entry-note'},log.note):null
        ));
      });
      else histDiv.appendChild(app('p',{style:'color:var(--muted);font-size:12px'},'First call'));
    });

    async function saveAndNext(){
      if(!selectedStatus){mDiv.className='alert alert-error';mDiv.textContent='Select outcome!';return;}
      saveBtn.disabled=true;saveBtn.textContent='Saving…';
      const body={status:selectedStatus,note:noteInp.value};
      if(selectedStatus==='callback'&&cbDate.value)body.callback_date=cbDate.value;
      if(selectedStatus==='not_interested'&&notIntInp.value)body.not_converted_reason=notIntInp.value;
      const r=await api.post('/leads/'+lead.id+'/log',body);
      if(r.ok){
        callCount++;
        if(r.newClient){
          const msg=app('div',{className:'alert alert-success',style:'margin-bottom:12px'},'⭐ Lead marked Interested! Added to client pipeline.');
          dialerWrap.prepend(msg);setTimeout(()=>msg.remove(),3000);
        }
        if(r.nextLead){currentLead=r.nextLead;showLead(r.nextLead);}
        else{dialerWrap.innerHTML='';dialerWrap.appendChild(app('div',{style:'text-align:center;padding:40px'},app('div',{style:'font-size:48px'},'🎉'),app('div',{style:'font-size:18px;font-weight:700;margin-top:12px'},'All calls done!'),app('p',{style:'color:var(--muted);margin-top:6px'},'Calls this session: '+callCount)));}
      } else{mDiv.className='alert alert-error';mDiv.textContent=r.error;saveBtn.disabled=false;saveBtn.textContent='Save & Next →';}
    }
    async function skipLead(){
      const r=await api.get('/leads/next?after_id='+lead.id);
      if(r.ok&&r.data){currentLead=r.data;showLead(r.data);}
      else{dialerWrap.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted)">No more leads.</div>';}
    }

    dialerWrap.appendChild(app('div',{style:'text-align:center;margin-bottom:16px'},
      app('div',{style:'color:var(--muted);font-size:11px;margin-bottom:4px;font-weight:600'},'CALLING #'+(callCount+1)),
      app('div',{style:'font-size:22px;font-weight:800'},lead.name||'Unknown'),
      app('a',{href:`tel:${lead.phone}`,style:'display:block;font-size:28px;font-weight:800;color:var(--accent2);margin:8px 0;font-family:monospace;text-decoration:none;background:var(--bg2);border-radius:10px;padding:12px'},'📞 '+lead.phone),
      lead.city?app('div',{style:'color:var(--muted);font-size:12px'},'📍 '+lead.city):null,
      lead.category&&lead.category!=='other'?app('div',{style:'color:var(--accent2);font-size:12px;margin-top:2px'},catLabel(lead.category)):null
    ));
    dialerWrap.appendChild(app('div',{className:'card'},
      app('div',{className:'section-label',style:'margin-bottom:10px'},'CALL OUTCOME'),
      mDiv,statusGrid,cbRow,notIntDiv,
      app('div',{className:'field'},app('label',{},'Note'),noteInp),
      saveBtn,skipBtn,
      app('div',{className:'section-label',style:'margin-top:14px;margin-bottom:8px'},'CALL HISTORY'),
      histDiv
    ));
  }
}

// ── MY LEADS (staff) ───────────────────────────────────────────────
async function renderMyLeads(container){
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  container.innerHTML='';
  container.appendChild(app('div',{className:'page-title'},'📋 My Leads'));
  let filters={search:'',status:'all'};
  const pillsRow=h('div',{className:'status-pills'});
  const allPill=app('button',{className:'pill',style:'background:var(--accent);color:#fff',onClick:()=>{filters.status='all';load();}});
  allPill.textContent='All';pillsRow.appendChild(allPill);
  CALL_STATUSES.forEach(s=>{
    const p=app('button',{className:'pill',style:`color:${s.color};border-color:${s.color}33`},s.label);
    p.addEventListener('click',()=>{filters.status=s.value;load();});
    pillsRow.appendChild(p);
  });
  container.appendChild(pillsRow);
  const searchInp=h('input',{type:'search',className:'inp inp-sm',placeholder:'Search…',style:'margin-bottom:14px;'});
  container.appendChild(searchInp);
  const listArea=h('div',{});container.appendChild(listArea);
  let activeModal=null;
  async function load(){
    listArea.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
    const params=new URLSearchParams({limit:200,search:filters.search,status:filters.status});
    const r=await api.get('/leads?'+params);
    const leads=r.ok?r.data:[];
    listArea.innerHTML='';
    if(!leads.length){listArea.appendChild(app('div',{style:'text-align:center;padding:40px;color:var(--muted)'},'No leads.'));return;}
    const list=app('div',{className:'lead-list'});
    leads.forEach(lead=>{
      const s=CALL_MAP[lead.status||'pending'];
      const card=app('div',{className:'lead-card',style:`border-left-color:${s.color}`},
        app('div',{className:'lead-card-top'},
          app('div',{},app('div',{className:'lead-name'},lead.name||'Unknown'),app('div',{className:'lead-phone'},lead.phone),lead.city?app('div',{className:'lead-meta'},'📍 '+lead.city):null,lead.category&&lead.category!=='other'?app('div',{className:'lead-meta'},catLabel(lead.category)):null),
          callBadge(lead.status)
        ),
        lead.last_note?app('div',{className:'lead-note'},'📝 '+lead.last_note):null,
        lead.callback_date?app('div',{style:'color:#fbbf24;font-size:11px;margin-top:4px'},'📅 '+lead.callback_date):null
      );
      card.addEventListener('click',()=>{
        if(activeModal)activeModal.remove();
        activeModal=renderCallModal(lead,()=>{if(activeModal){activeModal.remove();activeModal=null;}load();},()=>{if(activeModal){activeModal.remove();activeModal=null;}});
        document.body.appendChild(activeModal);
      });
      list.appendChild(card);
    });
    listArea.appendChild(list);
    listArea.appendChild(app('p',{style:'color:var(--muted);font-size:12px;margin-top:10px'},leads.length+' leads'));
  }
  let t;searchInp.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(()=>{filters.search=searchInp.value;load();},400);});
  load();
}

// ── MY CLIENTS (staff) ────────────────────────────────────────────
async function renderMyClients(container){
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const r=await api.get('/clients?limit=200');
  const clients=r.ok?r.data:[];
  const usersR=await api.get('/users');
  const users=usersR.ok?usersR.data:[];
  container.innerHTML='';
  container.appendChild(app('div',{className:'page-title'},'👥 My Clients'));
  const addBtn=app('button',{className:'btn btn-primary',style:'margin-bottom:14px',onClick:()=>openAddClientModal(users,()=>renderMyClients(container))},'+  Add Client');
  container.appendChild(addBtn);
  if(!clients.length){container.appendChild(app('p',{style:'color:var(--muted)'},'No clients yet. When a lead is marked Interested, they auto-appear here.'));return;}
  const list=app('div',{className:'lead-list'});
  clients.forEach(c=>{
    const s=STAGE_MAP[c.pipeline_stage]||{color:'#94a3b8'};
    const card=app('div',{className:'lead-card',style:`border-left-color:${s.color}`},
      app('div',{className:'lead-card-top'},
        app('div',{},app('div',{className:'lead-name'},c.name+(c.company?' — '+c.company:'')),app('div',{className:'lead-phone'},c.phone||'—'),app('div',{className:'lead-meta'},catLabel(c.category))),
        stageBadge(c.pipeline_stage)
      ),
      app('div',{style:'display:flex;gap:16px;margin-top:8px;font-size:12px'},
        app('span',{style:'color:#4ade80'},'Value: '+fmt(c.project_value)),
        app('span',{style:'color:#22c55e'},'Received: '+fmt(c.total_received))
      ),
      c.next_followup?app('div',{style:'color:#fbbf24;font-size:11px;margin-top:4px'},'📅 Follow-up: '+fmtDateOnly(c.next_followup)):null
    );
    card.addEventListener('click',()=>openClientModal(c,users,()=>renderMyClients(container)));
    list.appendChild(card);
  });
  container.appendChild(list);
}

// ── FOLLOW-UPS (staff) ────────────────────────────────────────────
async function renderFollowups(container){
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const [leadsR,clientsR,usersR]=await Promise.all([api.get('/leads?limit=300&status=callback'),api.get('/clients?limit=200'),api.get('/users')]);
  const leads=leadsR.ok?leadsR.data:[];
  const clients=clientsR.ok?clientsR.data.filter(c=>c.next_followup):[];
  const users=usersR.ok?usersR.data:[];
  const today=new Date().toISOString().slice(0,10);
  container.innerHTML='';
  container.appendChild(app('div',{className:'page-title'},'🔔 Follow-ups'));

  function section(title,items,renderItem){
    const sec=app('div',{style:'margin-bottom:24px'},app('div',{className:'section-label'},title+' ('+items.length+')'));
    if(!items.length){sec.appendChild(app('p',{style:'color:var(--muted);font-size:13px'},'None'));return sec;}
    const list=app('div',{className:'lead-list'});
    items.forEach(item=>list.appendChild(renderItem(item)));
    sec.appendChild(list);return sec;
  }

  const callOverdue=leads.filter(l=>l.callback_date&&l.callback_date<today);
  const callToday=leads.filter(l=>l.callback_date===today);
  const clientFollowups=clients.filter(c=>c.next_followup<=today&&!['completed','lost'].includes(c.pipeline_stage));
  const upcoming=clients.filter(c=>c.next_followup>today&&!['completed','lost'].includes(c.pipeline_stage));
  let activeModal=null;

  container.appendChild(section('🔴 Overdue Calls',callOverdue,l=>{
    const s=CALL_MAP[l.status||'pending'];
    const card=app('div',{className:'lead-card',style:`border-left-color:#ef4444;cursor:pointer`},app('div',{className:'lead-card-top'},app('div',{},app('div',{className:'lead-name'},l.name),app('div',{className:'lead-phone'},l.phone)),app('div',{style:'text-align:right'},callBadge(l.status),app('div',{style:'color:#ef4444;font-size:11px;margin-top:3px'},'📅 '+l.callback_date))),l.last_note?app('div',{className:'lead-note'},'📝 '+l.last_note):null);
    card.addEventListener('click',()=>{if(activeModal)activeModal.remove();activeModal=renderCallModal(l,()=>{if(activeModal){activeModal.remove();activeModal=null;}renderFollowups(container);},()=>{if(activeModal){activeModal.remove();activeModal=null;}});document.body.appendChild(activeModal);});
    return card;
  }));

  container.appendChild(section('🟡 Call Backs Today',callToday,l=>{
    const card=app('div',{className:'lead-card',style:`border-left-color:#fbbf24;cursor:pointer`},app('div',{className:'lead-card-top'},app('div',{},app('div',{className:'lead-name'},l.name),app('div',{className:'lead-phone'},l.phone)),callBadge(l.status)),l.last_note?app('div',{className:'lead-note'},'📝 '+l.last_note):null);
    card.addEventListener('click',()=>{if(activeModal)activeModal.remove();activeModal=renderCallModal(l,()=>{if(activeModal){activeModal.remove();activeModal=null;}renderFollowups(container);},()=>{if(activeModal){activeModal.remove();activeModal=null;}});document.body.appendChild(activeModal);});
    return card;
  }));

  container.appendChild(section('🟠 Client Follow-ups Due',clientFollowups,c=>{
    const card=app('div',{className:'lead-card',style:`border-left-color:#fb923c;cursor:pointer`},app('div',{className:'lead-card-top'},app('div',{},app('div',{className:'lead-name'},c.name+(c.company?' — '+c.company:'')),app('div',{className:'lead-meta'},catLabel(c.category))),app('div',{style:'text-align:right'},stageBadge(c.pipeline_stage),app('div',{style:'color:#fb923c;font-size:11px;margin-top:3px'},'📅 '+fmtDateOnly(c.next_followup)))));
    card.addEventListener('click',()=>openClientModal(c,users,()=>renderFollowups(container)));
    return card;
  }));

  container.appendChild(section('🟢 Upcoming Client Follow-ups',upcoming,c=>{
    const card=app('div',{className:'lead-card',style:`border-left-color:#22c55e;cursor:pointer`},app('div',{className:'lead-card-top'},app('div',{},app('div',{className:'lead-name'},c.name+(c.company?' — '+c.company:'')),app('div',{className:'lead-meta'},catLabel(c.category))),app('div',{style:'text-align:right'},stageBadge(c.pipeline_stage),app('div',{style:'color:#22c55e;font-size:11px;margin-top:3px'},'📅 '+fmtDateOnly(c.next_followup)))));
    card.addEventListener('click',()=>openClientModal(c,users,()=>renderFollowups(container)));
    return card;
  }));
}

// ── MY STATS (staff) ──────────────────────────────────────────────
async function renderMyStats(container){
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const [statsR,pipeR]=await Promise.all([api.get('/leads/stats'),api.get('/analytics/pipeline')]);
  container.innerHTML='';
  container.appendChild(app('div',{className:'page-title'},'📊 My Stats'));
  const s=statsR.ok?statsR:{total:0,byStatus:[],todayCalls:0,monthCalls:0};
  const p=pipeR.ok?pipeR:{byStage:[],followups:[]};
  const byStatus=Object.fromEntries((s.byStatus||[]).map(x=>[x.status,parseInt(x.cnt)]));
  const byStage=Object.fromEntries((p.byStage||[]).map(x=>[x.pipeline_stage,parseInt(x.cnt)]));

  const grid=h('div',{className:'stats-grid'});
  [{label:'Calls Today',val:s.todayCalls||0,color:'#6366f1'},{label:'Calls Month',val:s.monthCalls||0,color:'#3b82f6'},{label:'Total Leads',val:s.total||0,color:'#8b5cf6'},{label:'Interested',val:byStatus['interested']||0,color:'#22c55e'},{label:'Meetings',val:byStage['meeting_scheduled']||0,color:'#a78bfa'},{label:'Converted',val:byStage['converted']||0,color:'#4ade80'}].forEach(c=>{
    grid.appendChild(app('div',{className:'stat-card',style:`border-top-color:${c.color}`},app('div',{className:'stat-num',style:`color:${c.color}`},String(c.val)),app('div',{className:'stat-label'},c.label)));
  });
  container.appendChild(grid);

  const card=app('div',{className:'card'},app('div',{className:'card-title'},'Call Outcomes'));
  const total=s.total||1;
  CALL_STATUSES.forEach(st=>{
    const cnt=byStatus[st.value]||0;
    const pct=Math.round((cnt/total)*100);
    card.appendChild(app('div',{className:'progress-row'},app('div',{className:'progress-label'},st.label),app('div',{className:'progress-bar-wrap'},app('div',{className:'progress-bar',style:`width:${pct}%;background:${st.color}`})),app('div',{className:'progress-count',style:`color:${st.color}`},String(cnt))));
  });
  container.appendChild(card);

  if(Object.keys(byStage).length){
    const pCard=app('div',{className:'card'},app('div',{className:'card-title'},'My Pipeline Stages'));
    PIPELINE_STAGES.filter(s=>byStage[s.value]>0).forEach(s=>{
      pCard.appendChild(app('div',{style:'display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)'},stageBadge(s.value),app('span',{style:`color:${s.color};font-weight:700`},byStage[s.value])));
    });
    container.appendChild(pCard);
  }
}

// ── CALL MODAL ────────────────────────────────────────────────────
function renderCallModal(lead,onSave,onClose){
  let selectedStatus=lead.status||'pending';
  const cbRow=h('div',{style:'display:none'});
  const cbDate=h('input',{type:'date',className:'inp',value:lead.callback_date||''});
  cbRow.appendChild(app('div',{className:'field'},app('label',{},'Call-back Date'),cbDate));
  const notIntRow=h('div',{style:'display:none'});
  const notIntInp=h('textarea',{className:'inp',rows:2,placeholder:'Why not interested? (helps improve)'});
  notIntRow.appendChild(app('div',{className:'field'},app('label',{},'Reason'),notIntInp));
  const noteInp=h('textarea',{className:'inp',rows:2,placeholder:'Call notes…'});
  const mDiv=h('div',{});
  const histDiv=app('div',{className:'call-history'});
  api.get('/leads/'+lead.id+'/logs').then(r=>{
    if(r.ok&&r.data.length)r.data.forEach(log=>{const s=CALL_MAP[log.status||'pending'];histDiv.appendChild(app('div',{className:'call-entry'},app('div',{className:'call-entry-top'},app('span',{style:`color:${s.color};font-weight:600`},s.label),app('span',{style:'color:var(--muted)'},fmtDate(log.call_date))),log.note?app('div',{className:'call-entry-note'},log.note):null));});
    else histDiv.appendChild(app('p',{style:'color:var(--muted);font-size:12px'},'No history'));
  });
  const statusGrid=app('div',{className:'status-grid'});
  const statusBtns={};
  CALL_STATUSES.filter(s=>s.value!=='pending').forEach(s=>{
    const btn=app('button',{className:'status-btn',style:`color:${s.color};border-color:${s.color}44`},s.label);
    if(selectedStatus===s.value){btn.style.background=s.color;btn.style.color='#fff';btn.style.borderColor=s.color;}
    btn.addEventListener('click',()=>{
      selectedStatus=s.value;
      Object.values(statusBtns).forEach(b=>{b.style.background='var(--bg)';b.style.color=b._c;b.style.borderColor=b._c+'44';});
      btn.style.background=s.color;btn.style.color='#fff';btn.style.borderColor=s.color;
      cbRow.style.display=s.value==='callback'?'':'none';
      notIntRow.style.display=s.value==='not_interested'?'':'none';
    });
    btn._c=s.color;statusGrid.appendChild(btn);statusBtns[s.value]=btn;
  });
  const saveBtn=app('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:4px',onClick:async()=>{
    if(!selectedStatus||selectedStatus==='pending'){mDiv.className='alert alert-error';mDiv.textContent='Select outcome.';return;}
    saveBtn.disabled=true;saveBtn.textContent='Saving…';
    const body={status:selectedStatus,note:noteInp.value};
    if(selectedStatus==='callback'&&cbDate.value)body.callback_date=cbDate.value;
    if(selectedStatus==='not_interested'&&notIntInp.value)body.not_converted_reason=notIntInp.value;
    const r=await api.post('/leads/'+lead.id+'/log',body);
    if(r.ok){
      if(r.newClient){const msg=app('div',{className:'alert alert-success'},'⭐ Added to client pipeline!');modal.querySelector('.modal').prepend(msg);setTimeout(()=>msg.remove(),2000);}
      onSave({...lead,...body});
    } else{mDiv.className='alert alert-error';mDiv.textContent=r.error;saveBtn.disabled=false;saveBtn.textContent='Save & Update';}
  }},'Save & Update');

  const modal=app('div',{className:'modal-overlay',onClick:(e)=>{if(e.target===modal)onClose();}},
    app('div',{className:'modal'},
      app('div',{className:'modal-header'},
        app('div',{},app('div',{style:'font-weight:700;font-size:17px'},lead.name||'Lead'),app('a',{href:`tel:${lead.phone}`,className:'tel-link'},'📞 '+lead.phone),lead.city?app('div',{style:'color:var(--muted);font-size:12px'},'📍 '+lead.city):null,lead.category&&lead.category!=='other'?app('div',{style:'color:var(--accent2);font-size:12px'},catLabel(lead.category)):null),
        app('button',{className:'modal-close',onClick:onClose},'✕')
      ),
      mDiv,app('div',{className:'field'},app('label',{},'Call Outcome'),statusGrid),
      cbRow,notIntRow,app('div',{className:'field'},app('label',{},'Note'),noteInp),
      lead.last_note?app('div',{className:'alert alert-info',style:'font-size:12px;margin-bottom:10px'},'Previous: '+lead.last_note):null,
      saveBtn,
      app('div',{className:'section-label',style:'margin-top:14px;margin-bottom:8px'},'CALL HISTORY'),histDiv
    )
  );
  return modal;
}

// ── ADMIN LEADS ───────────────────────────────────────────────────
async function renderAdminLeads(container){
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const [usersR]=await Promise.all([api.get('/users')]);
  const users=usersR.ok?usersR.data:[];
  container.innerHTML='';
  container.appendChild(app('div',{className:'page-title'},'📋 All Leads'));

  let page=1,filters={search:'',status:'all',category:'all',source:'all',assigned:'all'};
  const searchInp=h('input',{type:'search',className:'inp inp-sm',placeholder:'Search…',style:'flex:1;min-width:180px'});
  const statusSel=h('select',{className:'inp inp-sm'});
  [['all','All Status'],...CALL_STATUSES.map(s=>[s.value,s.label])].forEach(([v,l])=>statusSel.appendChild(app('option',{value:v},l)));
  const catSel=h('select',{className:'inp inp-sm'});
  [['all','All Category'],...CATEGORIES.map(c=>[c.value,c.label])].forEach(([v,l])=>catSel.appendChild(app('option',{value:v},l)));
  const srcSel=h('select',{className:'inp inp-sm'});
  [['all','All Source'],['cold_call','Cold Call'],['ads','Ads'],['referral','Referral'],['audit','Audit'],['manual','Manual'],['import','Import']].forEach(([v,l])=>srcSel.appendChild(app('option',{value:v},l)));
  const staffSel=h('select',{className:'inp inp-sm'});
  [['all','All Staff'],['unassigned','Unassigned'],...users.filter(u=>u.role==='staff').map(u=>[u.id,u.name])].forEach(([v,l])=>staffSel.appendChild(app('option',{value:v},l)));
  container.appendChild(app('div',{className:'filters-bar'},searchInp,statusSel,catSel,srcSel,staffSel));

  const assignCard=app('div',{className:'card',style:'margin-bottom:14px'});
  const assignSel=h('select',{className:'inp inp-sm'});
  [['','Select staff…'],...users.filter(u=>u.role==='staff').map(u=>[u.id,u.name])].forEach(([v,l])=>assignSel.appendChild(app('option',{value:v},l)));
  const assignBtn=app('button',{className:'btn btn-primary btn-sm',onClick:doAssign},'Assign Selected');
  const assignMsg=h('div',{});
  assignCard.appendChild(app('div',{style:'display:flex;gap:8px;align-items:center;flex-wrap:wrap'},app('span',{style:'color:var(--muted);font-size:13px;font-weight:600'},'Bulk Assign:'),assignSel,assignBtn));
  assignCard.appendChild(assignMsg);
  container.appendChild(assignCard);

  const tableArea=h('div',{});container.appendChild(tableArea);
  const selectedIds=new Set();

  async function load(){
    tableArea.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
    const params=new URLSearchParams({page,limit:50,search:filters.search,status:filters.status,category:filters.category,source:filters.source,assigned:filters.assigned});
    const r=await api.get('/leads?'+params);
    if(!r.ok){tableArea.innerHTML='<p style="color:var(--muted)">Error</p>';return;}
    tableArea.innerHTML='';
    const allCheck=h('input',{type:'checkbox'});
    const tw=app('div',{className:'table-wrap'},app('table',{},
      app('thead',{},app('tr',{},app('th',{style:'width:36px'},allCheck),...['Name','Phone','Category','Status','Assigned','Actions'].map(c=>app('th',{className:['Category'].includes(c)?'hide-mobile':''},c)))),
      app('tbody',{id:'leads-tbody'})
    ));
    const tbody=tw.querySelector('#leads-tbody');
    allCheck.addEventListener('change',()=>{r.data.forEach(l=>allCheck.checked?selectedIds.add(l.id):selectedIds.delete(l.id));tbody.querySelectorAll('input[type=checkbox]').forEach(c=>c.checked=allCheck.checked);});
    if(!r.data.length){tbody.appendChild(app('tr',{className:'empty-row'},app('td',{colSpan:7},'No leads.')));}
    r.data.forEach(l=>{
      const staff=users.find(u=>u.id===l.assigned_to);
      const cb=h('input',{type:'checkbox'});cb.checked=selectedIds.has(l.id);
      cb.addEventListener('change',()=>cb.checked?selectedIds.add(l.id):selectedIds.delete(l.id));
      const tr=app('tr',{},app('td',{},cb),app('td',{className:'td-name'},l.name||'—'),app('td',{style:'font-family:monospace;font-size:12px;color:var(--muted2)'},l.phone||'—'),app('td',{className:'hide-mobile',style:'font-size:12px;color:var(--muted2)'},catLabel(l.category)),app('td',{}),app('td',{style:'font-size:12px;color:var(--muted2)'},staff?staff.name:'—'),app('td',{},app('button',{className:'btn btn-danger btn-xs',onClick:async()=>{if(!confirm('Delete?'))return;await api.del('/leads/'+l.id);load();}},'Del')));
      tr.children[4].appendChild(callBadge(l.status));
      tbody.appendChild(tr);
    });
    tableArea.appendChild(tw);
    if(r.pages>1){const pag=app('div',{className:'pagination'});if(page>1)pag.appendChild(app('button',{className:'page-btn',onClick:()=>{page--;load();}},'← Prev'));pag.appendChild(app('span',{className:'page-info'},`Page ${r.page}/${r.pages} · ${r.total} leads`));if(page<r.pages)pag.appendChild(app('button',{className:'page-btn',onClick:()=>{page++;load();}},'Next →'));tableArea.appendChild(pag);}
    else tableArea.appendChild(app('p',{style:'color:var(--muted);font-size:12px;margin-top:8px'},r.total+' leads'));
  }

  async function doAssign(){
    if(!assignSel.value){assignMsg.className='alert alert-error';assignMsg.textContent='Select staff.';return;}
    if(!selectedIds.size){assignMsg.className='alert alert-error';assignMsg.textContent='Select leads.';return;}
    const r=await api.post('/leads/assign',{lead_ids:[...selectedIds],staff_id:parseInt(assignSel.value)});
    if(r.ok){assignMsg.className='alert alert-success';assignMsg.textContent='✓ '+r.count+' leads assigned.';selectedIds.clear();setTimeout(()=>{assignMsg.className='';assignMsg.textContent='';},3000);load();}
    else{assignMsg.className='alert alert-error';assignMsg.textContent=r.error;}
  }

  let st;searchInp.addEventListener('input',()=>{clearTimeout(st);st=setTimeout(()=>{filters.search=searchInp.value;page=1;load();},400);});
  statusSel.addEventListener('change',()=>{filters.status=statusSel.value;page=1;load();});
  catSel.addEventListener('change',()=>{filters.category=catSel.value;page=1;load();});
  srcSel.addEventListener('change',()=>{filters.source=srcSel.value;page=1;load();});
  staffSel.addEventListener('change',()=>{filters.assigned=staffSel.value;page=1;load();});
  load();
}

// ── IMPORT ────────────────────────────────────────────────────────
function renderImport(container){
  container.innerHTML='';
  container.appendChild(app('div',{className:'page-title'},'📤 Import Leads'));
  let uploadedFile=null,headers=[],mapping={name:'',phone:'',email:'',city:'',category:''},totalRows=0;
  const msgDiv=h('div',{});
  const step2=h('div',{style:'display:none'});
  const fileInput=h('input',{type:'file',accept:'.csv,.xlsx,.xls',style:'display:none'});
  const dropzone=app('div',{className:'dropzone',onClick:()=>fileInput.click()},app('div',{style:'font-size:36px'},'📁'),app('p',{},'Click to upload CSV or Excel file'),app('p',{style:'font-size:11px;color:var(--muted)'},'First row must be headers'));
  dropzone.addEventListener('dragover',e=>{e.preventDefault();dropzone.style.borderColor='var(--accent)';});
  dropzone.addEventListener('dragleave',()=>dropzone.style.borderColor='');
  dropzone.addEventListener('drop',e=>{e.preventDefault();dropzone.style.borderColor='';handleFile(e.dataTransfer.files[0]);});
  fileInput.addEventListener('change',()=>handleFile(fileInput.files[0]));
  const catSel=h('select',{className:'inp'});
  [['','Leave as is in file'],...CATEGORIES.map(c=>[c.value,c.label])].forEach(([v,l])=>catSel.appendChild(app('option',{value:v},l)));
  const srcSel=h('select',{className:'inp'});
  [['cold_call','Cold Call'],['ads','Ads Lead'],['import','Import'],['referral','Referral']].forEach(([v,l])=>srcSel.appendChild(app('option',{value:v},l)));

  const uploadCard=app('div',{className:'card'},fileInput,dropzone,app('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px'},app('div',{className:'field',style:'margin:0'},app('label',{},'Default Category'),catSel),app('div',{className:'field',style:'margin:0'},app('label',{},'Source'),srcSel)));
  container.appendChild(uploadCard);container.appendChild(msgDiv);

  const mapGrid=h('div',{style:'display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px'});
  const previewDiv=h('div',{});
  const importBtn=app('button',{className:'btn btn-success',style:'margin-top:14px',onClick:doImport},'Import Leads');
  step2.appendChild(app('div',{className:'card',style:'margin-top:14px'},app('div',{className:'card-title'},'Map Columns'),mapGrid));
  step2.appendChild(app('div',{className:'card',style:'margin-top:12px'},app('div',{className:'card-title'},'Preview'),previewDiv));
  step2.appendChild(importBtn);
  container.appendChild(step2);

  async function handleFile(file){
    if(!file)return;uploadedFile=file;
    dropzone.innerHTML='';dropzone.appendChild(app('div',{style:'font-size:24px'},'✅'));dropzone.appendChild(app('p',{},file.name));
    msgDiv.className='alert alert-info';msgDiv.textContent='Parsing…';
    const fd=new FormData();fd.append('file',file);
    const r=await api.upload('/import/preview',fd);
    if(!r.ok){msgDiv.className='alert alert-error';msgDiv.textContent=r.error;return;}
    msgDiv.className='';msgDiv.textContent='';headers=r.headers;totalRows=r.total;
    headers.forEach(hd=>{const hl=hd.toLowerCase();if(hl.includes('name'))mapping.name=hd;if(hl.includes('phone')||hl.includes('mobile'))mapping.phone=hd;if(hl.includes('email'))mapping.email=hd;if(hl.includes('city'))mapping.city=hd;});
    mapGrid.innerHTML='';
    [['name','Name *'],['phone','Phone *'],['email','Email'],['city','City']].forEach(([field,label])=>{
      const sel=h('select',{className:'inp inp-sm'});
      [['','— skip —'],...headers.map(hd=>[hd,hd])].forEach(([v,l])=>{const opt=app('option',{value:v},l);if(mapping[field]===v)opt.selected=true;sel.appendChild(opt);});
      sel.addEventListener('change',()=>{mapping[field]=sel.value;updatePreview(r.preview);});
      mapGrid.appendChild(app('div',{className:'field',style:'margin:0'},app('label',{},label),sel));
    });
    updatePreview(r.preview);
    step2.style.display='';importBtn.textContent=`Import ${totalRows} Leads`;
  }

  function updatePreview(rows){
    previewDiv.innerHTML='';
    const activeFields=Object.keys(mapping).filter(k=>mapping[k]);
    if(!activeFields.length)return;
    const tbl=app('table',{style:'border-collapse:collapse;font-size:12px;width:100%'},app('thead',{},app('tr',{},...activeFields.map(f=>app('th',{style:'padding:5px 10px;border:1px solid var(--border);color:var(--muted)'},f)))),app('tbody',{}));
    const tbody=tbl.querySelector('tbody');
    (rows||[]).forEach(row=>tbody.appendChild(app('tr',{},...activeFields.map(f=>app('td',{style:'padding:5px 10px;border:1px solid var(--border);color:var(--muted2)'},String(row[mapping[f]]||'—'))))));
    previewDiv.appendChild(tbl);
  }

  async function doImport(){
    if(!uploadedFile){msgDiv.className='alert alert-error';msgDiv.textContent='No file.';return;}
    importBtn.disabled=true;importBtn.textContent='Importing…';
    const fd=new FormData();fd.append('file',uploadedFile);fd.append('mapping',JSON.stringify(mapping));fd.append('category',catSel.value);fd.append('source',srcSel.value);
    const r=await api.upload('/import',fd);
    importBtn.disabled=false;
    if(r.ok){msgDiv.className='alert alert-success';msgDiv.textContent='✓ '+r.count+' leads imported!';step2.style.display='none';uploadedFile=null;dropzone.innerHTML='';dropzone.appendChild(app('div',{style:'font-size:36px'},'📁'));dropzone.appendChild(app('p',{},'Click to upload CSV or Excel'));}
    else{msgDiv.className='alert alert-error';msgDiv.textContent=r.error;}
  }
}

// ── TEAM MANAGEMENT ───────────────────────────────────────────────
async function renderTeam(container){
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const r=await api.get('/users');
  const users=r.ok?r.data:[];
  container.innerHTML='';
  container.appendChild(app('div',{className:'page-title'},'👥 Team Management'));
  const mDiv=h('div',{});
  const nInp=h('input',{type:'text',className:'inp',placeholder:'Full Name'});
  const uInp=h('input',{type:'text',className:'inp',placeholder:'Username'});
  const pInp=h('input',{type:'password',className:'inp',placeholder:'Password'});
  const roleSel=h('select',{className:'inp'});
  [['staff','Staff (Telecaller)'],['auditor','Auditor'],['admin','Admin']].forEach(([v,l])=>roleSel.appendChild(app('option',{value:v},l)));
  const addBtn=app('button',{className:'btn btn-primary',onClick:addUser},icon('plus',14),'Add Team Member');
  container.appendChild(app('div',{className:'card',style:'margin-bottom:16px'},
    app('div',{className:'card-title'},'Add Team Member'),
    app('div',{style:'display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin-bottom:10px'},
      app('div',{className:'field',style:'margin:0'},app('label',{},'Name'),nInp),
      app('div',{className:'field',style:'margin:0'},app('label',{},'Username'),uInp),
      app('div',{className:'field',style:'margin:0'},app('label',{},'Password'),pInp),
      app('div',{className:'field',style:'margin:0'},app('label',{},'Role'),roleSel)
    ),
    mDiv,addBtn
  ));

  const tableArea=h('div',{});
  container.appendChild(tableArea);
  renderTable(users);

  function renderTable(list){
    tableArea.innerHTML='';
    const tw=app('div',{className:'table-wrap'},app('table',{},
      app('thead',{},app('tr',{},...['Name','Username','Role','Actions'].map(c=>app('th',{},c)))),
      app('tbody',{})
    ));
    const tbody=tw.querySelector('tbody');
    if(!list.length){tbody.appendChild(app('tr',{className:'empty-row'},app('td',{colSpan:4},'No team members.')));}
    list.forEach(u=>{
      const roleColors={admin:'#fbbf24',staff:'#6366f1',auditor:'#06b6d4'};
      tbody.appendChild(app('tr',{},
        app('td',{className:'td-name'},u.name),
        app('td',{style:'font-family:monospace;color:var(--muted2)'},u.username),
        app('td',{},app('span',{style:`background:${roleColors[u.role]}22;color:${roleColors[u.role]};padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600`},u.role.toUpperCase())),
        app('td',{},app('div',{style:'display:flex;gap:6px'},
          app('button',{className:'btn btn-ghost btn-xs',onClick:()=>openEditUser(u)},'Edit'),
          app('button',{className:'btn btn-danger btn-xs',onClick:async()=>{if(!confirm('Remove?'))return;await api.del('/users/'+u.id);renderTeam(container);}},'Remove')
        ))
      ));
    });
    tableArea.appendChild(tw);
    tableArea.appendChild(app('p',{style:'color:var(--muted);font-size:12px;margin-top:10px'},'Staff login URL: Share your CRM link + their username/password'));
  }

  async function addUser(){
    if(!nInp.value||!uInp.value||!pInp.value){mDiv.className='alert alert-error';mDiv.textContent='All fields required.';return;}
    addBtn.disabled=true;
    const r=await api.post('/users',{name:nInp.value,username:uInp.value,password:pInp.value,role:roleSel.value});
    addBtn.disabled=false;
    if(r.ok){mDiv.className='alert alert-success';mDiv.textContent='✓ Added. Share URL + credentials.';nInp.value='';uInp.value='';pInp.value='';setTimeout(()=>renderTeam(container),1500);}
    else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
  }

  function openEditUser(u){
    const nI=h('input',{type:'text',className:'inp',value:u.name});
    const uI=h('input',{type:'text',className:'inp',value:u.username});
    const pI=h('input',{type:'password',className:'inp',placeholder:'Leave blank to keep'});
    const rSel=h('select',{className:'inp'});
    [['staff','Staff'],['auditor','Auditor'],['admin','Admin']].forEach(([v,l])=>{const o=app('option',{value:v},l);if(v===u.role)o.selected=true;rSel.appendChild(o);});
    const mD=h('div',{});
    const modal=app('div',{className:'modal-overlay center',onClick:(e)=>{if(e.target===modal)modal.remove();}},
      app('div',{className:'modal center-modal'},
        app('div',{className:'modal-header'},app('span',{className:'modal-title'},'Edit: '+u.name),app('button',{className:'modal-close',onClick:()=>modal.remove()},'✕')),
        mD,
        app('div',{className:'field'},app('label',{},'Name'),nI),
        app('div',{className:'field'},app('label',{},'Username'),uI),
        app('div',{className:'field'},app('label',{},'New Password'),pI),
        app('div',{className:'field'},app('label',{},'Role'),rSel),
        app('button',{className:'btn btn-primary',style:'width:100%;justify-content:center',onClick:async()=>{
          const body={name:nI.value,username:uI.value,role:rSel.value};if(pI.value)body.password=pI.value;
          const r=await api.put('/users/'+u.id,body);
          if(r.ok){modal.remove();renderTeam(container);}else{mD.className='alert alert-error';mD.textContent=r.error;}
        }},'Save Changes')
      )
    );
    document.body.appendChild(modal);
  }
}

// ── AUDITOR DASHBOARD ─────────────────────────────────────────────
async function renderAuditDash(container){
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const r=await api.get('/audits/stats');
  container.innerHTML='';
  container.appendChild(app('div',{className:'page-title'},'🔍 Audit Dashboard'));
  if(!r.ok){container.appendChild(app('div',{className:'alert alert-error'},'Error'));return;}
  const grid=h('div',{className:'stats-grid'});
  [{label:'Today',val:r.today,color:'#6366f1'},{label:'This Month',val:r.month,color:'#3b82f6'},{label:'Total Audits',val:r.total,color:'#8b5cf6'},{label:'Interested',val:r.interested,color:'#22c55e'},{label:'Proposals Sent',val:r.proposalSent,color:'#06b6d4'},{label:'Converted',val:r.converted,color:'#4ade80'}].forEach(c=>{
    grid.appendChild(app('div',{className:'stat-card',style:`border-top-color:${c.color}`},app('div',{className:'stat-num',style:`color:${c.color}`},String(c.val)),app('div',{className:'stat-label'},c.label)));
  });
  container.appendChild(grid);
  container.appendChild(app('div',{className:'card'},app('div',{className:'card-title'},'Quick Actions'),app('div',{style:'display:flex;gap:10px;flex-wrap:wrap'},app('button',{className:'btn btn-cyan',onClick:()=>{STATE.tab='new_audit';render();}},icon('plus',14),'New Audit'),app('button',{className:'btn btn-ghost',onClick:()=>{STATE.tab='my_audits';render();}},'View All Audits'))));
}

function renderNewAudit(container){
  container.innerHTML='';
  container.appendChild(app('div',{className:'page-title'},'🔍 New Website Audit'));
  const mDiv=h('div',{});
  const fields={company_name:h('input',{type:'text',className:'inp',placeholder:'Company Name *'}),website_url:h('input',{type:'url',className:'inp',placeholder:'Website URL'}),phone:h('input',{type:'tel',className:'inp',placeholder:'Phone'}),email:h('input',{type:'email',className:'inp',placeholder:'Email'})};
  const catSel=h('select',{className:'inp'});
  CATEGORIES.forEach(c=>catSel.appendChild(app('option',{value:c.value},c.label)));
  const ratingInp=h('input',{type:'number',className:'inp',min:1,max:10,placeholder:'Current website rating 1-10'});
  const issuesInp=h('textarea',{className:'inp',rows:4,placeholder:'Issues found:\n• Slow loading\n• No mobile optimization\n• Outdated design\n• No contact form\n• Poor SEO\n...'});
  const oppInp=h('textarea',{className:'inp',rows:4,placeholder:'What we can offer:\n• Modern web app\n• E-commerce features\n• CRM integration\n• WhatsApp integration\n...'});
  const notesInp=h('textarea',{className:'inp',rows:2,placeholder:'Additional notes…'});

  const saveBtn=app('button',{className:'btn btn-primary btn-success',style:'width:100%;justify-content:center',onClick:async()=>{
    if(!fields.company_name.value){mDiv.className='alert alert-error';mDiv.textContent='Company name required.';return;}
    saveBtn.disabled=true;saveBtn.textContent='Saving…';
    const r=await api.post('/audits',{company_name:fields.company_name.value,website_url:fields.website_url.value,phone:fields.phone.value,email:fields.email.value,category:catSel.value,current_website_rating:parseInt(ratingInp.value)||5,issues_found:issuesInp.value,opportunities:oppInp.value,notes:notesInp.value});
    saveBtn.disabled=false;
    if(r.ok){mDiv.className='alert alert-success';mDiv.textContent='✓ Audit saved!';fields.company_name.value='';fields.website_url.value='';fields.phone.value='';fields.email.value='';ratingInp.value='';issuesInp.value='';oppInp.value='';notesInp.value='';saveBtn.textContent='+ Add Website Audit';}
    else{mDiv.className='alert alert-error';mDiv.textContent=r.error;saveBtn.textContent='+ Add Website Audit';}
  }},'+ Add Website Audit');

  container.appendChild(app('div',{className:'card'},
    mDiv,
    app('div',{className:'form-grid'},
      app('div',{className:'field',style:'margin:0'},app('label',{},'Company Name *'),fields.company_name),
      app('div',{className:'field',style:'margin:0'},app('label',{},'Website URL'),fields.website_url),
      app('div',{className:'field',style:'margin:0'},app('label',{},'Phone'),fields.phone),
      app('div',{className:'field',style:'margin:0'},app('label',{},'Email'),fields.email)
    ),
    app('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px'},
      app('div',{className:'field',style:'margin:0'},app('label',{},'Category'),catSel),
      app('div',{className:'field',style:'margin:0'},app('label',{},'Current Website Rating (1-10)'),ratingInp)
    ),
    app('div',{className:'field',style:'margin-top:12px'},app('label',{},'🔴 Issues Found'),issuesInp),
    app('div',{className:'field'},app('label',{},'🟢 What We Can Offer (Proposal Points)'),oppInp),
    app('div',{className:'field'},app('label',{},'Notes'),notesInp),
    saveBtn
  ));
}

async function renderAudits(container,role){
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const r=await api.get('/audits');
  const audits=r.ok?r.data:[];
  container.innerHTML='';
  container.appendChild(app('div',{className:'page-title'},'📋 Audit Reports <small>'+audits.length+' total</small>'));

  const searchInp=h('input',{type:'search',className:'inp inp-sm',placeholder:'Search company…',style:'flex:1;min-width:180px'});
  const statusSel=h('select',{className:'inp inp-sm'});
  [['all','All Status'],['audited','Audited'],['proposal_sent','Proposal Sent'],['interested','Interested'],['not_interested','Not Interested'],['converted','Converted']].forEach(([v,l])=>statusSel.appendChild(app('option',{value:v},l)));
  container.appendChild(app('div',{className:'filters-bar'},searchInp,statusSel));

  const listArea=h('div',{});container.appendChild(listArea);
  let filters={search:'',status:'all'};

  function renderList(){
    const filtered=audits.filter(a=>{
      if(filters.search&&!a.company_name.toLowerCase().includes(filters.search.toLowerCase()))return false;
      if(filters.status!=='all'&&a.status!==filters.status)return false;
      return true;
    });
    listArea.innerHTML='';
    if(!filtered.length){listArea.appendChild(app('div',{style:'text-align:center;padding:40px;color:var(--muted)'},'No audits found.'));return;}
    filtered.forEach(a=>{
      const statusColors={audited:'#94a3b8',proposal_sent:'#06b6d4',interested:'#22c55e',not_interested:'#ef4444',converted:'#4ade80'};
      const sc=statusColors[a.status]||'#94a3b8';
      const rating=parseInt(a.current_website_rating)||0;
      const ratingColor=rating<=3?'#ef4444':rating<=6?'#fbbf24':'#22c55e';
      const card=app('div',{className:'audit-card'},
        app('div',{style:'display:flex;justify-content:space-between;align-items:flex-start;gap:10px'},
          app('div',{style:'flex:1'},
            app('div',{style:'font-weight:700;font-size:15px'},a.company_name),
            a.website_url?app('a',{href:a.website_url,target:'_blank',style:'color:var(--accent2);font-size:12px'},a.website_url):null,
            app('div',{style:'color:var(--muted);font-size:12px;margin-top:2px'},(a.phone||'')+(a.phone&&a.category?' · ':'')+catLabel(a.category))
          ),
          app('div',{style:'text-align:right;flex-shrink:0'},
            app('span',{style:`background:${sc}22;color:${sc};padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700`},a.status.replace('_',' ').toUpperCase()),
            app('div',{style:`color:${ratingColor};font-size:13px;font-weight:800;margin-top:6px`},'Score: '+rating+'/10')
          )
        ),
        a.issues_found?app('div',{style:'margin-top:8px;padding-top:8px;border-top:1px solid var(--border)'},app('div',{style:'font-size:11px;color:var(--muted);margin-bottom:3px'},'ISSUES'),app('div',{style:'font-size:12px;color:var(--muted2);white-space:pre-line'},a.issues_found.slice(0,150)+(a.issues_found.length>150?'…':''))):null,
        app('div',{style:'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap'},
          a.status!=='converted'?app('button',{className:'btn btn-ghost btn-xs',onClick:async()=>{
            const newStatus=prompt('Update status (audited/proposal_sent/interested/not_interested/converted):',a.status);
            if(newStatus&&newStatus!==a.status){await api.put('/audits/'+a.id,{status:newStatus,proposal_sent:newStatus==='proposal_sent'||a.proposal_sent});renderAudits(container,role);}
          }},'Update Status'):null,
          !a.proposal_sent?app('button',{className:'btn btn-cyan btn-xs',onClick:async()=>{await api.put('/audits/'+a.id,{proposal_sent:true,status:'proposal_sent'});renderAudits(container,role);}},'Mark Proposal Sent'):app('span',{style:'color:#06b6d4;font-size:12px;font-weight:600'},'✓ Proposal Sent'),
          app('button',{className:'btn btn-danger btn-xs',onClick:async()=>{if(!confirm('Delete?'))return;await api.del('/audits/'+a.id);renderAudits(container,role);}},'Delete')
        )
      );
      listArea.appendChild(card);
    });
  }

  let st;searchInp.addEventListener('input',()=>{clearTimeout(st);st=setTimeout(()=>{filters.search=searchInp.value;renderList();},300);});
  statusSel.addEventListener('change',()=>{filters.status=statusSel.value;renderList();});
  renderList();
}

boot();

// ══════════════════════════════════════════════════════════════════
// NEW FEATURES — Tasks, Invoices, Analytics, Password, WhatsApp
// ══════════════════════════════════════════════════════════════════

// ── TASKS PAGE ────────────────────────────────────────────────────
async function renderTasks(container) {
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const [tasksR, usersR, clientsR] = await Promise.all([api.get('/tasks'), api.get('/users'), api.get('/clients?limit=200')]);
  const tasks = tasksR.ok ? tasksR.data : [];
  const users = usersR.ok ? usersR.data : [];
  const clients = clientsR.ok ? clientsR.data : [];
  const user = STATE.user;
  container.innerHTML = '';
  container.appendChild(app('div',{className:'page-title'},'✅ Tasks'));

  // Stats
  const pending = tasks.filter(t=>t.status==='pending').length;
  const inProgress = tasks.filter(t=>t.status==='in_progress').length;
  const done = tasks.filter(t=>t.status==='done').length;
  const overdue = tasks.filter(t=>t.due_date && t.due_date < new Date().toISOString().slice(0,10) && t.status!=='done').length;
  const grid = h('div',{className:'stats-grid'});
  [{label:'Pending',val:pending,color:'#f59e0b'},{label:'In Progress',val:inProgress,color:'#6366f1'},{label:'Done',val:done,color:'#22c55e'},{label:'Overdue',val:overdue,color:'#ef4444'}].forEach(c=>{
    grid.appendChild(app('div',{className:'stat-card',style:`border-top-color:${c.color}`},app('div',{className:'stat-num',style:`color:${c.color}`},String(c.val)),app('div',{className:'stat-label'},c.label)));
  });
  container.appendChild(grid);

  // Add task button
  const addBtn = app('button',{className:'btn btn-primary',style:'margin-bottom:14px',onClick:()=>openAddTaskModal(users,clients,()=>renderTasks(container))},'+  Add Task');
  container.appendChild(addBtn);

  // Filter
  const statusSel = h('select',{className:'inp inp-sm'});
  [['all','All Tasks'],['pending','Pending'],['in_progress','In Progress'],['done','Done'],['cancelled','Cancelled']].forEach(([v,l])=>statusSel.appendChild(app('option',{value:v},l)));
  container.appendChild(app('div',{className:'filters-bar'},statusSel));

  const listArea = h('div',{});
  container.appendChild(listArea);

  function renderList(filtered) {
    listArea.innerHTML='';
    if(!filtered.length){listArea.appendChild(app('div',{style:'text-align:center;padding:40px;color:var(--muted)'},'No tasks found.'));return;}
    const priorityColors = {low:'#94a3b8',medium:'#6366f1',high:'#f59e0b',urgent:'#ef4444'};
    const statusColors = {pending:'#f59e0b',in_progress:'#6366f1',done:'#22c55e',cancelled:'#94a3b8'};
    filtered.forEach(t=>{
      const pc = priorityColors[t.priority]||'#94a3b8';
      const sc = statusColors[t.status]||'#94a3b8';
      const isOverdue = t.due_date && t.due_date < new Date().toISOString().slice(0,10) && t.status!=='done';
      const card = app('div',{style:`background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:8px;border-left:3px solid ${pc}`},
        app('div',{style:'display:flex;justify-content:space-between;align-items:flex-start;gap:10px'},
          app('div',{style:'flex:1'},
            app('div',{style:`font-weight:700;font-size:14px;${t.status==='done'?'text-decoration:line-through;color:var(--muted)':''}`},t.title),
            t.description?app('div',{style:'color:var(--muted2);font-size:12px;margin-top:3px'},t.description):null,
            app('div',{style:'display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;align-items:center'},
              app('span',{style:`background:${pc}22;color:${pc};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600`},t.priority.toUpperCase()),
              app('span',{style:`background:${sc}22;color:${sc};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600`},t.status.replace('_',' ').toUpperCase()),
              t.assignedTo?app('span',{style:'color:var(--muted);font-size:11px'},'→ '+t.assignedTo.name):null,
              t.Client?app('span',{style:'color:var(--accent2);font-size:11px'},'📋 '+t.Client.name):null,
              t.due_date?app('span',{style:`color:${isOverdue?'#ef4444':'var(--muted)'};font-size:11px`},(isOverdue?'⚠️ OVERDUE: ':'📅 ')+fmtDateOnly(t.due_date)):null
            )
          ),
          app('div',{style:'display:flex;gap:6px;flex-shrink:0'},
            t.status!=='done'?app('button',{className:'btn btn-success btn-xs',onClick:async()=>{await api.put('/tasks/'+t.id,{status:'done'});renderTasks(container);}},'✓ Done'):null,
            app('button',{className:'btn btn-danger btn-xs',onClick:async()=>{if(!confirm('Delete?'))return;await api.del('/tasks/'+t.id);renderTasks(container);}},'Del')
          )
        )
      );
      listArea.appendChild(card);
    });
  }

  statusSel.addEventListener('change',()=>{
    const v = statusSel.value;
    renderList(v==='all'?tasks:tasks.filter(t=>t.status===v));
  });
  renderList(tasks);
}

function openAddTaskModal(users,clients,onSave) {
  const mDiv = h('div',{});
  const titleInp = h('input',{type:'text',className:'inp',placeholder:'Task title *'});
  const descInp = h('textarea',{className:'inp',rows:2,placeholder:'Description (optional)'});
  const assignSel = h('select',{className:'inp'});
  users.forEach(u=>assignSel.appendChild(app('option',{value:u.id},`${u.name} (${u.role})`)));
  const prioritySel = h('select',{className:'inp'});
  [['low','🟢 Low'],['medium','🔵 Medium'],['high','🟡 High'],['urgent','🔴 Urgent']].forEach(([v,l])=>prioritySel.appendChild(app('option',{value:v},l)));
  prioritySel.value='medium';
  const dueDateInp = h('input',{type:'date',className:'inp'});
  const clientSel = h('select',{className:'inp'});
  clientSel.appendChild(app('option',{value:''},'No client linked'));
  clients.forEach(c=>clientSel.appendChild(app('option',{value:c.id},c.name+(c.company?' — '+c.company:''))));

  const modal = app('div',{className:'modal-overlay center',onClick:(e)=>{if(e.target===modal)modal.remove();}},
    app('div',{className:'modal center-modal'},
      app('div',{className:'modal-header'},app('span',{className:'modal-title'},'Add Task'),app('button',{className:'modal-close',onClick:()=>modal.remove()},'✕')),
      mDiv,
      app('div',{className:'field'},app('label',{},'Task Title *'),titleInp),
      app('div',{className:'field'},app('label',{},'Description'),descInp),
      app('div',{className:'form-grid'},
        app('div',{className:'field',style:'margin:0'},app('label',{},'Assign To'),assignSel),
        app('div',{className:'field',style:'margin:0'},app('label',{},'Priority'),prioritySel)
      ),
      app('div',{className:'form-grid',style:'margin-top:10px'},
        app('div',{className:'field',style:'margin:0'},app('label',{},'Due Date'),dueDateInp),
        app('div',{className:'field',style:'margin:0'},app('label',{},'Linked Client'),clientSel)
      ),
      app('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:14px',onClick:async()=>{
        if(!titleInp.value){mDiv.className='alert alert-error';mDiv.textContent='Title required.';return;}
        const r = await api.post('/tasks',{title:titleInp.value,description:descInp.value,assigned_to:parseInt(assignSel.value),priority:prioritySel.value,due_date:dueDateInp.value||null,client_id:clientSel.value?parseInt(clientSel.value):null});
        if(r.ok){modal.remove();if(onSave)onSave();}
        else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
      }},'Add Task')
    )
  );
  document.body.appendChild(modal);
}

// ── INVOICES PAGE ─────────────────────────────────────────────────
async function renderInvoices(container) {
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const [invR, clientsR] = await Promise.all([api.get('/invoices'), api.get('/clients?limit=200')]);
  const invoices = invR.ok ? invR.data : [];
  const clients = clientsR.ok ? clientsR.data : [];
  container.innerHTML='';
  container.appendChild(app('div',{className:'page-title'},'🧾 Invoices'));

  const totalPaid = invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+parseFloat(i.total||0),0);
  const totalPending = invoices.filter(i=>i.status==='sent').reduce((s,i)=>s+parseFloat(i.total||0),0);
  const grid = h('div',{className:'stats-grid'});
  [{label:'Total Paid',val:fmt(totalPaid),color:'#22c55e'},{label:'Pending Payment',val:fmt(totalPending),color:'#f59e0b'},{label:'Total Invoices',val:invoices.length,color:'#6366f1'},{label:'Paid Count',val:invoices.filter(i=>i.status==='paid').length,color:'#4ade80'}].forEach(c=>{
    grid.appendChild(app('div',{className:'stat-card',style:`border-top-color:${c.color}`},app('div',{className:'stat-num',style:`color:${c.color};font-size:${typeof c.val==='string'?'16px':'28px'}`},String(c.val)),app('div',{className:'stat-label'},c.label)));
  });
  container.appendChild(grid);

  const addBtn = app('button',{className:'btn btn-primary',style:'margin-bottom:14px',onClick:()=>openCreateInvoiceModal(clients,()=>renderInvoices(container))},'+  Create Invoice');
  container.appendChild(addBtn);

  const tw = app('div',{className:'table-wrap'},app('table',{},
    app('thead',{},app('tr',{},...['Invoice No','Client','Amount','GST','Total','Status','Due','Actions'].map(c=>app('th',{},c)))),
    app('tbody',{id:'inv-tbody'})
  ));
  const tbody = tw.querySelector('#inv-tbody');
  if(!invoices.length){tbody.appendChild(app('tr',{className:'empty-row'},app('td',{colSpan:8},'No invoices yet.')));}
  invoices.forEach(inv=>{
    const statusColors={draft:'#94a3b8',sent:'#f59e0b',paid:'#22c55e',cancelled:'#ef4444'};
    const sc = statusColors[inv.status]||'#94a3b8';
    const tr = app('tr',{},
      app('td',{style:'font-family:monospace;font-weight:600;color:var(--accent2)'},inv.invoice_no),
      app('td',{className:'td-name'},inv.Client?inv.Client.name:'—'),
      app('td',{style:'color:var(--muted2)'},fmt(inv.subtotal)),
      app('td',{style:'color:var(--muted)'},fmt(inv.gst_amount)+' ('+inv.gst_percent+'%)'),
      app('td',{style:'color:#4ade80;font-weight:700'},fmt(inv.total)),
      app('td',{},app('span',{style:`background:${sc}22;color:${sc};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600`},inv.status.toUpperCase())),
      app('td',{style:'color:var(--muted);font-size:12px'},fmtDateOnly(inv.due_date)),
      app('td',{},app('div',{style:'display:flex;gap:4px'},
        app('button',{className:'btn btn-ghost btn-xs',onClick:()=>openInvoicePDF(inv.id)},'📄 PDF'),
        inv.status==='sent'?app('button',{className:'btn btn-success btn-xs',onClick:async()=>{await api.put('/invoices/'+inv.id,{status:'paid'});renderInvoices(container);}},'✓ Paid'):null,
        inv.status==='draft'?app('button',{className:'btn btn-cyan btn-xs',onClick:async()=>{await api.put('/invoices/'+inv.id,{status:'sent'});renderInvoices(container);}},'Send'):null
      ))
    );
    tbody.appendChild(tr);
  });
  container.appendChild(tw);
}

function openCreateInvoiceModal(clients,onSave) {
  const mDiv = h('div',{});
  const clientSel = h('select',{className:'inp'});
  clientSel.appendChild(app('option',{value:''},'Select client *'));
  clients.forEach(c=>clientSel.appendChild(app('option',{value:c.id},c.name+(c.company?' — '+c.company:''))));
  const gstInp = h('input',{type:'number',className:'inp',value:'18',placeholder:'GST %'});
  const dueDateInp = h('input',{type:'date',className:'inp'});
  const notesInp = h('textarea',{className:'inp',rows:2,placeholder:'Terms / Notes'});
  const itemsDiv = h('div',{});
  const items = [{desc:'',qty:1,rate:0,amount:0}];
  const totalDiv = app('div',{style:'text-align:right;margin-top:10px'});

  function recalc(){
    items.forEach((item,i)=>{item.amount=parseFloat(item.qty||0)*parseFloat(item.rate||0);});
    const sub=items.reduce((s,i)=>s+(i.amount||0),0);
    const gst=(sub*(parseFloat(gstInp.value)||0))/100;
    totalDiv.innerHTML=`<div style="color:var(--muted);font-size:12px">Subtotal: ${fmt(sub)}</div><div style="color:var(--muted);font-size:12px">GST (${gstInp.value||0}%): ${fmt(gst)}</div><div style="color:#4ade80;font-weight:800;font-size:18px;margin-top:4px">Total: ${fmt(sub+gst)}</div>`;
  }

  function renderItems(){
    itemsDiv.innerHTML='';
    items.forEach((item,i)=>{
      const row=app('div',{style:'display:grid;grid-template-columns:2fr 0.5fr 1fr 1fr auto;gap:6px;margin-bottom:6px;align-items:center'});
      const descI=h('input',{type:'text',className:'inp inp-sm',placeholder:'Description',value:item.desc||''});
      const qtyI=h('input',{type:'number',className:'inp inp-sm',placeholder:'Qty',value:item.qty||1,min:1});
      const rateI=h('input',{type:'number',className:'inp inp-sm',placeholder:'Rate ₹',value:item.rate||0});
      const amtI=h('input',{type:'number',className:'inp inp-sm',placeholder:'Amount',value:item.amount||0,readOnly:true,style:'background:var(--bg2);color:var(--muted2)'});
      const delBtn=app('button',{className:'btn btn-danger btn-xs',onClick:()=>{items.splice(i,1);renderItems();recalc();}},'✕');
      descI.addEventListener('input',()=>{items[i].desc=descI.value;});
      qtyI.addEventListener('input',()=>{items[i].qty=parseFloat(qtyI.value)||0;items[i].amount=items[i].qty*items[i].rate;amtI.value=items[i].amount;recalc();});
      rateI.addEventListener('input',()=>{items[i].rate=parseFloat(rateI.value)||0;items[i].amount=items[i].qty*items[i].rate;amtI.value=items[i].amount;recalc();});
      row.append(descI,qtyI,rateI,amtI,delBtn);
      itemsDiv.appendChild(row);
    });
  }

  const addItemBtn=app('button',{className:'btn btn-ghost btn-sm',style:'margin-top:6px',onClick:()=>{items.push({desc:'',qty:1,rate:0,amount:0});renderItems();recalc();}},'+ Add Item');
  gstInp.addEventListener('input',recalc);
  renderItems(); recalc();

  const modal=app('div',{className:'modal-overlay center',onClick:(e)=>{if(e.target===modal)modal.remove();}},
    app('div',{className:'modal center-modal wide-modal'},
      app('div',{className:'modal-header'},app('span',{className:'modal-title'},'Create Invoice'),app('button',{className:'modal-close',onClick:()=>modal.remove()},'✕')),
      mDiv,
      app('div',{className:'form-grid',style:'margin-bottom:10px'},
        app('div',{className:'field',style:'margin:0'},app('label',{},'Client *'),clientSel),
        app('div',{className:'field',style:'margin:0'},app('label',{},'Due Date'),dueDateInp)
      ),
      app('div',{className:'section-label',style:'margin-bottom:6px'},'LINE ITEMS'),
      app('div',{style:'display:grid;grid-template-columns:2fr 0.5fr 1fr 1fr auto;gap:6px;margin-bottom:4px'},
        ...[['Description',''],['Qty',''],['Rate ₹',''],['Amount',''],['','']].map(([l])=>app('div',{style:'font-size:11px;color:var(--muted);font-weight:600'},l))
      ),
      itemsDiv, addItemBtn,
      app('div',{className:'form-grid',style:'margin-top:10px'},
        app('div',{className:'field',style:'margin:0'},app('label',{},'GST %'),gstInp),
        app('div',{className:'field',style:'margin:0'},app('label',{},'Notes / Terms'),notesInp)
      ),
      totalDiv,
      app('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:14px',onClick:async()=>{
        if(!clientSel.value){mDiv.className='alert alert-error';mDiv.textContent='Select a client.';return;}
        if(!items.length||!items[0].desc){mDiv.className='alert alert-error';mDiv.textContent='Add at least one item.';return;}
        const r=await api.post('/invoices',{client_id:parseInt(clientSel.value),items,gst_percent:parseFloat(gstInp.value)||18,due_date:dueDateInp.value||null,notes:notesInp.value});
        if(r.ok){modal.remove();if(onSave)onSave();}
        else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
      }},'Generate Invoice')
    )
  );
  document.body.appendChild(modal);
}

async function openInvoicePDF(invId) {
  const r = await api.get('/invoices/'+invId);
  if(!r.ok) return alert('Error loading invoice');
  const inv = r.data;
  const client = inv.Client || {};
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ${inv.invoice_no}</title><style>
    body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#333}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
    .company{font-size:24px;font-weight:800;color:#6366f1}
    .company-sub{color:#666;font-size:13px;margin-top:4px}
    .invoice-title{font-size:32px;font-weight:800;color:#6366f1;text-align:right}
    .invoice-meta{text-align:right;color:#666;font-size:13px}
    .bill-to{margin-bottom:30px}
    .bill-to h3{color:#666;font-size:12px;text-transform:uppercase;margin-bottom:6px}
    .client-name{font-size:18px;font-weight:700}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{background:#f5f5f5;padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase;color:#666;border-bottom:2px solid #ddd}
    td{padding:10px 14px;border-bottom:1px solid #eee}
    .totals{text-align:right;margin-top:10px}
    .totals div{padding:4px 0;font-size:14px}
    .total-final{font-size:20px;font-weight:800;color:#22c55e;border-top:2px solid #ddd;margin-top:8px;padding-top:8px}
    .status{display:inline-block;padding:4px 12px;border-radius:4px;font-weight:700;font-size:12px;background:${inv.status==='paid'?'#d1fae5':inv.status==='sent'?'#fef3c7':'#f3f4f6'};color:${inv.status==='paid'?'#065f46':inv.status==='sent'?'#92400e':'#374151'}}
    .footer{margin-top:40px;padding-top:20px;border-top:1px solid #eee;color:#888;font-size:12px;text-align:center}
    @media print{body{margin:0;padding:20px}}
  </style></head><body>
    <div class="header">
      <div><div class="company">🚀 Macto AI</div><div class="company-sub">macto.in | hello@macto.in</div><div class="company-sub">Kerala, India</div></div>
      <div><div class="invoice-title">INVOICE</div><div class="invoice-meta">${inv.invoice_no}<br>Date: ${new Date(inv.createdAt).toLocaleDateString('en-IN')}<br>${inv.due_date?'Due: '+fmtDateOnly(inv.due_date):''}<br><span class="status">${inv.status.toUpperCase()}</span></div></div>
    </div>
    <div class="bill-to"><h3>Bill To</h3><div class="client-name">${client.name||''}</div>${client.company?`<div>${client.company}</div>`:''}<div>${client.phone||''}</div><div>${client.email||''}</div>${client.city?`<div>${client.city}, ${client.state||''}</div>`:''}</div>
    <table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>
    ${(inv.items||[]).map((item,i)=>`<tr><td>${i+1}</td><td>${item.desc}</td><td>${item.qty}</td><td>₹${Number(item.rate).toLocaleString('en-IN')}</td><td>₹${Number(item.amount).toLocaleString('en-IN')}</td></tr>`).join('')}
    </tbody></table>
    <div class="totals"><div>Subtotal: ₹${Number(inv.subtotal).toLocaleString('en-IN')}</div><div>GST (${inv.gst_percent}%): ₹${Number(inv.gst_amount).toLocaleString('en-IN')}</div><div class="total-final">Total: ₹${Number(inv.total).toLocaleString('en-IN')}</div></div>
    ${inv.notes?`<div style="margin-top:20px;padding:12px;background:#f9f9f9;border-radius:6px;font-size:13px"><strong>Notes:</strong> ${inv.notes}</div>`:''}
    <div class="footer">Thank you for your business! | Macto AI — Create. Deploy. Grow.</div>
  </body></html>`;
  const w = window.open('','_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(()=>w.print(), 500);
}

// ── ANALYTICS PAGE ────────────────────────────────────────────────
async function renderAnalytics(container) {
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const r = await api.get('/analytics/conversion');
  container.innerHTML='';
  container.appendChild(app('div',{className:'page-title'},'📈 Analytics'));
  if(!r.ok){container.appendChild(app('div',{className:'alert alert-error'},'Error loading analytics'));return;}

  // Source conversion rates
  const srcCard = app('div',{className:'card',style:'margin-bottom:16px'},app('div',{className:'card-title'},'🎯 Lead Source Conversion Rates'));
  const sourceLabels = {cold_call:'Cold Call',ads:'Ads',referral:'Referral',audit:'Audit',manual:'Manual',import:'Import'};
  if(Object.keys(r.bySource).length) {
    Object.entries(r.bySource).forEach(([src,data])=>{
      const pct = data.conversion_rate;
      const color = pct>=20?'#22c55e':pct>=10?'#f59e0b':'#ef4444';
      srcCard.appendChild(app('div',{style:'margin-bottom:12px'},
        app('div',{style:'display:flex;justify-content:space-between;margin-bottom:4px'},
          app('span',{style:'font-size:13px;font-weight:600'},sourceLabels[src]||src),
          app('span',{style:`color:${color};font-weight:700`},pct+'% conversion')
        ),
        app('div',{style:'display:flex;gap:10px;font-size:12px;color:var(--muted)'},
          app('span',{},'Total: '+data.total),
          app('span',{style:'color:#22c55e'},'Interested: '+data.interested),
          app('span',{style:'color:#ef4444'},'Not Interested: '+data.not_interested)
        ),
        app('div',{style:'background:var(--bg);border-radius:999px;height:6px;margin-top:6px;overflow:hidden'},
          app('div',{style:`width:${pct}%;background:${color};height:100%;border-radius:999px`})
        )
      ));
    });
  } else srcCard.appendChild(app('p',{style:'color:var(--muted)'},'Not enough data yet. Start making calls!'));
  container.appendChild(srcCard);

  // Monthly revenue chart
  if(r.monthlyRevenue&&r.monthlyRevenue.length) {
    const revCard = app('div',{className:'card',style:'margin-bottom:16px'},app('div',{className:'card-title'},'💰 Monthly Revenue (Last 6 Months)'));
    const maxRev = Math.max(...r.monthlyRevenue.map(m=>m.revenue),1);
    const chartDiv = app('div',{style:'display:flex;gap:8px;align-items:flex-end;height:120px;margin-bottom:8px'});
    r.monthlyRevenue.forEach(m=>{
      const pct = (m.revenue/maxRev)*100;
      chartDiv.appendChild(app('div',{style:'flex:1;display:flex;flex-direction:column;align-items:center;gap:4px'},
        app('div',{style:'color:var(--muted);font-size:10px'},m.revenue>0?'₹'+Math.round(m.revenue/1000)+'k':'—'),
        app('div',{style:`height:${Math.max(pct,2)}%;background:linear-gradient(180deg,#6366f1,#8b5cf6);border-radius:4px 4px 0 0;width:100%;min-height:4px`}),
        app('div',{style:'color:var(--muted);font-size:10px'},m.month)
      ));
    });
    revCard.appendChild(chartDiv);
    container.appendChild(revCard);
  }

  // Why clients didn't convert
  if(r.notConvertedReasons&&r.notConvertedReasons.length) {
    const reasons = r.notConvertedReasons.filter(Boolean);
    if(reasons.length){
      const rCard = app('div',{className:'card',style:'margin-bottom:16px'},app('div',{className:'card-title'},'❌ Why Leads Didn\'t Convert (Staff Notes)'));
      const reasonCount = {};
      reasons.forEach(r=>{const key=r.toLowerCase().trim().slice(0,50);reasonCount[key]=(reasonCount[key]||0)+1;});
      Object.entries(reasonCount).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([reason,count])=>{
        rCard.appendChild(app('div',{style:'display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)'},
          app('span',{style:'color:var(--muted2);font-size:13px'},reason),
          app('span',{style:'color:#ef4444;font-weight:600;font-size:13px'},count+'x')
        ));
      });
      container.appendChild(rCard);
    }
  }
}

// ── CHANGE PASSWORD ───────────────────────────────────────────────
function renderChangePassword(container) {
  container.innerHTML='';
  container.appendChild(app('div',{className:'page-title'},'🔐 Change Password'));
  const mDiv = h('div',{});
  const currInp = h('input',{type:'password',className:'inp',placeholder:'Current password'});
  const newInp = h('input',{type:'password',className:'inp',placeholder:'New password (min 6 chars)'});
  const confirmInp = h('input',{type:'password',className:'inp',placeholder:'Confirm new password'});
  const saveBtn = app('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:4px',onClick:async()=>{
    if(!currInp.value||!newInp.value){mDiv.className='alert alert-error';mDiv.textContent='All fields required.';return;}
    if(newInp.value!==confirmInp.value){mDiv.className='alert alert-error';mDiv.textContent='New passwords don\'t match.';return;}
    if(newInp.value.length<6){mDiv.className='alert alert-error';mDiv.textContent='Password must be at least 6 characters.';return;}
    saveBtn.disabled=true;saveBtn.textContent='Saving…';
    const r=await api.post('/change-password',{current_password:currInp.value,new_password:newInp.value});
    saveBtn.disabled=false;saveBtn.textContent='Change Password';
    if(r.ok){mDiv.className='alert alert-success';mDiv.textContent='✅ Password changed successfully!';currInp.value='';newInp.value='';confirmInp.value='';}
    else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
  }},'Change Password');

  container.appendChild(app('div',{className:'card',style:'max-width:400px'},
    mDiv,
    app('div',{className:'field'},app('label',{},'Current Password'),currInp),
    app('div',{className:'field'},app('label',{},'New Password'),newInp),
    app('div',{className:'field'},app('label',{},'Confirm New Password'),confirmInp),
    saveBtn,
    app('p',{style:'color:var(--muted);font-size:12px;margin-top:10px'},'After changing password you\'ll need to login again.')
  ));
}

// ── WHATSAPP QUICK SEND ───────────────────────────────────────────
function openWhatsAppModal(phone, clientId, clientName, onSent) {
  const mDiv = h('div',{});
  const phoneInp = h('input',{type:'tel',className:'inp',value:phone||'',placeholder:'Phone with country code e.g. 919876543210'});
  const msgInp = h('textarea',{className:'inp',rows:4,placeholder:'Type your WhatsApp message…'});

  const templates = [
    {label:'Interested Follow-up', msg:`Hi ${clientName||'there'}! Thank you for your interest in our web development services. I'd love to schedule a quick call to discuss how we can help grow your business online. When would be a good time? 😊`},
    {label:'Meeting Reminder', msg:`Hi ${clientName||'there'}! Just a reminder about our meeting scheduled. Looking forward to connecting with you! Feel free to reach out if you need to reschedule. — Macto AI Team 🚀`},
    {label:'Proposal Sent', msg:`Hi ${clientName||'there'}! We've just sent you our proposal for your project. Please review it at your earliest convenience. We're excited about the opportunity to work with you! — Macto AI`},
    {label:'Follow-up', msg:`Hi ${clientName||'there'}! Hope you're doing well. Just following up on our conversation. Do you have any questions about our services? We'd love to help! — Macto AI Team`},
  ];

  const tmplDiv = app('div',{style:'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px'});
  templates.forEach(t=>{
    const btn = app('button',{className:'btn btn-ghost btn-xs',onClick:()=>{msgInp.value=t.msg;}},t.label);
    tmplDiv.appendChild(btn);
  });

  const modal = app('div',{className:'modal-overlay center',onClick:(e)=>{if(e.target===modal)modal.remove();}},
    app('div',{className:'modal center-modal'},
      app('div',{className:'modal-header'},app('span',{className:'modal-title'},'📱 Send WhatsApp'),app('button',{className:'modal-close',onClick:()=>modal.remove()},'✕')),
      mDiv,
      app('div',{className:'field'},app('label',{},'Phone Number (with country code)'),phoneInp),
      app('div',{className:'section-label',style:'margin-bottom:6px'},'QUICK TEMPLATES'),
      tmplDiv,
      app('div',{className:'field'},app('label',{},'Message'),msgInp),
      app('div',{className:'alert alert-info',style:'font-size:12px'},'⚙️ Requires WhatsApp Business API. Add WHATSAPP_TOKEN & WHATSAPP_PHONE_ID in Railway Variables.'),
      app('button',{className:'btn btn-success',style:'width:100%;justify-content:center',onClick:async()=>{
        if(!phoneInp.value||!msgInp.value){mDiv.className='alert alert-error';mDiv.textContent='Phone and message required.';return;}
        const r=await api.post('/whatsapp/send',{phone:phoneInp.value,message:msgInp.value,client_id:clientId});
        if(r.ok){mDiv.className='alert alert-success';mDiv.textContent='✅ WhatsApp sent!';if(onSent)onSent();}
        else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
      }},'📤 Send WhatsApp')
    )
  );
  document.body.appendChild(modal);
}

// ── NOTIFICATIONS BELL ────────────────────────────────────────────
async function loadNotifications(bellBtn) {
  const r = await api.get('/notifications');
  if(!r.ok) return;
  if(r.count > 0) {
    bellBtn.style.position='relative';
    const badge = app('span',{style:`position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:999px;font-size:10px;font-weight:700;padding:1px 5px;min-width:16px;text-align:center`},String(r.count));
    bellBtn.appendChild(badge);
  }
  bellBtn.addEventListener('click',async()=>{
    const existing = document.getElementById('notif-dropdown');
    if(existing){existing.remove();return;}
    await api.post('/notifications/read');
    const dropdown = app('div',{id:'notif-dropdown',style:'position:fixed;top:58px;right:16px;width:320px;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;z-index:999;max-height:400px;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.4)'});
    dropdown.appendChild(app('div',{style:'padding:12px 16px;font-weight:700;border-bottom:1px solid var(--border)'},'🔔 Notifications'));
    if(!r.data.length){dropdown.appendChild(app('div',{style:'padding:16px;color:var(--muted);text-align:center'},'No new notifications'));}
    r.data.forEach(n=>{
      const typeColors={task:'#6366f1',client:'#22c55e',lead:'#f59e0b',invoice:'#fb923c',system:'#94a3b8'};
      dropdown.appendChild(app('div',{style:`padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;border-left:3px solid ${typeColors[n.type]||'#94a3b8'}`},
        app('div',{style:'font-size:13px;font-weight:600'},n.title),
        app('div',{style:'font-size:12px;color:var(--muted2);margin-top:2px'},n.message),
        app('div',{style:'font-size:11px;color:var(--muted);margin-top:4px'},fmtDate(n.createdAt))
      ));
    });
    document.body.appendChild(dropdown);
    setTimeout(()=>document.addEventListener('click',(e)=>{if(!dropdown.contains(e.target)&&e.target!==bellBtn){dropdown.remove();}},{once:true}),100);
  });
}

// Expose new functions globally so renderApp can call them
window._renderTasks = renderTasks;
window._renderInvoices = renderInvoices;
window._renderAnalytics = renderAnalytics;
window._renderChangePassword = renderChangePassword;


// ── PATCH renderApp to include new tabs ───────────────────────────
const _origRenderApp = renderApp;
// Override STATE.tab handling by patching the tab dispatch
const _origBoot = boot;

// We need to re-export renderApp with new tabs
// Patch by replacing the tab routing at the bottom
// Since we can't easily patch, we override the render function
const __origRender = render;
window.render = render; // keep reference

// Add new navigation items by monkey-patching renderApp
(function() {
  const origRenderApp = window.renderApp || renderApp;

  // Extend admin tabs and staff tabs
  const _old = renderApp;

  // We'll override by adding a post-render hook that injects new nav items
  // and handles new tab routing
  const newAdminTabs = [
    {id:'tasks_admin',label:'✅ Tasks',icon:'check'},
    {id:'invoices',label:'🧾 Invoices',icon:'money'},
    {id:'analytics',label:'📈 Analytics',icon:'chart'},
    {id:'password',label:'🔐 Password',icon:'users'},
  ];
  const newStaffTabs = [
    {id:'my_tasks',label:'✅ My Tasks',icon:'check'},
    {id:'password',label:'🔐 Password',icon:'users'},
  ];

  // Store originals
  const _origIsAdmin = null;

  // Override render to add new tabs
  window.render = function() {
    const container = document.getElementById('app');
    if (!STATE.user) { container.innerHTML = ''; container.appendChild(renderLogin()); return; }

    const user = STATE.user;
    const isAdmin = user.role === 'admin';
    const isAuditor = user.role === 'auditor';
    const isStaff = user.role === 'staff';

    let tabs = [];
    if (isAdmin) {
      tabs = [
        {section:'Overview'},
        {id:'dashboard',label:'Dashboard',icon:'dash'},
        {id:'revenue',label:'Revenue',icon:'money'},
        {section:'Sales'},
        {id:'pipeline',label:'Pipeline',icon:'pipeline'},
        {id:'clients',label:'All Clients',icon:'users'},
        {section:'Leads'},
        {id:'dialer',label:'📞 Dialer',icon:'phone'},
        {id:'leads',label:'All Leads',icon:'assign'},
        {id:'import',label:'Import',icon:'upload'},
        {section:'Work'},
        {id:'tasks_admin',label:'✅ Tasks',icon:'check'},
        {id:'invoices',label:'🧾 Invoices',icon:'money'},
        {section:'Audits'},
        {id:'audits',label:'Audit Reports',icon:'audit'},
        {section:'Insights'},
        {id:'analytics',label:'📈 Analytics',icon:'chart'},
        {section:'Admin'},
        {id:'staff',label:'Team',icon:'users'},
        {id:'password',label:'🔐 Password',icon:'users'},
      ];
    } else if (isStaff) {
      tabs = [
        {section:'Calls'},
        {id:'dialer',label:'📞 Dialer',icon:'phone'},
        {id:'my_leads',label:'My Leads',icon:'assign'},
        {section:'Clients'},
        {id:'my_clients',label:'My Clients',icon:'users'},
        {id:'followups',label:'Follow-ups',icon:'audit'},
        {section:'Work'},
        {id:'my_tasks',label:'✅ My Tasks',icon:'check'},
        {section:'Stats'},
        {id:'my_stats',label:'My Stats',icon:'chart'},
        {id:'password',label:'🔐 Password',icon:'users'},
      ];
    } else if (isAuditor) {
      tabs = [
        {section:'Audit'},
        {id:'audit_dash',label:'Dashboard',icon:'dash'},
        {id:'new_audit',label:'+ New Audit',icon:'plus'},
        {id:'my_audits',label:'My Audits',icon:'audit'},
        {id:'password',label:'🔐 Password',icon:'users'},
      ];
    }

    const flatTabs = tabs.filter(t => t.id);
    if (!flatTabs.find(t => t.id === STATE.tab)) STATE.tab = flatTabs[0]?.id || 'dashboard';

    const topbar = app('div', {className:'topbar'},
      app('div', {className:'brand'},
        app('div', {className:'brand-logo'}, '🚀 Macto AI CRM'),
        app('span', {className:`role-pill ${user.role}`}, user.role.toUpperCase())
      ),
      app('div', {className:'topbar-right'},
        app('span', {id:'notif-bell', className:'btn btn-ghost btn-sm', style:'position:relative'}, '🔔'),
        app('span', {className:'topbar-user'}, 'Hi, ' + user.name),
        app('button', {className:'btn btn-ghost btn-sm', onClick: async () => { await api.post('/logout'); STATE.user = null; window.render(); }}, icon('logout', 14), 'Logout')
      )
    );

    const sidebar = app('div', {className:'sidebar'});
    tabs.forEach(t => {
      if (t.section) { sidebar.appendChild(app('div', {className:'nav-section'}, t.section)); }
      else {
        const btn = app('button', {className:'nav-item' + (STATE.tab === t.id ? ' active' : ''), onClick: () => { STATE.tab = t.id; window.render(); }}, icon(t.icon, 15), t.label);
        sidebar.appendChild(btn);
      }
    });

    const mobileNav = app('div', {className:'sidebar-mobile'});
    flatTabs.slice(0, 5).forEach(t => {
      const btn = app('button', {className:'nav-item-mob' + (STATE.tab === t.id ? ' active' : ''), onClick: () => { STATE.tab = t.id; window.render(); }}, icon(t.icon, 18), t.label);
      mobileNav.appendChild(btn);
    });

    const main = h('div', {className:'main', id:'main-content'});
    const shell = app('div', {}, topbar, app('div', {className:'layout'}, sidebar, main), mobileNav);

    container.innerHTML = '';
    container.appendChild(shell);

    // Load notifications
    const bellBtn = document.getElementById('notif-bell');
    if (bellBtn) loadNotifications(bellBtn);

    requestAnimationFrame(() => {
      if (isAdmin) {
        if (STATE.tab === 'dashboard') renderAdminDash(main);
        else if (STATE.tab === 'revenue') renderRevenue(main);
        else if (STATE.tab === 'pipeline') renderPipeline(main);
        else if (STATE.tab === 'clients') renderAllClients(main);
        else if (STATE.tab === 'dialer') renderDialer(main);
        else if (STATE.tab === 'leads') renderAdminLeads(main);
        else if (STATE.tab === 'import') renderImport(main);
        else if (STATE.tab === 'tasks_admin') renderTasks(main);
        else if (STATE.tab === 'invoices') renderInvoices(main);
        else if (STATE.tab === 'analytics') renderAnalytics(main);
        else if (STATE.tab === 'audits') renderAudits(main, 'admin');
        else if (STATE.tab === 'staff') renderTeam(main);
        else if (STATE.tab === 'password') renderChangePassword(main);
      } else if (isStaff) {
        if (STATE.tab === 'dialer') renderDialer(main);
        else if (STATE.tab === 'my_leads') renderMyLeads(main);
        else if (STATE.tab === 'my_clients') renderMyClients(main);
        else if (STATE.tab === 'followups') renderFollowups(main);
        else if (STATE.tab === 'my_tasks') renderTasks(main);
        else if (STATE.tab === 'my_stats') renderMyStats(main);
        else if (STATE.tab === 'password') renderChangePassword(main);
      } else if (isAuditor) {
        if (STATE.tab === 'audit_dash') renderAuditDash(main);
        else if (STATE.tab === 'new_audit') renderNewAudit(main);
        else if (STATE.tab === 'my_audits') renderAudits(main, 'auditor');
        else if (STATE.tab === 'password') renderChangePassword(main);
      }
    });
  };

  // Override boot
  window.boot = async function() {
    await checkSession();
    window.render();
  };

  // Re-run boot with new render
  window.boot();
})();

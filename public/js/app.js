// ═══════════════════════════════════════════════════════════════════
// MACTO AI CRM — Complete Unified Frontend v9
// ═══════════════════════════════════════════════════════════════════

// ── CONSTANTS ────────────────────────────────────────────────────
const CALL_STATUSES = [
  {value:'pending',label:'Pending',color:'#94a3b8'},
  {value:'called',label:'Called',color:'#3b82f6'},
  {value:'interested',label:'⭐ Interested',color:'#22c55e'},
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
  {value:'ecommerce',label:'🛒 E-commerce'},{value:'real_estate',label:'🏢 Real Estate'},
  {value:'clinic',label:'🏥 Clinic'},{value:'study_abroad',label:'✈️ Study Abroad'},
  {value:'ads_lead',label:'📢 Ads Lead'},{value:'restaurant',label:'🍽 Restaurant'},
  {value:'retail',label:'🏪 Retail'},{value:'corporate',label:'🏛 Corporate'},
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
  {value:'whatsapp',label:'📱 WhatsApp',color:'#25d166'},
];
const ACT_MAP = Object.fromEntries(ACTIVITY_TYPES.map(a=>[a.value,a]));

// ── STATE ────────────────────────────────────────────────────────
let STATE = { user: null, tab: 'dashboard' };

// ── HELPERS ──────────────────────────────────────────────────────
const api = {
  async call(method, path, body) {
    const opts = { method, headers: {'Content-Type':'application/json'}, credentials:'include' };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch('/api'+path, opts);
    return r.json();
  },
  get: p => api.call('GET', p),
  post: (p,b) => api.call('POST', p, b),
  put: (p,b) => api.call('PUT', p, b),
  del: p => api.call('DELETE', p),
  async upload(path, fd) {
    const r = await fetch('/api'+path, { method:'POST', body:fd, credentials:'include' });
    return r.json();
  },
  async delBody(path, body) {
    const r = await fetch('/api'+path, { method:'DELETE', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(body) });
    return r.json();
  }
};

const el = (tag, attrs={}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)) {
    if (k==='onClick') e.addEventListener('click', v);
    else if (k==='className') e.className = v;
    else if (k==='html') e.innerHTML = v;
    else if (k==='style') e.style.cssText = v;
    else e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid==null || kid===false) continue;
    e.appendChild(typeof kid==='string' ? document.createTextNode(kid) : kid);
  }
  return e;
};

const fmt = n => '₹'+Number(n||0).toLocaleString('en-IN');
const fmtDate = d => d ? new Date(d).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}) : '—';
const fmtDay = d => d ? new Date(d).toLocaleDateString('en-IN',{dateStyle:'medium'}) : '—';
const catLabel = c => CAT_MAP[c]?.label || c || '—';

function stageBadge(stage) {
  const s = STAGE_MAP[stage]||{label:stage,color:'#94a3b8'};
  return el('span',{className:`badge stage-${stage}`,style:`background:${s.color}22;color:${s.color};border:1px solid ${s.color}44;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap`},s.label);
}
function callBadge(status) {
  const s = CALL_MAP[status||'pending'];
  return el('span',{style:`background:${s.color}22;color:${s.color};border:1px solid ${s.color}44;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600`},s.label);
}

function icon(name) {
  const icons = {
    phone:'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
    users:'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    chart:'M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z',
    upload:'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
    dash:'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
    assign:'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z',
    pipeline:'M22 12l-4-4v3H3v2h15v3z',
    money:'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z',
    check:'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    audit:'M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z',
    logout:'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5z',
    plus:'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    trash:'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    edit:'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width','16');svg.setAttribute('height','16');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','currentColor');
  const p = document.createElementNS('http://www.w3.org/2000/svg','path');
  p.setAttribute('d', icons[name]||'');
  svg.appendChild(p);
  return svg;
}

// ── BOOT ─────────────────────────────────────────────────────────
// ── TOAST NOTIFICATIONS ──────────────────────────────────────────
function showToast(message, type='success', duration=4000) {
  const colors = {success:'#22c55e',error:'#ef4444',warning:'#f59e0b',info:'#6366f1'};
  const color = colors[type]||colors.success;
  const existing = document.querySelectorAll('.toast-notif');
  const top = 70 + existing.length * 60;
  const toast = document.createElement('div');
  toast.className = 'toast-notif';
  toast.style.cssText = `position:fixed;top:${top}px;right:16px;background:var(--bg3);border:1px solid ${color}44;border-left:4px solid ${color};border-radius:10px;padding:12px 18px;font-size:13px;font-weight:600;color:var(--text);z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.4);max-width:320px;animation:slideIn 0.3s ease;`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(()=>{toast.style.opacity='0';toast.style.transform='translateX(20px)';toast.style.transition='all 0.3s';setTimeout(()=>toast.remove(),300);}, duration);
}

async function boot() {
  const r = await api.get('/me');
  if (r.ok) STATE.user = r.user;
  render();
  // Check for callback due alerts
  if(r.ok && r.user.role === 'staff') {
    setTimeout(async()=>{
      const cb = await api.get('/leads/callbacks-due');
      if(cb.ok && cb.count > 0) {
        showToast('🔔 '+cb.count+' callback(s) due now!', 'warning');
        if(Notification.permission === 'granted') {
          new Notification('Macto CRM - Callbacks Due', { body: cb.count+' leads need a callback now', icon: '/favicon.ico' });
        } else if(Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }
    }, 2000);
  }
}

function render() {
  const container = document.getElementById('app');
  container.innerHTML = '';
  if (!STATE.user) { container.appendChild(renderLogin()); return; }
  container.appendChild(renderApp());
}

// ── LOGIN ────────────────────────────────────────────────────────
function renderLogin() {
  const errDiv = el('div',{});
  const uInp = el('input',{type:'text',className:'inp',placeholder:'Username'});
  const pInp = el('input',{type:'password',className:'inp',placeholder:'Password'});
  const btn = el('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:4px',onClick:doLogin},'Sign In');
  async function doLogin() {
    btn.disabled=true; btn.textContent='Signing in…';
    const r = await api.post('/login',{username:uInp.value,password:pInp.value});
    if (r.ok) { STATE.user=r.user; render(); }
    else { errDiv.className='alert alert-error'; errDiv.textContent=r.error; btn.disabled=false; btn.textContent='Sign In'; }
  }
  uInp.addEventListener('keydown',e=>e.key==='Enter'&&doLogin());
  pInp.addEventListener('keydown',e=>e.key==='Enter'&&doLogin());
  return el('div',{className:'login-page'},
    el('div',{className:'login-box'},
      el('div',{className:'login-logo'},
        el('div',{className:'brand-logo',style:'font-size:18px;display:inline-block;padding:10px 20px'},'🚀 Macto AI CRM'),
        el('p',{style:'color:var(--muted);font-size:13px;margin-top:8px'},'Complete Company Sales OS')
      ),
      el('div',{className:'login-card'},
        el('h2',{},'Sign In'),errDiv,
        el('div',{className:'field'},el('label',{},'Username'),uInp),
        el('div',{className:'field'},el('label',{},'Password'),pInp),
        btn,
        el('p',{style:'color:var(--muted);font-size:12px;text-align:center;margin-top:12px'},'Default: admin / admin123')
      )
    )
  );
}

// ── APP SHELL ────────────────────────────────────────────────────
function renderApp() {
  const user = STATE.user;
  const isAdmin = user.role==='admin';
  const isStaff = user.role==='staff';
  const isAuditor = user.role==='auditor';

  const tabs = isAdmin ? [
    {s:'Overview'},{id:'dashboard',l:'🏠 Dashboard',i:'dash'},
    {s:'Leads'},{id:'assign_leads',l:'📋 Assign Leads',i:'assign'},{id:'all_leads',l:'All Leads',i:'assign'},{id:'import',l:'📤 Import',i:'upload'},{id:'manage_imports',l:'🗑️ Manage Imports',i:'trash'},
    {s:'Sales'},{id:'dialer',l:'📞 Dialer',i:'phone'},{id:'pipeline',l:'📊 Pipeline',i:'pipeline'},{id:'kanban',l:'🗂️ Kanban',i:'pipeline'},{id:'clients',l:'👥 All Clients',i:'users'},
    {s:'Documents'},{id:'proposals',l:'📄 Proposals',i:'audit'},{id:'invoices',l:'🧾 Invoices',i:'money'},
    {s:'Work'},{id:'tasks',l:'✅ Tasks',i:'check'},
    {s:'Audits'},{id:'audits',l:'🔍 Audit Reports',i:'audit'},
    {s:'Insights'},{id:'analytics',l:'📈 Analytics',i:'chart'},{id:'revenue',l:'💰 Revenue',i:'money'},
    {s:'Campaigns'},{id:'bulk_wa',l:'📢 Bulk WhatsApp',i:'phone'},{id:'wa_campaigns',l:'📊 WA Campaigns',i:'chart'},
    {s:'Settings'},{id:'team',l:'👥 Team',i:'users'},{id:'password',l:'🔐 Password',i:'check'},
  ] : isStaff ? [
    {s:'My Work'},{id:'staff_dash',l:'🏠 Dashboard',i:'dash'},{id:'dialer',l:'📞 Dialer',i:'phone'},
    {s:'Leads'},{id:'my_leads',l:'My Leads',i:'assign'},{id:'followups',l:'🔔 Follow-ups',i:'audit'},
    {s:'Clients'},{id:'my_clients',l:'👥 My Clients',i:'users'},
    {s:'Documents'},{id:'proposals',l:'📄 Proposals',i:'audit'},{id:'invoices',l:'🧾 Invoices',i:'money'},
    {s:'Work'},{id:'tasks',l:'✅ My Tasks',i:'check'},
    {s:'Stats'},{id:'my_stats',l:'📊 My Stats',i:'chart'},{id:'password',l:'🔐 Password',i:'check'},
  ] : [
    {s:'Audit'},{id:'audit_dash',l:'Dashboard',i:'dash'},{id:'new_audit',l:'+ New Audit',i:'plus'},{id:'my_audits',l:'My Audits',i:'audit'},
    {s:'Settings'},{id:'password',l:'🔐 Password',i:'check'},
  ];

  const flatTabs = tabs.filter(t=>t.id);
  if (!flatTabs.find(t=>t.id===STATE.tab)) STATE.tab = flatTabs[0]?.id||'dashboard';

  // Global Search
  const searchWrap = el('div',{style:'position:relative;flex:1;max-width:320px;margin:0 12px'});
  const searchInp = el('input',{type:'search',placeholder:'Search leads, clients, invoices...',style:'width:100%;background:var(--bg4);border:1px solid var(--border2);border-radius:8px;padding:8px 14px;color:var(--text);font-size:13px;outline:none;font-family:inherit;'});
  const searchDrop = el('div',{style:'position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;z-index:999;max-height:320px;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.5);display:none'});
  searchInp.addEventListener('focus',()=>{searchInp.style.borderColor='var(--accent)';searchInp.style.boxShadow='0 0 0 3px rgba(99,102,241,0.15)';});
  searchInp.addEventListener('blur',()=>{searchInp.style.borderColor='var(--border2)';searchInp.style.boxShadow='';setTimeout(()=>{searchDrop.style.display='none';},200);});
  let _st;
  searchInp.addEventListener('input',()=>{
    clearTimeout(_st);
    const q=searchInp.value.trim();
    if(q.length<2){searchDrop.style.display='none';return;}
    _st=setTimeout(async()=>{
      const r=await api.get('/search?q='+encodeURIComponent(q));
      searchDrop.innerHTML='';
      if(!r.ok||!r.results.length){searchDrop.appendChild(el('div',{style:'padding:16px;color:var(--muted);font-size:13px;text-align:center'},'No results found'));}
      else {
        const icons={lead:'📋',client:'👥',invoice:'🧾'};
        r.results.forEach(res=>{
          const item=el('div',{style:'padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border)'},
            el('div',{style:'display:flex;align-items:center;gap:10px'},
              el('span',{style:'font-size:15px'},icons[res.type]||'📄'),
              el('div',{style:'flex:1'},el('div',{style:'font-size:13px;font-weight:600'},res.title),el('div',{style:'font-size:11px;color:var(--muted2)'},res.sub)),
              el('span',{style:'font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);background:var(--bg4);padding:2px 6px;border-radius:4px'},res.type)
            )
          );
          item.addEventListener('mouseenter',()=>item.style.background='rgba(99,102,241,0.08)');
          item.addEventListener('mouseleave',()=>item.style.background='');
          item.addEventListener('click',()=>{STATE.tab=res.tab;render();searchDrop.style.display='none';searchInp.value='';});
          searchDrop.appendChild(item);
        });
      }
      searchDrop.style.display='block';
    },300);
  });
  searchWrap.appendChild(searchInp);
  searchWrap.appendChild(searchDrop);

  const topbar = el('div',{className:'topbar'},
    el('div',{className:'brand'},el('img',{src:'/mactoai.png',style:'height:38px;object-fit:contain;border-radius:6px'}),el('span',{className:`role-pill ${user.role}`},user.role.toUpperCase())),
    isAdmin ? searchWrap : el('div',{}),
    el('div',{className:'topbar-right'},
      el('button',{id:'notif-bell',className:'btn btn-ghost btn-sm',style:'position:relative;font-size:16px'},'🔔'),
      el('span',{className:'topbar-user'},'Hi, '+user.name),
      el('button',{className:'btn btn-ghost btn-sm',onClick:async()=>{await api.post('/logout');STATE.user=null;render();}},'Logout')
    )
  );

  const sidebar = el('div',{className:'sidebar'});
  tabs.forEach(t=>{
    if (t.s) sidebar.appendChild(el('div',{className:'nav-section'},t.s));
    else sidebar.appendChild(el('button',{className:'nav-item'+(STATE.tab===t.id?' active':''),onClick:()=>{STATE.tab=t.id;render();}},icon(t.i),t.l));
  });

  const mobileNav = el('div',{className:'sidebar-mobile'});
  flatTabs.slice(0,5).forEach(t=>{
    mobileNav.appendChild(el('button',{className:'nav-item-mob'+(STATE.tab===t.id?' active':''),onClick:()=>{STATE.tab=t.id;render();}},icon(t.i),t.l.replace(/[^\w\s]/g,'').trim().split(' ')[0]));
  });

  const main = el('div',{className:'main',id:'main-content'});
  const shell = el('div',{},topbar,el('div',{className:'layout'},sidebar,main),mobileNav);

  requestAnimationFrame(async()=>{
    // Load notifications
    const bellBtn = document.getElementById('notif-bell');
    if (bellBtn) {
      const nr = await api.get('/notifications');
      if (nr.ok && nr.count>0) {
        const badge = el('span',{style:'position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:999px;font-size:10px;font-weight:700;padding:1px 5px'},String(nr.count));
        bellBtn.appendChild(badge);
        bellBtn.addEventListener('click',async()=>{
          await api.post('/notifications/read');
          const dd = el('div',{id:'notif-dd',style:'position:fixed;top:58px;right:16px;width:300px;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;z-index:999;max-height:380px;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.5)'});
          dd.appendChild(el('div',{style:'padding:12px 16px;font-weight:700;border-bottom:1px solid var(--border)'},'🔔 Notifications'));
          nr.data.forEach(n=>dd.appendChild(el('div',{style:'padding:12px 16px;border-bottom:1px solid var(--border)'},el('div',{style:'font-size:13px;font-weight:600'},n.title),el('div',{style:'color:var(--muted2);font-size:12px;margin-top:2px'},n.message))));
          document.body.appendChild(dd);
          setTimeout(()=>document.addEventListener('click',()=>dd.remove(),{once:true}),100);
        });
      }
    }

    // Route
    const tab = STATE.tab;
    if (isAdmin) {
      if (tab==='dashboard') await renderDashboard(main);
      else if (tab==='assign_leads') await renderAssignLeads(main);
      else if (tab==='all_leads') await renderAllLeads(main);
      else if (tab==='import') renderImport(main);
      else if (tab==='manage_imports') await renderManageImports(main);
      else if (tab==='dialer') await renderDialer(main);
      else if (tab==='pipeline') await renderPipeline(main);
      else if (tab==='kanban') await renderKanban(main);
      else if (tab==='clients') await renderAllClients(main);
      else if (tab==='proposals') await renderProposals(main);
      else if (tab==='invoices') await renderInvoices(main);
      else if (tab==='tasks') await renderTasks(main);
      else if (tab==='audits') await renderAudits(main);
      else if (tab==='analytics') await renderAnalytics(main);
      else if (tab==='revenue') await renderRevenue(main);
      else if (tab==='team') await renderTeam(main);
      else if (tab==='bulk_wa') await renderBulkWA(main);
      else if (tab==='wa_campaigns') await renderWACampaigns(main);
      else if (tab==='password') renderPassword(main);
    } else if (isStaff) {
      if (tab==='staff_dash') await renderStaffDash(main);
      else if (tab==='dialer') await renderDialer(main);
      else if (tab==='my_leads') await renderMyLeads(main);
      else if (tab==='followups') await renderFollowups(main);
      else if (tab==='my_clients') await renderMyClients(main);
      else if (tab==='proposals') await renderProposals(main);
      else if (tab==='invoices') await renderInvoices(main);
      else if (tab==='tasks') await renderTasks(main);
      else if (tab==='my_stats') await renderMyStats(main);
      else if (tab==='password') renderPassword(main);
    } else {
      if (tab==='audit_dash') await renderAuditDash(main);
      else if (tab==='new_audit') renderNewAudit(main);
      else if (tab==='my_audits') await renderAudits(main);
      else if (tab==='password') renderPassword(main);
    }
  });
  return shell;
}


// ── ADMIN DASHBOARD ──────────────────────────────────────────────
async function renderDashboard(container) {
  container.innerHTML = loading();
  const [r, analyticsR] = await Promise.all([api.get('/dashboard/overview'), api.get('/analytics/full')]);
  container.innerHTML = '';
  if (!r.ok) { container.appendChild(alertEl('error','Failed to load dashboard')); return; }

  // Header
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  container.appendChild(el('div',{style:'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;flex-wrap:wrap;gap:10px'},
    el('div',{},
      el('div',{className:'page-title',style:'margin-bottom:4px'},'Command Center'),
      el('div',{style:'color:var(--muted);font-size:13px'},dateStr)
    ),
    el('div',{style:'display:flex;gap:8px;flex-wrap:wrap'},
      el('button',{className:'btn btn-primary btn-sm',onClick:()=>{STATE.tab='assign_leads';render();}},'+ Assign Leads'),
      el('button',{className:'btn btn-ghost btn-sm',onClick:()=>{STATE.tab='clients';render();}},'+ Add Client'),
      el('button',{className:'btn btn-ghost btn-sm',onClick:()=>renderDashboard(container)},'🔄 Refresh')
    )
  ));

  // KPI GRID
  const kpiRow = el('div',{style:'display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:14px;margin-bottom:24px'});
  [
    {l:'Total Leads',v:r.totalLeads,s:'Today: +'+r.todayLeads,c:'#6366f1',icon:'📋'},
    {l:'Unassigned',v:r.unassigned,s:'Need assignment',c:r.unassigned>0?'#ef4444':'#22c55e',icon:'⚠️'},
    {l:'Today Calls',v:r.todayCalls,s:'Week: '+r.weekCalls,c:'#3b82f6',icon:'📞'},
    {l:'Total Revenue',v:fmt(r.totalRevenue),s:'All time',c:'#22c55e',icon:'💰'},
    {l:'Month Revenue',v:fmt(r.monthRevenue),s:'This month',c:'#4ade80',icon:'📈'},
    {l:'Active Clients',v:r.activeClients,s:'Total: '+r.totalClients,c:'#06b6d4',icon:'👥'},
    {l:'Pending Tasks',v:r.pendingTasks,s:'Overdue: '+r.overdueTasks,c:r.overdueTasks>0?'#ef4444':'#8b5cf6',icon:'✅'},
    {l:'Pending Invoices',v:fmt(r.pendingInvValue),s:r.pendingInvCount+' invoices',c:'#fb923c',icon:'🧾'},
  ].forEach(k=>{
    const card = el('div',{style:`background:var(--bg3);border:1px solid var(--border);border-radius:14px;padding:18px;border-top:3px solid ${k.c};transition:all 0.2s;position:relative;overflow:hidden`});
    card.addEventListener('mouseenter',()=>{card.style.transform='translateY(-2px)';card.style.boxShadow=`0 8px 25px ${k.c}22`;});
    card.addEventListener('mouseleave',()=>{card.style.transform='';card.style.boxShadow='';});
    card.appendChild(el('div',{style:'display:flex;justify-content:space-between;align-items:flex-start'},
      el('div',{style:`font-size:${typeof k.v==='string'&&k.v.length>6?'16px':'26px'};font-weight:900;color:${k.c};letter-spacing:-1px;line-height:1`},String(k.v)),
      el('div',{style:'font-size:20px;opacity:0.7'},k.icon)
    ));
    card.appendChild(el('div',{style:'font-size:11px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:0.5px;margin-top:8px'},k.l));
    if(k.s) card.appendChild(el('div',{style:'font-size:11px;color:var(--muted);margin-top:3px'},k.s));
    kpiRow.appendChild(card);
  });
  container.appendChild(kpiRow);

  // CHARTS ROW
  const chartsRow = el('div',{style:'display:grid;grid-template-columns:1.6fr 1fr;gap:16px;margin-bottom:20px'});
  const revChartCard = el('div',{className:'card'});
  revChartCard.appendChild(el('div',{className:'card-title'},'📊 Revenue Trend — Last 6 Months'));
  const revCanvas = document.createElement('canvas');
  revCanvas.style.cssText='width:100%;height:220px;display:block';
  revChartCard.appendChild(revCanvas);
  chartsRow.appendChild(revChartCard);

  const donutCard = el('div',{className:'card'});
  donutCard.appendChild(el('div',{className:'card-title'},'🎯 Lead Status'));
  const donutCanvas = document.createElement('canvas');
  donutCanvas.style.cssText='width:100%;height:180px;display:block;margin:0 auto';
  donutCard.appendChild(donutCanvas);
  const donutLegend = el('div',{style:'display:flex;flex-wrap:wrap;gap:8px;margin-top:12px'});
  donutCard.appendChild(donutLegend);
  chartsRow.appendChild(donutCard);
  container.appendChild(chartsRow);

  requestAnimationFrame(()=>{
    const monthlyData = analyticsR.ok ? (analyticsR.monthlyRevenue||[]) : [];
    drawBarChart(revCanvas, monthlyData.map(m=>m.month), monthlyData.map(m=>m.revenue), '#6366f1', '#4ade80');
    const statusCounts = {};
    if(r.staffStats) r.staffStats.forEach(s=>{
      statusCounts.pending=(statusCounts.pending||0)+s.pending;
      statusCounts.called=(statusCounts.called||0)+s.called;
      statusCounts.interested=(statusCounts.interested||0)+s.interested;
      statusCounts.not_interested=(statusCounts.not_interested||0)+s.not_interested;
    });
    const donutData = [
      {l:'Interested',v:statusCounts.interested||0,c:'#22c55e'},
      {l:'Called',v:statusCounts.called||0,c:'#3b82f6'},
      {l:'Pending',v:statusCounts.pending||0,c:'#f59e0b'},
      {l:'Not Int.',v:statusCounts.not_interested||0,c:'#ef4444'},
      {l:'Unassigned',v:r.unassigned||0,c:'#8b5cf6'},
    ].filter(d=>d.v>0);
    if(donutData.length) drawDonutChart(donutCanvas, donutData);
    donutData.forEach(d=>{
      donutLegend.appendChild(el('div',{style:'display:flex;align-items:center;gap:5px;font-size:11px'},
        el('div',{style:`width:10px;height:10px;border-radius:3px;background:${d.c};flex-shrink:0`}),
        el('span',{style:'color:var(--muted2)'},d.l+' ('+d.v+')')
      ));
    });
  });

  // LEADERBOARD
  if(r.staffStats && r.staffStats.length) {
    const lbCard = el('div',{className:'card',style:'margin-bottom:16px'});
    lbCard.appendChild(el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px'},
      el('div',{className:'card-title',style:'margin:0'},'🏆 Staff Leaderboard'),
      el('button',{className:'btn btn-primary btn-sm',onClick:()=>{STATE.tab='assign_leads';render();}},'+ Assign Leads')
    ));
    const medals=['🥇','🥈','🥉'];
    r.staffStats.slice(0,5).forEach((s,i)=>{
      const cr=parseFloat(s.convRate||0);
      const crColor=cr>=15?'#22c55e':cr>=8?'#f59e0b':'#ef4444';
      lbCard.appendChild(el('div',{style:`display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)`},
        el('div',{style:'font-size:20px;width:28px;text-align:center'},medals[i]||String(i+1)),
        el('div',{style:`width:36px;height:36px;border-radius:50%;background:${s.avatar_color||'#6366f1'}33;border:2px solid ${s.avatar_color||'#6366f1'};display:flex;align-items:center;justify-content:center;font-weight:800;color:${s.avatar_color||'#6366f1'};font-size:14px;flex-shrink:0`},s.name.charAt(0).toUpperCase()),
        el('div',{style:'flex:1'},
          el('div',{style:'font-weight:700;font-size:13px'},s.name),
          el('div',{style:'font-size:11px;color:var(--muted2)'},s.monthCalls+' calls · '+s.interested+' interested')
        ),
        el('div',{style:'text-align:right'},
          el('div',{style:`font-size:18px;font-weight:900;color:${crColor}`},s.convRate+'%'),
          el('div',{style:'font-size:10px;color:var(--muted)'},'conv rate'),
          el('div',{style:'font-size:12px;color:#4ade80;font-weight:600'},fmt(s.revenue||0))
        )
      ));
    });
    // Assignment progress
    const assignPct = r.totalLeads>0 ? Math.round((r.assigned/r.totalLeads)*100) : 0;
    lbCard.appendChild(el('div',{style:'margin-top:14px;padding-top:14px;border-top:1px solid var(--border)'},
      el('div',{style:'display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px'},
        el('span',{style:'color:var(--muted2)'},'Lead Assignment: '+r.assigned+' of '+r.totalLeads),
        el('span',{style:'color:#6366f1;font-weight:700'},assignPct+'%')
      ),
      el('div',{style:'background:var(--bg);border-radius:999px;height:8px;overflow:hidden'},
        el('div',{style:`width:${assignPct}%;background:linear-gradient(90deg,#6366f1,#22c55e);height:100%;border-radius:999px`})
      )
    ));
    container.appendChild(lbCard);
  } else {
    container.appendChild(el('div',{className:'card',style:'margin-bottom:16px;text-align:center;padding:30px'},
      el('div',{style:'font-size:32px;margin-bottom:10px'},'👥'),
      el('div',{style:'color:var(--muted);font-size:14px;margin-bottom:12px'},'No staff members yet. Add your team to start assigning leads.'),
      el('button',{className:'btn btn-primary',onClick:()=>{STATE.tab='team';render();}},'+ Add Team Members')
    ));
  }

  // HOT LEADS
  if(r.hotLeads && r.hotLeads.length) {
    const hlCard = el('div',{className:'card',style:'margin-bottom:16px'});
    hlCard.appendChild(el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px'},
      el('div',{className:'card-title',style:'margin:0'},'🔥 Hot Leads'),
      el('button',{className:'btn btn-ghost btn-sm',onClick:()=>{STATE.tab='all_leads';render();}},'View All →')
    ));
    r.hotLeads.forEach(l=>{
      const score=l.lead_score||0;
      const sc=score>=70?'#22c55e':score>=50?'#f59e0b':'#fb923c';
      hlCard.appendChild(el('div',{style:'display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)'},
        el('div',{style:`background:${sc}22;color:${sc};border-radius:8px;padding:4px 8px;font-weight:800;font-size:13px;min-width:40px;text-align:center`},score),
        el('div',{style:'flex:1'},
          el('div',{style:'font-weight:600;font-size:13px'},l.name||'Unknown'),
          el('div',{style:'font-size:11px;color:var(--muted2)'},l.phone+' · '+catLabel(l.category))
        ),
        el('div',{style:'text-align:right'},
          el('div',{style:`color:${sc};font-size:11px;font-weight:700`},l.status.replace('_',' ').toUpperCase()),
          l.callback_date?el('div',{style:'color:#fbbf24;font-size:11px'},'📅 '+l.callback_date):null
        )
      ));
    });
    container.appendChild(hlCard);
  }

  // PIPELINE SUMMARY
  if(r.pipelineByStage && r.pipelineByStage.length) {
    const pCard = el('div',{className:'card',style:'margin-bottom:16px'});
    pCard.appendChild(el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px'},
      el('div',{className:'card-title',style:'margin:0'},'📊 Pipeline Status'),
      el('button',{className:'btn btn-ghost btn-sm',onClick:()=>{STATE.tab='kanban';render();}},'Kanban View →')
    ));
    const byStage = Object.fromEntries(r.pipelineByStage.map(x=>[x.pipeline_stage,{cnt:parseInt(x.cnt),val:parseFloat(x.val||0)}]));
    const pRow = el('div',{style:'display:flex;gap:8px;overflow-x:auto;padding-bottom:8px'});
    PIPELINE_STAGES.forEach(s=>{
      if(!byStage[s.value]) return;
      pRow.appendChild(el('div',{style:`flex-shrink:0;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;border-top:2px solid ${s.color};cursor:pointer;min-width:110px`,onClick:()=>{STATE.tab='kanban';render();}},
        el('div',{style:`font-size:22px;font-weight:800;color:${s.color}`},String(byStage[s.value].cnt)),
        el('div',{style:'font-size:11px;color:var(--muted);margin-top:2px;white-space:nowrap'},s.label),
        byStage[s.value].val>0?el('div',{style:'font-size:11px;color:#4ade80;margin-top:2px'},fmt(byStage[s.value].val)):null
      ));
    });
    pCard.appendChild(pRow);
    container.appendChild(pCard);
  }

  // OVERDUE FOLLOWUPS
  if(r.overduefollowups && r.overduefollowups.length) {
    const fCard = el('div',{className:'card',style:'margin-bottom:16px'});
    fCard.appendChild(el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px'},
      el('div',{className:'card-title',style:'margin:0'},'⚠️ '+r.overduefollowups.length+' Overdue Follow-ups'),
      el('button',{className:'btn btn-ghost btn-sm',onClick:()=>{STATE.tab='clients';render();}},'View All →')
    ));
    r.overduefollowups.slice(0,6).forEach(c=>{
      fCard.appendChild(el('div',{style:'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)'},
        el('div',{},el('div',{style:'font-weight:600;font-size:13px'},c.name),el('div',{style:'color:var(--muted);font-size:11px'},(c.assignedStaff?.name||'Unassigned')+' · '+catLabel(c.category))),
        el('div',{style:'text-align:right'},stageBadge(c.pipeline_stage),el('div',{style:'color:#ef4444;font-size:11px;margin-top:3px'},'📅 '+fmtDay(c.next_followup)))
      ));
    });
    container.appendChild(fCard);
  }

  // RECENT ACTIVITY
  if(r.recentActivities && r.recentActivities.length) {
    const aCard = el('div',{className:'card'});
    aCard.appendChild(el('div',{className:'card-title'},'🕐 Recent Activity'));
    r.recentActivities.slice(0,8).forEach(a=>{
      const act=ACT_MAP[a.type]||{label:a.type,color:'#94a3b8'};
      aCard.appendChild(el('div',{style:'display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);align-items:flex-start'},
        el('span',{style:`background:${act.color}22;color:${act.color};border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0`},act.label.slice(0,2)),
        el('div',{style:'flex:1'},
          el('div',{style:'font-size:13px;font-weight:600'},a.title),
          el('div',{style:'color:var(--muted);font-size:11px'},(a.Client?.name||'')+(a.user?' · by '+a.user.name:''))
        ),
        el('div',{style:'color:var(--muted);font-size:11px;white-space:nowrap'},fmtDate(a.date))
      ));
    });
    container.appendChild(aCard);
  }

  // Auto-refresh every 60 seconds
  if(STATE._dashRefresh) clearInterval(STATE._dashRefresh);
  STATE._dashRefresh = setInterval(()=>{
    if(STATE.tab==='dashboard') renderDashboard(container);
    else clearInterval(STATE._dashRefresh);
  }, 60000);
}

// ── STAFF DASHBOARD ──────────────────────────────────────────────
async function renderStaffDash(container) {
  container.innerHTML = loading();
  const [statsR, dailyR] = await Promise.all([api.get('/leads/stats'), api.get('/leads/stats')]);
  const clients = await api.get('/clients?limit=5');
  const tasks = await api.get('/tasks?status=pending');
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'🏠 My Dashboard'));

  const s = statsR.ok ? statsR : {total:0,byStatus:[],todayCalls:0,monthCalls:0};
  const byStatus = Object.fromEntries((s.byStatus||[]).map(x=>[x.status,parseInt(x.cnt)]));
  const myClients = clients.ok ? clients.data : [];
  const myTasks = tasks.ok ? tasks.data : [];

  // Today progress
  const todayCalls = s.todayCalls||0;
  const target = STATE.user.daily_target || 50;
  const pct = Math.min(100, Math.round((todayCalls/target)*100));
  const pColor = pct>=100?'#22c55e':pct>=60?'#f59e0b':'#6366f1';

  const progCard = el('div',{className:'card',style:'margin-bottom:16px'});
  progCard.appendChild(el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px'},
    el('div',{className:'card-title',style:'margin:0'},'🎯 Today\'s Target'),
    el('div',{style:`font-size:28px;font-weight:900;color:${pColor}`},todayCalls+'/'+target)
  ));
  progCard.appendChild(el('div',{style:'background:var(--bg);border-radius:999px;height:10px;overflow:hidden;margin-bottom:6px'},
    el('div',{style:`width:${pct}%;background:linear-gradient(90deg,#6366f1,${pColor});height:100%;border-radius:999px`})
  ));
  progCard.appendChild(el('div',{style:'display:flex;gap:16px;font-size:12px'},
    el('span',{style:'color:#22c55e'},'⭐ Interested: '+(byStatus['interested']||0)),
    el('span',{style:'color:var(--muted)'},pct+'% of target · Month: '+s.monthCalls+' calls')
  ));
  container.appendChild(progCard);

  const grid = el('div',{className:'stats-grid'});
  [{l:'My Leads',v:s.total,s:'Total assigned',c:'#6366f1'},{l:'Pending',v:byStatus['pending']||0,s:'Need to call',c:'#f59e0b'},{l:'Interested',v:byStatus['interested']||0,s:'In pipeline',c:'#22c55e'},{l:'Callbacks',v:byStatus['callback']||0,s:'To call back',c:'#fb923c'},{l:'Not Interested',v:byStatus['not_interested']||0,s:'',c:'#ef4444'},{l:'Tasks Pending',v:myTasks.length,s:'',c:'#8b5cf6'}].forEach(k=>grid.appendChild(kpiCard(k.l,k.v,k.s,k.c)));
  container.appendChild(grid);

  // Quick actions
  container.appendChild(el('div',{className:'card',style:'margin-bottom:16px'},
    el('div',{className:'card-title'},'⚡ Quick Actions'),
    el('div',{style:'display:flex;gap:8px;flex-wrap:wrap'},
      el('button',{className:'btn btn-primary',onClick:()=>{STATE.tab='dialer';render();}},'📞 Start Dialing'),
      el('button',{className:'btn btn-cyan',onClick:()=>{STATE.tab='followups';render();}},'🔔 Follow-ups'),
      el('button',{className:'btn btn-ghost',onClick:()=>{STATE.tab='my_clients';render();}},'👥 My Clients'),
      el('button',{className:'btn btn-ghost',onClick:()=>{STATE.tab='tasks';render();}},'✅ My Tasks')
    )
  ));

  // Recent clients
  if (myClients.length) {
    const cCard = el('div',{className:'card'},el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px'},el('div',{className:'card-title',style:'margin:0'},'👥 My Recent Clients'),el('button',{className:'btn btn-ghost btn-sm',onClick:()=>{STATE.tab='my_clients';render();}},'View All')));
    myClients.forEach(c=>{
      cCard.appendChild(el('div',{style:'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)'},
        el('div',{},el('div',{style:'font-weight:600;font-size:13px'},c.name),el('div',{style:'color:var(--muted);font-size:11px'},catLabel(c.category)+(c.next_followup?' · 📅 '+fmtDay(c.next_followup):''))),
        stageBadge(c.pipeline_stage)
      ));
    });
    container.appendChild(cCard);
  }
}

// ── ASSIGN LEADS ─────────────────────────────────────────────────
async function renderAssignLeads(container) {
  container.innerHTML = loading();
  const [usersR, unassignedR] = await Promise.all([api.get('/users'), api.get('/leads?assigned=unassigned&limit=100')]);
  const users = (usersR.ok ? usersR.data : []).filter(u=>u.role==='staff');
  const unassigned = unassignedR.ok ? unassignedR.data : [];
  const total = unassignedR.ok ? unassignedR.total : 0;
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'📋 Assign Leads'));

  const mDiv = el('div',{});
  const selectedIds = new Set();
  const countSpan = el('span',{style:'color:var(--accent2);font-weight:600;font-size:13px'},'0 selected');

  // Staff selector with load info
  const staffSel = el('select',{className:'inp',style:'max-width:220px'});
  staffSel.appendChild(el('option',{value:''},'Select staff to assign…'));
  users.forEach(u=>staffSel.appendChild(el('option',{value:u.id},u.name)));

  const assignBtn = el('button',{className:'btn btn-primary',onClick:doAssign},'Assign Selected');
  const selAllBtn = el('button',{className:'btn btn-ghost btn-sm',onClick:()=>{
    unassigned.forEach(l=>{selectedIds.add(l.id);});
    countSpan.textContent=selectedIds.size+' selected';
    container.querySelectorAll('.lead-check').forEach(cb=>cb.checked=true);
  }},'Select All');
  const clearBtn = el('button',{className:'btn btn-ghost btn-sm',onClick:()=>{
    selectedIds.clear();countSpan.textContent='0 selected';
    container.querySelectorAll('.lead-check').forEach(cb=>cb.checked=false);
  }},'Clear');

  async function doAssign() {
    if (!staffSel.value){mDiv.className='alert alert-error';mDiv.textContent='Select staff first.';return;}
    if (!selectedIds.size){mDiv.className='alert alert-error';mDiv.textContent='Select at least one lead.';return;}
    assignBtn.disabled=true;assignBtn.textContent='Assigning…';
    const r = await api.post('/leads/assign',{lead_ids:[...selectedIds],staff_id:parseInt(staffSel.value)});
    assignBtn.disabled=false;assignBtn.textContent='Assign Selected';
    if (r.ok){mDiv.className='alert alert-success';mDiv.textContent='✓ '+r.count+' leads assigned to '+users.find(u=>u.id==staffSel.value)?.name+'!';selectedIds.clear();setTimeout(()=>renderAssignLeads(container),1500);}
    else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
  }

  container.appendChild(el('div',{className:'card',style:'margin-bottom:14px'},
    el('div',{className:'card-title'},'📭 Unassigned Leads Pool ('+total+' total)'),
    el('div',{style:'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px'},
      staffSel, assignBtn, selAllBtn, clearBtn, countSpan
    ),
    mDiv
  ));

  if (!unassigned.length) {
    container.appendChild(el('div',{className:'card'},el('div',{style:'text-align:center;padding:40px;color:var(--muted)'},'✅ No unassigned leads! All leads are assigned.')));
    return;
  }

  // Filter bar
  const searchInp = el('input',{type:'search',className:'inp inp-sm',placeholder:'Search name or phone…',style:'flex:1;min-width:200px'});
  const catSel = el('select',{className:'inp inp-sm'});
  [['all','All Categories'],...CATEGORIES.map(c=>[c.value,c.label])].forEach(([v,l])=>catSel.appendChild(el('option',{value:v},l)));
  const srcSel = el('select',{className:'inp inp-sm'});
  [['all','All Sources'],['cold_call','Cold Call'],['ads','Ads'],['import','Import'],['referral','Referral'],['manual','Manual']].forEach(([v,l])=>srcSel.appendChild(el('option',{value:v},l)));
  container.appendChild(el('div',{className:'filters-bar'},searchInp,catSel,srcSel));

  const listArea = el('div',{});
  container.appendChild(listArea);

  function renderList() {
    const search = searchInp.value.toLowerCase();
    const cat = catSel.value;
    const src = srcSel.value;
    const filtered = unassigned.filter(l=>{
      if (search && !((l.name||'').toLowerCase().includes(search)||(l.phone||'').includes(search))) return false;
      if (cat!=='all' && l.category!==cat) return false;
      if (src!=='all' && l.source!==src) return false;
      return true;
    });
    listArea.innerHTML='';
    if (!filtered.length){listArea.appendChild(el('p',{style:'color:var(--muted);text-align:center;padding:20px'},'No leads match filter.'));return;}
    listArea.appendChild(el('p',{style:'color:var(--muted);font-size:12px;margin-bottom:8px'},filtered.length+' leads shown'));
    const list = el('div',{style:'display:flex;flex-direction:column;gap:6px'});
    filtered.forEach(l=>{
      const cb = el('input',{type:'checkbox',className:'lead-check'});
      cb.checked = selectedIds.has(l.id);
      cb.addEventListener('change',()=>{cb.checked?selectedIds.add(l.id):selectedIds.delete(l.id);countSpan.textContent=selectedIds.size+' selected';});
      list.appendChild(el('div',{style:'display:flex;align-items:center;gap:10px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px 14px'},
        cb,
        el('div',{style:'flex:1'},
          el('div',{style:'font-weight:600;font-size:13px'},l.name||'Unknown'),
          el('div',{style:'font-family:monospace;color:var(--muted2);font-size:12px'},l.phone||'—'),
          el('div',{style:'color:var(--muted);font-size:11px;margin-top:2px'},catLabel(l.category)+(l.city?' · 📍'+l.city:'')+(l.source?' · '+l.source:''))
        ),
        el('div',{style:'color:var(--muted);font-size:11px;white-space:nowrap'},fmtDay(l.createdAt))
      ));
    });
    listArea.appendChild(list);
    if (total>100) listArea.appendChild(el('p',{style:'color:var(--muted);font-size:12px;text-align:center;margin-top:10px'},'Showing 100 of '+total+'. Import more or filter.'));
  }

  let st; searchInp.addEventListener('input',()=>{clearTimeout(st);st=setTimeout(renderList,300);});
  catSel.addEventListener('change',renderList);
  srcSel.addEventListener('change',renderList);
  renderList();
}

// ── ALL LEADS ────────────────────────────────────────────────────
async function renderAllLeads(container) {
  container.innerHTML = loading();
  const usersR = await api.get('/users');
  const users = usersR.ok ? usersR.data : [];
  container.innerHTML = '';
  container.appendChild(el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px'},
    el('div',{className:'page-title',style:'margin:0'},'📋 All Leads'),
    el('button',{className:'btn btn-ghost btn-sm',onClick:()=>{window.location.href='/api/export/leads';}},'📥 Export Excel')
  ));

  let page=1, filters={search:'',status:'all',category:'all',source:'all',assigned:'all'};
  const selectedIds = new Set();

  // Filters
  const searchInp = el('input',{type:'search',className:'inp inp-sm',placeholder:'Search…',style:'flex:1;min-width:180px'});
  const statusSel = el('select',{className:'inp inp-sm'});
  [['all','All Status'],...CALL_STATUSES.map(s=>[s.value,s.label])].forEach(([v,l])=>statusSel.appendChild(el('option',{value:v},l)));
  const catSel = el('select',{className:'inp inp-sm'});
  [['all','All Category'],...CATEGORIES.map(c=>[c.value,c.label])].forEach(([v,l])=>catSel.appendChild(el('option',{value:v},l)));
  const srcSel = el('select',{className:'inp inp-sm'});
  [['all','All Source'],['cold_call','Cold Call'],['ads','Ads'],['referral','Referral'],['audit','Audit'],['manual','Manual'],['import','Import']].forEach(([v,l])=>srcSel.appendChild(el('option',{value:v},l)));
  const staffSel = el('select',{className:'inp inp-sm'});
  [['all','All Staff'],['unassigned','⚠ Unassigned'],...users.filter(u=>u.role==='staff').map(u=>[u.id,u.name])].forEach(([v,l])=>staffSel.appendChild(el('option',{value:v},l)));
  container.appendChild(el('div',{className:'filters-bar'},searchInp,statusSel,catSel,srcSel,staffSel));

  // Bulk actions bar
  const mDiv = el('div',{});
  const assignSel = el('select',{className:'inp inp-sm'});
  [['','Assign to…'],...users.filter(u=>u.role==='staff').map(u=>[u.id,u.name])].forEach(([v,l])=>assignSel.appendChild(el('option',{value:v},l)));
  const countSpan = el('span',{style:'color:var(--accent2);font-weight:600;font-size:13px'},'0 selected');
  const assignBtn = el('button',{className:'btn btn-primary btn-sm',onClick:doAssign},'Assign');
  const delBtn = el('button',{className:'btn btn-danger btn-sm',onClick:doBulkDel},'🗑️ Delete Selected');
  container.appendChild(el('div',{className:'card',style:'margin-bottom:12px'},
    el('div',{style:'display:flex;gap:8px;align-items:center;flex-wrap:wrap'},
      el('span',{style:'color:var(--muted);font-size:13px;font-weight:600'},'Bulk:'),
      assignSel,assignBtn,
      el('span',{style:'color:var(--muted)'},'|'),
      delBtn,
      el('span',{style:'color:var(--muted)'},'|'),
      countSpan
    ),mDiv
  ));

  const tableArea = el('div',{});
  container.appendChild(tableArea);

  async function load() {
    tableArea.innerHTML = loading();
    const params = new URLSearchParams({page,limit:50,search:filters.search,status:filters.status,category:filters.category,source:filters.source,assigned:filters.assigned});
    const r = await api.get('/leads?'+params);
    if (!r.ok){tableArea.innerHTML='<p style="color:var(--muted)">Error loading leads</p>';return;}
    tableArea.innerHTML='';
    const allCb = el('input',{type:'checkbox'});
    const tw = el('div',{className:'table-wrap'},
      el('table',{},
        el('thead',{},el('tr',{},el('th',{style:'width:36px'},allCb),...['Name','Phone','Category','Status','Source','Assigned To','Action'].map(h=>el('th',{},h)))),
        el('tbody',{id:'leads-tbody'})
      )
    );
    const tbody = tw.querySelector('#leads-tbody');
    allCb.addEventListener('change',()=>{
      r.data.forEach(l=>allCb.checked?selectedIds.add(l.id):selectedIds.delete(l.id));
      tbody.querySelectorAll('input[type=checkbox]').forEach(cb=>cb.checked=allCb.checked);
      countSpan.textContent=selectedIds.size+' selected';
    });
    if (!r.data.length) {tbody.appendChild(el('tr',{className:'empty-row'},el('td',{colSpan:8},'No leads found.')));} 
    r.data.forEach(l=>{
      const staff = users.find(u=>u.id===l.assigned_to);
      const cb = el('input',{type:'checkbox'});
      cb.checked = selectedIds.has(l.id);
      cb.addEventListener('change',()=>{cb.checked?selectedIds.add(l.id):selectedIds.delete(l.id);countSpan.textContent=selectedIds.size+' selected';});
      const tr = el('tr',{},el('td',{},cb),
        el('td',{},el('div',{className:'td-name'},l.name||'—'),el('div',{className:'td-muted'},l.email||'')),
        el('td',{style:'font-family:monospace;font-size:12px;color:var(--muted2)'},l.phone||'—'),
        el('td',{style:'font-size:12px'},catLabel(l.category)),
        el('td',{}),
        el('td',{style:'font-size:12px;color:var(--muted2)'},l.source||'—'),
        el('td',{style:'font-size:12px;color:var(--muted2)'},staff?staff.name:'⚠ Unassigned'),
        el('td',{},el('button',{className:'btn btn-danger btn-xs',onClick:async()=>{if(!confirm('Delete this lead?'))return;await api.del('/leads/'+l.id);load();}},'Del'))
      );
      tr.children[4].appendChild(callBadge(l.status));
      tbody.appendChild(tr);
    });
    tableArea.appendChild(tw);
    const pg = el('div',{className:'pagination'});
    if (page>1) pg.appendChild(el('button',{className:'page-btn',onClick:()=>{page--;load();}},'← Prev'));
    pg.appendChild(el('span',{className:'page-info'},`Page ${r.page}/${r.pages} · ${r.total} leads`));
    if (page<r.pages) pg.appendChild(el('button',{className:'page-btn',onClick:()=>{page++;load();}},'Next →'));
    tableArea.appendChild(pg);
  }

  async function doAssign() {
    if (!assignSel.value){mDiv.className='alert alert-error';mDiv.textContent='Select staff first.';return;}
    if (!selectedIds.size){mDiv.className='alert alert-error';mDiv.textContent='Select leads first.';return;}
    const r = await api.post('/leads/assign',{lead_ids:[...selectedIds],staff_id:parseInt(assignSel.value)});
    if (r.ok){mDiv.className='alert alert-success';mDiv.textContent='✓ '+r.count+' leads assigned!';selectedIds.clear();countSpan.textContent='0 selected';setTimeout(()=>{mDiv.className='';mDiv.textContent='';},3000);load();}
    else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
  }

  async function doBulkDel() {
    if (!selectedIds.size){mDiv.className='alert alert-error';mDiv.textContent='Select leads to delete.';return;}
    if (!confirm(`Permanently delete ${selectedIds.size} leads? Cannot undo!`)) return;
    const r = await api.delBody('/leads/bulk',{lead_ids:[...selectedIds]});
    if (r.ok){mDiv.className='alert alert-success';mDiv.textContent='✓ Deleted '+r.count+' leads.';selectedIds.clear();countSpan.textContent='0 selected';setTimeout(()=>{mDiv.className='';mDiv.textContent='';},3000);load();}
    else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
  }

  let st;
  searchInp.addEventListener('input',()=>{clearTimeout(st);st=setTimeout(()=>{filters.search=searchInp.value;page=1;load();},400);});
  statusSel.addEventListener('change',()=>{filters.status=statusSel.value;page=1;load();});
  catSel.addEventListener('change',()=>{filters.category=catSel.value;page=1;load();});
  srcSel.addEventListener('change',()=>{filters.source=srcSel.value;page=1;load();});
  staffSel.addEventListener('change',()=>{filters.assigned=staffSel.value;page=1;load();});
  load();
}

// ── MANAGE IMPORTS ───────────────────────────────────────────────
async function renderManageImports(container) {
  container.innerHTML = loading();
  const batchR = await api.get('/leads/batches');
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'🗑️ Manage Imported Leads'));
  container.appendChild(el('div',{className:'alert alert-warn',style:'margin-bottom:16px'},'⚠️ Warning: Deleting leads is PERMANENT and cannot be undone.'));

  const mDiv = el('div',{});
  container.appendChild(mDiv);

  // Quick delete options
  const qCard = el('div',{className:'card',style:'margin-bottom:16px'},el('div',{className:'card-title'},'⚡ Quick Delete Options'));
  
  // Delete all unassigned
  const delUBtn = el('button',{className:'btn btn-danger',onClick:async()=>{
    const r2 = await api.get('/leads?assigned=unassigned&limit=1');
    const count = r2.total||0;
    if (!count){mDiv.className='alert alert-info';mDiv.textContent='No unassigned leads.';return;}
    if (!confirm(`Delete ALL ${count} unassigned leads? Cannot undo!`)) return;
    delUBtn.disabled=true;delUBtn.textContent='Deleting…';
    const r = await api.delBody('/leads/bulk',{filter_assigned:'unassigned'});
    delUBtn.disabled=false;delUBtn.textContent='🗑️ Delete All Unassigned';
    if (r.ok){mDiv.className='alert alert-success';mDiv.textContent='✓ Deleted '+r.count+' unassigned leads.';setTimeout(()=>renderManageImports(container),1500);}
    else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
  }},'🗑️ Delete All Unassigned Leads');

  qCard.appendChild(el('div',{style:'display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap'},
    el('div',{},
      el('div',{style:'font-size:13px;font-weight:600;margin-bottom:4px'},'Remove Unassigned Leads'),
      el('div',{style:'color:var(--muted);font-size:12px;margin-bottom:8px'},'Delete all leads not yet assigned to any staff member'),
      delUBtn
    )
  ));
  container.appendChild(qCard);

  // Batch table
  const batches = batchR.ok ? batchR.data : [];
  if (!batches.length) {
    container.appendChild(el('div',{className:'card'},el('p',{style:'text-align:center;color:var(--muted);padding:30px'},'No import batches found.')));
    return;
  }

  const bCard = el('div',{className:'card'},el('div',{className:'card-title'},'📅 Delete by Import Batch'));
  bCard.appendChild(el('p',{style:'color:var(--muted);font-size:12px;margin-bottom:12px'},'Each row = leads imported on that date from that source. Click Delete to remove the entire batch.'));

  const tw = el('div',{className:'table-wrap'},
    el('table',{},
      el('thead',{},el('tr',{},...['Date','Source','Total','Unassigned','Action'].map(h=>el('th',{},h)))),
      el('tbody',{},...batches.map(b=>{
        const srcColors={cold_call:'#3b82f6',ads:'#f59e0b',import:'#8b5cf6',referral:'#22c55e',audit:'#06b6d4',manual:'#94a3b8'};
        const sc = srcColors[b.source]||'#94a3b8';
        const dBtn = el('button',{className:'btn btn-danger btn-sm',onClick:async()=>{
          if (!confirm(`Delete ${b.count} leads from ${b.date} (${b.source})? Cannot undo!`)) return;
          dBtn.disabled=true;dBtn.textContent='Deleting…';
          const r = await api.delBody('/leads/bulk',{filter_source:b.source,filter_date:b.date});
          if (r.ok){mDiv.className='alert alert-success';mDiv.textContent='✓ Deleted '+r.count+' leads from '+b.date;setTimeout(()=>renderManageImports(container),1500);}
          else{mDiv.className='alert alert-error';mDiv.textContent=r.error;dBtn.disabled=false;dBtn.textContent='Delete';}
        }},'🗑️ Delete');
        return el('tr',{},
          el('td',{style:'font-weight:600'},b.date),
          el('td',{},el('span',{style:`background:${sc}22;color:${sc};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600`},b.source)),
          el('td',{style:'font-weight:700;color:var(--text)'},b.count),
          el('td',{style:'color:#ef4444;font-weight:600'},b.unassigned||0),
          el('td',{},dBtn)
        );
      }))
    )
  );
  bCard.appendChild(tw);
  container.appendChild(bCard);
}

// ── STAFF LEADS MODAL ─────────────────────────────────────────────
function openStaffLeadsModal(staff) {
  let page=1, statusFilter='all';
  const overlay = el('div',{className:'modal-overlay center',onClick:(e)=>{if(e.target===overlay)overlay.remove();}});
  const modal = el('div',{className:'modal center-modal wide-modal',style:'max-width:680px'});
  overlay.appendChild(modal);

  async function load() {
    modal.innerHTML = loading();
    const r = await api.get(`/leads?assigned=${staff.id}&status=${statusFilter}&page=${page}&limit=30`);
    modal.innerHTML = '';
    modal.appendChild(el('div',{className:'modal-header'},
      el('div',{},
        el('div',{style:'font-weight:800;font-size:17px'},'📋 '+staff.name+"'s Leads"),
        el('div',{style:'color:var(--muted);font-size:12px;margin-top:2px'},'Total: '+(r.total||0)+' · Pending: '+staff.pending+' · Interested: '+staff.interested)
      ),
      el('button',{className:'modal-close',onClick:()=>overlay.remove()},'✕')
    ));

    // Status pills
    const pills = el('div',{style:'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px'});
    [['all','All'],['pending','Pending'],['called','Called'],['interested','⭐ Interested'],['not_interested','Not Int.'],['callback','Callback'],['busy','Busy'],['no_answer','No Answer']].forEach(([v,l])=>{
      pills.appendChild(el('button',{className:'pill',style:statusFilter===v?'background:var(--accent);color:#fff':'',onClick:()=>{statusFilter=v;page=1;load();}},l));
    });
    modal.appendChild(pills);

    const leads = r.ok ? r.data : [];
    if (!leads.length){modal.appendChild(el('p',{style:'text-align:center;color:var(--muted);padding:20px'},'No leads with this filter.'));return;}

    leads.forEach(l=>{
      const s = CALL_MAP[l.status||'pending'];
      modal.appendChild(el('div',{style:`background:var(--bg2);border-radius:8px;padding:10px 14px;margin-bottom:6px;border-left:3px solid ${s.color}`},
        el('div',{style:'display:flex;justify-content:space-between;align-items:flex-start'},
          el('div',{},
            el('div',{style:'font-weight:600;font-size:13px'},l.name||'Unknown'),
            el('div',{style:'font-family:monospace;color:var(--muted2);font-size:12px'},l.phone||'—'),
            el('div',{style:'color:var(--muted);font-size:11px;margin-top:2px'},catLabel(l.category)+(l.city?' · '+l.city:'')),
            l.last_note?el('div',{style:'color:var(--muted);font-size:11px;margin-top:3px;font-style:italic'},'📝 '+l.last_note):null
          ),
          el('div',{style:'text-align:right'},
            callBadge(l.status),
            l.callback_date?el('div',{style:'color:#fbbf24;font-size:11px;margin-top:3px'},'📅 '+l.callback_date):null
          )
        )
      ));
    });

    if (r.pages>1) {
      const pag = el('div',{className:'pagination'});
      if (page>1) pag.appendChild(el('button',{className:'page-btn',onClick:()=>{page--;load();}},'← Prev'));
      pag.appendChild(el('span',{className:'page-info'},`${page}/${r.pages}`));
      if (page<r.pages) pag.appendChild(el('button',{className:'page-btn',onClick:()=>{page++;load();}},'Next →'));
      modal.appendChild(pag);
    }
  }

  load();
  document.body.appendChild(overlay);
}

// ── IMPORT ────────────────────────────────────────────────────────
function renderImport(container) {
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'📤 Import Leads'));
  const mDiv = el('div',{});
  const previewDiv = el('div',{});
  let headers = [], previewRows = [], totalRows = 0, uploadedFile = null;
  const fileInp = el('input',{type:'file',accept:'.xlsx,.csv',style:'display:none'});
  const dropzone = el('div',{className:'dropzone',onClick:()=>fileInp.click()},
    el('div',{style:'font-size:32px'},'📂'),
    el('p',{},'Click to upload Excel (.xlsx) or CSV file'),
    el('p',{style:'font-size:11px;margin-top:4px'},'Max 10MB · Columns: Name, Phone, Email, City, Category')
  );
  fileInp.addEventListener('change',async()=>{
    const file = fileInp.files[0];
    if(!file) return;
    uploadedFile = file;
    dropzone.style.borderColor = 'var(--accent)';
    dropzone.innerHTML = '<div style="font-size:13px;color:var(--accent2)">📄 '+file.name+'</div><p style="color:var(--muted);font-size:12px">Processing…</p>';
    const fd = new FormData(); fd.append('file', file);
    const r = await api.upload('/import/preview', fd);
    if(!r.ok){mDiv.className='alert alert-error';mDiv.textContent=r.error;return;}
    headers = r.headers; previewRows = r.preview; totalRows = r.total;
    renderMapping();
  });
  container.appendChild(dropzone);
  container.appendChild(fileInp);
  container.appendChild(mDiv);
  container.appendChild(previewDiv);

  function renderMapping() {
    previewDiv.innerHTML = '';
    previewDiv.appendChild(el('div',{className:'alert alert-info',style:'margin-bottom:12px'},'✅ Found '+totalRows+' rows. Map columns below:'));
    const fields = [
      {key:'name',label:'Name *'},{key:'phone',label:'Phone *'},{key:'email',label:'Email'},
      {key:'city',label:'City'},{key:'state',label:'State'},
    ];
    const mapping = {};
    const catSel = el('select',{className:'inp inp-sm'});
    CATEGORIES.forEach(c=>catSel.appendChild(el('option',{value:c.value},c.label)));
    const srcSel = el('select',{className:'inp inp-sm'});
    [['cold_call','Cold Call'],['ads','Ads'],['import','Import'],['referral','Referral'],['manual','Manual']].forEach(([v,l])=>srcSel.appendChild(el('option',{value:v},l)));
    srcSel.value = 'import';
    const mapCard = el('div',{className:'card',style:'margin-bottom:14px'});
    mapCard.appendChild(el('div',{className:'card-title'},'Map Columns'));
    fields.forEach(f=>{
      const sel = el('select',{className:'inp inp-sm'});
      sel.appendChild(el('option',{value:''},'— Skip —'));
      headers.forEach(h=>sel.appendChild(el('option',{value:h},h)));
      const match = headers.find(h=>h.toLowerCase().includes(f.key));
      if(match) sel.value = match;
      mapping[f.key] = sel;
      mapCard.appendChild(el('div',{style:'display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center;margin-bottom:8px'},
        el('div',{style:'font-size:12px;color:var(--muted2);font-weight:600'},f.label), sel
      ));
    });
    mapCard.appendChild(el('div',{style:'display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center;margin-top:8px'},
      el('div',{style:'font-size:12px;color:var(--muted2);font-weight:600'},'Category'), catSel
    ));
    mapCard.appendChild(el('div',{style:'display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center;margin-top:8px'},
      el('div',{style:'font-size:12px;color:var(--muted2);font-weight:600'},'Source'), srcSel
    ));
    const tw = el('div',{className:'table-wrap',style:'margin-bottom:14px'},
      el('table',{},
        el('thead',{},el('tr',{},...headers.map(h=>el('th',{},h)))),
        el('tbody',{},...previewRows.map(row=>el('tr',{},...headers.map(h=>el('td',{style:'font-size:12px'},String(row[h]||''))))))
      )
    );
    const importBtn = el('button',{className:'btn btn-primary',style:'width:100%;justify-content:center',onClick:async()=>{
      const map = {};
      fields.forEach(f=>{ if(mapping[f.key].value) map[f.key]=mapping[f.key].value; });
      if(!map.name&&!map.phone){mDiv.className='alert alert-error';mDiv.textContent='Map at least Name or Phone.';return;}
      importBtn.disabled=true;importBtn.textContent='Importing…';
      const fd2 = new FormData();
      fd2.append('file', uploadedFile);
      fd2.append('mapping', JSON.stringify(map));
      fd2.append('category', catSel.value);
      fd2.append('source', srcSel.value);
      const r2 = await api.upload('/import', fd2);
      importBtn.disabled=false;importBtn.textContent='🚀 Import Leads';
      if(r2.ok){mDiv.className='alert alert-success';mDiv.textContent='✅ Imported '+r2.count+' leads!';}
      else{mDiv.className='alert alert-error';mDiv.textContent=r2.error;}
    }},'🚀 Import Leads');
    previewDiv.appendChild(mapCard);
    previewDiv.appendChild(el('div',{className:'card-title',style:'margin-bottom:8px'},'Preview (first 5 rows)'));
    previewDiv.appendChild(tw);
    previewDiv.appendChild(importBtn);
  }
}

// ── AUDITS ────────────────────────────────────────────────────────
async function renderAudits(container) {
  container.innerHTML = loading();
  const [auditsR, statsR] = await Promise.all([api.get('/audits'), api.get('/audits/stats')]);
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'🔍 Audit Reports'));
  const stats = statsR.ok ? statsR : {total:0,today:0,month:0,interested:0,converted:0,proposalSent:0};
  const grid = el('div',{className:'stats-grid'});
  [{l:'Total Audits',v:stats.total,c:'#6366f1'},{l:'Today',v:stats.today,c:'#3b82f6'},{l:'This Month',v:stats.month,c:'#06b6d4'},
   {l:'Interested',v:stats.interested,c:'#22c55e'},{l:'Converted',v:stats.converted,c:'#4ade80'},{l:'Proposals Sent',v:stats.proposalSent,c:'#a78bfa'}
  ].forEach(k=>grid.appendChild(kpiCard(k.l,k.v,'',k.c)));
  container.appendChild(grid);
  const audits = auditsR.ok ? auditsR.data : [];
  const searchInp = el('input',{type:'search',className:'inp inp-sm',placeholder:'Search company…',style:'flex:1;min-width:180px'});
  const statusSel = el('select',{className:'inp inp-sm'});
  [['all','All Status'],['audited','Audited'],['proposal_sent','Proposal Sent'],['interested','Interested'],['not_interested','Not Interested'],['converted','Converted']].forEach(([v,l])=>statusSel.appendChild(el('option',{value:v},l)));
  container.appendChild(el('div',{className:'filters-bar'},searchInp,statusSel));
  const listArea = el('div',{});
  container.appendChild(listArea);
  function renderList() {
    const search = searchInp.value.toLowerCase();
    const status = statusSel.value;
    const filtered = audits.filter(a=>{
      if(search && !(a.company_name||'').toLowerCase().includes(search)) return false;
      if(status!=='all' && a.status!==status) return false;
      return true;
    });
    listArea.innerHTML='';
    if(!filtered.length){listArea.appendChild(el('div',{style:'text-align:center;padding:40px;color:var(--muted)'},'No audits found.'));return;}
    const sColors={audited:'#94a3b8',proposal_sent:'#06b6d4',interested:'#22c55e',not_interested:'#ef4444',converted:'#4ade80'};
    const tw = el('div',{className:'table-wrap'},el('table',{},
      el('thead',{},el('tr',{},...['Company','Category','Rating','Status','Auditor','Date','Actions'].map(h=>el('th',{},h)))),
      el('tbody',{},...filtered.map(a=>{
        const sc = sColors[a.status]||'#94a3b8';
        return el('tr',{},
          el('td',{},el('div',{className:'td-name'},a.company_name),el('div',{className:'td-muted'},a.website_url||'')),
          el('td',{style:'font-size:12px;color:var(--muted2)'},a.category||'—'),
          el('td',{style:'font-size:12px'},a.current_website_rating?'⭐ '+a.current_website_rating+'/10':'—'),
          el('td',{},el('span',{style:`background:${sc}22;color:${sc};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600`},a.status)),
          el('td',{className:'td-muted'},a.auditor?a.auditor.name:'—'),
          el('td',{className:'td-muted'},fmtDay(a.audit_date)),
          el('td',{},el('button',{className:'btn btn-ghost btn-xs',onClick:()=>openAuditModal(a,()=>renderAudits(container))},'View'))
        );
      }))
    ));
    listArea.appendChild(tw);
  }
  let st; searchInp.addEventListener('input',()=>{clearTimeout(st);st=setTimeout(renderList,300);}); statusSel.addEventListener('change',renderList);
  renderList();
}

function openAuditModal(audit, onUpdate) {
  const mDiv = el('div',{});
  const statusSel = el('select',{className:'inp inp-sm'});
  [['audited','Audited'],['proposal_sent','Proposal Sent'],['interested','Interested'],['not_interested','Not Interested'],['converted','Converted']].forEach(([v,l])=>{
    const o=el('option',{value:v},l); if(v===audit.status)o.selected=true; statusSel.appendChild(o);
  });
  const notesInp = el('textarea',{className:'inp',rows:3,value:audit.notes||'',placeholder:'Notes…'});
  const overlay = el('div',{className:'modal-overlay center',onClick:(e)=>{if(e.target===overlay)overlay.remove();}},
    el('div',{className:'modal center-modal wide-modal'},
      el('div',{className:'modal-header'},
        el('div',{},
          el('div',{style:'font-weight:800;font-size:17px'},audit.company_name),
          el('div',{style:'color:var(--muted);font-size:12px;margin-top:2px'},audit.website_url||'')
        ),
        el('button',{className:'modal-close',onClick:()=>overlay.remove()},'✕')
      ),
      mDiv,
      el('div',{style:'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:16px'},
        el('div',{},el('div',{style:'font-size:11px;color:var(--muted)'},'PHONE'),el('div',{style:'font-weight:600'},audit.phone||'—')),
        el('div',{},el('div',{style:'font-size:11px;color:var(--muted)'},'EMAIL'),el('div',{style:'font-weight:600'},audit.email||'—')),
        el('div',{},el('div',{style:'font-size:11px;color:var(--muted)'},'CATEGORY'),el('div',{style:'font-weight:600'},audit.category||'—')),
        el('div',{},el('div',{style:'font-size:11px;color:var(--muted)'},'RATING'),el('div',{style:'font-weight:600'},(audit.current_website_rating||0)+'/10'))
      ),
      audit.issues_found?el('div',{className:'card',style:'margin-bottom:12px'},el('div',{className:'card-title'},'Issues Found'),el('div',{style:'font-size:13px;color:var(--muted2)'},audit.issues_found)):null,
      audit.opportunities?el('div',{className:'card',style:'margin-bottom:12px'},el('div',{className:'card-title'},'Opportunities'),el('div',{style:'font-size:13px;color:var(--muted2)'},audit.opportunities)):null,
      el('div',{className:'card',style:'margin-bottom:12px'},
        el('div',{className:'card-title'},'Update Status'),
        el('div',{className:'field'},el('label',{},'Status'),statusSel),
        el('div',{className:'field'},el('label',{},'Notes'),notesInp),
        el('button',{className:'btn btn-primary btn-sm',onClick:async()=>{
          const r=await api.put('/audits/'+audit.id,{status:statusSel.value,notes:notesInp.value});
          if(r.ok){mDiv.className='alert alert-success';mDiv.textContent='✅ Updated!';if(onUpdate)onUpdate();}
          else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
        }},'Save Update')
      )
    )
  );
  document.body.appendChild(overlay);
}

// ── AUDIT DASHBOARD ───────────────────────────────────────────────
async function renderAuditDash(container) {
  container.innerHTML = loading();
  const statsR = await api.get('/audits/stats');
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'🔍 Audit Dashboard'));
  const stats = statsR.ok ? statsR : {total:0,today:0,month:0,interested:0,converted:0,proposalSent:0};
  const grid = el('div',{className:'stats-grid'});
  [{l:'Total Audits',v:stats.total,c:'#6366f1'},{l:'Today',v:stats.today,c:'#3b82f6'},{l:'This Month',v:stats.month,c:'#06b6d4'},
   {l:'Interested',v:stats.interested,c:'#22c55e'},{l:'Converted',v:stats.converted,c:'#4ade80'},{l:'Proposals Sent',v:stats.proposalSent,c:'#a78bfa'}
  ].forEach(k=>grid.appendChild(kpiCard(k.l,k.v,'',k.c)));
  container.appendChild(grid);
  container.appendChild(el('div',{className:'card',style:'margin-bottom:14px'},
    el('div',{className:'card-title'},'⚡ Quick Actions'),
    el('div',{style:'display:flex;gap:8px;flex-wrap:wrap'},
      el('button',{className:'btn btn-primary',onClick:()=>{STATE.tab='new_audit';render();}},'+ New Audit'),
      el('button',{className:'btn btn-ghost',onClick:()=>{STATE.tab='my_audits';render();}},'📋 My Audits')
    )
  ));
}

// ── NEW AUDIT ─────────────────────────────────────────────────────
function renderNewAudit(container) {
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'+ New Audit'));
  const mDiv = el('div',{});
  const fields = {
    company_name: el('input',{type:'text',className:'inp',placeholder:'Company Name *'}),
    website_url: el('input',{type:'url',className:'inp',placeholder:'Website URL'}),
    phone: el('input',{type:'tel',className:'inp',placeholder:'Phone'}),
    email: el('input',{type:'email',className:'inp',placeholder:'Email'}),
    current_website_rating: el('input',{type:'number',className:'inp',placeholder:'Website Rating (0-10)',min:0,max:10}),
    issues_found: el('textarea',{className:'inp',rows:3,placeholder:'Issues found on website/business…'}),
    opportunities: el('textarea',{className:'inp',rows:3,placeholder:'Opportunities / what can be improved…'}),
    notes: el('textarea',{className:'inp',rows:2,placeholder:'Additional notes…'}),
  };
  const catSel = el('select',{className:'inp'});
  [['ecommerce','🛒 E-commerce'],['real_estate','🏢 Real Estate'],['clinic','🏥 Clinic'],['study_abroad','✈️ Study Abroad'],['restaurant','🍽 Restaurant'],['retail','🏪 Retail'],['corporate','🏛 Corporate']].forEach(([v,l])=>catSel.appendChild(el('option',{value:v},l)));
  const propSel = el('select',{className:'inp'});
  [['false','No'],['true','Yes']].forEach(([v,l])=>propSel.appendChild(el('option',{value:v},l)));
  const btn = el('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:14px',onClick:async()=>{
    if(!fields.company_name.value){mDiv.className='alert alert-error';mDiv.textContent='Company name required.';return;}
    btn.disabled=true;btn.textContent='Saving…';
    const r = await api.post('/audits',{
      company_name:fields.company_name.value, website_url:fields.website_url.value,
      phone:fields.phone.value, email:fields.email.value, category:catSel.value,
      current_website_rating:parseInt(fields.current_website_rating.value)||0,
      issues_found:fields.issues_found.value, opportunities:fields.opportunities.value,
      notes:fields.notes.value, proposal_sent:propSel.value==='true', status:'audited'
    });
    btn.disabled=false;btn.textContent='Save Audit';
    if(r.ok){mDiv.className='alert alert-success';mDiv.textContent='✅ Audit saved!';Object.values(fields).forEach(f=>f.value='');}
    else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
  }},'Save Audit');
  container.appendChild(el('div',{className:'card',style:'max-width:600px'},
    mDiv,
    el('div',{className:'form-grid'},
      el('div',{className:'field',style:'margin:0'},el('label',{},'Company Name *'),fields.company_name),
      el('div',{className:'field',style:'margin:0'},el('label',{},'Website URL'),fields.website_url)
    ),
    el('div',{className:'form-grid',style:'margin-top:10px'},
      el('div',{className:'field',style:'margin:0'},el('label',{},'Phone'),fields.phone),
      el('div',{className:'field',style:'margin:0'},el('label',{},'Email'),fields.email)
    ),
    el('div',{className:'form-grid',style:'margin-top:10px'},
      el('div',{className:'field',style:'margin:0'},el('label',{},'Category'),catSel),
      el('div',{className:'field',style:'margin:0'},el('label',{},'Website Rating (0-10)'),fields.current_website_rating)
    ),
    el('div',{className:'field',style:'margin-top:10px'},el('label',{},'Issues Found'),fields.issues_found),
    el('div',{className:'field'},el('label',{},'Opportunities'),fields.opportunities),
    el('div',{className:'form-grid'},
      el('div',{className:'field',style:'margin:0'},el('label',{},'Proposal Sent?'),propSel),
      el('div',{className:'field',style:'margin:0'},el('label',{},'Notes'),fields.notes)
    ),
    btn
  ));
}

// ── ANALYTICS ─────────────────────────────────────────────────────
async function renderAnalytics(container, fromDate='', toDate='') {
  container.innerHTML = loading();
  // Date range filter header
  const dateRow = el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px'});
  dateRow.appendChild(el('div',{className:'page-title',style:'margin:0'},'Analytics'));
  const fromInp = el('input',{type:'date',className:'inp inp-sm',value:fromDate,style:'width:150px'});
  const toInp = el('input',{type:'date',className:'inp inp-sm',value:toDate,style:'width:150px'});
  const filterBtn = el('button',{className:'btn btn-primary btn-sm',onClick:()=>renderAnalytics(container,fromInp.value,toInp.value)},'Apply Filter');
  const clearBtn = el('button',{className:'btn btn-ghost btn-sm',onClick:()=>renderAnalytics(container,'','')},'Clear');
  dateRow.appendChild(el('div',{style:'display:flex;gap:8px;align-items:center'},
    el('span',{style:'color:var(--muted);font-size:12px'},'From'),fromInp,
    el('span',{style:'color:var(--muted);font-size:12px'},'To'),toInp,
    filterBtn,clearBtn
  ));
  container.innerHTML = '';
  container.appendChild(dateRow);

  const params = new URLSearchParams();
  if(fromDate) params.set('from',fromDate);
  if(toDate) params.set('to',toDate);
  const r = await api.get('/analytics/full'+(params.toString()?'?'+params:''));
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'📈 Analytics'));
  if(!r.ok){container.appendChild(alertEl('error','Failed to load analytics'));return;}
  const revenueCard = el('div',{className:'card',style:'margin-bottom:16px'});
  revenueCard.appendChild(el('div',{className:'card-title'},'💰 Monthly Revenue (Last 6 Months)'));
  const canvas = document.createElement('canvas');
  canvas.style.cssText='width:100%;height:200px';
  revenueCard.appendChild(canvas);
  container.appendChild(revenueCard);
  requestAnimationFrame(()=>{
    const ctx = canvas.getContext('2d');
    const months = r.monthlyRevenue||[];
    const maxVal = Math.max(...months.map(m=>m.revenue),1);
    const W = canvas.offsetWidth||600; const H = 200;
    canvas.width = W; canvas.height = H;
    const pad = 45; const gap = (W-pad*2)/Math.max(months.length,1);
    const barW = gap*0.6;
    ctx.fillStyle='#0f1629';ctx.fillRect(0,0,W,H);
    for(let i=0;i<=4;i++){
      const y=pad+(H-pad*2)*(1-i/4);
      ctx.strokeStyle='rgba(255,255,255,0.05)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-pad,y);ctx.stroke();
      ctx.fillStyle='#64748b';ctx.font='10px sans-serif';ctx.textAlign='right';
      ctx.fillText('₹'+Math.round(maxVal*i/4/1000)+'k',pad-4,y+3);
    }
    months.forEach((m,i)=>{
      const x=pad+gap*i+gap/2-barW/2;
      const barH=((m.revenue||0)/maxVal)*(H-pad*2);
      const y=H-pad-barH;
      const grad=ctx.createLinearGradient(0,y,0,H-pad);
      grad.addColorStop(0,'#6366f1');grad.addColorStop(1,'#4ade80');
      ctx.fillStyle=grad;
      ctx.beginPath();ctx.roundRect(x,y,barW,barH,4);ctx.fill();
      ctx.fillStyle='#94a3b8';ctx.font='10px sans-serif';ctx.textAlign='center';
      ctx.fillText(m.month,x+barW/2,H-pad+14);
      if(m.revenue>0){ctx.fillStyle='#e2e8f0';ctx.font='bold 10px sans-serif';ctx.fillText('₹'+Math.round(m.revenue/1000)+'k',x+barW/2,y-4);}
    });
  });
  const grid = el('div',{className:'stats-grid',style:'margin-bottom:16px'});
  [{l:'Total Revenue',v:fmt(r.totalRevenue||0),c:'#22c55e'},{l:'Pipeline Value',v:fmt(r.pipelineValue||0),c:'#6366f1'},
   {l:'Staff Count',v:(r.staffPerf||[]).length,c:'#3b82f6'},{l:'Loss Reasons',v:(r.reasons||[]).length,c:'#f59e0b'}
  ].forEach(k=>grid.appendChild(kpiCard(k.l,k.v,'',k.c)));
  container.appendChild(grid);
  if(r.bySource&&Object.keys(r.bySource).length){
    const srcCard = el('div',{className:'card',style:'margin-bottom:16px'});
    srcCard.appendChild(el('div',{className:'card-title'},'📊 Lead Source Performance'));
    const tw = el('div',{className:'table-wrap'},el('table',{},
      el('thead',{},el('tr',{},...['Source','Total','Interested','Not Interested','Conv Rate'].map(h=>el('th',{},h)))),
      el('tbody',{},...Object.entries(r.bySource).map(([src,d])=>{
        const cr=parseFloat(d.rate||0);const crColor=cr>=15?'#22c55e':cr>=8?'#f59e0b':'#ef4444';
        return el('tr',{},
          el('td',{style:'font-weight:600;text-transform:capitalize'},src.replace(/_/g,' ')),
          el('td',{style:'color:var(--muted2)'},d.total),
          el('td',{style:'color:#22c55e'},d.interested),
          el('td',{style:'color:#ef4444'},d.not_interested),
          el('td',{style:`color:${crColor};font-weight:700`},cr.toFixed(1)+'%')
        );
      }))
    ));
    srcCard.appendChild(tw);container.appendChild(srcCard);
  }
  if(r.staffPerf&&r.staffPerf.length){
    const staffCard = el('div',{className:'card',style:'margin-bottom:16px'});
    staffCard.appendChild(el('div',{className:'card-title'},'👥 Staff Performance'));
    const tw = el('div',{className:'table-wrap'},el('table',{},
      el('thead',{},el('tr',{},...['Name','Role','Total Calls','Month Calls','Leads','Conv%','Revenue','Score'].map(h=>el('th',{},h)))),
      el('tbody',{},...r.staffPerf.map(s=>{
        const cr=parseFloat(s.convRate||0);const crColor=cr>=15?'#22c55e':cr>=8?'#f59e0b':'#ef4444';
        const trend=s.trend>0?'📈 +'+s.trend+'%':s.trend<0?'📉 '+s.trend+'%':'→';
        return el('tr',{},
          el('td',{style:'font-weight:600'},s.name),
          el('td',{style:'color:var(--muted);font-size:11px;text-transform:capitalize'},s.role),
          el('td',{style:'color:#3b82f6'},s.totalCalls),
          el('td',{},s.monthCalls+' ',el('span',{style:'font-size:11px;color:var(--muted)'},trend)),
          el('td',{style:'color:var(--muted2)'},s.totalLeads),
          el('td',{style:`color:${crColor};font-weight:700`},cr+'%'),
          el('td',{style:'color:#4ade80'},fmt(s.revenue)),
          el('td',{style:'color:#a78bfa;font-weight:700'},s.score)
        );
      }))
    ));
    staffCard.appendChild(tw);container.appendChild(staffCard);
  }
  if(r.reasons&&r.reasons.length){
    const rCard = el('div',{className:'card'});
    rCard.appendChild(el('div',{className:'card-title'},'❌ Not Converted Reasons'));
    r.reasons.slice(0,10).forEach(reason=>{
      rCard.appendChild(el('div',{style:'padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;color:var(--muted2)'},'• '+reason));
    });
    container.appendChild(rCard);
  }
}

// ── REVENUE ───────────────────────────────────────────────────────
async function renderRevenue(container) {
  container.innerHTML = loading();
  const invR = await api.get('/invoices');
  container.innerHTML = '';
  container.appendChild(el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px'},
    el('div',{className:'page-title',style:'margin:0'},'💰 Revenue'),
    el('button',{className:'btn btn-ghost btn-sm',onClick:()=>{window.location.href='/api/export/revenue';}},'📥 Export Excel')
  ));
  const invoices = invR.ok ? invR.data : [];
  const paid = invoices.filter(i=>i.status==='paid');
  const pending = invoices.filter(i=>i.status==='sent');
  const draft = invoices.filter(i=>i.status==='draft');
  const totalPaid = paid.reduce((s,i)=>s+parseFloat(i.total||0),0);
  const totalPending = pending.reduce((s,i)=>s+parseFloat(i.total||0),0);
  const grid = el('div',{className:'stats-grid',style:'margin-bottom:20px'});
  [{l:'Total Collected',v:fmt(totalPaid),s:paid.length+' invoices paid',c:'#22c55e'},
   {l:'Pending Collection',v:fmt(totalPending),s:pending.length+' invoices',c:'#f59e0b'},
   {l:'Total Invoices',v:invoices.length,s:'All time',c:'#6366f1'},
   {l:'Drafts',v:draft.length,s:'Not sent yet',c:'#94a3b8'}
  ].forEach(k=>grid.appendChild(kpiCard(k.l,k.v,k.s,k.c)));
  container.appendChild(grid);
  const byMonth = {};
  paid.forEach(inv=>{
    const m = new Date(inv.createdAt).toLocaleString('en-IN',{month:'short',year:'2-digit'});
    byMonth[m]=(byMonth[m]||0)+parseFloat(inv.total||0);
  });
  if(Object.keys(byMonth).length){
    const mCard = el('div',{className:'card',style:'margin-bottom:16px'});
    mCard.appendChild(el('div',{className:'card-title'},'📅 Monthly Breakdown'));
    const tw = el('div',{className:'table-wrap'},el('table',{},
      el('thead',{},el('tr',{},...['Month','Revenue','% of Total'].map(h=>el('th',{},h)))),
      el('tbody',{},...Object.entries(byMonth).reverse().map(([m,v])=>{
        const pct=totalPaid>0?Math.round((v/totalPaid)*100):0;
        return el('tr',{},
          el('td',{style:'font-weight:600'},m),
          el('td',{style:'color:#4ade80;font-weight:700'},fmt(v)),
          el('td',{},el('div',{style:'display:flex;align-items:center;gap:8px'},
            el('div',{style:'background:var(--bg);border-radius:999px;height:6px;width:100px;overflow:hidden'},
              el('div',{style:`width:${pct}%;background:#6366f1;height:100%;border-radius:999px`})
            ),
            el('span',{style:'font-size:12px;color:var(--muted)'},pct+'%')
          ))
        );
      }))
    ));
    mCard.appendChild(tw);container.appendChild(mCard);
  }
  if(pending.length){
    const pCard = el('div',{className:'card'});
    pCard.appendChild(el('div',{className:'card-title'},'⏳ Pending Payments'));
    const tw = el('div',{className:'table-wrap'},el('table',{},
      el('thead',{},el('tr',{},...['Invoice','Client','Amount','Due Date'].map(h=>el('th',{},h)))),
      el('tbody',{},...pending.map(inv=>el('tr',{},
        el('td',{style:'font-family:monospace;color:var(--accent2)'},inv.invoice_no),
        el('td',{className:'td-name'},inv.Client?inv.Client.name:'—'),
        el('td',{style:'color:#f59e0b;font-weight:700'},fmt(inv.total)),
        el('td',{style:'color:var(--muted);font-size:12px'},fmtDay(inv.due_date))
      )))
    ));
    pCard.appendChild(tw);container.appendChild(pCard);
  }
}

// ── TEAM ──────────────────────────────────────────────────────────
async function renderTeam(container) {
  container.innerHTML = loading();
  const usersR = await api.get('/users');
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'👥 Team Management'));
  const users = usersR.ok ? usersR.data : [];
  const mDiv = el('div',{});
  container.appendChild(mDiv);
  container.appendChild(el('button',{className:'btn btn-primary',style:'margin-bottom:14px',onClick:()=>openAddUserModal(()=>renderTeam(container))},'+ Add Team Member'));
  const grid = el('div',{className:'stats-grid',style:'margin-bottom:16px'});
  [{l:'Total Members',v:users.length,c:'#6366f1'},{l:'Staff',v:users.filter(u=>u.role==='staff').length,c:'#3b82f6'},
   {l:'Admins',v:users.filter(u=>u.role==='admin').length,c:'#fbbf24'},{l:'Auditors',v:users.filter(u=>u.role==='auditor').length,c:'#06b6d4'}
  ].forEach(k=>grid.appendChild(kpiCard(k.l,k.v,'',k.c)));
  container.appendChild(grid);
  if(!users.length){container.appendChild(el('div',{className:'card'},el('p',{style:'text-align:center;color:var(--muted);padding:30px'},'No team members yet.')));return;}
  const tw = el('div',{className:'table-wrap'},el('table',{},
    el('thead',{},el('tr',{},...['Name','Username','Role','Daily Target','Joined','Actions'].map(h=>el('th',{},h)))),
    el('tbody',{},...users.map(u=>{
      const rColors={admin:'#fbbf24',staff:'#6366f1',auditor:'#06b6d4'};
      const rc=rColors[u.role]||'#94a3b8';
      return el('tr',{},
        el('td',{style:'font-weight:600'},u.name),
        el('td',{style:'font-family:monospace;color:var(--muted2)'},u.username),
        el('td',{},el('span',{style:`background:${rc}22;color:${rc};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700`},u.role.toUpperCase())),
        el('td',{style:'color:var(--muted2)'},u.daily_target||50),
        el('td',{className:'td-muted'},fmtDay(u.createdAt)),
        el('td',{},el('div',{style:'display:flex;gap:4px'},
          el('button',{className:'btn btn-ghost btn-xs',onClick:()=>openEditUserModal(u,()=>renderTeam(container))},'✏️ Edit'),
          u.username!=='admin'?el('button',{className:'btn btn-danger btn-xs',onClick:async()=>{
            if(!confirm('Remove '+u.name+'?'))return;
            const r=await api.del('/users/'+u.id);
            if(r.ok)renderTeam(container);
            else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
          }},'🗑️'):null
        ))
      );
    }))
  ));
  container.appendChild(tw);
}

function openAddUserModal(onSave) {
  const mDiv=el('div',{});
  const nameInp=el('input',{type:'text',className:'inp',placeholder:'Full Name *'});
  const userInp=el('input',{type:'text',className:'inp',placeholder:'Username *'});
  const passInp=el('input',{type:'password',className:'inp',placeholder:'Password * (min 6)'});
  const roleSel=el('select',{className:'inp'});
  [['staff','Staff'],['admin','Admin'],['auditor','Auditor']].forEach(([v,l])=>roleSel.appendChild(el('option',{value:v},l)));
  const targetInp=el('input',{type:'number',className:'inp',value:'50'});
  const overlay=el('div',{className:'modal-overlay center',onClick:(e)=>{if(e.target===overlay)overlay.remove();}},
    el('div',{className:'modal center-modal'},
      el('div',{className:'modal-header'},el('span',{className:'modal-title'},'Add Team Member'),el('button',{className:'modal-close',onClick:()=>overlay.remove()},'✕')),
      mDiv,
      el('div',{className:'field'},el('label',{},'Full Name *'),nameInp),
      el('div',{className:'form-grid'},
        el('div',{className:'field',style:'margin:0'},el('label',{},'Username *'),userInp),
        el('div',{className:'field',style:'margin:0'},el('label',{},'Password *'),passInp)
      ),
      el('div',{className:'form-grid',style:'margin-top:10px'},
        el('div',{className:'field',style:'margin:0'},el('label',{},'Role'),roleSel),
        el('div',{className:'field',style:'margin:0'},el('label',{},'Daily Target'),targetInp)
      ),
      el('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:14px',onClick:async()=>{
        if(!nameInp.value||!userInp.value||!passInp.value){mDiv.className='alert alert-error';mDiv.textContent='All fields required.';return;}
        const r=await api.post('/users',{name:nameInp.value,username:userInp.value,password:passInp.value,role:roleSel.value,daily_target:parseInt(targetInp.value)||50});
        if(r.ok){overlay.remove();if(onSave)onSave();}
        else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
      }},'Add Member')
    )
  );
  document.body.appendChild(overlay);
}

function openEditUserModal(user, onSave) {
  const mDiv=el('div',{});
  const nameInp=el('input',{type:'text',className:'inp',value:user.name});
  const roleSel=el('select',{className:'inp'});
  [['staff','Staff'],['admin','Admin'],['auditor','Auditor']].forEach(([v,l])=>{const o=el('option',{value:v},l);if(v===user.role)o.selected=true;roleSel.appendChild(o);});
  const targetInp=el('input',{type:'number',className:'inp',value:user.daily_target||50});
  const passInp=el('input',{type:'password',className:'inp',placeholder:'New password (leave blank to keep)'});
  const overlay=el('div',{className:'modal-overlay center',onClick:(e)=>{if(e.target===overlay)overlay.remove();}},
    el('div',{className:'modal center-modal'},
      el('div',{className:'modal-header'},el('span',{className:'modal-title'},'Edit: '+user.name),el('button',{className:'modal-close',onClick:()=>overlay.remove()},'✕')),
      mDiv,
      el('div',{className:'field'},el('label',{},'Full Name'),nameInp),
      el('div',{className:'form-grid'},
        el('div',{className:'field',style:'margin:0'},el('label',{},'Role'),roleSel),
        el('div',{className:'field',style:'margin:0'},el('label',{},'Daily Target'),targetInp)
      ),
      el('div',{className:'field',style:'margin-top:10px'},el('label',{},'New Password (optional)'),passInp),
      el('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:14px',onClick:async()=>{
        const body={name:nameInp.value,role:roleSel.value,daily_target:parseInt(targetInp.value)||50};
        if(passInp.value)body.password=passInp.value;
        const r=await api.put('/users/'+user.id,body);
        if(r.ok){overlay.remove();if(onSave)onSave();}
        else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
      }},'Save Changes')
    )
  );
  document.body.appendChild(overlay);
}

// ── PASSWORD ──────────────────────────────────────────────────────
function renderPassword(container) {
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'🔐 Change Password'));
  const mDiv = el('div',{});
  const curInp = el('input',{type:'password',className:'inp',placeholder:'Current password'});
  const newInp = el('input',{type:'password',className:'inp',placeholder:'New password (min 6 chars)'});
  const conInp = el('input',{type:'password',className:'inp',placeholder:'Confirm new password'});
  const btn = el('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:4px',onClick:async()=>{
    if(!curInp.value||!newInp.value||!conInp.value){mDiv.className='alert alert-error';mDiv.textContent='All fields required.';return;}
    if(newInp.value!==conInp.value){mDiv.className='alert alert-error';mDiv.textContent='Passwords do not match.';return;}
    if(newInp.value.length<6){mDiv.className='alert alert-error';mDiv.textContent='Min 6 characters.';return;}
    btn.disabled=true;btn.textContent='Saving…';
    const r=await api.post('/change-password',{current_password:curInp.value,new_password:newInp.value});
    btn.disabled=false;btn.textContent='Update Password';
    if(r.ok){mDiv.className='alert alert-success';mDiv.textContent='✅ Password updated!';curInp.value='';newInp.value='';conInp.value='';}
    else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
  }},'Update Password');
  container.appendChild(el('div',{className:'card',style:'max-width:400px'},
    mDiv,
    el('div',{className:'field'},el('label',{},'Current Password'),curInp),
    el('div',{className:'field'},el('label',{},'New Password'),newInp),
    el('div',{className:'field'},el('label',{},'Confirm Password'),conInp),
    btn
  ));
}

// ── MY STATS (Staff) ──────────────────────────────────────────────
async function renderMyStats(container) {
  container.innerHTML = loading();
  const [statsR, invR] = await Promise.all([api.get('/leads/stats'), api.get('/invoices')]);
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'📊 My Stats'));
  const s = statsR.ok ? statsR : {total:0,byStatus:[],todayCalls:0,monthCalls:0};
  const byStatus = Object.fromEntries((s.byStatus||[]).map(x=>[x.status,parseInt(x.cnt)]));
  const invoices = invR.ok ? invR.data : [];
  const myPaid = invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+parseFloat(i.total||0),0);
  const convRate = s.total>0 ? ((byStatus['interested']||0)/s.total*100).toFixed(1) : 0;
  const grid = el('div',{className:'stats-grid',style:'margin-bottom:16px'});
  [{l:'Total Leads',v:s.total,c:'#6366f1'},{l:'Calls Today',v:s.todayCalls,c:'#3b82f6'},
   {l:'Month Calls',v:s.monthCalls,c:'#06b6d4'},{l:'Interested',v:byStatus['interested']||0,c:'#22c55e'},
   {l:'Conv Rate',v:convRate+'%',c:'#a78bfa'},{l:'My Revenue',v:fmt(myPaid),c:'#fbbf24'}
  ].forEach(k=>grid.appendChild(kpiCard(k.l,k.v,'',k.c)));
  container.appendChild(grid);
  const sCard = el('div',{className:'card'});
  sCard.appendChild(el('div',{className:'card-title'},'📋 Lead Status Breakdown'));
  CALL_STATUSES.forEach(cs=>{
    const cnt=byStatus[cs.value]||0;
    const pct=s.total>0?Math.round((cnt/s.total)*100):0;
    sCard.appendChild(el('div',{className:'progress-row'},
      el('div',{className:'progress-label',style:`color:${cs.color}`},cs.label),
      el('div',{className:'progress-bar-wrap'},el('div',{className:'progress-bar',style:`width:${pct}%;background:${cs.color}`})),
      el('div',{className:'progress-count'},cnt)
    ));
  });
  container.appendChild(sCard);
}

boot();
// ── HELPERS ──────────────────────────────────────────────────────
const loading = () => '<div class="loading-center"><div class="spinner"></div></div>';
const alertEl = (type, msg) => { const d = el('div',{className:`alert alert-${type}`},msg); return d; };
const sectionLabel = (text) => el('div',{style:'font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;margin-top:16px'},text);
const kpiCard = (label, val, sub, color) => el('div',{className:'stat-card',style:`border-top-color:${color}`},
  el('div',{className:'stat-num',style:`color:${color};font-size:${typeof val==='string'&&val.length>6?'16px':'28px'}`},String(val)),
  el('div',{className:'stat-label'},label),
  sub?el('div',{style:'color:var(--muted);font-size:11px;margin-top:2px'},sub):null
);

// ── DIALER ───────────────────────────────────────────────────────
async function renderDialer(container) {
  container.innerHTML = loading();
  const r = await api.get('/leads?status=pending&limit=1');
  container.innerHTML = '';
  const leads = r.ok ? r.data : [];
  if (!leads.length) {
    container.appendChild(el('div',{style:'text-align:center;padding:60px'},el('div',{style:'font-size:48px'},'🎉'),el('div',{style:'font-size:20px;font-weight:700;margin-top:12px'},'All calls done!'),el('p',{style:'color:var(--muted);margin-top:8px'},'No pending leads assigned to you.')));
    return;
  }
  let currentLead = leads[0], callCount = 0;
  const dialerWrap = el('div',{style:'max-width:500px;margin:0 auto'});
  container.appendChild(dialerWrap);
  showLead(currentLead);

  function showLead(lead) {
    dialerWrap.innerHTML = '';
    const s = CALL_MAP[lead.status||'pending'];
    let selectedStatus = '';
    const mDiv = el('div',{});
    const noteInp = el('textarea',{className:'inp',rows:2,placeholder:'Call notes…'});
    const cbRow = el('div',{style:'display:none'},el('div',{className:'field'},el('label',{},'Call-back Date'),el('input',{type:'date',className:'inp',id:'cb-date'})));
    const notIntRow = el('div',{style:'display:none'},el('div',{className:'field'},el('label',{},'Reason not interested'),el('textarea',{className:'inp',rows:2,placeholder:'Why? (helps improve)','id':'not-int-reason'})));

    const statusGrid = el('div',{className:'status-grid'});
    CALL_STATUSES.filter(s=>s.value!=='pending').forEach(s=>{
      const btn = el('button',{className:'status-btn',style:`color:${s.color};border-color:${s.color}44`,onClick:()=>{
        selectedStatus = s.value;
        statusGrid.querySelectorAll('.status-btn').forEach(b=>{b.style.background='var(--bg)';b.style.color=b.dataset.c;b.style.borderColor=b.dataset.c+'44';});
        btn.style.background=s.color;btn.style.color='#fff';btn.style.borderColor=s.color;
        cbRow.style.display = s.value==='callback'?'':'none';
        notIntRow.style.display = s.value==='not_interested'?'':'none';
      }},s.label);
      btn.dataset.c = s.color;
      statusGrid.appendChild(btn);
    });

    const saveBtn = el('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;font-size:15px;padding:12px',onClick:saveAndNext},'Save & Next →');
    const skipBtn = el('button',{className:'btn btn-ghost',style:'width:100%;justify-content:center;margin-top:8px',onClick:skipLead},'Skip this lead');

    const histDiv = el('div',{className:'call-history',style:'min-height:30px'});
    api.get('/leads/'+lead.id+'/logs').then(r=>{
      if (r.ok && r.data.length) r.data.forEach(log=>{
        const ls = CALL_MAP[log.status||'pending'];
        histDiv.appendChild(el('div',{className:'call-entry'},el('div',{className:'call-entry-top'},el('span',{style:`color:${ls.color};font-weight:600`},ls.label),el('span',{style:'color:var(--muted)'},fmtDate(log.call_date))),log.note?el('div',{className:'call-entry-note'},log.note):null));
      }); else histDiv.appendChild(el('p',{style:'color:var(--muted);font-size:12px'},'First call'));
    });

    async function saveAndNext() {
      if (!selectedStatus){mDiv.className='alert alert-error';mDiv.textContent='Select outcome!';return;}
      saveBtn.disabled=true;saveBtn.textContent='Saving…';
      const body = {status:selectedStatus,note:noteInp.value};
      const cbDate = document.getElementById('cb-date');
      const notInt = document.getElementById('not-int-reason');
      if (selectedStatus==='callback'&&cbDate?.value) body.callback_date=cbDate.value;
      if (selectedStatus==='not_interested'&&notInt?.value) body.not_converted_reason=notInt.value;
      const r = await api.post('/leads/'+lead.id+'/log',body);
      if (r.ok) {
        callCount++;
        if (r.newClient) { const msg=el('div',{className:'alert alert-success'},'⭐ Added to client pipeline!'); dialerWrap.prepend(msg); setTimeout(()=>msg.remove(),2500); }
        if (r.nextLead) { currentLead=r.nextLead; showLead(r.nextLead); }
        else { dialerWrap.innerHTML=''; dialerWrap.appendChild(el('div',{style:'text-align:center;padding:40px'},el('div',{style:'font-size:48px'},'🎉'),el('div',{style:'font-size:18px;font-weight:700;margin-top:12px'},'Session complete!'),el('p',{style:'color:var(--muted)'},'Calls this session: '+callCount))); }
      } else { mDiv.className='alert alert-error';mDiv.textContent=r.error;saveBtn.disabled=false;saveBtn.textContent='Save & Next →'; }
    }
    async function skipLead() {
      const r = await api.get('/leads/next?after_id='+lead.id);
      if (r.ok&&r.data){currentLead=r.data;showLead(r.data);}
      else{dialerWrap.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted)">No more pending leads.</div>';}
    }

    dialerWrap.appendChild(el('div',{style:'text-align:center;margin-bottom:16px'},
      el('div',{style:'color:var(--muted);font-size:11px;font-weight:600;margin-bottom:4px'},'CALL #'+(callCount+1)),
      el('div',{style:'font-size:22px;font-weight:800'},lead.name||'Unknown'),
      el('a',{href:`tel:${lead.phone}`,style:'display:block;font-size:28px;font-weight:800;color:var(--accent2);margin:8px 0;font-family:monospace;text-decoration:none;background:var(--bg2);border-radius:10px;padding:12px'},'📞 '+lead.phone),
      lead.city?el('div',{style:'color:var(--muted);font-size:12px'},'📍 '+lead.city):null,
      lead.category&&lead.category!=='other'?el('div',{style:'color:var(--accent2);font-size:12px;margin-top:2px'},catLabel(lead.category)):null
    ));
    dialerWrap.appendChild(el('div',{className:'card'},
      el('div',{style:'font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:10px'},'CALL OUTCOME'),
      mDiv,statusGrid,cbRow,notIntRow,
      el('div',{className:'field'},el('label',{},'Note'),noteInp),
      saveBtn,skipBtn,
      el('div',{style:'font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin:14px 0 8px'},'CALL HISTORY'),
      histDiv
    ));
  }
}

// ── MY LEADS (Staff) ─────────────────────────────────────────────
async function renderMyLeads(container) {
  container.innerHTML = loading();
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'📋 My Leads'));
  let statusFilter='all';
  const pills=el('div',{className:'status-pills'});
  [['all','All'],...CALL_STATUSES.map(s=>[s.value,s.label])].forEach(([v,l])=>{
    pills.appendChild(el('button',{className:'pill',style:statusFilter===v?'background:var(--accent);color:#fff':'',onClick:()=>{statusFilter=v;load();}},l));
  });
  container.appendChild(pills);
  const searchInp=el('input',{type:'search',className:'inp inp-sm',placeholder:'Search…',style:'margin-bottom:14px'});
  container.appendChild(searchInp);
  const listArea=el('div',{});container.appendChild(listArea);
  let activeModal=null;

  async function load(){
    listArea.innerHTML=loading();
    const params=new URLSearchParams({limit:200,status:statusFilter,search:searchInp.value});
    const r=await api.get('/leads?'+params);
    const leads=r.ok?r.data:[];
    listArea.innerHTML='';
    listArea.appendChild(el('p',{style:'color:var(--muted);font-size:12px;margin-bottom:8px'},leads.length+' leads'));
    if(!leads.length){listArea.appendChild(el('div',{style:'text-align:center;padding:40px;color:var(--muted)'},'No leads found.'));return;}
    const list=el('div',{className:'lead-list'});
    leads.forEach(lead=>{
      const s=CALL_MAP[lead.status||'pending'];
      const card=el('div',{className:'lead-card',style:`border-left-color:${s.color}`,onClick:()=>{
        if(activeModal)activeModal.remove();
        activeModal=renderCallModal(lead,()=>{if(activeModal){activeModal.remove();activeModal=null;}load();},()=>{if(activeModal){activeModal.remove();activeModal=null;}});
        document.body.appendChild(activeModal);
      }},
        el('div',{className:'lead-card-top'},
          el('div',{},el('div',{className:'lead-name'},lead.name||'Unknown'),el('div',{className:'lead-phone'},lead.phone||'—'),lead.city?el('div',{className:'lead-meta'},'📍 '+lead.city):null,lead.category&&lead.category!=='other'?el('div',{className:'lead-meta'},catLabel(lead.category)):null),
          callBadge(lead.status)
        ),
        lead.last_note?el('div',{className:'lead-note'},'📝 '+lead.last_note):null,
        lead.callback_date?el('div',{style:'color:#fbbf24;font-size:11px;margin-top:4px'},'📅 '+lead.callback_date):null
      );
      list.appendChild(card);
    });
    listArea.appendChild(list);
  }
  let t;searchInp.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(load,400);});
  load();
}

// ── CALL MODAL ───────────────────────────────────────────────────
function renderCallModal(lead, onSave, onClose) {
  let selectedStatus=lead.status||'pending';
  const cbRow=el('div',{style:'display:none'},el('div',{className:'field'},el('label',{},'Call-back Date'),el('input',{type:'date',className:'inp',id:'cm-cb-date',value:lead.callback_date||''})));
  const notIntRow=el('div',{style:'display:none'},el('div',{className:'field'},el('label',{},'Reason'),el('textarea',{className:'inp',rows:2,placeholder:'Why not interested?','id':'cm-ni-reason'})));
  const noteInp=el('textarea',{className:'inp',rows:2,placeholder:'Call notes…'});
  const mDiv=el('div',{});
  const histDiv=el('div',{className:'call-history'});
  api.get('/leads/'+lead.id+'/logs').then(r=>{
    if(r.ok&&r.data.length)r.data.forEach(log=>{const ls=CALL_MAP[log.status||'pending'];histDiv.appendChild(el('div',{className:'call-entry'},el('div',{className:'call-entry-top'},el('span',{style:`color:${ls.color};font-weight:600`},ls.label),el('span',{style:'color:var(--muted)'},fmtDate(log.call_date))),log.note?el('div',{className:'call-entry-note'},log.note):null));});
    else histDiv.appendChild(el('p',{style:'color:var(--muted);font-size:12px'},'No history'));
  });

  const statusGrid=el('div',{className:'status-grid'});
  CALL_STATUSES.filter(s=>s.value!=='pending').forEach(s=>{
    const btn=el('button',{className:'status-btn',style:`color:${s.color};border-color:${s.color}44${selectedStatus===s.value?`;background:${s.color};color:#fff;border-color:${s.color}`:''}`,onClick:()=>{
      selectedStatus=s.value;
      statusGrid.querySelectorAll('.status-btn').forEach(b=>{b.style.background='var(--bg)';b.style.color=b.dataset.c;b.style.borderColor=b.dataset.c+'44';});
      btn.style.background=s.color;btn.style.color='#fff';btn.style.borderColor=s.color;
      cbRow.style.display=s.value==='callback'?'':'none';
      notIntRow.style.display=s.value==='not_interested'?'':'none';
    }},s.label);
    btn.dataset.c=s.color;statusGrid.appendChild(btn);
  });

  const saveBtn=el('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:4px',onClick:async()=>{
    if(!selectedStatus||selectedStatus==='pending'){mDiv.className='alert alert-error';mDiv.textContent='Select outcome.';return;}
    saveBtn.disabled=true;saveBtn.textContent='Saving…';
    const body={status:selectedStatus,note:noteInp.value};
    const cbDate=document.getElementById('cm-cb-date');
    const niReason=document.getElementById('cm-ni-reason');
    if(selectedStatus==='callback'&&cbDate?.value)body.callback_date=cbDate.value;
    if(selectedStatus==='not_interested'&&niReason?.value)body.not_converted_reason=niReason.value;
    const r=await api.post('/leads/'+lead.id+'/log',body);
    if(r.ok){if(r.newClient){const msg=el('div',{className:'alert alert-success'},'⭐ Added to pipeline!');modal.querySelector('.modal').prepend(msg);setTimeout(()=>msg.remove(),2000);}onSave(lead);}
    else{mDiv.className='alert alert-error';mDiv.textContent=r.error;saveBtn.disabled=false;saveBtn.textContent='Save & Update';}
  }},'Save & Update');

  const modal=el('div',{className:'modal-overlay',onClick:(e)=>{if(e.target===modal)onClose();}},
    el('div',{className:'modal'},
      el('div',{className:'modal-header'},
        el('div',{},el('div',{style:'font-weight:700;font-size:17px'},lead.name||'Lead'),el('a',{href:`tel:${lead.phone}`,style:'color:var(--accent2);font-family:monospace;font-size:16px;text-decoration:none;display:block'},'📞 '+lead.phone),lead.city?el('div',{style:'color:var(--muted);font-size:12px'},'📍 '+lead.city):null,lead.category?el('div',{style:'color:var(--accent2);font-size:12px'},catLabel(lead.category)):null),
        el('button',{className:'modal-close',onClick:onClose},'✕')
      ),
      mDiv,
      el('div',{className:'field'},el('label',{},'Call Outcome'),statusGrid),
      cbRow,notIntRow,
      el('div',{className:'field'},el('label',{},'Note'),noteInp),
      lead.last_note?el('div',{className:'alert alert-info',style:'font-size:12px;margin-bottom:10px'},'Previous: '+lead.last_note):null,
      saveBtn,
      el('div',{style:'font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin:14px 0 8px'},'CALL HISTORY'),
      histDiv
    )
  );
  return modal;
}


// ── CLIENT MODAL ─────────────────────────────────────────────────
function openClientModal(client, users, onUpdate) {
  async function load() {
    const r = await api.get('/clients/'+client.id);
    if (!r.ok) return;
    const c=r.data; const activities=r.activities||[]; const tasks=r.tasks||[]; const invoices=r.invoices||[]; const proposals=r.proposals||[];
    const existing=document.getElementById('client-modal-overlay');
    if(existing)existing.remove();

    const stageSel=el('select',{className:'inp inp-sm'});
    PIPELINE_STAGES.forEach(s=>{const o=el('option',{value:s.value},s.label);if(s.value===c.pipeline_stage)o.selected=true;stageSel.appendChild(o);});
    const nextDate=el('input',{type:'date',className:'inp inp-sm',value:c.next_followup||''});
    const projVal=el('input',{type:'number',className:'inp inp-sm',value:c.project_value||0,placeholder:'Project value ₹'});
    const advVal=el('input',{type:'number',className:'inp inp-sm',value:c.advance_paid||0,placeholder:'Advance paid ₹'});
    const stageNote=el('input',{type:'text',className:'inp inp-sm',placeholder:'Note about stage change…'});
    const mDiv=el('div',{});

    const actType=el('select',{className:'inp inp-sm'});
    ACTIVITY_TYPES.forEach(a=>actType.appendChild(el('option',{value:a.value},a.label)));
    const actTitle=el('input',{type:'text',className:'inp inp-sm',placeholder:'Title'});
    const actDesc=el('textarea',{className:'inp inp-sm',rows:2,placeholder:'Details…'});
    const actAmount=el('input',{type:'number',className:'inp inp-sm',placeholder:'Amount ₹ (for payments)'});
    const actNextDate=el('input',{type:'date',className:'inp inp-sm'});

    const timeline=el('div',{className:'timeline'});
    activities.forEach(act=>{
      const at=ACT_MAP[act.type]||{label:act.type,color:'#94a3b8'};
      timeline.appendChild(el('div',{className:'timeline-item'},
        el('div',{className:'timeline-dot',style:`border-color:${at.color};color:${at.color}`},at.label.slice(0,2)),
        el('div',{className:'timeline-content'},
          el('div',{className:'timeline-header'},el('div',{className:'timeline-title'},act.title||at.label),el('div',{className:'timeline-date'},fmtDate(act.date)+(act.user?' · '+act.user.name:''))),
          act.description?el('div',{className:'timeline-desc'},act.description):null,
          act.amount?el('div',{style:'color:#4ade80;font-size:12px;margin-top:4px;font-weight:600'},'💰 '+fmt(act.amount)):null
        )
      ));
    });
    if(!activities.length)timeline.appendChild(el('p',{style:'color:var(--muted);font-size:13px'},'No activity yet.'));

    const overlay=el('div',{id:'client-modal-overlay',className:'modal-overlay center',onClick:(e)=>{if(e.target===overlay)overlay.remove();}},
      el('div',{className:'modal center-modal wide-modal'},
        el('div',{className:'modal-header'},
          el('div',{},
            el('div',{style:'font-weight:800;font-size:18px'},c.name+(c.company?' — '+c.company:'')),
            el('div',{style:'display:flex;gap:8px;align-items:center;margin-top:6px'},stageBadge(c.pipeline_stage),el('span',{style:'color:var(--muted);font-size:12px'},catLabel(c.category)+(c.source?' · '+c.source:'')))
          ),
          el('button',{className:'modal-close',onClick:()=>overlay.remove()},'✕')
        ),
        mDiv,
        // Client quick info
        el('div',{style:'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:16px'},
          el('div',{},el('div',{style:'font-size:11px;color:var(--muted)'},'PHONE'),el('a',{href:`tel:${c.phone}`,style:'color:var(--accent2);font-family:monospace;text-decoration:none;font-size:14px'},c.phone||'—')),
          el('div',{},el('div',{style:'font-size:11px;color:var(--muted)'},'PROJECT VALUE'),el('div',{style:'font-weight:700;color:#4ade80;font-size:15px'},fmt(c.project_value))),
          el('div',{},el('div',{style:'font-size:11px;color:var(--muted)'},'RECEIVED'),el('div',{style:'font-weight:700;color:#22c55e;font-size:15px'},fmt(c.total_received))),
          el('div',{},el('div',{style:'font-size:11px;color:var(--muted)'},'ADVANCE'),el('div',{style:'font-weight:700;color:#fb923c;font-size:15px'},fmt(c.advance_paid))),
          c.website?el('div',{},el('div',{style:'font-size:11px;color:var(--muted)'},'WEBSITE'),el('a',{href:c.website,target:'_blank',style:'color:var(--accent2);font-size:12px;text-decoration:none'},c.website.slice(0,30))):null
        ),
        // WhatsApp quick send
        el('div',{style:'margin-bottom:14px'},
          el('button',{className:'btn btn-success btn-sm',style:'background:rgba(37,211,102,0.15);color:#25d166;border:1px solid rgba(37,211,102,0.3)',onClick:()=>openWhatsAppModal(c.phone,c.id,c.name,()=>load())},'📱 Send WhatsApp')
        ),
        // Stage update
        el('div',{className:'card',style:'margin-bottom:14px'},
          el('div',{className:'card-title',style:'margin-bottom:10px'},'Update Pipeline Stage'),
          el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px'},
            el('div',{},el('label',{style:'display:block;font-size:11px;color:var(--muted);margin-bottom:4px'},'Stage'),stageSel),
            el('div',{},el('label',{style:'display:block;font-size:11px;color:var(--muted);margin-bottom:4px'},'Next Follow-up'),nextDate)
          ),
          el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px'},
            el('div',{},el('label',{style:'display:block;font-size:11px;color:var(--muted);margin-bottom:4px'},'Project Value ₹'),projVal),
            el('div',{},el('label',{style:'display:block;font-size:11px;color:var(--muted);margin-bottom:4px'},'Advance Paid ₹'),advVal)
          ),
          stageNote,
          el('button',{className:'btn btn-primary btn-sm',style:'margin-top:8px',onClick:async()=>{
            await api.put('/clients/'+c.id,{pipeline_stage:stageSel.value,stage_note:stageNote.value,next_followup:nextDate.value||null,project_value:parseFloat(projVal.value)||0,advance_paid:parseFloat(advVal.value)||0});
            if(onUpdate)onUpdate();load();
          }},'Save Stage Update')
        ),
        // Add activity
        el('div',{className:'card',style:'margin-bottom:14px'},
          el('div',{className:'card-title',style:'margin-bottom:10px'},'Add Activity / Update'),
          el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px'},
            el('div',{},el('label',{style:'display:block;font-size:11px;color:var(--muted);margin-bottom:4px'},'Type'),actType),
            el('div',{},el('label',{style:'display:block;font-size:11px;color:var(--muted);margin-bottom:4px'},'Title'),actTitle)
          ),actDesc,
          el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0'},
            el('div',{},el('label',{style:'display:block;font-size:11px;color:var(--muted);margin-bottom:4px'},'Amount ₹'),actAmount),
            el('div',{},el('label',{style:'display:block;font-size:11px;color:var(--muted);margin-bottom:4px'},'Next Follow-up Date'),actNextDate)
          ),
          el('button',{className:'btn btn-success btn-sm',onClick:async()=>{
            if(!actTitle.value){mDiv.className='alert alert-error';mDiv.textContent='Enter title.';return;}
            await api.post('/clients/'+c.id+'/activity',{type:actType.value,title:actTitle.value,description:actDesc.value,amount:parseFloat(actAmount.value)||null,next_date:actNextDate.value||null});
            actTitle.value='';actDesc.value='';actAmount.value='';
            if(onUpdate)onUpdate();load();
          }},'+ Add Activity')
        ),
        // Timeline
        el('div',{style:'font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:12px'},'ACTIVITY TIMELINE'),
        timeline
      )
    );
    document.body.appendChild(overlay);
  }
  load();
}

// ── PIPELINE ─────────────────────────────────────────────────────
async function renderPipeline(container) {
  container.innerHTML = loading();
  const [clientsR, usersR] = await Promise.all([api.get('/clients?limit=300'), api.get('/users')]);
  const clients = clientsR.ok ? clientsR.data : [];
  const users = usersR.ok ? usersR.data : [];
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'📊 Sales Pipeline'));

  // Stage summary
  const byStage = {};
  clients.forEach(c=>{byStage[c.pipeline_stage]=(byStage[c.pipeline_stage]||0)+1;});
  const summaryRow = el('div',{style:'display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;margin-bottom:16px'});
  PIPELINE_STAGES.forEach(s=>{
    if (!byStage[s.value]) return;
    summaryRow.appendChild(el('div',{style:`flex-shrink:0;background:var(--bg3);border:1px solid ${s.color}44;border-radius:8px;padding:8px 14px;border-top:2px solid ${s.color}`},
      el('div',{style:`font-size:20px;font-weight:800;color:${s.color}`},String(byStage[s.value])),
      el('div',{style:'font-size:11px;color:var(--muted);margin-top:2px;white-space:nowrap'},s.label)
    ));
  });
  container.appendChild(el('div',{style:'overflow-x:auto'},summaryRow));

  // Filters
  const searchInp = el('input',{type:'search',className:'inp inp-sm',placeholder:'Search clients…',style:'flex:1;min-width:180px'});
  const stageSel = el('select',{className:'inp inp-sm'});
  [['all','All Stages'],...PIPELINE_STAGES.map(s=>[s.value,s.label])].forEach(([v,l])=>stageSel.appendChild(el('option',{value:v},l)));
  const catSel = el('select',{className:'inp inp-sm'});
  [['all','All Categories'],...CATEGORIES.map(c=>[c.value,c.label])].forEach(([v,l])=>catSel.appendChild(el('option',{value:v},l)));
  const staffSel = el('select',{className:'inp inp-sm'});
  [['all','All Staff'],...users.filter(u=>u.role==='staff').map(u=>[u.id,u.name])].forEach(([v,l])=>staffSel.appendChild(el('option',{value:v},l)));
  container.appendChild(el('div',{className:'filters-bar'},searchInp,stageSel,catSel,staffSel));

  const listArea = el('div',{});container.appendChild(listArea);
  let filters={search:'',stage:'all',cat:'all',staff:'all'};

  function renderList(){
    const filtered=clients.filter(c=>{
      if(filters.search&&![c.name,c.company,c.phone].some(v=>v&&v.toLowerCase().includes(filters.search.toLowerCase())))return false;
      if(filters.stage!=='all'&&c.pipeline_stage!==filters.stage)return false;
      if(filters.cat!=='all'&&c.category!==filters.cat)return false;
      if(filters.staff!=='all'&&c.assigned_to!=filters.staff)return false;
      return true;
    });
    listArea.innerHTML='';
    listArea.appendChild(el('p',{style:'color:var(--muted);font-size:12px;margin-bottom:10px'},filtered.length+' clients'));
    const tw=el('div',{className:'table-wrap'},el('table',{},
      el('thead',{},el('tr',{},...['Client','Category','Stage','Value','Received','Staff','Action'].map(h=>el('th',{},h)))),
      el('tbody',{},...filtered.map(c=>{
        const staff=users.find(u=>u.id===c.assigned_to);
        const tr=el('tr',{style:'cursor:pointer',onClick:()=>openClientModal(c,users,()=>renderPipeline(container))},
          el('td',{},el('div',{className:'td-name'},c.name),el('div',{className:'td-muted'},c.company||c.phone||'')),
          el('td',{style:'font-size:12px;color:var(--muted2)'},catLabel(c.category)),
          el('td',{}),
          el('td',{style:'color:#4ade80;font-weight:600;font-size:13px'},fmt(c.project_value)),
          el('td',{style:'color:#22c55e;font-size:13px'},fmt(c.total_received)),
          el('td',{className:'td-muted'},staff?staff.name:'—'),
          el('td',{},el('button',{className:'btn btn-ghost btn-xs',onClick:(e)=>{e.stopPropagation();openClientModal(c,users,()=>renderPipeline(container));}},'View'))
        );
        tr.children[2].appendChild(stageBadge(c.pipeline_stage));
        return tr;
      }))
    ));
    listArea.appendChild(tw);
  }

  let st;searchInp.addEventListener('input',()=>{clearTimeout(st);st=setTimeout(()=>{filters.search=searchInp.value;renderList();},300);});
  stageSel.addEventListener('change',()=>{filters.stage=stageSel.value;renderList();});
  catSel.addEventListener('change',()=>{filters.cat=catSel.value;renderList();});
  staffSel.addEventListener('change',()=>{filters.staff=staffSel.value;renderList();});
  renderList();
}

// ── ALL CLIENTS ──────────────────────────────────────────────────
async function renderAllClients(container) {
  container.innerHTML = loading();
  const [clientsR, usersR] = await Promise.all([api.get('/clients?limit=300'), api.get('/users')]);
  const clients = clientsR.ok ? clientsR.data : [];
  const users = usersR.ok ? usersR.data : [];
  container.innerHTML = '';
  container.appendChild(el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px'},
    el('div',{className:'page-title',style:'margin:0'},'👥 All Clients'),
    el('button',{className:'btn btn-ghost btn-sm',onClick:()=>{window.location.href='/api/export/clients';}},'📥 Export Excel')
  ));
  const addBtn=el('button',{className:'btn btn-primary',style:'margin-bottom:14px',onClick:()=>openAddClientModal(users,()=>renderAllClients(container))},'+  Add Client Manually');
  container.appendChild(addBtn);
  const searchInp=el('input',{type:'search',className:'inp inp-sm',placeholder:'Search…',style:'flex:1;min-width:180px'});
  const stageSel=el('select',{className:'inp inp-sm'});
  [['all','All Stages'],...PIPELINE_STAGES.map(s=>[s.value,s.label])].forEach(([v,l])=>stageSel.appendChild(el('option',{value:v},l)));
  container.appendChild(el('div',{className:'filters-bar'},searchInp,stageSel));
  const listArea=el('div',{});container.appendChild(listArea);
  let filters={search:'',stage:'all'};
  function renderList(){
    const filtered=clients.filter(c=>{
      if(filters.search&&![c.name,c.company,c.phone].some(v=>v&&v.toLowerCase().includes(filters.search.toLowerCase())))return false;
      if(filters.stage!=='all'&&c.pipeline_stage!==filters.stage)return false;
      return true;
    });
    listArea.innerHTML='';
    const tw=el('div',{className:'table-wrap'},el('table',{},
      el('thead',{},el('tr',{},...['Client','Phone','Category','Stage','Value','Received','Action'].map(h=>el('th',{},h)))),
      el('tbody',{},...filtered.map(c=>{
        const tr=el('tr',{style:'cursor:pointer',onClick:()=>openClientModal(c,users,()=>renderAllClients(container))},
          el('td',{},el('div',{className:'td-name'},c.name),el('div',{className:'td-muted'},c.company||'')),
          el('td',{className:'td-muted',style:'font-family:monospace'},c.phone||'—'),
          el('td',{style:'font-size:12px;color:var(--muted2)'},catLabel(c.category)),
          el('td',{}),
          el('td',{style:'color:#4ade80;font-weight:600'},fmt(c.project_value)),
          el('td',{style:'color:#22c55e'},fmt(c.total_received)),
          el('td',{},el('button',{className:'btn btn-ghost btn-xs',onClick:(e)=>{e.stopPropagation();openClientModal(c,users,()=>renderAllClients(container));}},'View'))
        );
        tr.children[3].appendChild(stageBadge(c.pipeline_stage));
        return tr;
      }))
    ));
    listArea.appendChild(tw);
    listArea.appendChild(el('p',{style:'color:var(--muted);font-size:12px;margin-top:8px'},filtered.length+' clients'));
  }
  let st;searchInp.addEventListener('input',()=>{clearTimeout(st);st=setTimeout(()=>{filters.search=searchInp.value;renderList();},300);});
  stageSel.addEventListener('change',()=>{filters.stage=stageSel.value;renderList();});
  renderList();
}

function openAddClientModal(users, onSave) {
  const fields={name:el('input',{type:'text',className:'inp',placeholder:'Client Name *'}),company:el('input',{type:'text',className:'inp',placeholder:'Company'}),phone:el('input',{type:'tel',className:'inp',placeholder:'Phone'}),email:el('input',{type:'email',className:'inp',placeholder:'Email'}),city:el('input',{type:'text',className:'inp',placeholder:'City'})};
  const catSel=el('select',{className:'inp'});CATEGORIES.forEach(c=>catSel.appendChild(el('option',{value:c.value},c.label)));
  const stageSel=el('select',{className:'inp'});PIPELINE_STAGES.forEach(s=>stageSel.appendChild(el('option',{value:s.value},s.label)));
  const staffSel=el('select',{className:'inp'});staffSel.appendChild(el('option',{value:''},'Assign to…'));users.filter(u=>u.role==='staff').forEach(u=>staffSel.appendChild(el('option',{value:u.id},u.name)));
  const projVal=el('input',{type:'number',className:'inp',placeholder:'Project Value ₹'});
  const srcSel=el('select',{className:'inp'});[['cold_call','Cold Call'],['ads','Ads'],['referral','Referral'],['audit','Audit'],['manual','Manual']].forEach(([v,l])=>srcSel.appendChild(el('option',{value:v},l)));
  const notes=el('textarea',{className:'inp',rows:2,placeholder:'Notes…'});
  const mDiv=el('div',{});
  const overlay=el('div',{className:'modal-overlay center',onClick:(e)=>{if(e.target===overlay)overlay.remove();}},
    el('div',{className:'modal center-modal wide-modal'},
      el('div',{className:'modal-header'},el('span',{className:'modal-title'},'Add Client'),el('button',{className:'modal-close',onClick:()=>overlay.remove()},'✕')),
      mDiv,
      el('div',{className:'form-grid'},el('div',{className:'field',style:'margin:0'},el('label',{},'Name *'),fields.name),el('div',{className:'field',style:'margin:0'},el('label',{},'Company'),fields.company),el('div',{className:'field',style:'margin:0'},el('label',{},'Phone'),fields.phone),el('div',{className:'field',style:'margin:0'},el('label',{},'Email'),fields.email),el('div',{className:'field',style:'margin:0'},el('label',{},'City'),fields.city),el('div',{className:'field',style:'margin:0'},el('label',{},'Project Value ₹'),projVal)),
      el('div',{style:'display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-top:10px'},el('div',{className:'field',style:'margin:0'},el('label',{},'Category'),catSel),el('div',{className:'field',style:'margin:0'},el('label',{},'Stage'),stageSel),el('div',{className:'field',style:'margin:0'},el('label',{},'Source'),srcSel),el('div',{className:'field',style:'margin:0'},el('label',{},'Assign to'),staffSel)),
      el('div',{className:'field',style:'margin-top:10px'},el('label',{},'Notes'),notes),
      el('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:4px',onClick:async()=>{
        if(!fields.name.value){mDiv.className='alert alert-error';mDiv.textContent='Name required.';return;}
        const r=await api.post('/clients',{name:fields.name.value,company:fields.company.value,phone:fields.phone.value,email:fields.email.value,city:fields.city.value,category:catSel.value,pipeline_stage:stageSel.value,source:srcSel.value,assigned_to:staffSel.value?parseInt(staffSel.value):null,project_value:parseFloat(projVal.value)||0,notes:notes.value});
        if(r.ok){overlay.remove();if(onSave)onSave();}else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
      }},'Add Client')
    )
  );
  document.body.appendChild(overlay);
}

// ── MY CLIENTS (Staff) ───────────────────────────────────────────
async function renderMyClients(container) {
  container.innerHTML = loading();
  const [clientsR, usersR] = await Promise.all([api.get('/clients?limit=200'), api.get('/users')]);
  const clients = clientsR.ok ? clientsR.data : [];
  const users = usersR.ok ? usersR.data : [];
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'👥 My Clients'));
  const addBtn=el('button',{className:'btn btn-primary',style:'margin-bottom:14px',onClick:()=>openAddClientModal(users,()=>renderMyClients(container))},'+  Add Client');
  container.appendChild(addBtn);
  if (!clients.length){container.appendChild(el('p',{style:'color:var(--muted)'},'No clients yet. When a lead is marked Interested, they appear here.'));return;}
  const list=el('div',{className:'lead-list'});
  clients.forEach(c=>{
    const s=STAGE_MAP[c.pipeline_stage]||{color:'#94a3b8'};
    list.appendChild(el('div',{className:'lead-card',style:`border-left-color:${s.color}`,onClick:()=>openClientModal(c,users,()=>renderMyClients(container))},
      el('div',{className:'lead-card-top'},
        el('div',{},el('div',{className:'lead-name'},c.name+(c.company?' — '+c.company:'')),el('div',{className:'lead-phone'},c.phone||'—'),el('div',{className:'lead-meta'},catLabel(c.category))),
        stageBadge(c.pipeline_stage)
      ),
      el('div',{style:'display:flex;gap:16px;margin-top:8px;font-size:12px'},el('span',{style:'color:#4ade80'},'Value: '+fmt(c.project_value)),el('span',{style:'color:#22c55e'},'Received: '+fmt(c.total_received))),
      c.next_followup?el('div',{style:'color:#fbbf24;font-size:11px;margin-top:4px'},'📅 Follow-up: '+fmtDay(c.next_followup)):null
    ));
  });
  container.appendChild(list);
}

// ── FOLLOW-UPS ───────────────────────────────────────────────────
async function renderFollowups(container) {
  container.innerHTML = loading();
  const [leadsR, clientsR, usersR] = await Promise.all([api.get('/leads?status=callback&limit=300'), api.get('/clients?limit=300'), api.get('/users')]);
  const leads = leadsR.ok ? leadsR.data : [];
  const clients = clientsR.ok ? clientsR.data : [];
  const users = usersR.ok ? usersR.data : [];
  const today = new Date().toISOString().slice(0,10);
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'🔔 Follow-ups'));
  let activeModal=null;

  function section(title,items,renderFn) {
    const sec=el('div',{style:'margin-bottom:24px'},el('div',{style:'font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:8px'},title+' ('+items.length+')'));
    if(!items.length){sec.appendChild(el('p',{style:'color:var(--muted);font-size:13px'},'None'));return sec;}
    const list=el('div',{className:'lead-list'});items.forEach(item=>list.appendChild(renderFn(item)));sec.appendChild(list);return sec;
  }

  const callOverdue=leads.filter(l=>l.callback_date&&l.callback_date<today);
  const callToday=leads.filter(l=>l.callback_date===today);
  const clientDue=clients.filter(c=>c.next_followup&&c.next_followup<=today&&!['completed','lost'].includes(c.pipeline_stage));
  const upcoming=clients.filter(c=>c.next_followup&&c.next_followup>today&&!['completed','lost'].includes(c.pipeline_stage));

  container.appendChild(section('🔴 Overdue Callbacks',callOverdue,l=>{
    const card=el('div',{className:'lead-card',style:'border-left-color:#ef4444',onClick:()=>{if(activeModal)activeModal.remove();activeModal=renderCallModal(l,()=>{if(activeModal){activeModal.remove();activeModal=null;}renderFollowups(container);},()=>{if(activeModal){activeModal.remove();activeModal=null;}});document.body.appendChild(activeModal);}});
    card.appendChild(el('div',{className:'lead-card-top'},el('div',{},el('div',{className:'lead-name'},l.name),el('div',{className:'lead-phone'},l.phone)),el('div',{style:'text-align:right'},callBadge(l.status),el('div',{style:'color:#ef4444;font-size:11px;margin-top:3px'},'📅 '+l.callback_date))));
    if(l.last_note)card.appendChild(el('div',{className:'lead-note'},'📝 '+l.last_note));
    return card;
  }));

  container.appendChild(section('🟡 Callbacks Today',callToday,l=>{
    const card=el('div',{className:'lead-card',style:'border-left-color:#fbbf24',onClick:()=>{if(activeModal)activeModal.remove();activeModal=renderCallModal(l,()=>{if(activeModal){activeModal.remove();activeModal=null;}renderFollowups(container);},()=>{if(activeModal){activeModal.remove();activeModal=null;}});document.body.appendChild(activeModal);}});
    card.appendChild(el('div',{className:'lead-card-top'},el('div',{},el('div',{className:'lead-name'},l.name),el('div',{className:'lead-phone'},l.phone)),callBadge(l.status)));
    return card;
  }));

  container.appendChild(section('🟠 Client Follow-ups Due',clientDue,c=>{
    const card=el('div',{className:'lead-card',style:'border-left-color:#fb923c',onClick:()=>openClientModal(c,users,()=>renderFollowups(container))});
    card.appendChild(el('div',{className:'lead-card-top'},el('div',{},el('div',{className:'lead-name'},c.name+(c.company?' — '+c.company:'')),el('div',{className:'lead-meta'},catLabel(c.category))),el('div',{style:'text-align:right'},stageBadge(c.pipeline_stage),el('div',{style:'color:#fb923c;font-size:11px;margin-top:3px'},'📅 '+fmtDay(c.next_followup)))));
    return card;
  }));

  container.appendChild(section('🟢 Upcoming Follow-ups',upcoming.slice(0,20),c=>{
    const card=el('div',{className:'lead-card',style:'border-left-color:#22c55e',onClick:()=>openClientModal(c,users,()=>renderFollowups(container))});
    card.appendChild(el('div',{className:'lead-card-top'},el('div',{},el('div',{className:'lead-name'},c.name+(c.company?' — '+c.company:'')),el('div',{className:'lead-meta'},catLabel(c.category))),el('div',{style:'text-align:right'},stageBadge(c.pipeline_stage),el('div',{style:'color:#22c55e;font-size:11px;margin-top:3px'},'📅 '+fmtDay(c.next_followup)))));
    return card;
  }));
}


// ── TASKS ─────────────────────────────────────────────────────────
async function renderTasks(container) {
  container.innerHTML = loading();
  const [tasksR, usersR, clientsR] = await Promise.all([api.get('/tasks'), api.get('/users'), api.get('/clients?limit=200')]);
  const tasks = tasksR.ok ? tasksR.data : [];
  const users = usersR.ok ? usersR.data : [];
  const clients = clientsR.ok ? clientsR.data : [];
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'✅ Tasks'));

  const pending=tasks.filter(t=>t.status==='pending').length;
  const inProg=tasks.filter(t=>t.status==='in_progress').length;
  const done=tasks.filter(t=>t.status==='done').length;
  const today=new Date().toISOString().slice(0,10);
  const overdue=tasks.filter(t=>t.due_date&&t.due_date<today&&t.status!=='done').length;
  const grid=el('div',{className:'stats-grid'});
  [{l:'Pending',v:pending,c:'#f59e0b'},{l:'In Progress',v:inProg,c:'#6366f1'},{l:'Done',v:done,c:'#22c55e'},{l:'Overdue ⚠',v:overdue,c:'#ef4444'}].forEach(k=>grid.appendChild(kpiCard(k.l,k.v,'',k.c)));
  container.appendChild(grid);

  if (STATE.user.role==='admin') {
    container.appendChild(el('button',{className:'btn btn-primary',style:'margin-bottom:14px',onClick:()=>openAddTaskModal(users,clients,()=>renderTasks(container))},'+  Add Task'));
  }

  const statusSel=el('select',{className:'inp inp-sm',style:'margin-bottom:14px'});
  [['all','All Tasks'],['pending','Pending'],['in_progress','In Progress'],['done','Done'],['cancelled','Cancelled']].forEach(([v,l])=>statusSel.appendChild(el('option',{value:v},l)));
  container.appendChild(statusSel);
  const listArea=el('div',{});container.appendChild(listArea);

  function renderList(filtered) {
    listArea.innerHTML='';
    if(!filtered.length){listArea.appendChild(el('div',{style:'text-align:center;padding:40px;color:var(--muted)'},'No tasks found.'));return;}
    const pColors={low:'#94a3b8',medium:'#6366f1',high:'#f59e0b',urgent:'#ef4444'};
    const sColors={pending:'#f59e0b',in_progress:'#6366f1',done:'#22c55e',cancelled:'#94a3b8'};
    filtered.forEach(t=>{
      const pc=pColors[t.priority]||'#94a3b8';const sc=sColors[t.status]||'#94a3b8';
      const isOverdue=t.due_date&&t.due_date<today&&t.status!=='done';
      listArea.appendChild(el('div',{style:`background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:8px;border-left:3px solid ${pc}`},
        el('div',{style:'display:flex;justify-content:space-between;align-items:flex-start;gap:10px'},
          el('div',{style:'flex:1'},
            el('div',{style:`font-weight:700;font-size:14px;${t.status==='done'?'text-decoration:line-through;opacity:0.5':''}`},t.title),
            t.description?el('div',{style:'color:var(--muted2);font-size:12px;margin-top:3px'},t.description):null,
            el('div',{style:'display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;align-items:center'},
              el('span',{style:`background:${pc}22;color:${pc};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600`},t.priority.toUpperCase()),
              el('span',{style:`background:${sc}22;color:${sc};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600`},t.status.replace('_',' ').toUpperCase()),
              t.assignedTo?el('span',{style:'color:var(--muted);font-size:11px'},'→ '+t.assignedTo.name):null,
              t.Client?el('span',{style:'color:var(--accent2);font-size:11px'},'📋 '+t.Client.name):null,
              t.due_date?el('span',{style:`color:${isOverdue?'#ef4444':'var(--muted)'};font-size:11px`},(isOverdue?'⚠️ OVERDUE: ':'📅 ')+fmtDay(t.due_date)):null
            )
          ),
          el('div',{style:'display:flex;gap:6px;flex-shrink:0'},
            t.status!=='done'?el('button',{className:'btn btn-success btn-xs',onClick:async()=>{await api.put('/tasks/'+t.id,{status:'done'});renderTasks(container);}},'✓ Done'):null,
            el('button',{className:'btn btn-danger btn-xs',onClick:async()=>{if(!confirm('Delete?'))return;await api.del('/tasks/'+t.id);renderTasks(container);}},'Del')
          )
        )
      ));
    });
  }

  statusSel.addEventListener('change',()=>{const v=statusSel.value;renderList(v==='all'?tasks:tasks.filter(t=>t.status===v));});
  renderList(tasks);
}

function openAddTaskModal(users, clients, onSave) {
  const mDiv=el('div',{});
  const titleInp=el('input',{type:'text',className:'inp',placeholder:'Task title *'});
  const descInp=el('textarea',{className:'inp',rows:2,placeholder:'Description'});
  const assignSel=el('select',{className:'inp'});users.forEach(u=>assignSel.appendChild(el('option',{value:u.id},u.name+' ('+u.role+')')));
  const priSel=el('select',{className:'inp'});[['low','🟢 Low'],['medium','🔵 Medium'],['high','🟡 High'],['urgent','🔴 Urgent']].forEach(([v,l])=>priSel.appendChild(el('option',{value:v},l)));priSel.value='medium';
  const dueInp=el('input',{type:'date',className:'inp'});
  const clientSel=el('select',{className:'inp'});clientSel.appendChild(el('option',{value:''},'No client (optional)'));clients.forEach(c=>clientSel.appendChild(el('option',{value:c.id},c.name+(c.company?' — '+c.company:''))));
  const overlay=el('div',{className:'modal-overlay center',onClick:(e)=>{if(e.target===overlay)overlay.remove();}},
    el('div',{className:'modal center-modal'},
      el('div',{className:'modal-header'},el('span',{className:'modal-title'},'Add Task'),el('button',{className:'modal-close',onClick:()=>overlay.remove()},'✕')),
      mDiv,
      el('div',{className:'field'},el('label',{},'Title *'),titleInp),
      el('div',{className:'field'},el('label',{},'Description'),descInp),
      el('div',{className:'form-grid'},el('div',{className:'field',style:'margin:0'},el('label',{},'Assign To'),assignSel),el('div',{className:'field',style:'margin:0'},el('label',{},'Priority'),priSel)),
      el('div',{className:'form-grid',style:'margin-top:10px'},el('div',{className:'field',style:'margin:0'},el('label',{},'Due Date'),dueInp),el('div',{className:'field',style:'margin:0'},el('label',{},'Linked Client'),clientSel)),
      el('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:14px',onClick:async()=>{
        if(!titleInp.value){mDiv.className='alert alert-error';mDiv.textContent='Title required.';return;}
        const r=await api.post('/tasks',{title:titleInp.value,description:descInp.value,assigned_to:parseInt(assignSel.value),priority:priSel.value,due_date:dueInp.value||null,client_id:clientSel.value?parseInt(clientSel.value):null});
        if(r.ok){overlay.remove();if(onSave)onSave();}else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
      }},'Add Task')
    )
  );
  document.body.appendChild(overlay);
}

// ── INVOICES ─────────────────────────────────────────────────────
async function renderInvoices(container) {
  container.innerHTML = loading();
  const [invR, clientsR] = await Promise.all([api.get('/invoices'), api.get('/clients?limit=200')]);
  const invoices = invR.ok ? invR.data : [];
  const clients = clientsR.ok ? clientsR.data : [];
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'🧾 Invoices'));

  const totalPaid=invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+parseFloat(i.total||0),0);
  const totalPending=invoices.filter(i=>i.status==='sent').reduce((s,i)=>s+parseFloat(i.total||0),0);
  const grid=el('div',{className:'stats-grid'});
  [{l:'Total Paid',v:fmt(totalPaid),c:'#22c55e'},{l:'Pending Payment',v:fmt(totalPending),c:'#f59e0b'},{l:'Total Invoices',v:invoices.length,c:'#6366f1'},{l:'Paid Count',v:invoices.filter(i=>i.status==='paid').length,c:'#4ade80'}].forEach(k=>grid.appendChild(kpiCard(k.l,k.v,'',k.c)));
  container.appendChild(grid);
  container.appendChild(el('button',{className:'btn btn-primary',style:'margin-bottom:14px',onClick:()=>openCreateInvoiceModal(clients,()=>renderInvoices(container))},'+  Create Invoice'));

  const tw=el('div',{className:'table-wrap'},el('table',{},
    el('thead',{},el('tr',{},...['Invoice No','Client','Amount','GST','Total','Status','Due','Actions'].map(h=>el('th',{},h)))),
    el('tbody',{},...invoices.map(inv=>{
      const sColors={draft:'#94a3b8',sent:'#f59e0b',paid:'#22c55e',cancelled:'#ef4444'};
      const sc=sColors[inv.status]||'#94a3b8';
      return el('tr',{},
        el('td',{style:'font-family:monospace;font-weight:600;color:var(--accent2)'},inv.invoice_no),
        el('td',{className:'td-name'},inv.Client?inv.Client.name:'—'),
        el('td',{style:'color:var(--muted2)'},fmt(inv.subtotal)),
        el('td',{style:'color:var(--muted)'},fmt(inv.gst_amount)+' ('+inv.gst_percent+'%)'),
        el('td',{style:'color:#4ade80;font-weight:700'},fmt(inv.total)),
        el('td',{},el('span',{style:`background:${sc}22;color:${sc};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600`},inv.status.toUpperCase())),
        el('td',{style:'color:var(--muted);font-size:12px'},fmtDay(inv.due_date)),
        el('td',{},el('div',{style:'display:flex;gap:4px;flex-wrap:wrap'},
          el('button',{className:'btn btn-ghost btn-xs',onClick:()=>openInvoicePDF(inv.id)},'📄 PDF'),
          el('button',{className:'btn btn-xs',style:'background:rgba(37,211,102,0.15);color:#25d166;border:1px solid rgba(37,211,102,0.3)',onClick:async()=>{
            const client=inv.Client;if(!client?.phone){alert('No phone on file.');return;}
            await sendWhatsAppDoc('invoice',inv.invoice_no,inv.total,client.phone,client.name,inv.client_id);
          }},'📱 WA'),
          inv.status==='draft'?el('button',{className:'btn btn-cyan btn-xs',onClick:async()=>{await api.put('/invoices/'+inv.id,{status:'sent'});renderInvoices(container);}},'Send'):null,
          inv.status==='sent'?el('button',{className:'btn btn-success btn-xs',onClick:async()=>{await api.put('/invoices/'+inv.id,{status:'paid'});renderInvoices(container);}},'✓ Paid'):null
        ))
      );
    }))
  ));
  container.appendChild(tw);
}

function openCreateInvoiceModal(clients, onSave) {
  const mDiv=el('div',{});
  const clientSel=el('select',{className:'inp'});clientSel.appendChild(el('option',{value:''},'Select client *'));clients.forEach(c=>clientSel.appendChild(el('option',{value:c.id},c.name+(c.company?' — '+c.company:''))));
  const gstInp=el('input',{type:'number',className:'inp',value:'18',placeholder:'GST %'});
  const dueInp=el('input',{type:'date',className:'inp'});
  const notesInp=el('textarea',{className:'inp',rows:2,placeholder:'Terms / Notes'});
  const items=[{desc:'',qty:1,rate:0,amount:0}];
  const itemsDiv=el('div',{});
  const totalDiv=el('div',{style:'text-align:right;margin-top:10px'});

  function recalc(){
    items.forEach(item=>{item.amount=parseFloat(item.qty||0)*parseFloat(item.rate||0);});
    const sub=items.reduce((s,i)=>s+(i.amount||0),0);
    const gst=(sub*(parseFloat(gstInp.value)||0))/100;
    totalDiv.innerHTML=`<div style="color:var(--muted);font-size:12px">Subtotal: ${fmt(sub)}</div><div style="color:var(--muted);font-size:12px">GST: ${fmt(gst)}</div><div style="color:#4ade80;font-weight:800;font-size:18px;margin-top:4px">Total: ${fmt(sub+gst)}</div>`;
  }

  function renderItems(){
    itemsDiv.innerHTML='';
    items.forEach((item,i)=>{
      const row=el('div',{style:'display:grid;grid-template-columns:2fr 0.5fr 1fr 1fr auto;gap:6px;margin-bottom:6px;align-items:center'});
      const dI=el('input',{type:'text',className:'inp inp-sm',placeholder:'Description',value:item.desc||''});
      const qI=el('input',{type:'number',className:'inp inp-sm',placeholder:'Qty',value:item.qty||1,min:1});
      const rI=el('input',{type:'number',className:'inp inp-sm',placeholder:'Rate ₹',value:item.rate||0});
      const aI=el('input',{type:'number',className:'inp inp-sm',placeholder:'Amount',value:item.amount||0,readonly:'',style:'background:var(--bg2);color:var(--muted2)'});
      const delBtn=el('button',{className:'btn btn-danger btn-xs',onClick:()=>{items.splice(i,1);renderItems();recalc();}},'✕');
      dI.addEventListener('input',()=>{items[i].desc=dI.value;});
      qI.addEventListener('input',()=>{items[i].qty=parseFloat(qI.value)||0;items[i].amount=items[i].qty*items[i].rate;aI.value=items[i].amount;recalc();});
      rI.addEventListener('input',()=>{items[i].rate=parseFloat(rI.value)||0;items[i].amount=items[i].qty*items[i].rate;aI.value=items[i].amount;recalc();});
      row.append(dI,qI,rI,aI,delBtn);itemsDiv.appendChild(row);
    });
  }
  gstInp.addEventListener('input',recalc);renderItems();recalc();

  const overlay=el('div',{className:'modal-overlay center',onClick:(e)=>{if(e.target===overlay)overlay.remove();}},
    el('div',{className:'modal center-modal wide-modal'},
      el('div',{className:'modal-header'},el('span',{className:'modal-title'},'Create Invoice'),el('button',{className:'modal-close',onClick:()=>overlay.remove()},'✕')),
      mDiv,
      el('div',{className:'form-grid',style:'margin-bottom:10px'},el('div',{className:'field',style:'margin:0'},el('label',{},'Client *'),clientSel),el('div',{className:'field',style:'margin:0'},el('label',{},'Due Date'),dueInp)),
      el('div',{style:'display:grid;grid-template-columns:2fr 0.5fr 1fr 1fr auto;gap:6px;margin-bottom:4px'},...['Description','Qty','Rate ₹','Amount',''].map(h=>el('div',{style:'font-size:11px;color:var(--muted);font-weight:600'},h))),
      itemsDiv,
      el('button',{className:'btn btn-ghost btn-xs',style:'margin-bottom:10px',onClick:()=>{items.push({desc:'',qty:1,rate:0,amount:0});renderItems();recalc();}},'+ Add Item'),
      el('div',{className:'form-grid'},el('div',{className:'field',style:'margin:0'},el('label',{},'GST %'),gstInp),el('div',{className:'field',style:'margin:0'},el('label',{},'Notes'),notesInp)),
      totalDiv,
      el('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:14px',onClick:async()=>{
        if(!clientSel.value){mDiv.className='alert alert-error';mDiv.textContent='Select client.';return;}
        if(!items.length||!items[0].desc){mDiv.className='alert alert-error';mDiv.textContent='Add at least one item.';return;}
        const r=await api.post('/invoices',{client_id:parseInt(clientSel.value),items,gst_percent:parseFloat(gstInp.value)||18,due_date:dueInp.value||null,notes:notesInp.value});
        if(r.ok){overlay.remove();if(onSave)onSave();}else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
      }},'Generate Invoice')
    )
  );
  document.body.appendChild(overlay);
}

async function openInvoicePDF(invId) {
  const r=await api.get('/invoices/'+invId);
  if(!r.ok)return alert('Error loading invoice');
  const inv=r.data; const client=inv.Client||{};
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ${inv.invoice_no}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#333}.header{display:flex;justify-content:space-between;margin-bottom:40px}.brand{font-size:24px;font-weight:900;color:#6366f1}.inv-num{text-align:right;font-size:28px;font-weight:800;color:#6366f1}.client-box{background:#f8f9ff;border-radius:8px;padding:16px;margin-bottom:24px}.client-name{font-size:20px;font-weight:800}.info{font-size:13px;color:#666;margin-top:2px}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{background:#6366f1;color:#fff;padding:10px 14px;text-align:left;font-size:12px}td{padding:10px 14px;border-bottom:1px solid #eee;font-size:13px}.total-row td{font-weight:800;font-size:16px;background:#f0f0ff;color:#6366f1}.footer{text-align:center;margin-top:30px;color:#888;font-size:12px}.no-print button{background:#6366f1;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:13px}@media print{.no-print{display:none}}</style></head><body><div class="no-print" style="text-align:center;background:#f5f5f5;padding:12px;margin-bottom:20px"><button onclick="window.print()">🖨️ Print / Save PDF</button></div><div class="header"><div><div class="brand">🚀 Macto AI</div><div class="info">macto.in · Kerala, India</div></div><div><div class="inv-num">INVOICE</div><div style="text-align:right;font-size:13px;color:#666">${inv.invoice_no}<br>Date: ${new Date(inv.createdAt).toLocaleDateString('en-IN')}<br>${inv.due_date?'Due: '+fmtDay(inv.due_date):''}</div></div></div><div class="client-box"><div class="client-name">${client.name||''}</div>${client.company?`<div class="info">🏢 ${client.company}</div>`:''}<div class="info">${client.phone||''}</div><div class="info">${client.email||''}</div></div><table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${(inv.items||[]).map((item,i)=>`<tr><td>${i+1}</td><td>${item.desc}</td><td>${item.qty}</td><td>₹${Number(item.rate).toLocaleString('en-IN')}</td><td>₹${Number(item.amount).toLocaleString('en-IN')}</td></tr>`).join('')}<tr class="total-row"><td colspan="2">Subtotal</td><td colspan="3">₹${Number(inv.subtotal).toLocaleString('en-IN')}</td></tr><tr class="total-row"><td colspan="2">GST (${inv.gst_percent}%)</td><td colspan="3">₹${Number(inv.gst_amount).toLocaleString('en-IN')}</td></tr><tr class="total-row"><td colspan="2"><strong>TOTAL</strong></td><td colspan="3"><strong>₹${Number(inv.total).toLocaleString('en-IN')}</strong></td></tr></tbody></table>${inv.notes?`<div style="background:#f9f9f9;padding:12px;border-radius:6px;font-size:13px"><strong>Notes:</strong> ${inv.notes}</div>`:''}<div class="footer">Thank you for your business! · Macto AI — Create. Deploy. Grow.</div></body></html>`;
  const w=window.open('','_blank');w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
}


// ── PROPOSALS ────────────────────────────────────────────────────
async function renderProposals(container) {
  container.innerHTML = loading();
  const [propR, clientsR] = await Promise.all([api.get('/proposals'), api.get('/clients?limit=200')]);
  const proposals = propR.ok ? propR.data : [];
  const clients = clientsR.ok ? clientsR.data : [];
  container.innerHTML = '';
  container.appendChild(el('div',{className:'page-title'},'📄 Proposals'));

  const stats={draft:0,sent:0,accepted:0,rejected:0};
  proposals.forEach(p=>{stats[p.status]=(stats[p.status]||0)+1;});
  const grid=el('div',{className:'stats-grid'});
  [{l:'Drafts',v:stats.draft||0,c:'#94a3b8'},{l:'Sent',v:stats.sent||0,c:'#06b6d4'},{l:'Accepted ✓',v:stats.accepted||0,c:'#22c55e'},{l:'Rejected',v:stats.rejected||0,c:'#ef4444'}].forEach(k=>grid.appendChild(kpiCard(k.l,k.v,'',k.c)));
  container.appendChild(grid);
  container.appendChild(el('button',{className:'btn btn-primary',style:'margin-bottom:14px',onClick:()=>openCreateProposalModal(clients,()=>renderProposals(container))},'+  Create Proposal'));

  if (!proposals.length){container.appendChild(el('div',{className:'card'},el('p',{style:'text-align:center;color:var(--muted);padding:30px'},'No proposals yet. Create your first proposal!')));return;}

  const tw=el('div',{className:'table-wrap'},el('table',{},
    el('thead',{},el('tr',{},...['No.','Client','Project','Investment','Status','Actions'].map(h=>el('th',{},h)))),
    el('tbody',{},...proposals.map(p=>{
      const sColors={draft:'#94a3b8',sent:'#06b6d4',accepted:'#22c55e',rejected:'#ef4444',revised:'#f59e0b'};
      const sc=sColors[p.status]||'#94a3b8';
      return el('tr',{},
        el('td',{style:'font-family:monospace;font-weight:600;color:var(--accent2)'},p.proposal_no),
        el('td',{className:'td-name'},p.Client?p.Client.name:'—'),
        el('td',{style:'color:var(--muted2);font-size:12px'},p.project_title||'—'),
        el('td',{style:'color:#4ade80;font-weight:700'},fmt(p.investment)),
        el('td',{},el('span',{style:`background:${sc}22;color:${sc};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600`},p.status.toUpperCase())),
        el('td',{},el('div',{style:'display:flex;gap:4px;flex-wrap:wrap'},
          el('button',{className:'btn btn-ghost btn-xs',onClick:()=>openProposalPDF(p.id)},'📄 PDF'),
          el('button',{className:'btn btn-xs',style:'background:rgba(37,211,102,0.15);color:#25d166;border:1px solid rgba(37,211,102,0.3)',onClick:async()=>{
            const client=p.Client;if(!client?.phone){alert('No phone on file.');return;}
            await sendWhatsAppDoc('proposal',p.proposal_no,p.investment,client.phone,client.name,p.client_id);
          }},'📱 WA'),
          p.status==='draft'?el('button',{className:'btn btn-cyan btn-xs',onClick:async()=>{await api.put('/proposals/'+p.id,{status:'sent',sent_at:new Date()});renderProposals(container);}},'Send'):null,
          p.status==='sent'?el('button',{className:'btn btn-success btn-xs',onClick:async()=>{await api.put('/proposals/'+p.id,{status:'accepted',accepted_at:new Date()});renderProposals(container);}},'✓ Accept'):null,
          p.status==='sent'?el('button',{className:'btn btn-danger btn-xs',onClick:async()=>{await api.put('/proposals/'+p.id,{status:'rejected'});renderProposals(container);}},'Reject'):null,
          el('button',{className:'btn btn-danger btn-xs',onClick:async()=>{if(!confirm('Delete?'))return;await api.del('/proposals/'+p.id);renderProposals(container);}},'Del')
        ))
      );
    }))
  ));
  container.appendChild(tw);
}

function openCreateProposalModal(clients, onSave) {
  const mDiv=el('div',{});
  const clientSel=el('select',{className:'inp'});clientSel.appendChild(el('option',{value:''},'Select client *'));clients.forEach(c=>clientSel.appendChild(el('option',{value:c.id},c.name+(c.company?' — '+c.company:''))));
  const projTitle=el('input',{type:'text',className:'inp',placeholder:'Project title e.g. E-commerce Web App'});
  const overview=el('textarea',{className:'inp',rows:3,placeholder:'Project overview — what problem does it solve?'});
  const investment=el('input',{type:'number',className:'inp',placeholder:'Total investment ₹'});
  const timeline=el('input',{type:'number',className:'inp',value:'6',placeholder:'Timeline weeks'});
  const payTerms=el('textarea',{className:'inp',rows:2,value:'50% advance, 50% on delivery',placeholder:'Payment terms'});
  const validity=el('input',{type:'number',className:'inp',value:'30'});
  const whyUs=el('textarea',{className:'inp',rows:3,value:'5+ years experience, 100+ projects delivered, dedicated support team, Kerala-based company with pan-India clients'});

  const scopeItems=[{title:'Discovery & Planning',description:'Requirements gathering, wireframes, project plan'},{title:'Design',description:'UI/UX design, mobile-responsive layouts'},{title:'Development',description:'Full-stack development with modern technologies'},{title:'Testing & QA',description:'Thorough testing across devices and browsers'},{title:'Deployment',description:'Live deployment, domain, SSL certificate'},{title:'Training & Support',description:'Admin training, documentation, 30 days support'}];
  const breakItems=[{item:'Design & UI/UX',amount:0},{item:'Frontend Development',amount:0},{item:'Backend Development',amount:0},{item:'Testing & Deployment',amount:0},{item:'Post-launch Support',amount:0}];
  const scopeDiv=el('div',{});const breakDiv=el('div',{});

  function renderScope(){
    scopeDiv.innerHTML='';
    scopeItems.forEach((item,i)=>{
      const row=el('div',{style:'display:grid;grid-template-columns:1fr 1.5fr auto;gap:6px;margin-bottom:6px;align-items:center'});
      const tI=el('input',{type:'text',className:'inp inp-sm',value:item.title});const dI=el('input',{type:'text',className:'inp inp-sm',value:item.description});const del=el('button',{className:'btn btn-danger btn-xs',onClick:()=>{scopeItems.splice(i,1);renderScope();}},'✕');
      tI.addEventListener('input',()=>scopeItems[i].title=tI.value);dI.addEventListener('input',()=>scopeItems[i].description=dI.value);
      row.append(tI,dI,del);scopeDiv.appendChild(row);
    });
  }
  function renderBreak(){
    breakDiv.innerHTML='';
    breakItems.forEach((item,i)=>{
      const row=el('div',{style:'display:grid;grid-template-columns:1.5fr 1fr auto;gap:6px;margin-bottom:6px;align-items:center'});
      const iI=el('input',{type:'text',className:'inp inp-sm',value:item.item});const aI=el('input',{type:'number',className:'inp inp-sm',value:item.amount||0});const del=el('button',{className:'btn btn-danger btn-xs',onClick:()=>{breakItems.splice(i,1);renderBreak();}},'✕');
      iI.addEventListener('input',()=>breakItems[i].item=iI.value);
      aI.addEventListener('input',()=>{breakItems[i].amount=parseFloat(aI.value)||0;investment.value=breakItems.reduce((s,b)=>s+(b.amount||0),0);});
      row.append(iI,aI,del);breakDiv.appendChild(row);
    });
  }
  renderScope();renderBreak();

  const overlay=el('div',{className:'modal-overlay center',onClick:(e)=>{if(e.target===overlay)overlay.remove();}},
    el('div',{className:'modal center-modal wide-modal',style:'max-width:720px'},
      el('div',{className:'modal-header'},el('span',{className:'modal-title'},'📄 Create Proposal'),el('button',{className:'modal-close',onClick:()=>overlay.remove()},'✕')),
      mDiv,
      el('div',{className:'form-grid',style:'margin-bottom:10px'},el('div',{className:'field',style:'margin:0'},el('label',{},'Client *'),clientSel),el('div',{className:'field',style:'margin:0'},el('label',{},'Project Title'),projTitle)),
      el('div',{className:'field'},el('label',{},'Project Overview'),overview),
      el('div',{style:'font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:6px'},'SCOPE OF WORK'),
      scopeDiv,
      el('button',{className:'btn btn-ghost btn-xs',style:'margin-bottom:12px',onClick:()=>{scopeItems.push({title:'',description:''});renderScope();}},'+ Add Scope Item'),
      el('div',{style:'font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:6px'},'INVESTMENT BREAKDOWN'),
      breakDiv,
      el('button',{className:'btn btn-ghost btn-xs',style:'margin-bottom:12px',onClick:()=>{breakItems.push({item:'',amount:0});renderBreak();}},'+ Add Item'),
      el('div',{className:'form-grid',style:'margin-bottom:10px'},el('div',{className:'field',style:'margin:0'},el('label',{},'Total Investment ₹'),investment),el('div',{className:'field',style:'margin:0'},el('label',{},'Timeline (weeks)'),timeline)),
      el('div',{className:'form-grid',style:'margin-bottom:10px'},el('div',{className:'field',style:'margin:0'},el('label',{},'Payment Terms'),payTerms),el('div',{className:'field',style:'margin:0'},el('label',{},'Valid Days'),validity)),
      el('div',{className:'field'},el('label',{},'Why Choose Macto AI?'),whyUs),
      el('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:4px',onClick:async()=>{
        if(!clientSel.value){mDiv.className='alert alert-error';mDiv.textContent='Select client.';return;}
        if(!projTitle.value){mDiv.className='alert alert-error';mDiv.textContent='Enter project title.';return;}
        const r=await api.post('/proposals',{client_id:parseInt(clientSel.value),project_title:projTitle.value,project_overview:overview.value,scope_of_work:scopeItems,investment:parseFloat(investment.value)||0,investment_breakdown:breakItems,timeline_weeks:parseInt(timeline.value)||6,payment_terms:payTerms.value,validity_days:parseInt(validity.value)||30,why_us:whyUs.value});
        if(r.ok){overlay.remove();if(onSave)onSave();}else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
      }},'Generate Proposal')
    )
  );
  document.body.appendChild(overlay);
}

async function openProposalPDF(propId) {
  const r=await api.get('/proposals/'+propId);
  if(!r.ok)return alert('Error');
  const p=r.data;const c=p.Client||{};
  const validUntil=new Date(p.createdAt||Date.now());validUntil.setDate(validUntil.getDate()+(p.validity_days||30));
  const scope=p.scope_of_work||[];const breakdown=p.investment_breakdown||[];
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Proposal ${p.proposal_no}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;background:#fff}.cover{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:60px 50px;position:relative}.cover-logo{font-size:26px;font-weight:900;margin-bottom:4px}.cover-tag{font-size:13px;opacity:0.8;margin-bottom:30px}.cover-title{font-size:32px;font-weight:800;line-height:1.3;margin-bottom:10px}.cover-sub{font-size:15px;opacity:0.9}.cover-meta{position:absolute;bottom:30px;right:50px;text-align:right;font-size:13px;opacity:0.85}.section{padding:36px 50px;border-bottom:1px solid #eee}.section h2{font-size:18px;font-weight:800;color:#6366f1;margin-bottom:14px;padding-bottom:6px;border-bottom:2px solid #6366f122}.client-box{background:#f8f9ff;border:1px solid #e0e0ff;border-radius:8px;padding:18px;margin-bottom:16px}.client-name{font-size:20px;font-weight:800}.info{color:#666;font-size:13px;margin-top:3px}p{font-size:14px;line-height:1.7;color:#444;margin-bottom:10px}.scope-item{display:flex;gap:14px;margin-bottom:14px}.scope-num{background:#6366f1;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0}.scope-title{font-weight:700;font-size:13px;margin-bottom:3px}.scope-desc{font-size:12px;color:#666}table{width:100%;border-collapse:collapse;margin-bottom:16px}th{background:#6366f1;color:#fff;padding:9px 14px;text-align:left;font-size:12px}td{padding:9px 14px;border-bottom:1px solid #eee;font-size:13px}.total-row td{font-weight:800;font-size:15px;background:#f0f0ff;color:#6366f1}.pay-box{background:#f0fff4;border:1px solid #86efac;border-radius:6px;padding:14px;font-size:13px}.sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:16px}.sign-line{border-bottom:1px solid #999;height:50px;margin-bottom:6px}.sign-label{font-size:12px;color:#666}.footer{background:#1a1a2e;color:#fff;padding:24px 50px;text-align:center;font-size:13px}.no-print button{background:#6366f1;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600}@media print{.no-print{display:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="no-print" style="text-align:center;padding:10px;background:#f5f5f5;margin-bottom:0"><button onclick="window.print()">🖨️ Print / Save as PDF</button></div><div class="cover"><div class="cover-logo">🚀 Macto AI</div><div class="cover-tag">Create. Deploy. Grow.</div><div class="cover-title">${p.project_title||'Web Development Proposal'}</div><div class="cover-sub">Prepared for ${c.name||''}${c.company?' — '+c.company:''}</div><div class="cover-meta">Proposal: <strong>${p.proposal_no}</strong><br>Date: ${new Date(p.createdAt||Date.now()).toLocaleDateString('en-IN',{dateStyle:'long'})}<br>Valid Until: ${validUntil.toLocaleDateString('en-IN',{dateStyle:'long'})}</div></div><div class="section"><h2>Client Information</h2><div class="client-box"><div class="client-name">${c.name||''}</div>${c.company?`<div class="info">🏢 ${c.company}</div>`:''}<div class="info">📞 ${c.phone||'—'}</div><div class="info">📧 ${c.email||'—'}</div>${c.city?`<div class="info">📍 ${c.city}</div>`:''}</div></div>${p.project_overview?`<div class="section"><h2>Project Overview</h2><p>${p.project_overview.replace(/\n/g,'<br>')}</p></div>`:''}<div class="section"><h2>Scope of Work</h2>${scope.map((s,i)=>`<div class="scope-item"><div class="scope-num">${i+1}</div><div><div class="scope-title">${s.title}</div><div class="scope-desc">${s.description}</div></div></div>`).join('')}</div><div class="section"><h2>Investment</h2><table><thead><tr><th>#</th><th>Service / Component</th><th>Amount</th></tr></thead><tbody>${breakdown.map((b,i)=>`<tr><td>${i+1}</td><td>${b.item}</td><td>₹${Number(b.amount).toLocaleString('en-IN')}</td></tr>`).join('')}<tr class="total-row"><td colspan="2"><strong>Total Investment</strong></td><td><strong>₹${Number(p.investment).toLocaleString('en-IN')}</strong></td></tr></tbody></table><div class="pay-box">💳 <strong>Payment Terms:</strong> ${p.payment_terms||'50% advance, 50% on delivery'}</div></div><div class="section"><h2>Timeline</h2><p>Estimated completion: <strong>${p.timeline_weeks||6} weeks</strong> from advance payment and project kickoff.</p></div>${p.why_us?`<div class="section"><h2>Why Choose Macto AI?</h2><p>${p.why_us.replace(/\n/g,'<br>')}</p></div>`:''}<div class="section"><h2>Acceptance</h2><p>By signing, client agrees to the scope and investment outlined above.</p><div class="sign-grid"><div><div class="sign-line"></div><div class="sign-label">Client Signature & Date — ${c.name||''}</div></div><div><div class="sign-line"></div><div class="sign-label">Macto AI Authorized Signature</div></div></div></div><div class="footer"><strong>🚀 Macto AI</strong> · macto.in · Kerala, India<br>Thank you for choosing Macto AI!</div></body></html>`;
  const w=window.open('','_blank');w.document.write(html);w.document.close();setTimeout(()=>w.print(),800);
}

// ── WHATSAPP HELPERS ─────────────────────────────────────────────
async function sendWhatsAppDoc(type, docNo, amount, phone, clientName, clientId) {
  if (!phone){alert('No phone number. Add phone to client first.');return;}
  let message='';
  if(type==='proposal'){message=`Hello ${clientName}! 🙏\n\nThank you for your time. Our proposal *${docNo}* is ready for your review.\n\n*Investment: ₹${Number(amount).toLocaleString('en-IN')}*\n\nValid for 30 days. Please feel free to reach out with any questions!\n\nWarm regards,\n*Macto AI Team* 🚀\nCreate. Deploy. Grow.\nmacto.in`;}
  else if(type==='invoice'){message=`Hello ${clientName}! 🙏\n\nYour invoice *${docNo}* is ready.\n\n*Amount Due: ₹${Number(amount).toLocaleString('en-IN')}*\n\nKindly process payment at your earliest convenience. Thank you!\n\nWarm regards,\n*Macto AI Team* 🚀\nmacto.in`;}
  const confirmSend=confirm(`Send WhatsApp to ${clientName}?\n\n${message.slice(0,100)}…`);
  if(!confirmSend)return;
  const r=await api.post('/whatsapp/send',{phone,message,client_id:clientId,doc_type:type,doc_no:docNo});
  if(r.ok)alert('✅ WhatsApp sent to '+clientName+'!');
  else alert('❌ Failed: '+r.error);
}

function openWhatsAppModal(phone, clientId, clientName, onSent) {
  const mDiv=el('div',{});
  const phoneInp=el('input',{type:'tel',className:'inp',value:phone||'',placeholder:'Phone with country code e.g. 919876543210'});
  const msgInp=el('textarea',{className:'inp',rows:4,placeholder:'Type your message…'});
  const templates=[
    {l:'Interested Follow-up',m:`Hi ${clientName}! Thank you for your interest in our web development services. I'd love to schedule a quick call to discuss how we can help grow your business. When would be a good time? 😊 — Macto AI Team`},
    {l:'Meeting Reminder',m:`Hi ${clientName}! Just a reminder about our scheduled meeting. Looking forward to connecting! Feel free to reschedule if needed. — Macto AI 🚀`},
    {l:'After Meeting',m:`Hi ${clientName}! Great meeting you today! We'll send our proposal shortly. Thank you for your time! — Macto AI 🚀`},
    {l:'Follow-up',m:`Hi ${clientName}! Hope you're doing well. Just following up on our conversation. Any questions about our services? — Macto AI Team 🚀`},
  ];
  const tmplDiv=el('div',{style:'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px'});
  templates.forEach(t=>tmplDiv.appendChild(el('button',{className:'btn btn-ghost btn-xs',onClick:()=>{msgInp.value=t.m;}},t.l)));

  const overlay=el('div',{className:'modal-overlay center',onClick:(e)=>{if(e.target===overlay)overlay.remove();}},
    el('div',{className:'modal center-modal'},
      el('div',{className:'modal-header'},el('span',{className:'modal-title'},'📱 Send WhatsApp'),el('button',{className:'modal-close',onClick:()=>overlay.remove()},'✕')),
      mDiv,
      el('div',{className:'field'},el('label',{},'Phone (with country code)'),phoneInp),
      el('div',{style:'font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:6px'},'QUICK TEMPLATES'),
      tmplDiv,
      el('div',{className:'field'},el('label',{},'Message'),msgInp),
      el('div',{className:'alert alert-info',style:'font-size:12px;margin-bottom:10px'},'⚙️ Requires WHATSAPP_TOKEN & WHATSAPP_PHONE_ID in Railway Variables.'),
      el('button',{className:'btn btn-success',style:'width:100%;justify-content:center',onClick:async()=>{
        if(!phoneInp.value||!msgInp.value){mDiv.className='alert alert-error';mDiv.textContent='Phone and message required.';return;}
        const r=await api.post('/whatsapp/send',{phone:phoneInp.value,message:msgInp.value,client_id:clientId});
        if(r.ok){mDiv.className='alert alert-success';mDiv.textContent='✅ WhatsApp sent!';if(onSent)onSent();}
        else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
      }},'📤 Send WhatsApp')
    )
  );
  document.body.appendChild(overlay);
}


// ── CHART HELPERS ─────────────────────────────────────────────────
function drawBarChart(canvas, labels, values, color1, color2) {
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth||600; const H = canvas.offsetHeight||220;
  canvas.width = W; canvas.height = H;
  const maxVal = Math.max(...values, 1);
  const pad = { top:30, right:20, bottom:40, left:60 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const barW = (chartW / Math.max(labels.length,1)) * 0.6;
  const gap   = chartW / Math.max(labels.length,1);

  ctx.fillStyle = 'transparent';
  ctx.clearRect(0,0,W,H);

  // Grid lines
  for(let i=0;i<=4;i++) {
    const y = pad.top + chartH * (1 - i/4);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(W-pad.right,y); ctx.stroke();
    ctx.fillStyle = '#5a6785';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    const val = maxVal*i/4;
    ctx.fillText(val>=1000?'₹'+Math.round(val/1000)+'k':'₹'+Math.round(val), pad.left-6, y+3);
  }

  // Bars
  labels.forEach((label,i) => {
    const x = pad.left + gap*i + gap/2 - barW/2;
    const barH2 = ((values[i]||0)/maxVal)*chartH;
    const y = pad.top + chartH - barH2;
    const grad = ctx.createLinearGradient(0,y,0,pad.top+chartH);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2||color1);
    ctx.fillStyle = grad;
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(x,y,barW,barH2,4);
    else ctx.rect(x,y,barW,barH2);
    ctx.fill();

    // Value label
    if(values[i]>0) {
      ctx.fillStyle = '#c4cde0';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      const v = values[i];
      ctx.fillText(v>=1000?'₹'+Math.round(v/1000)+'k':'₹'+Math.round(v), x+barW/2, y-5);
    }

    // X label
    ctx.fillStyle = '#5a6785';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x+barW/2, H-pad.bottom+16);
  });
}

function drawDonutChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.offsetWidth||200, canvas.offsetHeight||180);
  canvas.width = size; canvas.height = size;
  const cx = size/2, cy = size/2, r = size*0.38, innerR = r*0.6;
  const total = data.reduce((s,d)=>s+d.v,0)||1;
  let angle = -Math.PI/2;
  data.forEach(d=>{
    const slice = (d.v/total)*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,angle,angle+slice);
    ctx.closePath();
    ctx.fillStyle = d.c;
    ctx.fill();
    angle += slice;
  });
  // Inner hole
  ctx.beginPath();
  ctx.arc(cx,cy,innerR,0,Math.PI*2);
  ctx.fillStyle = '#0e1220';
  ctx.fill();
  // Center text
  ctx.fillStyle = '#e8edf8';
  ctx.font = 'bold 18px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy+3);
  ctx.fillStyle = '#5a6785';
  ctx.font = '10px Inter, sans-serif';
  ctx.fillText('TOTAL', cx, cy+16);
}

function drawLineChart(canvas, labels, datasets) {
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth||600; const H = canvas.offsetHeight||200;
  canvas.width = W; canvas.height = H;
  const pad = {top:20,right:20,bottom:35,left:55};
  const cW = W-pad.left-pad.right, cH = H-pad.top-pad.bottom;
  const allVals = datasets.flatMap(d=>d.values);
  const maxVal = Math.max(...allVals,1);
  ctx.clearRect(0,0,W,H);

  // Grid
  for(let i=0;i<=4;i++) {
    const y = pad.top + cH*(1-i/4);
    ctx.strokeStyle='rgba(255,255,255,0.05)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(W-pad.right,y);ctx.stroke();
    ctx.fillStyle='#5a6785';ctx.font='10px sans-serif';ctx.textAlign='right';
    ctx.fillText('₹'+Math.round(maxVal*i/4/1000)+'k',pad.left-4,y+3);
  }

  datasets.forEach(ds=>{
    const pts = ds.values.map((v,i)=>({
      x: pad.left + (i/(Math.max(labels.length-1,1)))*cW,
      y: pad.top + cH*(1-(v/maxVal))
    }));
    // Line
    ctx.beginPath();
    pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // Dots
    pts.forEach(p=>{
      ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);
      ctx.fillStyle=ds.color;ctx.fill();
      ctx.strokeStyle='#0e1220';ctx.lineWidth=2;ctx.stroke();
    });
  });

  // X labels
  labels.forEach((l,i)=>{
    const x = pad.left+(i/(Math.max(labels.length-1,1)))*cW;
    ctx.fillStyle='#5a6785';ctx.font='10px sans-serif';ctx.textAlign='center';
    ctx.fillText(l,x,H-pad.bottom+14);
  });
}

// ── BULK WHATSAPP ─────────────────────────────────────────────────
async function renderBulkWA(container) {
  container.innerHTML = loading();
  const usersR = await api.get('/users');
  container.innerHTML = '';
  container.appendChild(el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px'},
    el('div',{className:'page-title',style:'margin:0'},'📢 Bulk WhatsApp Campaign'),
    el('button',{className:'btn btn-ghost btn-sm',onClick:()=>{STATE.tab='wa_campaigns';render();}},'View All Campaigns →')
  ));
  container.appendChild(el('div',{className:'alert alert-info',style:'margin-bottom:16px'},'⚙️ Requires WHATSAPP_TOKEN & WHATSAPP_PHONE_ID in Railway Variables. Each message costs WhatsApp API credits.'));

  const mDiv = el('div',{});
  container.appendChild(mDiv);

  const nameInp = el('input',{type:'text',className:'inp',placeholder:'Campaign name e.g. "June Follow-up Blast"'});
  const msgInp = el('textarea',{className:'inp',rows:5,placeholder:'Message text. Use {name} to personalize e.g. "Hi {name}, following up on our call..."'});
  const statusSel = el('select',{className:'inp inp-sm'});
  [['all','All Status'],['pending','Pending'],['called','Called'],['callback','Callback Due'],['not_interested','Not Interested']].forEach(([v,l])=>statusSel.appendChild(el('option',{value:v},l)));
  const catSel = el('select',{className:'inp inp-sm'});
  [['all','All Categories'],...CATEGORIES.map(c=>[c.value,c.label])].forEach(([v,l])=>catSel.appendChild(el('option',{value:v},l)));
  const srcSel = el('select',{className:'inp inp-sm'});
  [['all','All Sources'],['cold_call','Cold Call'],['ads','Ads'],['import','Import'],['referral','Referral']].forEach(([v,l])=>srcSel.appendChild(el('option',{value:v},l)));

  const previewDiv = el('div',{style:'margin:12px 0;padding:12px 16px;background:var(--bg4);border-radius:8px;font-size:13px;color:var(--muted2)'},'Click Preview to see how many leads will receive this message.');
  const previewBtn = el('button',{className:'btn btn-ghost',onClick:async()=>{
    previewBtn.textContent='Loading...';previewBtn.disabled=true;
    const r = await api.post('/wa-campaigns/preview',{filter_status:statusSel.value,filter_category:catSel.value,filter_source:srcSel.value});
    previewBtn.textContent='Preview';previewBtn.disabled=false;
    if(r.ok){
      previewDiv.innerHTML='';
      previewDiv.appendChild(el('div',{style:'font-weight:700;color:var(--green);font-size:15px;margin-bottom:8px'},'✅ '+r.count+' leads will receive this message'));
      if(r.sample.length){
        previewDiv.appendChild(el('div',{style:'font-size:11px;color:var(--muted);margin-bottom:6px'},'Sample recipients:'));
        r.sample.forEach(s=>previewDiv.appendChild(el('div',{style:'font-size:12px;color:var(--muted2)'},'• '+s.name+' ('+s.phone+')')));
      }
    }
  }},'👁️ Preview');

  const sendBtn = el('button',{className:'btn btn-success',style:'width:100%;justify-content:center;margin-top:4px',onClick:async()=>{
    if(!nameInp.value){mDiv.className='alert alert-error';mDiv.textContent='Campaign name required.';return;}
    if(!msgInp.value||msgInp.value.length<10){mDiv.className='alert alert-error';mDiv.textContent='Message too short.';return;}
    if(!confirm('Send WhatsApp to all filtered leads? This cannot be undone.'))return;
    sendBtn.disabled=true;sendBtn.textContent='Creating campaign...';
    const r = await api.post('/wa-campaigns',{name:nameInp.value,message:msgInp.value,filter_status:statusSel.value,filter_category:catSel.value,filter_source:srcSel.value});
    if(!r.ok){mDiv.className='alert alert-error';mDiv.textContent=r.error;sendBtn.disabled=false;sendBtn.textContent='Send Campaign';return;}
    sendBtn.textContent='Sending to '+r.total+' leads...';
    const r2 = await api.post('/wa-campaigns/'+r.data.id+'/send',{});
    sendBtn.disabled=false;sendBtn.textContent='Send Campaign';
    if(r2.ok){mDiv.className='alert alert-success';mDiv.textContent='✅ Sent: '+r2.sent+' | Failed: '+r2.failed+' | Total: '+r2.total;}
    else{mDiv.className='alert alert-error';mDiv.textContent=r2.error;}
  }},'📤 Send Campaign');

  container.appendChild(el('div',{className:'card'},
    el('div',{className:'card-title'},'Campaign Details'),
    el('div',{className:'field'},el('label',{},'Campaign Name'),nameInp),
    el('div',{className:'field'},el('label',{},'Message'),msgInp),
    el('div',{style:'background:var(--bg4);border-radius:8px;padding:12px;margin-bottom:14px'},
      el('div',{style:'font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:10px'},'Filter Recipients'),
      el('div',{style:'display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px'},
        el('div',{className:'field',style:'margin:0'},el('label',{},'Status'),statusSel),
        el('div',{className:'field',style:'margin:0'},el('label',{},'Category'),catSel),
        el('div',{className:'field',style:'margin:0'},el('label',{},'Source'),srcSel)
      )
    ),
    el('div',{style:'display:flex;gap:8px;margin-bottom:12px'},previewBtn),
    previewDiv,
    sendBtn
  ));
}

async function renderWACampaigns(container) {
  container.innerHTML = loading();
  const r = await api.get('/wa-campaigns');
  container.innerHTML = '';
  container.appendChild(el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px'},
    el('div',{className:'page-title',style:'margin:0'},'📊 WA Campaign History'),
    el('button',{className:'btn btn-primary btn-sm',onClick:()=>{STATE.tab='bulk_wa';render();}},'+ New Campaign')
  ));
  const campaigns = r.ok ? r.data : [];
  if(!campaigns.length){
    container.appendChild(el('div',{className:'card'},el('div',{style:'text-align:center;padding:40px;color:var(--muted)'},'No campaigns yet. Create your first bulk WhatsApp campaign.')));
    return;
  }
  const sColors={draft:'#94a3b8',running:'#f59e0b',completed:'#22c55e',failed:'#ef4444'};
  const tw = el('div',{className:'table-wrap'},el('table',{},
    el('thead',{},el('tr',{},...['Campaign','Filters','Total','Sent','Failed','Status','Created','By'].map(h=>el('th',{},h)))),
    el('tbody',{},...campaigns.map(c=>{
      const sc=sColors[c.status]||'#94a3b8';
      const pct = c.total_count>0?Math.round((c.sent_count/c.total_count)*100):0;
      return el('tr',{},
        el('td',{style:'font-weight:600'},c.name),
        el('td',{style:'font-size:11px;color:var(--muted2)'},[c.filter_status,c.filter_category,c.filter_source].filter(Boolean).join(' · ')||'All leads'),
        el('td',{style:'color:var(--muted2)'},c.total_count),
        el('td',{style:'color:#22c55e;font-weight:700'},c.sent_count),
        el('td',{style:'color:#ef4444'},c.failed_count),
        el('td',{},
          el('div',{},el('span',{style:`background:${sc}22;color:${sc};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600`},c.status)),
          c.status==='completed'?el('div',{style:'font-size:10px;color:var(--muted);margin-top:2px'},pct+'% success rate'):null
        ),
        el('td',{className:'td-muted'},fmtDay(c.createdAt)),
        el('td',{className:'td-muted'},c.createdBy?c.createdBy.name:'—')
      );
    }))
  ));
  container.appendChild(tw);
}

// ── KANBAN PIPELINE ───────────────────────────────────────────────
async function renderKanban(container) {
  container.innerHTML = loading();
  const [clientsR, usersR] = await Promise.all([api.get('/clients?limit=500'), api.get('/users')]);
  const clients = clientsR.ok ? clientsR.data : [];
  const users = usersR.ok ? usersR.data : [];
  container.innerHTML = '';
  container.appendChild(el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px'},
    el('div',{className:'page-title',style:'margin:0'},'📊 Kanban Pipeline'),
    el('button',{className:'btn btn-ghost btn-sm',onClick:()=>renderKanban(container)},'🔄 Refresh')
  ));

  const KANBAN_STAGES = [
    {value:'interested',label:'Interested',color:'#60a5fa'},
    {value:'follow_up_1',label:'Follow-up 1',color:'#fbbf24'},
    {value:'meeting_scheduled',label:'Meeting',color:'#a78bfa'},
    {value:'proposal_shared',label:'Proposal',color:'#06b6d4'},
    {value:'negotiation',label:'Negotiation',color:'#fb923c'},
    {value:'invoice_shared',label:'Invoice',color:'#fb923c'},
    {value:'converted',label:'Converted',color:'#22c55e'},
    {value:'in_progress',label:'In Progress',color:'#4ade80'},
    {value:'lost',label:'Lost',color:'#ef4444'},
  ];

  const byStage = {};
  KANBAN_STAGES.forEach(s=>{byStage[s.value]=[];});
  clients.forEach(c=>{
    const key = KANBAN_STAGES.find(s=>s.value===c.pipeline_stage)?.value || 'interested';
    if(byStage[key]) byStage[key].push(c);
  });

  const board = el('div',{className:'kanban-board'});
  KANBAN_STAGES.forEach(stage=>{
    const cols = byStage[stage.value]||[];
    const col = el('div',{className:'kanban-col'});
    col.appendChild(el('div',{className:'kanban-col-header',style:`border-bottom-color:${stage.color}44`},
      el('span',{style:`color:${stage.color};font-weight:700`},stage.label),
      el('span',{style:`background:${stage.color}22;color:${stage.color};padding:2px 8px;border-radius:999px;font-size:11px`},cols.length)
    ));
    if(!cols.length){
      col.appendChild(el('div',{style:'text-align:center;padding:20px;color:var(--muted);font-size:12px'},'Empty'));
    }
    cols.forEach(c=>{
      const staff = users.find(u=>u.id===c.assigned_to);
      const card = el('div',{className:'kanban-card',onClick:()=>openClientModal(c,users,()=>renderKanban(container))},
        el('div',{style:'font-weight:700;font-size:13px;margin-bottom:4px'},c.name),
        c.company?el('div',{style:'font-size:11px;color:var(--muted2);margin-bottom:4px'},c.company):null,
        el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-top:6px'},
          el('div',{style:'font-size:12px;color:#4ade80;font-weight:600'},c.project_value>0?fmt(c.project_value):'No value'),
          staff?el('div',{style:`background:${staff.avatar_color||'#6366f1'}33;color:${staff.avatar_color||'#6366f1'};border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700`},staff.name.split(' ')[0]):null
        ),
        c.next_followup?el('div',{style:'font-size:10px;color:#fbbf24;margin-top:4px'},'📅 '+fmtDay(c.next_followup)):null
      );
      col.appendChild(card);
    });
    board.appendChild(col);
  });
  container.appendChild(el('div',{style:'overflow-x:auto'},board));
}

boot();

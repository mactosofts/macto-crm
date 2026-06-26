// MACTO CRM — Frontend SPA v2

const STATUSES = [
  { value:'pending',          label:'Pending',            color:'#94a3b8' },
  { value:'called',           label:'Called',             color:'#3b82f6' },
  { value:'interested',       label:'Interested',         color:'#22c55e' },
  { value:'not_interested',   label:'Not Interested',     color:'#ef4444' },
  { value:'callback',         label:'Call Back',          color:'#f59e0b' },
  { value:'meeting_scheduled',label:'Meeting Scheduled',  color:'#06b6d4' },
  { value:'busy',             label:'Busy',               color:'#8b5cf6' },
  { value:'no_answer',        label:'No Answer',          color:'#f97316' },
  { value:'converted',        label:'Converted ✓',       color:'#4ade80' },
  { value:'invalid',          label:'Invalid No.',        color:'#6b7280' },
];
const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.value, s]));

const api = {
  async call(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch('/api' + path, opts);
    return r.json();
  },
  get: (p) => api.call('GET', p),
  post: (p, b) => api.call('POST', p, b),
  put: (p, b) => api.call('PUT', p, b),
  del: (p) => api.call('DELETE', p),
  async upload(path, formData) {
    const r = await fetch('/api' + path, { method: 'POST', body: formData, credentials: 'include' });
    return r.json();
  }
};

let STATE = { user: null, tab: 'overview' };

const h = (tag, attrs = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'className') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
};

function badge(status) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  const span = document.createElement('span');
  span.className = `badge badge-${status || 'pending'}`;
  span.textContent = s.label;
  return span;
}

function icon(name, size = 16) {
  const paths = {
    phone:'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
    users:'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    upload:'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
    chart:'M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z',
    logout:'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
    plus:'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    search:'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    assign:'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
    cal:'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
    dialer:'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
    next:'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
    check:'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width',size); svg.setAttribute('height',size);
  svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('fill','currentColor');
  const p = document.createElementNS('http://www.w3.org/2000/svg','path');
  p.setAttribute('d', paths[name]||''); svg.appendChild(p);
  return svg;
}

function formatDate(d) { if(!d)return'—'; return new Date(d).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}); }

async function checkSession() { const r=await api.get('/me'); if(r.ok)STATE.user=r.user; }
async function boot() { await checkSession(); render(); }

function render() {
  const app = document.getElementById('app');
  if (!STATE.user) { app.innerHTML=''; app.appendChild(renderLogin()); return; }
  app.innerHTML=''; app.appendChild(renderApp());
}

// ── LOGIN ──────────────────────────────────────────────────────────
function renderLogin() {
  const wrap = h('div',{className:'login-page'});
  const errDiv = h('div',{style:'display:none'});
  const uInp = h('input',{type:'text',className:'inp',placeholder:'Username'});
  const pInp = h('input',{type:'password',className:'inp',placeholder:'Password'});
  const btn = h('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:4px',onClick:doLogin},'Sign In');

  async function doLogin() {
    btn.disabled=true; btn.textContent='Signing in…';
    const r=await api.post('/login',{username:uInp.value,password:pInp.value});
    if(r.ok){STATE.user=r.user;render();}
    else{errDiv.className='alert alert-error';errDiv.textContent=r.error||'Invalid credentials';errDiv.style.display='';btn.disabled=false;btn.textContent='Sign In';}
  }
  uInp.addEventListener('keydown',e=>e.key==='Enter'&&doLogin());
  pInp.addEventListener('keydown',e=>e.key==='Enter'&&doLogin());

  wrap.appendChild(h('div',{className:'login-box'},
    h('div',{className:'login-logo'},h('div',{className:'brand-logo'},'📞 Macto CRM'),h('p',{},'Telecalling Management System')),
    h('div',{className:'login-card'},
      h('h2',{},'Sign in'), errDiv,
      h('div',{className:'field'},h('label',{},'Username'),uInp),
      h('div',{className:'field'},h('label',{},'Password'),pInp),
      btn,
      h('p',{style:'text-align:center;color:var(--muted);font-size:12px;margin-top:14px;margin-bottom:0'},'Default: admin / admin123')
    )
  ));
  return wrap;
}

// ── APP SHELL ──────────────────────────────────────────────────────
function renderApp() {
  const user = STATE.user;
  const isAdmin = user.role==='admin';
  const adminTabs = [{id:'overview',label:'Overview',icon:'chart'},{id:'leads',label:'All Leads',icon:'phone'},{id:'assign',label:'Assign',icon:'assign'},{id:'import',label:'Import',icon:'upload'},{id:'staff',label:'Staff',icon:'users'}];
  const staffTabs = [{id:'dialer',label:'📞 Dialer',icon:'dialer'},{id:'myLeads',label:'My Leads',icon:'phone'},{id:'followups',label:'Follow-ups',icon:'cal'},{id:'stats',label:'My Stats',icon:'chart'}];
  const tabs = isAdmin ? adminTabs : staffTabs;
  if (!tabs.find(t=>t.id===STATE.tab)) STATE.tab = tabs[0].id;

  const topbar = h('div',{className:'topbar'},
    h('div',{className:'topbar-brand'},h('div',{className:'brand-logo'},'📞 Macto CRM'),h('span',{className:`role-badge ${user.role}`},user.role.toUpperCase())),
    h('div',{className:'topbar-right'},
      h('span',{className:'topbar-user'},'Hi, '+user.name),
      h('button',{className:'btn btn-ghost btn-sm',onClick:async()=>{await api.post('/logout');STATE.user=null;render();}},icon('logout',14),'Logout')
    )
  );

  const sidebar = h('div',{className:'sidebar'},...tabs.map(t=>h('button',{className:'nav-item'+(STATE.tab===t.id?' active':''),onClick:()=>{STATE.tab=t.id;render();}},icon(t.icon,16),t.label)));
  const mobileNav = h('div',{className:'sidebar-mobile'},...tabs.map(t=>h('button',{className:'nav-item-mob'+(STATE.tab===t.id?' active':''),onClick:()=>{STATE.tab=t.id;render();}},icon(t.icon,18),t.label)));
  const main = h('div',{className:'main',id:'main-content'});
  const shell = h('div',{},topbar,h('div',{className:'layout'},sidebar,main),mobileNav);

  requestAnimationFrame(()=>{
    if(isAdmin){
      if(STATE.tab==='overview') renderOverview(main);
      else if(STATE.tab==='leads') renderAdminLeads(main);
      else if(STATE.tab==='assign') renderAssign(main);
      else if(STATE.tab==='import') renderImport(main);
      else if(STATE.tab==='staff') renderStaff(main);
    } else {
      if(STATE.tab==='dialer') renderDialer(main);
      else if(STATE.tab==='myLeads') renderMyLeads(main);
      else if(STATE.tab==='followups') renderFollowups(main);
      else if(STATE.tab==='stats') renderMyStats(main);
    }
  });
  return shell;
}

// ══════════════════════════════════════════════════════
// STAFF: AUTO DIALER
// ══════════════════════════════════════════════════════
async function renderDialer(container) {
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const r = await api.get('/leads?limit=1&status=pending');
  const leads = r.ok ? r.data : [];
  container.innerHTML='';

  if(!leads.length) {
    container.appendChild(h('div',{style:'text-align:center;padding:60px 20px'},
      h('div',{style:'font-size:48px;margin-bottom:16px'},'🎉'),
      h('div',{style:'font-size:20px;font-weight:700;margin-bottom:8px'},'All calls done!'),
      h('p',{style:'color:var(--muted)'},'No more pending leads to call.')
    ));
    return;
  }

  let currentLead = leads[0];
  let callIndex = 0;

  const dialerCard = h('div',{style:'max-width:500px;margin:0 auto'});
  container.appendChild(dialerCard);
  showDialer(currentLead);

  function showDialer(lead) {
    dialerCard.innerHTML='';
    const st = STATUS_MAP[lead.status||'pending'];

    dialerCard.appendChild(h('div',{style:'text-align:center;margin-bottom:20px'},
      h('div',{style:'color:var(--muted);font-size:13px;margin-bottom:4px'},'NEXT CALL'),
      h('div',{style:'font-size:22px;font-weight:800'},lead.name||'Unknown'),
      h('a',{href:`tel:${lead.phone}`,style:'display:block;font-size:28px;font-weight:800;color:var(--accent2);margin:8px 0;font-family:monospace;text-decoration:none'},'📞 '+lead.phone),
      lead.city?h('div',{style:'color:var(--muted);font-size:13px'},'📍 '+lead.city):null,
      lead.category?h('div',{style:'color:var(--accent2);font-size:13px;margin-top:4px'},'🏷 '+lead.category+(lead.business_type?' · '+lead.business_type:'')):null
    ));

    // Status buttons
    const statusGrid = h('div',{className:'status-grid',style:'margin-bottom:16px'});
    let selectedStatus = '';
    let statusBtns = {};

    STATUSES.filter(s=>s.value!=='pending').forEach(s=>{
      const btn = h('button',{className:'status-btn',style:`color:${s.color};border-color:${s.color}44`},s.label);
      btn.addEventListener('click',()=>{
        selectedStatus=s.value;
        Object.values(statusBtns).forEach(b=>{b.style.background='var(--bg)';b.style.color=b._c;b.style.borderColor=b._c+'44';});
        btn.style.background=s.color; btn.style.color='#fff'; btn.style.borderColor=s.color;
        if(s.value==='callback') cbRow.style.display=''; else cbRow.style.display='none';
      });
      btn._c=s.color;
      statusGrid.appendChild(btn);
      statusBtns[s.value]=btn;
    });

    const cbDateInp = h('input',{type:'date',className:'inp'});
    const cbRow = h('div',{className:'field',style:'display:none'},h('label',{},'Follow-up Date'),cbDateInp);
    const noteInp = h('textarea',{className:'inp',rows:2,placeholder:'Note / Remarks (optional)'});
    const saveBtn = h('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;font-size:16px;padding:12px',onClick:saveAndNext},'Save & Next Call →');
    const skipBtn = h('button',{className:'btn btn-ghost',style:'width:100%;justify-content:center;margin-top:8px',onClick:skipLead},'Skip this lead');

    const msgDiv = h('div',{});

    async function saveAndNext() {
      if(!selectedStatus){msgDiv.className='alert alert-error';msgDiv.textContent='Select a call outcome first!';return;}
      saveBtn.disabled=true; saveBtn.textContent='Saving…';
      const body={status:selectedStatus,note:noteInp.value};
      if(selectedStatus==='callback'&&cbDateInp.value) body.callback_date=cbDateInp.value;
      const r=await api.post('/leads/'+lead.id+'/log',body);
      if(r.ok){
        callIndex++;
        if(r.nextLead){ currentLead=r.nextLead; showDialer(r.nextLead); }
        else { dialerCard.innerHTML=''; dialerCard.appendChild(h('div',{style:'text-align:center;padding:60px 20px'},h('div',{style:'font-size:48px'},'🎉'),h('div',{style:'font-size:20px;font-weight:700;margin-top:12px'},'All pending calls done!'),h('p',{style:'color:var(--muted)'},'Total calls today: '+callIndex))); }
      } else { msgDiv.className='alert alert-error';msgDiv.textContent=r.error; saveBtn.disabled=false; saveBtn.textContent='Save & Next Call →'; }
    }

    async function skipLead() {
      const r=await api.get('/leads/next?after_id='+lead.id);
      if(r.ok&&r.data){ currentLead=r.data; showDialer(r.data); }
      else { dialerCard.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted)">No more leads to call.</div>'; }
    }

    // Call history
    const histDiv = h('div',{className:'call-history',style:'margin-top:12px'});
    api.get('/leads/'+lead.id+'/logs').then(r=>{
      if(r.ok&&r.data.length){
        r.data.forEach(log=>{
          const st=STATUS_MAP[log.status||'pending'];
          histDiv.appendChild(h('div',{className:'call-entry'},
            h('div',{className:'call-entry-top'},h('span',{style:`color:${st.color};font-weight:600`},st.label),h('span',{style:'color:var(--muted)'},formatDate(log.call_date))),
            log.note?h('div',{className:'call-entry-note'},log.note):null
          ));
        });
      }
    });

    dialerCard.appendChild(h('div',{className:'card'},
      h('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px'},
        h('div',{className:'section-label'},'CALL OUTCOME'),
        h('div',{style:'color:var(--muted);font-size:12px'},'Call #'+(callIndex+1))
      ),
      statusGrid, cbRow,
      h('div',{className:'field'},h('label',{},'Note'),noteInp),
      msgDiv, saveBtn, skipBtn,
      h('div',{className:'section-label',style:'margin-top:16px;margin-bottom:8px'},'CALL HISTORY'),
      histDiv
    ));
  }
}

// ══════════════════════════════════════════════════════
// STAFF: MY LEADS (list view)
// ══════════════════════════════════════════════════════
async function renderMyLeads(container) {
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const filterR=await api.get('/leads/filters');
  const filterOpts=filterR.ok?filterR:{categories:[],business_types:[]};
  container.innerHTML='';
  container.appendChild(h('div',{className:'page-title'},'My Leads'));

  let filters={search:'',status:'all',category:'all',business_type:'all'};

  const pillsRow=h('div',{className:'status-pills'});
  const allPill=h('button',{className:'pill',style:'background:var(--accent);color:#fff;border-color:var(--accent)'},'All');
  allPill.addEventListener('click',()=>{filters.status='all';refreshPills();load();});
  pillsRow.appendChild(allPill);
  let pillMap={all:allPill};
  STATUSES.forEach(s=>{
    const p=h('button',{className:'pill',style:`color:${s.color};border-color:${s.color}33`},s.label);
    p.addEventListener('click',()=>{filters.status=s.value;refreshPills();load();});
    pillsRow.appendChild(p); pillMap[s.value]=p;
  });
  container.appendChild(pillsRow);

  function refreshPills(){
    Object.entries(pillMap).forEach(([k,b])=>{
      const s=STATUS_MAP[k]||{color:'var(--accent)'};
      if(k===filters.status||(k==='all'&&filters.status==='all')){b.style.background=k==='all'?'var(--accent)':s.color;b.style.color='#fff';}
      else{b.style.background='var(--bg3)';b.style.color=k==='all'?'var(--accent)':s.color;}
    });
  }

  const searchInp=h('input',{type:'search',className:'inp inp-sm',placeholder:'Search…',style:'flex:1;min-width:150px'});
  const catSel=h('select',{className:'inp inp-sm'},h('option',{value:'all'},'All Category'),h('option',{value:'Business'},'Business'),h('option',{value:'Individual'},'Individual'),...filterOpts.categories.filter(c=>!['Business','Individual'].includes(c)).map(c=>h('option',{value:c},c)));
  container.appendChild(h('div',{className:'filters-bar'},searchInp,catSel));

  const listArea=h('div',{});
  container.appendChild(listArea);
  let activeModal=null;

  async function load() {
    listArea.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
    const params=new URLSearchParams({limit:200,search:filters.search,status:filters.status,category:filters.category});
    const r=await api.get('/leads?'+params);
    const leads=r.ok?r.data:[];
    listArea.innerHTML='';
    listArea.appendChild(h('p',{style:'color:var(--muted);font-size:13px;margin-bottom:10px'},`${leads.length} leads`));
    if(!leads.length){listArea.appendChild(h('div',{style:'text-align:center;padding:40px;color:var(--muted)'},'No leads found.'));return;}
    const list=h('div',{className:'lead-list'});
    leads.forEach(lead=>{
      const st=STATUS_MAP[lead.status||'pending'];
      const card=h('div',{className:'lead-card',style:`border-left-color:${st.color}`},
        h('div',{className:'lead-card-top'},
          h('div',{},h('div',{className:'lead-name'},lead.name||'Unknown'),h('div',{className:'lead-phone'},lead.phone),lead.city?h('div',{className:'lead-city'},'📍 '+lead.city):null,lead.category?h('div',{className:'lead-cat'},'🏷 '+lead.category+(lead.business_type?' · '+lead.business_type:'')):null),
          badge(lead.status)
        ),
        lead.last_note?h('div',{className:'lead-note'},'📝 '+lead.last_note):null,
        lead.callback_date?h('div',{className:'lead-callback'},'📅 '+lead.callback_date):null
      );
      card.addEventListener('click',()=>{
        if(activeModal)activeModal.remove();
        activeModal=renderCallModal(lead,()=>{if(activeModal){activeModal.remove();activeModal=null;}load();},()=>{if(activeModal){activeModal.remove();activeModal=null;}});
        document.body.appendChild(activeModal);
      });
      list.appendChild(card);
    });
    listArea.appendChild(list);
  }

  let t;
  searchInp.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(()=>{filters.search=searchInp.value;load();},400);});
  catSel.addEventListener('change',()=>{filters.category=catSel.value;load();});
  load();
}

// ══════════════════════════════════════════════════════
// STAFF: FOLLOW-UPS
// ══════════════════════════════════════════════════════
async function renderFollowups(container) {
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const r=await api.get('/leads?limit=500');
  const leads=r.ok?r.data:[];
  const today=new Date().toISOString().slice(0,10);
  container.innerHTML='';
  container.appendChild(h('div',{className:'page-title'},'Follow-ups'));

  const withDate=leads.filter(l=>l.callback_date);
  const overdue=withDate.filter(l=>l.callback_date<today&&l.status!=='converted');
  const todayL=withDate.filter(l=>l.callback_date===today);
  const upcoming=withDate.filter(l=>l.callback_date>today);
  let activeModal=null;

  function openModal(lead){
    if(activeModal)activeModal.remove();
    activeModal=renderCallModal(lead,()=>{if(activeModal){activeModal.remove();activeModal=null;}renderFollowups(container);},()=>{if(activeModal){activeModal.remove();activeModal=null;}});
    document.body.appendChild(activeModal);
  }

  function section(title,items,color){
    const sec=h('div',{style:'margin-bottom:24px'});
    sec.appendChild(h('div',{className:'section-label',style:`color:${color}`},title+` (${items.length})`));
    if(!items.length){sec.appendChild(h('p',{style:'color:var(--muted);font-size:13px'},'None.'));return sec;}
    const list=h('div',{className:'lead-list'});
    items.forEach(l=>{
      const st=STATUS_MAP[l.status||'pending'];
      const card=h('div',{className:'lead-card',style:`border-left-color:${color};cursor:pointer`},
        h('div',{className:'lead-card-top'},
          h('div',{},h('div',{className:'lead-name'},l.name),h('div',{className:'lead-phone'},l.phone),l.category?h('div',{className:'lead-cat'},'🏷 '+l.category):null),
          h('div',{style:'text-align:right'},badge(l.status),h('div',{style:`color:${color};font-size:12px;margin-top:4px`},'📅 '+l.callback_date))
        ),
        l.last_note?h('div',{className:'lead-note'},'📝 '+l.last_note):null
      );
      card.addEventListener('click',()=>openModal(l));
      list.appendChild(card);
    });
    sec.appendChild(list);
    return sec;
  }

  container.appendChild(section('🔴 Overdue',overdue,'#ef4444'));
  container.appendChild(section('🟡 Today',todayL,'#f59e0b'));
  container.appendChild(section('🟢 Upcoming',upcoming,'#22c55e'));
}

// ══════════════════════════════════════════════════════
// STAFF: MY STATS (with today/week/month analytics)
// ══════════════════════════════════════════════════════
async function renderMyStats(container) {
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const r=await api.get('/leads/stats');
  container.innerHTML='';
  container.appendChild(h('div',{className:'page-title'},'My Stats'));

  const s=r.ok?r:{total:0,byStatus:[],todayCalls:0,weekCalls:0,monthCalls:0,meetings:0};
  const byStatus=Object.fromEntries((s.byStatus||[]).map(x=>[x.status,parseInt(x.cnt)]));

  // Activity cards
  const actGrid=h('div',{className:'stats-grid'});
  [
    {label:'Calls Today',val:s.todayCalls||0,color:'#6366f1'},
    {label:'Calls This Week',val:s.weekCalls||0,color:'#3b82f6'},
    {label:'Calls This Month',val:s.monthCalls||0,color:'#8b5cf6'},
    {label:'Meetings Scheduled',val:s.meetings||byStatus['meeting_scheduled']||0,color:'#06b6d4'},
    {label:'Interested',val:byStatus['interested']||0,color:'#22c55e'},
    {label:'Converted',val:byStatus['converted']||0,color:'#4ade80'},
  ].forEach(c=>{
    actGrid.appendChild(h('div',{className:'stat-card',style:`border-top-color:${c.color}`},
      h('div',{className:'stat-num',style:`color:${c.color}`},String(c.val)),
      h('div',{className:'stat-label'},c.label)
    ));
  });
  container.appendChild(actGrid);

  // Status breakdown
  const card=h('div',{className:'card'});
  card.appendChild(h('div',{className:'card-title'},'Breakdown by Status'));
  const total=s.total||1;
  STATUSES.forEach(st=>{
    const cnt=byStatus[st.value]||0;
    const pct=Math.round((cnt/total)*100);
    card.appendChild(h('div',{className:'progress-row'},
      h('div',{className:'progress-label'},st.label),
      h('div',{className:'progress-bar-wrap'},h('div',{className:'progress-bar',style:`width:${pct}%;background:${st.color}`})),
      h('div',{className:'progress-count',style:`color:${st.color}`},String(cnt))
    ));
  });
  container.appendChild(card);
}

// ══════════════════════════════════════════════════════
// ADMIN: OVERVIEW
// ══════════════════════════════════════════════════════
async function renderOverview(container) {
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const [statsR,staffR]=await Promise.all([api.get('/leads/stats'),api.get('/staff')]);
  const stats=statsR.ok?statsR:{total:0,assigned:0,unassigned:0,byStatus:[]};
  const staffs=staffR.ok?staffR.data:[];
  container.innerHTML='';
  container.appendChild(h('div',{className:'page-title'},'Overview'));

  const byStatus=Object.fromEntries((stats.byStatus||[]).map(s=>[s.status,parseInt(s.cnt)]));
  const grid=h('div',{className:'stats-grid'});
  [{label:'Total Leads',val:stats.total,color:'#6366f1'},{label:'Assigned',val:stats.assigned,color:'#3b82f6'},{label:'Unassigned',val:stats.unassigned,color:'#f59e0b'},{label:'Interested',val:byStatus['interested']||0,color:'#22c55e'},{label:'Meetings',val:byStatus['meeting_scheduled']||0,color:'#06b6d4'},{label:'Converted',val:byStatus['converted']||0,color:'#4ade80'},{label:'Staff',val:staffs.length,color:'#8b5cf6'}].forEach(c=>{
    grid.appendChild(h('div',{className:'stat-card',style:`border-top-color:${c.color}`},h('div',{className:'stat-num',style:`color:${c.color}`},String(c.val)),h('div',{className:'stat-label'},c.label)));
  });
  container.appendChild(grid);

  if(staffs.length){
    const perfCard=h('div',{className:'card'});
    perfCard.appendChild(h('div',{className:'card-title'},'👥 Staff Performance'));
    const tw=h('div',{className:'table-wrap'});
    const tbl=h('table',{},h('thead',{},h('tr',{},...['Staff','Assigned','Called','Interested','Meetings','Converted'].map(c=>h('th',{},c)))),h('tbody',{id:'perf-tbody'}));
    tw.appendChild(tbl); perfCard.appendChild(tw); container.appendChild(perfCard);
    (async()=>{
      const leadsR=await api.get('/leads?limit=10000');
      const all=leadsR.ok?leadsR.data:[];
      const tbody=tbl.querySelector('#perf-tbody');
      staffs.forEach(s=>{
        const mine=all.filter(l=>l.assigned_to===s.id);
        const called=mine.filter(l=>l.status&&l.status!=='pending').length;
        tbody.appendChild(h('tr',{},h('td',{className:'td-name'},s.name),h('td',{style:'color:#6366f1;font-weight:700'},String(mine.length)),h('td',{style:'color:#3b82f6'},String(called)),h('td',{style:'color:#22c55e'},String(mine.filter(l=>l.status==='interested').length)),h('td',{style:'color:#06b6d4'},String(mine.filter(l=>l.status==='meeting_scheduled').length)),h('td',{style:'color:#4ade80'},String(mine.filter(l=>l.status==='converted').length))));
      });
    })();
  }

  const statusCard=h('div',{className:'card'});
  statusCard.appendChild(h('div',{className:'card-title'},'📊 Status Breakdown'));
  const total=stats.total||1;
  STATUSES.forEach(s=>{
    const cnt=byStatus[s.value]||0;
    const pct=Math.round((cnt/total)*100);
    statusCard.appendChild(h('div',{className:'progress-row'},h('div',{className:'progress-label'},s.label),h('div',{className:'progress-bar-wrap'},h('div',{className:'progress-bar',style:`width:${pct}%;background:${s.color}`})),h('div',{className:'progress-count',style:`color:${s.color}`},String(cnt))));
  });
  container.appendChild(statusCard);
}

// ══════════════════════════════════════════════════════
// ADMIN: ALL LEADS
// ══════════════════════════════════════════════════════
async function renderAdminLeads(container) {
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  let page=1, filters={search:'',status:'all',category:'all',business_type:'all',assigned:'all'};
  let staffs=[], filterOpts={categories:[],business_types:[]};
  const [staffR,filterR]=await Promise.all([api.get('/staff'),api.get('/leads/filters')]);
  if(staffR.ok)staffs=staffR.data;
  if(filterR.ok)filterOpts=filterR;
  container.innerHTML='';
  container.appendChild(h('div',{className:'page-title'},'All Leads'));

  const searchInp=h('input',{type:'search',className:'inp inp-sm',placeholder:'Search…',style:'flex:1;min-width:200px'});
  const statusSel=h('select',{className:'inp inp-sm'},h('option',{value:'all'},'All Status'),...STATUSES.map(s=>h('option',{value:s.value},s.label)));
  const catSel=h('select',{className:'inp inp-sm'},h('option',{value:'all'},'All Category'),h('option',{value:'Business'},'Business'),h('option',{value:'Individual'},'Individual'),h('option',{value:'Corporate'},'Corporate'),h('option',{value:'SME'},'SME'),...filterOpts.categories.filter(c=>!['Business','Individual','Corporate','SME'].includes(c)).map(c=>h('option',{value:c},c)));
  const bizSel=h('select',{className:'inp inp-sm'},h('option',{value:'all'},'All Biz Type'),...filterOpts.business_types.map(b=>h('option',{value:b},b)));
  const staffSel=h('select',{className:'inp inp-sm'},h('option',{value:'all'},'All Staff'),h('option',{value:'unassigned'},'Unassigned'),...staffs.map(s=>h('option',{value:s.id},s.name)));
  container.appendChild(h('div',{className:'filters-bar'},searchInp,statusSel,catSel,bizSel,staffSel));

  const tableArea=h('div',{});
  container.appendChild(tableArea);
  let editModal=null;

  async function load(){
    tableArea.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
    const params=new URLSearchParams({page,limit:50,search:filters.search,status:filters.status,category:filters.category,business_type:filters.business_type,assigned:filters.assigned});
    const r=await api.get('/leads?'+params);
    if(!r.ok){tableArea.innerHTML='<p style="color:var(--muted);padding:20px">Error loading.</p>';return;}
    tableArea.innerHTML='';
    const tw=h('div',{className:'table-wrap'});
    const tbl=h('table',{},h('thead',{},h('tr',{},...['Name','Phone','City','Category','Status','Assigned To','Actions'].map(c=>h('th',{className:['City','Category'].includes(c)?'hide-mobile':''},c)))),h('tbody',{}));
    const tbody=tbl.querySelector('tbody');
    if(!r.data.length){tbody.appendChild(h('tr',{className:'empty-row'},h('td',{colSpan:7},'No leads found.')));}
    else r.data.forEach(lead=>{
      const st=staffs.find(s=>s.id===lead.assigned_to);
      const tr=h('tr',{},
        h('td',{className:'td-name'},lead.name||'—'),
        h('td',{className:'td-phone'},lead.phone||'—'),
        h('td',{className:'td-muted hide-mobile'},lead.city||'—'),
        h('td',{className:'hide-mobile',style:'color:var(--accent2);font-size:12px'},lead.category||'—'),
        h('td',{}),
        h('td',{className:'td-muted',style:'font-size:12px'},st?st.name:h('span',{style:'color:var(--muted)'},'Unassigned')),
        h('td',{},h('div',{style:'display:flex;gap:6px'},
          h('button',{className:'btn btn-ghost btn-xs',onClick:()=>openEdit(lead)},'Edit'),
          h('button',{className:'btn btn-danger btn-xs',onClick:async()=>{if(!confirm('Delete?'))return;await api.del('/leads/'+lead.id);load();}},'Del')
        ))
      );
      tr.children[4].appendChild(badge(lead.status));
      tbody.appendChild(tr);
    });
    tw.appendChild(tbl); tableArea.appendChild(tw);
    if(r.pages>1){
      const pag=h('div',{className:'pagination'});
      if(page>1)pag.appendChild(h('button',{className:'page-btn',onClick:()=>{page--;load();}},'← Prev'));
      pag.appendChild(h('span',{className:'page-info'},`Page ${r.page} of ${r.pages} · ${r.total} leads`));
      if(page<r.pages)pag.appendChild(h('button',{className:'page-btn',onClick:()=>{page++;load();}},'Next →'));
      tableArea.appendChild(pag);
    } else tableArea.appendChild(h('p',{style:'color:var(--muted);font-size:12px;margin-top:10px'},r.total+' leads'));
  }

  function openEdit(lead){
    if(editModal)editModal.remove();
    const fields=[['name','Name'],['phone','Phone'],['email','Email'],['city','City'],['category','Category'],['business_type','Business Type']];
    const inputs={};
    fields.forEach(([f])=>inputs[f]=h('input',{type:'text',className:'inp',value:lead[f]||''}));
    const staffSel2=h('select',{className:'inp'},h('option',{value:''},'Unassigned'),...staffs.map(s=>h('option',{value:s.id},s.name)));
    if(lead.assigned_to)staffSel2.value=lead.assigned_to;
    const statusSel2=h('select',{className:'inp'},...STATUSES.map(s=>h('option',{value:s.value},s.label)));
    statusSel2.value=lead.status||'pending';
    const mDiv=h('div',{});
    editModal=h('div',{className:'modal-overlay center'},
      h('div',{className:'modal center-modal'},
        h('div',{className:'modal-header'},h('span',{className:'modal-title'},'Edit Lead'),h('button',{className:'modal-close',onClick:()=>{editModal.remove();editModal=null;}},'✕')),
        mDiv,
        h('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:10px'},...fields.map(([f,l])=>h('div',{className:'field',style:'margin:0'},h('label',{},l),inputs[f]))),
        h('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px'},
          h('div',{className:'field',style:'margin:0'},h('label',{},'Status'),statusSel2),
          h('div',{className:'field',style:'margin:0'},h('label',{},'Assigned To'),staffSel2)
        ),
        h('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:14px',onClick:async()=>{
          const body={};fields.forEach(([f])=>body[f]=inputs[f].value);
          body.status=statusSel2.value;body.assigned_to=staffSel2.value?parseInt(staffSel2.value):null;
          const r=await api.put('/leads/'+lead.id,body);
          if(r.ok){editModal.remove();editModal=null;load();}
          else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
        }},'Save Changes')
      )
    );
    editModal.addEventListener('click',e=>{if(e.target===editModal){editModal.remove();editModal=null;}});
    document.body.appendChild(editModal);
  }

  let st; searchInp.addEventListener('input',()=>{clearTimeout(st);st=setTimeout(()=>{filters.search=searchInp.value;page=1;load();},400);});
  statusSel.addEventListener('change',()=>{filters.status=statusSel.value;page=1;load();});
  catSel.addEventListener('change',()=>{filters.category=catSel.value;page=1;load();});
  bizSel.addEventListener('change',()=>{filters.business_type=bizSel.value;page=1;load();});
  staffSel.addEventListener('change',()=>{filters.assigned=staffSel.value;page=1;load();});
  load();
}

// ══════════════════════════════════════════════════════
// ADMIN: ASSIGN
// ══════════════════════════════════════════════════════
async function renderAssign(container) {
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const staffR=await api.get('/staff');
  const staffs=staffR.ok?staffR.data:[];
  container.innerHTML='';
  container.appendChild(h('div',{className:'page-title'},'Assign Leads'));

  const staffSel=h('select',{className:'inp'},h('option',{value:''},'Select staff…'),...staffs.map(s=>h('option',{value:s.id},`${s.name} (${s.username})`)));
  const assignBtn=h('button',{className:'btn btn-primary',onClick:doAssign},icon('assign',15),'Assign Selected');
  const msgDiv=h('div',{});
  const ctrlCard=h('div',{className:'card',style:'margin-bottom:16px'});
  ctrlCard.appendChild(h('div',{className:'card-title'},'Bulk Assign'));
  ctrlCard.appendChild(h('div',{style:'display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end'},h('div',{style:'flex:1;min-width:200px'},h('label',{style:'display:block;font-size:12px;color:var(--muted2);margin-bottom:5px'},'Assign to Staff'),staffSel),assignBtn));
  ctrlCard.appendChild(msgDiv);
  container.appendChild(ctrlCard);

  const searchInp=h('input',{type:'search',className:'inp inp-sm',placeholder:'Search unassigned leads…',style:'flex:1;min-width:180px'});
  const filterR=await api.get('/leads/filters');
  const catSel=h('select',{className:'inp inp-sm'},h('option',{value:'all'},'All Category'),h('option',{value:'Business'},'Business'),h('option',{value:'Individual'},'Individual'),...(filterR.ok?filterR.categories:[]).filter(c=>!['Business','Individual'].includes(c)).map(c=>h('option',{value:c},c)));
  container.appendChild(h('div',{className:'filters-bar'},searchInp,catSel));

  const tableArea=h('div',{});
  container.appendChild(tableArea);
  const selectedIds=new Set();
  let filters={search:'',category:'all'};

  async function load(){
    tableArea.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
    const params=new URLSearchParams({assigned:'unassigned',limit:200,search:filters.search,category:filters.category});
    const r=await api.get('/leads?'+params);
    const leads=r.ok?r.data:[];
    tableArea.innerHTML='';
    const selLabel=h('p',{style:'color:var(--muted);font-size:13px;margin-bottom:8px'},`${leads.length} unassigned · ${selectedIds.size} selected`);
    tableArea.appendChild(selLabel);
    const tw=h('div',{className:'table-wrap'});
    const allCheck=h('input',{type:'checkbox'});
    const tbl=h('table',{},h('thead',{},h('tr',{},h('th',{style:'width:40px'},allCheck),...['Name','Phone','Category'].map(c=>h('th',{},c)))),h('tbody',{}));
    const tbody=tbl.querySelector('tbody');
    allCheck.addEventListener('change',()=>{leads.forEach(l=>allCheck.checked?selectedIds.add(l.id):selectedIds.delete(l.id));tbody.querySelectorAll('input[type=checkbox]').forEach(c=>c.checked=allCheck.checked);selLabel.textContent=`${leads.length} unassigned · ${selectedIds.size} selected`;});
    leads.forEach(l=>{
      const cb=h('input',{type:'checkbox'}); cb.checked=selectedIds.has(l.id);
      cb.addEventListener('change',()=>{cb.checked?selectedIds.add(l.id):selectedIds.delete(l.id);selLabel.textContent=`${leads.length} unassigned · ${selectedIds.size} selected`;});
      tbody.appendChild(h('tr',{},h('td',{},cb),h('td',{className:'td-name'},l.name||'—'),h('td',{className:'td-phone'},l.phone),h('td',{style:'color:var(--accent2);font-size:12px'},l.category||'—')));
    });
    tw.appendChild(tbl); tableArea.appendChild(tw);
  }

  async function doAssign(){
    if(!staffSel.value){msgDiv.className='alert alert-error';msgDiv.textContent='Select a staff member.';return;}
    if(!selectedIds.size){msgDiv.className='alert alert-error';msgDiv.textContent='Select at least one lead.';return;}
    assignBtn.disabled=true;
    const r=await api.post('/leads/assign',{lead_ids:[...selectedIds],staff_id:parseInt(staffSel.value)});
    assignBtn.disabled=false;
    if(r.ok){const s=staffs.find(x=>x.id==staffSel.value);msgDiv.className='alert alert-success';msgDiv.textContent=`✓ ${r.count} leads assigned to ${s?.name}.`;selectedIds.clear();setTimeout(()=>{msgDiv.className='';msgDiv.textContent='';},4000);load();}
    else{msgDiv.className='alert alert-error';msgDiv.textContent=r.error;}
  }

  let t; searchInp.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(()=>{filters.search=searchInp.value;load();},400);});
  catSel.addEventListener('change',()=>{filters.category=catSel.value;load();});
  load();
}

// ══════════════════════════════════════════════════════
// ADMIN: IMPORT
// ══════════════════════════════════════════════════════
function renderImport(container) {
  container.innerHTML='';
  container.appendChild(h('div',{className:'page-title'},'Import Leads'));
  let headers=[],previewRows=[],totalRows=0,uploadedFile=null;
  let mapping={name:'',phone:'',email:'',city:'',state:'',category:'',business_type:''};
  const msgDiv=h('div',{});
  const step2=h('div',{style:'display:none'});
  const fileInput=h('input',{type:'file',accept:'.csv,.xlsx,.xls',style:'display:none'});
  const dropzone=h('div',{className:'dropzone'},icon('upload',32),h('p',{},'Click to upload CSV / Excel (.xlsx, .xls)'),h('p',{style:'font-size:11px;color:var(--muted);margin-top:4px'},'Max 10MB'));
  dropzone.addEventListener('click',()=>fileInput.click());
  dropzone.addEventListener('dragover',e=>{e.preventDefault();dropzone.classList.add('drag');});
  dropzone.addEventListener('dragleave',()=>dropzone.classList.remove('drag'));
  dropzone.addEventListener('drop',e=>{e.preventDefault();dropzone.classList.remove('drag');handleFile(e.dataTransfer.files[0]);});
  fileInput.addEventListener('change',()=>handleFile(fileInput.files[0]));
  const catInp=h('input',{type:'text',className:'inp',placeholder:'e.g. Business, Individual…'});
  const sourceInp=h('input',{type:'text',className:'inp',placeholder:'e.g. Kerala_Batch1'});
  const uploadCard=h('div',{className:'card'},h('div',{className:'card-title'},'1. Upload File'),fileInput,dropzone,h('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px'},h('div',{className:'field',style:'margin:0'},h('label',{},'Default Category'),catInp),h('div',{className:'field',style:'margin:0'},h('label',{},'Batch Name'),sourceInp)));
  container.appendChild(uploadCard);
  container.appendChild(msgDiv);
  const mapGrid=h('div',{className:'map-grid'});
  const previewDiv=h('div',{});
  const importBtn=h('button',{className:'btn btn-success',style:'margin-top:16px',onClick:doImport},icon('upload',15),'Import All Leads');
  step2.appendChild(h('div',{className:'card'},h('div',{className:'card-title'},'2. Map Columns'),mapGrid));
  step2.appendChild(h('div',{className:'card',style:'margin-top:12px'},h('div',{className:'card-title'},'3. Preview'),previewDiv));
  step2.appendChild(importBtn);
  container.appendChild(step2);

  async function handleFile(file){
    if(!file)return; uploadedFile=file;
    dropzone.innerHTML=''; dropzone.appendChild(icon('check',24)); dropzone.appendChild(h('p',{},file.name)); dropzone.style.borderColor='var(--green)';
    msgDiv.className='alert alert-info'; msgDiv.textContent='Parsing…';
    const fd=new FormData(); fd.append('file',file);
    const r=await api.upload('/import/preview',fd);
    if(!r.ok){msgDiv.className='alert alert-error';msgDiv.textContent=r.error;return;}
    msgDiv.className=''; msgDiv.textContent=''; headers=r.headers; previewRows=r.preview; totalRows=r.total;
    headers.forEach(h2=>{const hl=h2.toLowerCase();if(hl.includes('name'))mapping.name=h2;if(hl.includes('phone')||hl.includes('mobile'))mapping.phone=h2;if(hl.includes('email'))mapping.email=h2;if(hl.includes('city'))mapping.city=h2;if(hl.includes('state'))mapping.state=h2;if(hl.includes('categ'))mapping.category=h2;if(hl.includes('biz')||hl.includes('business'))mapping.business_type=h2;});
    mapGrid.innerHTML='';
    [['name','Name *'],['phone','Phone *'],['email','Email'],['city','City'],['state','State'],['category','Category'],['business_type','Business Type']].forEach(([field,label])=>{
      const sel=h('select',{className:'inp inp-sm'},h('option',{value:''},'— skip —'),...headers.map(hd=>{const opt=h('option',{value:hd},hd);if(mapping[field]===hd)opt.selected=true;return opt;}));
      sel.addEventListener('change',()=>{mapping[field]=sel.value;updatePreview();});
      mapGrid.appendChild(h('div',{className:'field',style:'margin:0'},h('label',{},label),sel));
    });
    updatePreview(); step2.style.display=''; importBtn.textContent=`Import ${totalRows} Leads`;
  }

  function updatePreview(){
    previewDiv.innerHTML='';
    const activeFields=Object.keys(mapping).filter(k=>mapping[k]);
    const tbl=h('table',{className:'preview-table'},h('thead',{},h('tr',{},...activeFields.map(k=>h('th',{},k)))),h('tbody',{}));
    const tbody=tbl.querySelector('tbody');
    previewRows.forEach(row=>tbody.appendChild(h('tr',{},...activeFields.map(k=>h('td',{style:'color:var(--muted2)'},String(row[mapping[k]]||'—'))))));
    previewDiv.appendChild(tbl);
  }

  async function doImport(){
    if(!uploadedFile){msgDiv.className='alert alert-error';msgDiv.textContent='No file.';return;}
    importBtn.disabled=true; importBtn.textContent='Importing…';
    const fd=new FormData(); fd.append('file',uploadedFile); fd.append('mapping',JSON.stringify(mapping)); fd.append('category',catInp.value); fd.append('source',sourceInp.value||uploadedFile.name);
    const r=await api.upload('/import',fd);
    importBtn.disabled=false;
    if(r.ok){msgDiv.className='alert alert-success';msgDiv.textContent=`✓ ${r.count} leads imported!`;step2.style.display='none';uploadedFile=null;dropzone.innerHTML='';dropzone.appendChild(icon('upload',32));dropzone.appendChild(h('p',{},'Click to upload CSV / Excel'));dropzone.style.borderColor='';}
    else{msgDiv.className='alert alert-error';msgDiv.textContent=r.error;}
  }
}

// ══════════════════════════════════════════════════════
// ADMIN: STAFF
// ══════════════════════════════════════════════════════
async function renderStaff(container) {
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const r=await api.get('/staff');
  const staffs=r.ok?r.data:[];
  container.innerHTML='';
  container.appendChild(h('div',{className:'page-title'},'Manage Staff'));
  const nInp=h('input',{type:'text',className:'inp',placeholder:'Full Name'});
  const uInp=h('input',{type:'text',className:'inp',placeholder:'Username'});
  const pInp=h('input',{type:'password',className:'inp',placeholder:'Password'});
  const addBtn=h('button',{className:'btn btn-primary',onClick:addStaff},icon('plus',15),'Add Staff');
  const formMsg=h('div',{});
  container.appendChild(h('div',{className:'card',style:'margin-bottom:16px'},h('div',{className:'card-title'},'Add New Staff'),h('div',{style:'display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:12px'},h('div',{className:'field',style:'margin:0'},h('label',{},'Full Name'),nInp),h('div',{className:'field',style:'margin:0'},h('label',{},'Username'),uInp),h('div',{className:'field',style:'margin:0'},h('label',{},'Password'),pInp)),formMsg,addBtn));

  const tableArea=h('div',{});
  container.appendChild(tableArea);
  renderTable(staffs);

  function renderTable(list){
    tableArea.innerHTML='';
    const tw=h('div',{className:'table-wrap'});
    const tbl=h('table',{},h('thead',{},h('tr',{},...['Name','Username','Leads','Actions'].map(c=>h('th',{},c)))),h('tbody',{}));
    const tbody=tbl.querySelector('tbody');
    if(!list.length)tbody.appendChild(h('tr',{className:'empty-row'},h('td',{colSpan:4},'No staff added yet.')));
    list.forEach(s=>{
      tbody.appendChild(h('tr',{},h('td',{className:'td-name'},s.name),h('td',{style:'font-family:monospace;color:var(--muted2)'},s.username),h('td',{style:'color:var(--accent)'},String(s.leadCount||0)),h('td',{},h('div',{style:'display:flex;gap:6px'},h('button',{className:'btn btn-ghost btn-xs',onClick:()=>openEditStaff(s)},'Edit'),h('button',{className:'btn btn-danger btn-xs',onClick:async()=>{if(!confirm(`Remove ${s.name}?`))return;await api.del('/staff/'+s.id);renderStaff(container);}},'Remove')))));
    });
    tw.appendChild(tbl); tableArea.appendChild(tw);
  }

  async function addStaff(){
    if(!nInp.value||!uInp.value||!pInp.value){formMsg.className='alert alert-error';formMsg.textContent='All fields required.';return;}
    addBtn.disabled=true;
    const r=await api.post('/staff',{name:nInp.value,username:uInp.value,password:pInp.value});
    addBtn.disabled=false;
    if(r.ok){formMsg.className='alert alert-success';formMsg.textContent='✓ Staff added. Share URL + credentials.';nInp.value='';uInp.value='';pInp.value='';setTimeout(()=>renderStaff(container),2000);}
    else{formMsg.className='alert alert-error';formMsg.textContent=r.error;}
  }

  function openEditStaff(s){
    const nI=h('input',{type:'text',className:'inp',value:s.name});
    const uI=h('input',{type:'text',className:'inp',value:s.username});
    const pI=h('input',{type:'password',className:'inp',placeholder:'Leave blank to keep'});
    const mDiv=h('div',{});
    const modal=h('div',{className:'modal-overlay center'},
      h('div',{className:'modal center-modal'},
        h('div',{className:'modal-header'},h('span',{className:'modal-title'},'Edit Staff'),h('button',{className:'modal-close',onClick:()=>modal.remove()},'✕')),
        mDiv,
        h('div',{className:'field'},h('label',{},'Name'),nI),
        h('div',{className:'field'},h('label',{},'Username'),uI),
        h('div',{className:'field'},h('label',{},'New Password'),pI),
        h('button',{className:'btn btn-primary',style:'width:100%;justify-content:center',onClick:async()=>{
          const body={name:nI.value,username:uI.value};if(pI.value)body.password=pI.value;
          const r=await api.put('/staff/'+s.id,body);
          if(r.ok){modal.remove();renderStaff(container);}else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
        }},'Save Changes')
      )
    );
    modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
    document.body.appendChild(modal);
  }
}

// ══════════════════════════════════════════════════════
// CALL MODAL (used in My Leads & Follow-ups)
// ══════════════════════════════════════════════════════
function renderCallModal(lead, onSave, onClose) {
  let selectedStatus=lead.status||'pending';
  let statusBtns={};
  const cbDateInp=h('input',{type:'date',className:'inp',value:lead.callback_date||''});
  const noteInp=h('textarea',{className:'inp',rows:3,placeholder:'What happened? Key points…'});
  const historyDiv=h('div',{className:'call-history'});
  const mDiv=h('div',{});
  const cbRow=h('div',{className:'field',style:`display:${selectedStatus==='callback'?'':'none'}`},h('label',{},'Follow-up Date'),cbDateInp);

  (async()=>{
    const r=await api.get('/leads/'+lead.id+'/logs');
    if(r.ok&&r.data.length)r.data.forEach(log=>{const st=STATUS_MAP[log.status||'pending'];historyDiv.appendChild(h('div',{className:'call-entry'},h('div',{className:'call-entry-top'},h('span',{style:`color:${st.color};font-weight:600`},st.label),h('span',{style:'color:var(--muted)'},formatDate(log.call_date)+(log.staff?(' · '+log.staff.name):''))),log.note?h('div',{className:'call-entry-note'},log.note):null));});
    else historyDiv.innerHTML='<p style="color:var(--muted);font-size:12px">No history yet.</p>';
  })();

  const statusGrid=h('div',{className:'status-grid'});
  STATUSES.filter(s=>s.value!=='pending').forEach(s=>{
    const btn=h('button',{className:'status-btn',style:`color:${s.color};border-color:${s.color}44`},s.label);
    if(selectedStatus===s.value){btn.style.background=s.color;btn.style.color='#fff';btn.style.borderColor=s.color;}
    btn.addEventListener('click',()=>{
      selectedStatus=s.value;
      Object.values(statusBtns).forEach(b=>{b.style.background='var(--bg)';b.style.color=b._c;b.style.borderColor=b._c+'44';});
      btn.style.background=s.color;btn.style.color='#fff';btn.style.borderColor=s.color;
      cbRow.style.display=s.value==='callback'?'':'none';
    });
    btn._c=s.color; statusGrid.appendChild(btn); statusBtns[s.value]=btn;
  });

  const saveBtn=h('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:4px',onClick:async()=>{
    if(!selectedStatus||selectedStatus==='pending'){mDiv.className='alert alert-error';mDiv.textContent='Select a call outcome.';return;}
    saveBtn.disabled=true; saveBtn.textContent='Saving…';
    const body={status:selectedStatus,note:noteInp.value};
    if(selectedStatus==='callback'&&cbDateInp.value)body.callback_date=cbDateInp.value;
    const r=await api.post('/leads/'+lead.id+'/log',body);
    if(r.ok)onSave({...lead,...body});
    else{mDiv.className='alert alert-error';mDiv.textContent=r.error;saveBtn.disabled=false;saveBtn.textContent='Save & Update';}
  }},'Save & Update');

  const modal=h('div',{className:'modal-overlay'},
    h('div',{className:'modal'},
      h('div',{className:'modal-header'},
        h('div',{},h('div',{style:'font-weight:700;font-size:17px'},lead.name||'Lead'),h('a',{href:`tel:${lead.phone}`,className:'tel-link'},'📞 '+lead.phone),lead.city?h('div',{style:'color:var(--muted);font-size:12px;margin-top:2px'},'📍 '+lead.city):null,lead.category?h('div',{style:'color:var(--accent2);font-size:12px'},'🏷 '+lead.category+(lead.business_type?' · '+lead.business_type:'')):null),
        h('button',{className:'modal-close',onClick:onClose},'✕')
      ),
      mDiv,
      h('div',{className:'field'},h('label',{},'Call Outcome'), statusGrid),
      cbRow,
      h('div',{className:'field'},h('label',{},'Note'),noteInp),
      lead.last_note?h('div',{className:'alert alert-info',style:'font-size:12px;margin-bottom:12px'},'Previous: '+lead.last_note):null,
      h('div',{className:'section-label',style:'margin-bottom:8px'},'Call History'),
      historyDiv, saveBtn
    )
  );
  modal.addEventListener('click',e=>{if(e.target===modal)onClose();});
  return modal;
}

// ── Boot ──────────────────────────────────────────────
boot();

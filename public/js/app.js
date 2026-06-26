// ═══════════════════════════════════════════════════════
// MACTO CRM — Frontend SPA
// ═══════════════════════════════════════════════════════

const STATUSES = [
  { value:'pending',        label:'Pending',         color:'#94a3b8' },
  { value:'called',         label:'Called',          color:'#3b82f6' },
  { value:'interested',     label:'Interested',      color:'#22c55e' },
  { value:'not_interested', label:'Not Interested',  color:'#ef4444' },
  { value:'callback',       label:'Call Back',       color:'#f59e0b' },
  { value:'busy',           label:'Busy',            color:'#8b5cf6' },
  { value:'no_answer',      label:'No Answer',       color:'#f97316' },
  { value:'converted',      label:'Converted ✓',    color:'#4ade80' },
  { value:'invalid',        label:'Invalid No.',     color:'#6b7280' },
];
const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.value, s]));

// ── API helper ────────────────────────────────────────────
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

// ── State ─────────────────────────────────────────────────
let STATE = { user: null, tab: 'overview' };

function setState(patch) { STATE = { ...STATE, ...patch }; render(); }

// ── Utils ─────────────────────────────────────────────────
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
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
    phone: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
    users: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    upload: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
    chart: 'M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z',
    logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
    plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    assign: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
    filter: 'M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z',
    check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    note: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
    refresh: 'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
    cal: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
    person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size); svg.setAttribute('height', size);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', paths[name] || '');
  svg.appendChild(p);
  return svg;
}

function showAlert(msg, type = 'success', parent) {
  const div = document.createElement('div');
  div.className = `alert alert-${type}`;
  div.textContent = msg;
  if (parent) { parent.prepend(div); setTimeout(() => div.remove(), 4000); }
  return div;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}
function formatDateOnly(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

// ── Router / Render ───────────────────────────────────────
async function checkSession() {
  const r = await api.get('/me');
  if (r.ok) STATE.user = r.user;
}

async function boot() {
  await checkSession();
  render();
}

function render() {
  const app = document.getElementById('app');
  if (!STATE.user) { app.innerHTML = ''; app.appendChild(renderLogin()); return; }
  app.innerHTML = '';
  app.appendChild(renderApp());
}

// ── LOGIN ─────────────────────────────────────────────────
function renderLogin() {
  const wrap = document.createElement('div');
  wrap.className = 'login-page';

  let errDiv;
  const usernameInp = h('input', { type:'text', className:'inp', placeholder:'Enter username', id:'login-user' });
  const passwordInp = h('input', { type:'password', className:'inp', placeholder:'Enter password', id:'login-pass' });
  const submitBtn = h('button', { className:'btn btn-primary', style:'width:100%;justify-content:center;margin-top:4px;', onClick: doLogin }, 'Sign In');

  errDiv = h('div', { style:'display:none' });

  async function doLogin() {
    submitBtn.disabled = true; submitBtn.textContent = 'Signing in…';
    const r = await api.post('/login', { username: usernameInp.value, password: passwordInp.value });
    if (r.ok) { STATE.user = r.user; render(); }
    else {
      errDiv.className = 'alert alert-error';
      errDiv.textContent = r.error || 'Invalid credentials';
      errDiv.style.display = '';
      submitBtn.disabled = false; submitBtn.textContent = 'Sign In';
    }
  }

  usernameInp.addEventListener('keydown', e => e.key === 'Enter' && doLogin());
  passwordInp.addEventListener('keydown', e => e.key === 'Enter' && doLogin());

  wrap.appendChild(h('div', { className:'login-box' },
    h('div', { className:'login-logo' },
      h('div', { className:'brand-logo' }, '📞 Macto CRM'),
      h('p', {}, 'Telecalling Management System')
    ),
    h('div', { className:'login-card' },
      h('h2', {}, 'Sign in'),
      errDiv,
      h('div', { className:'field' }, h('label', {}, 'Username'), usernameInp),
      h('div', { className:'field' }, h('label', {}, 'Password'), passwordInp),
      submitBtn,
      h('p', { style:'text-align:center;color:var(--muted);font-size:12px;margin-top:14px;margin-bottom:0' }, 'Default: admin / admin123')
    )
  ));
  return wrap;
}

// ── APP SHELL ─────────────────────────────────────────────
function renderApp() {
  const user = STATE.user;
  const isAdmin = user.role === 'admin';

  const adminTabs = [
    { id:'overview', label:'Overview', icon:'chart' },
    { id:'leads',    label:'All Leads', icon:'phone' },
    { id:'assign',   label:'Assign',   icon:'assign' },
    { id:'import',   label:'Import',   icon:'upload' },
    { id:'staff',    label:'Staff',    icon:'users' },
  ];
  const staffTabs = [
    { id:'myLeads',   label:'My Leads',  icon:'phone' },
    { id:'followups', label:'Follow-ups', icon:'cal' },
    { id:'stats',     label:'My Stats',  icon:'chart' },
  ];
  const tabs = isAdmin ? adminTabs : staffTabs;
  if (!tabs.find(t => t.id === STATE.tab)) STATE.tab = tabs[0].id;

  // Topbar
  const topbar = h('div', { className:'topbar' },
    h('div', { className:'topbar-brand' },
      h('div', { className:'brand-logo' }, '📞 Macto CRM'),
      h('span', { className:`role-badge ${user.role}` }, user.role.toUpperCase())
    ),
    h('div', { className:'topbar-right' },
      h('span', { className:'topbar-user' }, 'Hi, ' + user.name),
      h('button', { className:'btn btn-ghost btn-sm', onClick: async () => { await api.post('/logout'); STATE.user=null; render(); } },
        icon('logout', 14), 'Logout'
      )
    )
  );

  // Sidebar
  const sidebar = h('div', { className:'sidebar' },
    ...tabs.map(t => h('button', {
      className: 'nav-item' + (STATE.tab === t.id ? ' active' : ''),
      onClick: () => { STATE.tab = t.id; render(); }
    }, icon(t.icon, 16), t.label))
  );

  // Mobile bottom nav
  const mobileNav = h('div', { className:'sidebar-mobile' },
    ...tabs.map(t => h('button', {
      className: 'nav-item-mob' + (STATE.tab === t.id ? ' active' : ''),
      onClick: () => { STATE.tab = t.id; render(); }
    }, icon(t.icon, 18), t.label))
  );

  // Main content area
  const main = h('div', { className:'main', id:'main-content' });

  const layout = h('div', { className:'layout' }, sidebar, main);
  const shell = h('div', {}, topbar, layout, mobileNav);

  // Render tab content
  requestAnimationFrame(() => {
    if (isAdmin) {
      if (STATE.tab === 'overview') renderOverview(main);
      else if (STATE.tab === 'leads') renderAdminLeads(main);
      else if (STATE.tab === 'assign') renderAssign(main);
      else if (STATE.tab === 'import') renderImport(main);
      else if (STATE.tab === 'staff') renderStaff(main);
    } else {
      if (STATE.tab === 'myLeads') renderMyLeads(main);
      else if (STATE.tab === 'followups') renderFollowups(main);
      else if (STATE.tab === 'stats') renderMyStats(main);
    }
  });

  return shell;
}

// ═══════════════════════════════════════════════════════
// ADMIN PAGES
// ═══════════════════════════════════════════════════════

// ── Overview ─────────────────────────────────────────────
async function renderOverview(container) {
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  const [statsR, staffR] = await Promise.all([api.get('/leads/stats'), api.get('/staff')]);
  const stats = statsR.ok ? statsR : { total:0, assigned:0, unassigned:0, byStatus:[] };
  const staffs = staffR.ok ? staffR.data : [];

  const byStatus = Object.fromEntries((stats.byStatus||[]).map(s => [s.status, parseInt(s.cnt)]));
  const converted = byStatus['converted'] || 0;
  const interested = byStatus['interested'] || 0;

  container.innerHTML = '';

  const title = h('div', { className:'page-title' }, 'Overview');
  const grid = h('div', { className:'stats-grid' });

  const cards = [
    { label:'Total Leads', val: stats.total, color:'#6366f1' },
    { label:'Assigned',    val: stats.assigned, color:'#3b82f6' },
    { label:'Unassigned',  val: stats.unassigned, color:'#f59e0b' },
    { label:'Interested',  val: interested, color:'#22c55e' },
    { label:'Converted',   val: converted, color:'#4ade80' },
    { label:'Staff Count', val: staffs.length, color:'#8b5cf6' },
  ];
  cards.forEach(c => {
    const card = h('div', { className:'stat-card', style:`border-top-color:${c.color}` },
      h('div', { className:'stat-num', style:`color:${c.color}` }, String(c.val)),
      h('div', { className:'stat-label' }, c.label)
    );
    grid.appendChild(card);
  });

  // Staff performance table
  const perfCard = h('div', { className:'card' });
  perfCard.appendChild(h('div', { className:'card-title' }, '👥 Staff Performance'));
  if (staffs.length === 0) {
    perfCard.appendChild(h('p', { style:'color:var(--muted);font-size:13px' }, 'No staff added yet.'));
  } else {
    const tw = h('div', { className:'table-wrap' });
    const tbl = h('table', {},
      h('thead', {}, h('tr', {},
        ...['Staff','Assigned','Called','Interested','Converted'].map(col =>
          h('th', {}, col)
        )
      )),
      h('tbody', { id:'perf-tbody' })
    );
    tw.appendChild(tbl);
    perfCard.appendChild(tw);

    // load per-staff data
    (async () => {
      const leadsR = await api.get('/leads?limit=10000');
      const allLeads = leadsR.ok ? leadsR.data : [];
      const tbody = tbl.querySelector('#perf-tbody');
      staffs.forEach(s => {
        const mine = allLeads.filter(l => l.assigned_to === s.id);
        const called = mine.filter(l => l.status && l.status !== 'pending').length;
        const inter = mine.filter(l => l.status === 'interested').length;
        const conv = mine.filter(l => l.status === 'converted').length;
        const row = h('tr', {},
          h('td', { className:'td-name' }, s.name),
          h('td', { style:'color:#6366f1;font-weight:700' }, String(mine.length)),
          h('td', { style:'color:#3b82f6' }, String(called)),
          h('td', { style:'color:#22c55e' }, String(inter)),
          h('td', { style:'color:#4ade80' }, String(conv))
        );
        tbody.appendChild(row);
      });
    })();
  }

  // Status breakdown
  const statusCard = h('div', { className:'card' });
  statusCard.appendChild(h('div', { className:'card-title' }, '📊 Status Breakdown'));
  const total = stats.total || 1;
  STATUSES.forEach(s => {
    const cnt = byStatus[s.value] || 0;
    const pct = Math.round((cnt / total) * 100);
    statusCard.appendChild(h('div', { className:'progress-row' },
      h('div', { className:'progress-label' }, s.label),
      h('div', { className:'progress-bar-wrap' },
        h('div', { className:'progress-bar', style:`width:${pct}%;background:${s.color}` })
      ),
      h('div', { className:'progress-count', style:`color:${s.color}` }, String(cnt))
    ));
  });

  container.append(title, grid, perfCard, statusCard);
}

// ── Admin Leads ───────────────────────────────────────────
async function renderAdminLeads(container) {
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  let page = 1;
  let filters = { search:'', status:'all', category:'all', business_type:'all', assigned:'all' };
  let staffs = [];
  let filterOpts = { categories:[], business_types:[] };

  const [staffR, filterR] = await Promise.all([api.get('/staff'), api.get('/leads/filters')]);
  if (staffR.ok) staffs = staffR.data;
  if (filterR.ok) filterOpts = filterR;

  container.innerHTML = '';
  const title = h('div', { className:'page-title' }, 'All Leads');
  container.appendChild(title);

  // Filters bar
  const searchInp = h('input', { type:'search', className:'inp inp-sm', placeholder:'Search name, phone, city, category…', style:'min-width:220px;flex:1' });
  const statusSel = h('select', { className:'inp inp-sm' },
    h('option', { value:'all' }, 'All Status'),
    ...STATUSES.map(s => h('option', { value:s.value }, s.label))
  );
  const catSel = h('select', { className:'inp inp-sm' },
    h('option', { value:'all' }, 'All Category'),
    h('option', { value:'Business' }, 'Business'),
    h('option', { value:'Individual' }, 'Individual'),
    h('option', { value:'Corporate' }, 'Corporate'),
    h('option', { value:'SME' }, 'SME'),
    ...filterOpts.categories.filter(c => !['Business','Individual','Corporate','SME'].includes(c)).map(c => h('option', { value:c }, c))
  );
  const bizSel = h('select', { className:'inp inp-sm' },
    h('option', { value:'all' }, 'All Business Type'),
    ...filterOpts.business_types.map(b => h('option', { value:b }, b))
  );
  const staffSel = h('select', { className:'inp inp-sm' },
    h('option', { value:'all' }, 'All Staff'),
    h('option', { value:'unassigned' }, 'Unassigned'),
    ...staffs.map(s => h('option', { value:s.id }, s.name))
  );

  const filtersBar = h('div', { className:'filters-bar' }, searchInp, statusSel, catSel, bizSel, staffSel);
  container.appendChild(filtersBar);

  // Table area
  const tableArea = h('div', {});
  container.appendChild(tableArea);

  let editModal = null;

  async function load() {
    tableArea.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
    const params = new URLSearchParams({
      page, limit: 50,
      search: filters.search,
      status: filters.status,
      category: filters.category,
      business_type: filters.business_type,
      assigned: filters.assigned,
    });
    const r = await api.get('/leads?' + params);
    if (!r.ok) { tableArea.innerHTML = '<p style="color:var(--muted);padding:20px">Error loading leads.</p>'; return; }

    tableArea.innerHTML = '';

    const tw = h('div', { className:'table-wrap' });
    const tbl = h('table', {},
      h('thead', {}, h('tr', {},
        ...['Name','Phone','City','Category','Business Type','Status','Assigned To','Note','Actions'].map(col =>
          h('th', { className: ['City','Category','Business Type','Note'].includes(col) ? 'hide-mobile' : '' }, col)
        )
      )),
      h('tbody', {})
    );
    const tbody = tbl.querySelector('tbody');

    if (!r.data.length) {
      tbody.appendChild(h('tr', { className:'empty-row' }, h('td', { colSpan:9 }, 'No leads found.')));
    } else {
      r.data.forEach(lead => {
        const st = staffs.find(s => s.id === lead.assigned_to);
        const tr = h('tr', {},
          h('td', { className:'td-name' }, lead.name || '—'),
          h('td', { className:'td-phone' }, lead.phone || '—'),
          h('td', { className:'td-muted hide-mobile' }, lead.city || '—'),
          h('td', { className:'hide-mobile', style:'color:var(--accent2);font-size:12px' }, lead.category || '—'),
          h('td', { className:'hide-mobile', style:'color:var(--muted2);font-size:12px' }, lead.business_type || '—'),
          h('td', {}),  // badge injected below
          h('td', { className:'td-muted', style:'font-size:12px' }, st ? st.name : h('span', { style:'color:var(--muted)' }, 'Unassigned')),
          h('td', { className:'hide-mobile td-muted', style:'font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, lead.last_note || '—'),
          h('td', {},
            h('div', { style:'display:flex;gap:6px' },
              h('button', { className:'btn btn-ghost btn-xs', onClick: () => openEditModal(lead) }, 'Edit'),
              h('button', { className:'btn btn-danger btn-xs', onClick: async () => {
                if (!confirm('Delete this lead?')) return;
                await api.del('/leads/' + lead.id);
                load();
              }}, 'Del')
            )
          )
        );
        // inject badge
        tr.children[5].appendChild(badge(lead.status));
        tbody.appendChild(tr);
      });
    }
    tw.appendChild(tbl);
    tableArea.appendChild(tw);

    // Pagination
    if (r.pages > 1) {
      const pag = h('div', { className:'pagination' });
      if (page > 1) pag.appendChild(h('button', { className:'page-btn', onClick: () => { page--; load(); }}, '← Prev'));
      pag.appendChild(h('span', { className:'page-info' }, `Page ${r.page} of ${r.pages} · ${r.total} leads`));
      if (page < r.pages) pag.appendChild(h('button', { className:'page-btn', onClick: () => { page++; load(); }}, 'Next →'));
      tableArea.appendChild(pag);
    } else {
      tableArea.appendChild(h('p', { style:'color:var(--muted);font-size:12px;margin-top:10px' }, `${r.total} leads`));
    }
  }

  function openEditModal(lead) {
    if (editModal) editModal.remove();
    editModal = renderEditLeadModal(lead, staffs, async (updated) => {
      await api.put('/leads/' + lead.id, updated);
      editModal.remove(); editModal = null;
      load();
    }, () => { editModal.remove(); editModal = null; });
    document.body.appendChild(editModal);
  }

  let searchTimer;
  searchInp.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { filters.search = searchInp.value; page=1; load(); }, 400); });
  statusSel.addEventListener('change', () => { filters.status = statusSel.value; page=1; load(); });
  catSel.addEventListener('change', () => { filters.category = catSel.value; page=1; load(); });
  bizSel.addEventListener('change', () => { filters.business_type = bizSel.value; page=1; load(); });
  staffSel.addEventListener('change', () => { filters.assigned = staffSel.value; page=1; load(); });

  load();
}

// ── Assign Leads ──────────────────────────────────────────
async function renderAssign(container) {
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  const staffR = await api.get('/staff');
  const staffs = staffR.ok ? staffR.data : [];
  container.innerHTML = '';

  const title = h('div', { className:'page-title' }, 'Assign Leads to Staff');
  container.appendChild(title);

  // Controls card
  const ctrlCard = h('div', { className:'card', style:'margin-bottom:16px' });
  const staffSel = h('select', { className:'inp' },
    h('option', { value:'' }, 'Select staff member…'),
    ...staffs.map(s => h('option', { value:s.id }, `${s.name} (${s.username})`))
  );
  const assignBtn = h('button', { className:'btn btn-primary', onClick: doAssign }, icon('assign',15), 'Assign Selected');
  const msgDiv = h('div', {});
  ctrlCard.appendChild(h('div', { className:'card-title' }, 'Bulk Assign'));
  ctrlCard.appendChild(h('div', { style:'display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end' },
    h('div', { style:'flex:1;min-width:200px' },
      h('label', { style:'display:block;font-size:12px;color:var(--muted2);margin-bottom:5px' }, 'Assign to Staff'),
      staffSel
    ),
    assignBtn
  ));
  ctrlCard.appendChild(msgDiv);
  container.appendChild(ctrlCard);

  // Filters
  let filters = { search:'', category:'all', status:'all' };
  const filterR = await api.get('/leads/filters');
  const filterOpts = filterR.ok ? filterR : { categories:[], business_types:[] };

  const searchInp = h('input', { type:'search', className:'inp inp-sm', placeholder:'Search unassigned leads…', style:'flex:1;min-width:180px' });
  const catSel = h('select', { className:'inp inp-sm' },
    h('option', { value:'all' }, 'All Category'),
    h('option', { value:'Business' }, 'Business'),
    h('option', { value:'Individual' }, 'Individual'),
    ...filterOpts.categories.filter(c => !['Business','Individual'].includes(c)).map(c => h('option', { value:c }, c))
  );
  const filtersBar = h('div', { className:'filters-bar' }, searchInp, catSel);
  container.appendChild(filtersBar);

  const tableArea = h('div', {});
  container.appendChild(tableArea);
  const selectedIds = new Set();

  async function load() {
    tableArea.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
    const params = new URLSearchParams({ assigned:'unassigned', limit:200, search: filters.search, category: filters.category });
    const r = await api.get('/leads?' + params);
    const leads = r.ok ? r.data : [];

    tableArea.innerHTML = '';
    const selLabel = h('p', { style:'color:var(--muted);font-size:13px;margin-bottom:8px' }, `${leads.length} unassigned leads · ${selectedIds.size} selected`);
    tableArea.appendChild(selLabel);

    const tw = h('div', { className:'table-wrap' });
    const allCheck = h('input', { type:'checkbox' });
    const tbl = h('table', {},
      h('thead', {}, h('tr', {},
        h('th', { style:'width:40px' }, allCheck),
        ...['Name','Phone','City','Category','Business Type'].map(col => h('th', { className: ['City','Category','Business Type'].includes(col) ? 'hide-mobile':'' }, col))
      )),
      h('tbody', {})
    );
    const tbody = tbl.querySelector('tbody');

    allCheck.addEventListener('change', () => {
      leads.forEach(l => allCheck.checked ? selectedIds.add(l.id) : selectedIds.delete(l.id));
      tbody.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = allCheck.checked);
      selLabel.textContent = `${leads.length} unassigned leads · ${selectedIds.size} selected`;
    });

    leads.forEach(l => {
      const cb = h('input', { type:'checkbox' });
      cb.checked = selectedIds.has(l.id);
      cb.addEventListener('change', () => {
        cb.checked ? selectedIds.add(l.id) : selectedIds.delete(l.id);
        selLabel.textContent = `${leads.length} unassigned leads · ${selectedIds.size} selected`;
      });
      tbody.appendChild(h('tr', {},
        h('td', {}, cb),
        h('td', { className:'td-name' }, l.name || '—'),
        h('td', { className:'td-phone' }, l.phone),
        h('td', { className:'td-muted hide-mobile' }, l.city || '—'),
        h('td', { className:'hide-mobile', style:'color:var(--accent2);font-size:12px' }, l.category || '—'),
        h('td', { className:'hide-mobile td-muted', style:'font-size:12px' }, l.business_type || '—')
      ));
    });
    tw.appendChild(tbl);
    tableArea.appendChild(tw);
  }

  async function doAssign() {
    if (!staffSel.value) { msgDiv.className='alert alert-error'; msgDiv.textContent='Select a staff member.'; return; }
    if (!selectedIds.size) { msgDiv.className='alert alert-error'; msgDiv.textContent='Select at least one lead.'; return; }
    assignBtn.disabled = true;
    const r = await api.post('/leads/assign', { lead_ids: [...selectedIds], staff_id: parseInt(staffSel.value) });
    assignBtn.disabled = false;
    if (r.ok) {
      const s = staffs.find(x => x.id == staffSel.value);
      msgDiv.className='alert alert-success'; msgDiv.textContent=`✓ ${r.count} leads assigned to ${s?.name}.`;
      selectedIds.clear(); setTimeout(() => { msgDiv.className=''; msgDiv.textContent=''; }, 4000);
      load();
    } else { msgDiv.className='alert alert-error'; msgDiv.textContent=r.error; }
  }

  let t;
  searchInp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { filters.search=searchInp.value; load(); }, 400); });
  catSel.addEventListener('change', () => { filters.category = catSel.value; load(); });
  load();
}

// ── Import ────────────────────────────────────────────────
function renderImport(container) {
  container.innerHTML = '';
  const title = h('div', { className:'page-title' }, 'Import Leads');
  container.appendChild(title);

  let headers = [], previewRows = [], totalRows = 0;
  let mapping = { name:'', phone:'', email:'', city:'', state:'', category:'', business_type:'' };
  let uploadedFile = null;

  const msgDiv = h('div', {});
  const step2 = h('div', { style:'display:none' });

  // Dropzone card
  const fileInput = h('input', { type:'file', accept:'.csv,.xlsx,.xls', style:'display:none', id:'import-file' });
  const dropzone = h('div', { className:'dropzone' },
    icon('upload', 32),
    h('p', {}, 'Click to upload CSV / Excel (.xlsx, .xls)'),
    h('p', { style:'font-size:11px;color:var(--muted);margin-top:4px' }, 'Max 10MB · First row must be headers')
  );
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
  dropzone.addEventListener('drop', e => { e.preventDefault(); dropzone.classList.remove('drag'); handleFile(e.dataTransfer.files[0]); });
  fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));

  const catInp = h('input', { type:'text', className:'inp', placeholder:'e.g. Business, Individual, Corporate…' });
  const sourceInp = h('input', { type:'text', className:'inp', placeholder:'e.g. Kerala_2024_Batch1' });

  const uploadCard = h('div', { className:'card' },
    h('div', { className:'card-title' }, '1. Upload File'),
    fileInput, dropzone,
    h('div', { style:'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px' },
      h('div', { className:'field', style:'margin:0' }, h('label', {}, 'Default Category'), catInp),
      h('div', { className:'field', style:'margin:0' }, h('label', {}, 'Batch / Source Name'), sourceInp)
    )
  );
  container.appendChild(uploadCard);
  container.appendChild(msgDiv);

  // Step 2: column mapping
  const mapGrid = h('div', { className:'map-grid' });
  const previewDiv = h('div', {});
  const importBtn = h('button', { className:'btn btn-success', style:'margin-top:16px', onClick: doImport }, icon('upload',15), 'Import All Leads');

  step2.appendChild(h('div', { className:'card' },
    h('div', { className:'card-title' }, '2. Map Columns'),
    mapGrid
  ));
  step2.appendChild(h('div', { className:'card', style:'margin-top:12px' },
    h('div', { className:'card-title' }, '3. Preview (first 5 rows)'),
    previewDiv
  ));
  step2.appendChild(importBtn);
  container.appendChild(step2);

  async function handleFile(file) {
    if (!file) return;
    uploadedFile = file;
    dropzone.innerHTML = '';
    dropzone.appendChild(icon('check', 24));
    dropzone.appendChild(h('p', {}, file.name));
    dropzone.style.borderColor = 'var(--green)';

    msgDiv.className = 'alert alert-info'; msgDiv.textContent = 'Parsing file…';
    const fd = new FormData(); fd.append('file', file);
    const r = await api.upload('/import/preview', fd);
    if (!r.ok) { msgDiv.className='alert alert-error'; msgDiv.textContent=r.error; return; }
    msgDiv.className=''; msgDiv.textContent='';
    headers = r.headers; previewRows = r.preview; totalRows = r.total;

    // Auto-map
    headers.forEach(h2 => {
      const hl = h2.toLowerCase();
      if (hl.includes('name')) mapping.name = h2;
      if (hl.includes('phone')||hl.includes('mobile')||hl.includes('contact')) mapping.phone = h2;
      if (hl.includes('email')||hl.includes('mail')) mapping.email = h2;
      if (hl.includes('city')||hl.includes('location')) mapping.city = h2;
      if (hl.includes('state')||hl.includes('region')) mapping.state = h2;
      if (hl.includes('categ')||hl.includes('type') && !hl.includes('business')) mapping.category = h2;
      if (hl.includes('business')||hl.includes('biz')) mapping.business_type = h2;
    });

    // Render map grid
    mapGrid.innerHTML = '';
    const fields = [
      ['name','Name *'],['phone','Phone *'],['email','Email'],['city','City'],
      ['state','State'],['category','Category'],['business_type','Business Type']
    ];
    fields.forEach(([field, label]) => {
      const sel = h('select', { className:'inp inp-sm' },
        h('option', { value:'' }, '— skip —'),
        ...headers.map(hd => {
          const opt = h('option', { value:hd }, hd);
          if (mapping[field] === hd) opt.selected = true;
          return opt;
        })
      );
      sel.addEventListener('change', () => { mapping[field] = sel.value; updatePreview(); });
      mapGrid.appendChild(h('div', { className:'field', style:'margin:0' },
        h('label', {}, label), sel
      ));
    });

    updatePreview();
    step2.style.display = '';
    importBtn.textContent = `Import ${totalRows} Leads`;
  }

  function updatePreview() {
    previewDiv.innerHTML = '';
    const tbl = h('table', { className:'preview-table' },
      h('thead', {}, h('tr', {},
        ...Object.keys(mapping).filter(k => mapping[k]).map(k => h('th', {}, k))
      )),
      h('tbody', {})
    );
    const tbody = tbl.querySelector('tbody');
    previewRows.forEach(row => {
      tbody.appendChild(h('tr', {},
        ...Object.keys(mapping).filter(k => mapping[k]).map(k =>
          h('td', { style:'color:var(--muted2)' }, String(row[mapping[k]] || '—'))
        )
      ));
    });
    previewDiv.appendChild(tbl);
  }

  async function doImport() {
    if (!uploadedFile) { msgDiv.className='alert alert-error'; msgDiv.textContent='No file selected.'; return; }
    importBtn.disabled = true; importBtn.textContent = 'Importing…';
    const fd = new FormData();
    fd.append('file', uploadedFile);
    fd.append('mapping', JSON.stringify(mapping));
    fd.append('category', catInp.value);
    fd.append('source', sourceInp.value || uploadedFile.name);
    const r = await api.upload('/import', fd);
    importBtn.disabled = false;
    if (r.ok) {
      msgDiv.className='alert alert-success'; msgDiv.textContent=`✓ ${r.count} leads imported successfully!`;
      step2.style.display='none'; uploadedFile=null;
      dropzone.innerHTML = '';
      dropzone.appendChild(icon('upload',32));
      dropzone.appendChild(h('p',{},'Click to upload CSV / Excel (.xlsx, .xls)'));
      dropzone.style.borderColor='';
      importBtn.textContent='Import All Leads';
    } else { msgDiv.className='alert alert-error'; msgDiv.textContent=r.error; }
  }
}

// ── Staff Management ──────────────────────────────────────
async function renderStaff(container) {
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  const r = await api.get('/staff');
  const staffs = r.ok ? r.data : [];
  container.innerHTML = '';

  const title = h('div', { className:'page-title' }, 'Manage Staff');
  container.appendChild(title);

  // Add form
  const nameInp = h('input', { type:'text', className:'inp', placeholder:'Full Name' });
  const userInp = h('input', { type:'text', className:'inp', placeholder:'Username (for login)' });
  const passInp = h('input', { type:'password', className:'inp', placeholder:'Password' });
  const addBtn = h('button', { className:'btn btn-primary', onClick: addStaff }, icon('plus',15), 'Add Staff');
  const formMsg = h('div', {});

  const addCard = h('div', { className:'card', style:'margin-bottom:16px' },
    h('div', { className:'card-title' }, 'Add New Staff'),
    h('div', { style:'display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:12px' },
      h('div', { className:'field', style:'margin:0' }, h('label',{},'Full Name'), nameInp),
      h('div', { className:'field', style:'margin:0' }, h('label',{},'Username'), userInp),
      h('div', { className:'field', style:'margin:0' }, h('label',{},'Password'), passInp)
    ),
    formMsg, addBtn
  );
  container.appendChild(addCard);

  const tableArea = h('div', {});
  container.appendChild(tableArea);
  renderTable(staffs);

  function renderTable(list) {
    tableArea.innerHTML = '';
    const tw = h('div', { className:'table-wrap' });
    const tbl = h('table', {},
      h('thead', {}, h('tr', {},
        ...['Name','Username','Password','Leads','Status','Actions'].map(c => h('th',{},c))
      )),
      h('tbody', {})
    );
    const tbody = tbl.querySelector('tbody');
    if (!list.length) {
      tbody.appendChild(h('tr', { className:'empty-row' }, h('td',{colSpan:6},'No staff added yet.')));
    }
    list.forEach(s => {
      const tr = h('tr', {},
        h('td', { className:'td-name' }, s.name),
        h('td', { style:'font-family:monospace;color:var(--muted2)' }, s.username),
        h('td', { style:'color:var(--muted)' }, '••••••••'),
        h('td', { style:'color:var(--accent)' }, String(s.leadCount || 0)),
        h('td', {}, h('span', { className:'badge', style:`background:${s.active?'#052e16':'#1e0a0a'};color:${s.active?'#4ade80':'#f87171'};border:1px solid ${s.active?'#15803d':'#7f1d1d'}` }, s.active?'Active':'Inactive')),
        h('td', {},
          h('div', { style:'display:flex;gap:6px' },
            h('button', { className:'btn btn-ghost btn-xs', onClick: () => openEditStaff(s) }, 'Edit'),
            h('button', { className:'btn btn-danger btn-xs', onClick: async () => {
              if (!confirm(`Remove ${s.name}?`)) return;
              await api.del('/staff/' + s.id);
              renderStaff(container);
            }}, 'Remove')
          )
        )
      );
      tbody.appendChild(tr);
    });
    tw.appendChild(tbl);
    tableArea.appendChild(tw);
  }

  async function addStaff() {
    if (!nameInp.value||!userInp.value||!passInp.value) {
      formMsg.className='alert alert-error'; formMsg.textContent='All fields required.'; return;
    }
    addBtn.disabled=true;
    const r = await api.post('/staff', { name:nameInp.value, username:userInp.value, password:passInp.value });
    addBtn.disabled=false;
    if (r.ok) {
      formMsg.className='alert alert-success'; formMsg.textContent='✓ Staff added. Share your site URL + their username/password.';
      nameInp.value=''; userInp.value=''; passInp.value='';
      setTimeout(() => renderStaff(container), 2000);
    } else { formMsg.className='alert alert-error'; formMsg.textContent=r.error; }
  }

  function openEditStaff(s) {
    const nInp = h('input',{type:'text',className:'inp',value:s.name});
    const uInp = h('input',{type:'text',className:'inp',value:s.username});
    const pInp = h('input',{type:'password',className:'inp',placeholder:'Leave blank to keep'});
    const mDiv = h('div',{});
    const modal = h('div',{className:'modal-overlay center'},
      h('div',{className:'modal center-modal'},
        h('div',{className:'modal-header'},
          h('span',{className:'modal-title'},'Edit Staff'),
          h('button',{className:'modal-close',onClick:()=>modal.remove()},'✕')
        ),
        mDiv,
        h('div',{className:'field'},h('label',{},'Name'),nInp),
        h('div',{className:'field'},h('label',{},'Username'),uInp),
        h('div',{className:'field'},h('label',{},'New Password'),pInp),
        h('button',{className:'btn btn-primary',style:'width:100%;justify-content:center',onClick:async()=>{
          const body={name:nInp.value,username:uInp.value};
          if(pInp.value)body.password=pInp.value;
          const r=await api.put('/staff/'+s.id,body);
          if(r.ok){modal.remove();renderStaff(container);}
          else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
        }},'Save Changes')
      )
    );
    modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
    document.body.appendChild(modal);
  }
}

// ── Edit Lead Modal (admin) ───────────────────────────────
function renderEditLeadModal(lead, staffs, onSave, onClose) {
  const fields = [
    ['name','Name'],['phone','Phone'],['email','Email'],
    ['city','City'],['state','State'],['category','Category'],['business_type','Business Type']
  ];
  const inputs = {};
  fields.forEach(([f]) => inputs[f] = h('input',{type:'text',className:'inp',value:lead[f]||''}));

  const catSel = h('select',{className:'inp'},
    ...['','Business','Individual','Corporate','SME','Other'].map(v=>
      h('option',{value:v},v||'— set category —')
    )
  );
  catSel.value = lead.category||'';

  const staffSel = h('select',{className:'inp'},
    h('option',{value:''},'Unassigned'),
    ...staffs.map(s=>h('option',{value:s.id},s.name))
  );
  if(lead.assigned_to) staffSel.value=lead.assigned_to;

  const statusSel = h('select',{className:'inp'},
    ...STATUSES.map(s=>h('option',{value:s.value},s.label))
  );
  statusSel.value = lead.status||'pending';

  const mDiv = h('div',{});

  const modal = h('div',{className:'modal-overlay center'},
    h('div',{className:'modal center-modal'},
      h('div',{className:'modal-header'},
        h('span',{className:'modal-title'},'Edit Lead'),
        h('button',{className:'modal-close',onClick:onClose},'✕')
      ),
      mDiv,
      h('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:10px'},
        ...fields.map(([f,l])=>h('div',{className:'field',style:'margin:0'},h('label',{},l),inputs[f]))
      ),
      h('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px'},
        h('div',{className:'field',style:'margin:0'},h('label',{},'Category'),catSel),
        h('div',{className:'field',style:'margin:0'},h('label',{},'Status'),statusSel)
      ),
      h('div',{className:'field',style:'margin-top:10px'},h('label',{},'Assigned To'),staffSel),
      h('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:4px',onClick:async()=>{
        const body={};
        fields.forEach(([f])=>body[f]=inputs[f].value);
        body.category=catSel.value;
        body.status=statusSel.value;
        body.assigned_to=staffSel.value?parseInt(staffSel.value):null;
        const r=await api.put('/leads/'+lead.id,body);
        if(r.ok)onSave(body);
        else{mDiv.className='alert alert-error';mDiv.textContent=r.error;}
      }},'Save Changes')
    )
  );
  modal.addEventListener('click',e=>{if(e.target===modal)onClose();});
  return modal;
}

// ═══════════════════════════════════════════════════════
// STAFF PAGES
// ═══════════════════════════════════════════════════════

async function renderMyLeads(container) {
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  const filterR = await api.get('/leads/filters');
  const filterOpts = filterR.ok ? filterR : { categories:[], business_types:[] };

  container.innerHTML = '';
  container.appendChild(h('div',{className:'page-title'},'My Leads'));

  let filters = { search:'', status:'all', category:'all', business_type:'all' };

  // Status pills
  const pillsRow = h('div',{className:'status-pills'});
  const allPill = h('button',{className:'pill',style:'background:var(--accent);color:#fff;border-color:var(--accent)'},
    'All', onClick=()=>{ filters.status='all'; refreshPills(); load(); });
  pillsRow.appendChild(allPill);

  let pillBtns = {all: allPill};
  STATUSES.forEach(s=>{
    const p=h('button',{className:'pill',style:`color:${s.color};border-color:${s.color}33`},s.label);
    p.addEventListener('click',()=>{ filters.status=s.value; refreshPills(); load(); });
    pillsRow.appendChild(p);
    pillBtns[s.value]=p;
  });
  container.appendChild(pillsRow);

  function refreshPills() {
    Object.entries(pillBtns).forEach(([k,b])=>{
      const s = STATUS_MAP[k]||{color:'var(--accent)'};
      if(k===filters.status||(k==='all'&&filters.status==='all')){
        b.style.background=k==='all'?'var(--accent)':s.color;
        b.style.color='#fff';
      } else {
        b.style.background='var(--bg3)';
        b.style.color=k==='all'?'var(--accent)':s.color;
      }
    });
  }

  // Filters bar
  const searchInp = h('input',{type:'search',className:'inp inp-sm',placeholder:'Search…',style:'flex:1;min-width:150px'});
  const catSel = h('select',{className:'inp inp-sm'},
    h('option',{value:'all'},'All Category'),
    h('option',{value:'Business'},'Business'),
    h('option',{value:'Individual'},'Individual'),
    ...filterOpts.categories.filter(c=>!['Business','Individual'].includes(c)).map(c=>h('option',{value:c},c))
  );
  const bizSel = h('select',{className:'inp inp-sm'},
    h('option',{value:'all'},'All Business Type'),
    ...filterOpts.business_types.map(b=>h('option',{value:b},b))
  );
  container.appendChild(h('div',{className:'filters-bar'},searchInp,catSel,bizSel));

  const listArea = h('div',{});
  container.appendChild(listArea);

  let activeModal = null;

  async function load() {
    listArea.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
    const params = new URLSearchParams({limit:200, search:filters.search, status:filters.status, category:filters.category, business_type:filters.business_type});
    const r = await api.get('/leads?'+params);
    const leads = r.ok?r.data:[];

    listArea.innerHTML='';
    listArea.appendChild(h('p',{style:'color:var(--muted);font-size:13px;margin-bottom:10px'},`${leads.length} leads`));

    if(!leads.length){
      listArea.appendChild(h('div',{style:'text-align:center;padding:40px;color:var(--muted)'},'No leads found.'));
      return;
    }

    const list = h('div',{className:'lead-list'});
    leads.forEach(lead=>{
      const st = STATUS_MAP[lead.status||'pending'];
      const card = h('div',{className:'lead-card',style:`border-left-color:${st.color}`},
        h('div',{className:'lead-card-top'},
          h('div',{},
            h('div',{className:'lead-name'},lead.name||'Unknown'),
            h('div',{className:'lead-phone'},lead.phone),
            lead.city?h('div',{className:'lead-city'},'📍 '+lead.city):null,
            lead.category?h('div',{className:'lead-cat'},'🏷 '+lead.category+(lead.business_type?' · '+lead.business_type:'')):null
          ),
          badge(lead.status)
        ),
        lead.last_note?h('div',{className:'lead-note'},'📝 '+lead.last_note):null,
        lead.callback_date?h('div',{className:'lead-callback'},'📅 Follow-up: '+lead.callback_date):null
      );
      card.addEventListener('click',()=>openCallModal(lead));
      list.appendChild(card);
    });
    listArea.appendChild(list);
  }

  function openCallModal(lead) {
    if(activeModal) activeModal.remove();
    activeModal = renderCallModal(lead, (updated)=>{
      if(activeModal){activeModal.remove();activeModal=null;}
      load();
    }, ()=>{ if(activeModal){activeModal.remove();activeModal=null;} });
    document.body.appendChild(activeModal);
  }

  let t;
  searchInp.addEventListener('input',()=>{ clearTimeout(t); t=setTimeout(()=>{ filters.search=searchInp.value; load(); },400); });
  catSel.addEventListener('change',()=>{ filters.category=catSel.value; load(); });
  bizSel.addEventListener('change',()=>{ filters.business_type=bizSel.value; load(); });
  load();
}

// ── Staff: Follow-ups ─────────────────────────────────────
async function renderFollowups(container) {
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const r = await api.get('/leads?limit=500');
  const leads = r.ok?r.data:[];
  const today = new Date().toISOString().slice(0,10);

  container.innerHTML='';
  container.appendChild(h('div',{className:'page-title'},'Follow-ups'));

  const withDate = leads.filter(l=>l.callback_date);
  const overdue = withDate.filter(l=>l.callback_date<today&&l.status!=='converted');
  const todayL = withDate.filter(l=>l.callback_date===today);
  const upcoming = withDate.filter(l=>l.callback_date>today);

  let activeModal=null;
  function openModal(lead){
    if(activeModal)activeModal.remove();
    activeModal=renderCallModal(lead,()=>{ if(activeModal){activeModal.remove();activeModal=null;} renderFollowups(container); },()=>{if(activeModal){activeModal.remove();activeModal=null;}});
    document.body.appendChild(activeModal);
  }

  function section(title, items, color) {
    const sec=h('div',{style:'margin-bottom:24px'});
    sec.appendChild(h('div',{className:'section-label',style:`color:${color}`},title+` (${items.length})`));
    if(!items.length){sec.appendChild(h('p',{style:'color:var(--muted);font-size:13px'},'None.'));return sec;}
    const list=h('div',{className:'lead-list'});
    items.forEach(l=>{
      const st=STATUS_MAP[l.status||'pending'];
      const card=h('div',{className:'lead-card',style:`border-left-color:${color};cursor:pointer`},
        h('div',{className:'lead-card-top'},
          h('div',{},
            h('div',{className:'lead-name'},l.name),
            h('div',{className:'lead-phone'},l.phone),
            l.category?h('div',{className:'lead-cat'},'🏷 '+l.category):null
          ),
          h('div',{style:'text-align:right'},
            badge(l.status),
            h('div',{style:`color:${color};font-size:12px;margin-top:4px`},'📅 '+l.callback_date)
          )
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

// ── Staff: Stats ──────────────────────────────────────────
async function renderMyStats(container) {
  container.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';
  const r = await api.get('/leads/stats');
  const leadsR = await api.get('/leads?limit=10000');
  const leads = leadsR.ok?leadsR.data:[];
  container.innerHTML='';
  container.appendChild(h('div',{className:'page-title'},'My Stats'));

  const total=leads.length;
  const called=leads.filter(l=>l.status&&l.status!=='pending').length;
  const pending=leads.filter(l=>!l.status||l.status==='pending').length;
  const interested=leads.filter(l=>l.status==='interested').length;
  const converted=leads.filter(l=>l.status==='converted').length;
  const followups=leads.filter(l=>l.callback_date).length;

  const grid=h('div',{className:'stats-grid'});
  [
    {label:'Total Assigned',val:total,color:'#6366f1'},
    {label:'Called',val:called,color:'#3b82f6'},
    {label:'Pending',val:pending,color:'#f59e0b'},
    {label:'Interested',val:interested,color:'#22c55e'},
    {label:'Converted',val:converted,color:'#4ade80'},
    {label:'Follow-ups',val:followups,color:'#8b5cf6'},
  ].forEach(c=>{
    grid.appendChild(h('div',{className:'stat-card',style:`border-top-color:${c.color}`},
      h('div',{className:'stat-num',style:`color:${c.color}`},String(c.val)),
      h('div',{className:'stat-label'},c.label)
    ));
  });
  container.appendChild(grid);

  const card=h('div',{className:'card'});
  card.appendChild(h('div',{className:'card-title'},'Status Breakdown'));
  STATUSES.forEach(s=>{
    const cnt=leads.filter(l=>(l.status||'pending')===s.value).length;
    const pct=total?Math.round((cnt/total)*100):0;
    card.appendChild(h('div',{className:'progress-row'},
      h('div',{className:'progress-label'},s.label),
      h('div',{className:'progress-bar-wrap'},h('div',{className:'progress-bar',style:`width:${pct}%;background:${s.color}`})),
      h('div',{className:'progress-count',style:`color:${s.color}`},String(cnt))
    ));
  });
  container.appendChild(card);
}

// ── Call Modal ────────────────────────────────────────────
function renderCallModal(lead, onSave, onClose) {
  let selectedStatus = lead.status || 'pending';
  let statusBtns = {};

  const callbackDateInp = h('input',{type:'date',className:'inp',value:lead.callback_date||''});
  const noteInp = h('textarea',{className:'inp',rows:3,placeholder:'What happened? Key points from the call…'});
  const historyDiv = h('div',{className:'call-history'});
  const mDiv = h('div',{});
  const callbackRow = h('div',{className:'field',style:`display:${selectedStatus==='callback'?'':'none'}`},
    h('label',{},'Follow-up Date'), callbackDateInp
  );

  // Load call history
  (async()=>{
    const r=await api.get('/leads/'+lead.id+'/logs');
    if(r.ok&&r.data.length){
      r.data.forEach(log=>{
        const st=STATUS_MAP[log.status||'pending'];
        historyDiv.appendChild(h('div',{className:'call-entry'},
          h('div',{className:'call-entry-top'},
            h('span',{style:`color:${st.color};font-weight:600`},st.label),
            h('span',{style:'color:var(--muted)'},formatDate(log.call_date)+' · '+(log.staff?.name||''))
          ),
          log.note?h('div',{className:'call-entry-note'},log.note):null
        ));
      });
    } else { historyDiv.innerHTML='<p style="color:var(--muted);font-size:12px">No call history yet.</p>'; }
  })();

  const statusGrid = h('div',{className:'status-grid'});
  STATUSES.forEach(s=>{
    const btn=h('button',{className:'status-btn'},s.label);
    const setActive=()=>{
      Object.values(statusBtns).forEach(b=>{ b.style.background='var(--bg)'; b.style.color=b._statusColor; b.style.borderColor=b._statusColor+'44'; });
      btn.style.background=s.color; btn.style.color='#fff'; btn.style.borderColor=s.color;
    };
    btn._statusColor=s.color;
    btn.style.color=s.color; btn.style.borderColor=s.color+'44';
    if(selectedStatus===s.value){btn.style.background=s.color;btn.style.color='#fff';btn.style.borderColor=s.color;}
    btn.addEventListener('click',()=>{
      selectedStatus=s.value;
      setActive();
      callbackRow.style.display=s.value==='callback'?'':'none';
    });
    statusGrid.appendChild(btn);
    statusBtns[s.value]=btn;
  });

  const saveBtn = h('button',{className:'btn btn-primary',style:'width:100%;justify-content:center;margin-top:4px',
    onClick: async()=>{
      saveBtn.disabled=true; saveBtn.textContent='Saving…';
      const body={status:selectedStatus,note:noteInp.value};
      if(selectedStatus==='callback'&&callbackDateInp.value) body.callback_date=callbackDateInp.value;
      const r=await api.post('/leads/'+lead.id+'/log',body);
      if(r.ok)onSave({...lead,...body});
      else{mDiv.className='alert alert-error';mDiv.textContent=r.error;saveBtn.disabled=false;saveBtn.textContent='Save & Update';}
    }
  },'Save & Update');

  const modal=h('div',{className:'modal-overlay'},
    h('div',{className:'modal'},
      h('div',{className:'modal-header'},
        h('div',{},
          h('div',{style:'font-weight:700;font-size:17px'},lead.name||'Lead'),
          h('a',{href:`tel:${lead.phone}`,className:'tel-link'},'📞 '+lead.phone),
          lead.city?h('div',{style:'color:var(--muted);font-size:12px;margin-top:2px'},'📍 '+lead.city):null,
          lead.category?h('div',{style:'color:var(--accent2);font-size:12px'},'🏷 '+lead.category+(lead.business_type?' · '+lead.business_type:'')):null
        ),
        h('button',{className:'modal-close',onClick:onClose},'✕')
      ),
      mDiv,
      h('div',{className:'field'},h('label',{},'Update Call Status'), statusGrid),
      callbackRow,
      h('div',{className:'field'},h('label',{},'Note / Remarks'), noteInp),
      lead.last_note?h('div',{className:'alert alert-info',style:'font-size:12px;margin-bottom:12px'},'Previous note: '+lead.last_note):null,
      h('div',{className:'section-label',style:'margin-bottom:8px'},'Call History'),
      historyDiv,
      saveBtn
    )
  );
  modal.addEventListener('click',e=>{ if(e.target===modal)onClose(); });
  return modal;
}

// ── Boot ──────────────────────────────────────────────────
boot();

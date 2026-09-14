/* Expiration Timelines
   Replace the previous contract-timeline.js with this file.
   Terminations are intentionally excluded from this consolidated view. */
(function () {
  'use strict';

  const byId = id => document.getElementById(id);
  const clean = value => window.norm ? window.norm(value) : String(value ?? '').trim();
  const safe = value => window.esc ? window.esc(value) : String(value ?? '');
  const parse = value => window.parseDate ? window.parseDate(value) : (value ? new Date(value) : null);
  const labels = {
    comodato: 'Tooling Loan Agreement',
    fornecimento: 'Supply Agreement'
  };
  const allowedCategories = ['comodato', 'fornecimento'];

  function injectStyles() {
    if (byId('expirationTimelineExtraStyles')) return;
    const style = document.createElement('style');
    style.id = 'expirationTimelineExtraStyles';
    style.textContent = `
      .timeline-multi-filter{position:relative;min-width:220px}
      .timeline-multi-button{width:100%;height:40px;display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--input);color:var(--text);font:inherit;cursor:pointer;text-align:left}
      .timeline-multi-button::after{content:'▾';color:var(--muted)}
      .timeline-multi-menu{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:50;display:none;padding:8px;border:1px solid var(--line);border-radius:12px;background:var(--solid);box-shadow:var(--shadow)}
      .timeline-multi-menu.open{display:grid;gap:4px}
      .timeline-check{display:flex;align-items:center;gap:9px;padding:9px;border-radius:9px;cursor:pointer;color:var(--text);font-size:.8rem;font-weight:700}
      .timeline-check:hover{background:var(--surface)}
      .timeline-check input{width:16px;height:16px;accent-color:var(--primary2)}
      .timeline-filter-actions{display:flex;gap:6px;padding-top:7px;margin-top:4px;border-top:1px solid var(--line)}
      .timeline-filter-action{flex:1;border:1px solid var(--line);border-radius:8px;padding:7px;background:var(--surface);color:var(--text);font-size:.7rem;font-weight:800;cursor:pointer}
      .timeline-controls{grid-template-columns:minmax(220px,1.25fr) repeat(3,minmax(150px,1fr))}
      @media(max-width:1200px){.timeline-controls{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:800px){.timeline-controls{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function dateText(value) {
    const date = value instanceof Date ? value : parse(value);
    if (!date || Number.isNaN(date.getTime())) return 'Not provided';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: '2-digit', year: 'numeric'
    }).format(date);
  }

  function startOfDay(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function dayDiff(from, to) {
    const fromUTC = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const toUTC = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((toUTC - fromUTC) / 86400000);
  }

  function createView() {
    if (byId('timelineView')) return;
    const main = document.querySelector('.main');
    if (!main) return;

    main.insertAdjacentHTML('beforeend', `
      <section id="timelineView" class="timeline-view">
        <div class="timeline-view-head">
          <div>
            <h2>Expiration Timelines</h2>
            <p>Consolidated view of expiration dates for Tooling Loan Agreements and Supply Agreements.</p>
          </div>
        </div>

        <div class="timeline-section">
          <div class="timeline-header">
            <div>
              <h3>Contract Expiration Timeline</h3>
              <p>Select one or more contract types, then filter and sort the consolidated timeline.</p>
            </div>

            <div class="timeline-controls">
              <div class="field timeline-multi-filter">
                <label>Contract types</label>
                <button id="timelineCategoryButton" class="timeline-multi-button" type="button" aria-expanded="false">
                  <span id="timelineCategoryLabel">All contract types</span>
                </button>
                <div id="timelineCategoryMenu" class="timeline-multi-menu">
                  <label class="timeline-check">
                    <input class="timeline-category-check" type="checkbox" value="comodato" checked>
                    <span>Tooling Loan Agreements</span>
                  </label>
                  <label class="timeline-check">
                    <input class="timeline-category-check" type="checkbox" value="fornecimento" checked>
                    <span>Supply Agreements</span>
                  </label>
                  <div class="timeline-filter-actions">
                    <button id="timelineSelectAll" class="timeline-filter-action" type="button">Select all</button>
                    <button id="timelineClearTypes" class="timeline-filter-action" type="button">Clear</button>
                  </div>
                </div>
              </div>

              <div class="field">
                <label>Expiration period</label>
                <select id="timelinePeriod">
                  <option value="all">All dates</option>
                  <option value="expired">Expired</option>
                  <option value="30">Next 30 days</option>
                  <option value="60">Next 60 days</option>
                  <option value="90">Next 90 days</option>
                  <option value="180">Next 180 days</option>
                  <option value="365">Next 12 months</option>
                </select>
              </div>

              <div class="field">
                <label>Sort by</label>
                <select id="timelineSort">
                  <option value="expiry_asc">Expiration: nearest</option>
                  <option value="expiry_desc">Expiration: farthest</option>
                  <option value="supplier_asc">Supplier A-Z</option>
                  <option value="contract_asc">Contract A-Z</option>
                  <option value="category_asc">Contract type</option>
                </select>
              </div>

              <div class="field">
                <label>Search</label>
                <input id="timelineSearch" type="search" placeholder="Contract, supplier, or project">
              </div>
            </div>
          </div>

          <div class="timeline-summary">
            <div class="timeline-summary-card"><span class="summary-dot expired"></span><div><strong id="timelineExpired">0</strong><small>Expired</small></div></div>
            <div class="timeline-summary-card"><span class="summary-dot critical"></span><div><strong id="timelineCritical">0</strong><small>Within 30 days</small></div></div>
            <div class="timeline-summary-card"><span class="summary-dot warning"></span><div><strong id="timelineWarning">0</strong><small>31 to 90 days</small></div></div>
            <div class="timeline-summary-card"><span class="summary-dot safe"></span><div><strong id="timelineSafe">0</strong><small>More than 90 days</small></div></div>
          </div>

          <div class="timeline-table">
            <div class="timeline-table-head">
              <div>Contract</div><div>Contract lifetime</div><div>Expiration alert</div>
            </div>
            <div id="timelineBody" class="timeline-body"></div>
          </div>
        </div>
      </section>
    `);

    bindEvents();
  }

  function selectedCategories() {
    return [...document.querySelectorAll('.timeline-category-check:checked')].map(input => input.value);
  }

  function updateCategoryLabel() {
    const selected = selectedCategories();
    const label = byId('timelineCategoryLabel');
    if (!label) return;
    if (selected.length === 2) label.textContent = 'All contract types';
    else if (selected.length === 1) label.textContent = labels[selected[0]];
    else label.textContent = 'No contract type selected';
  }

  function bindEvents() {
    const button = byId('timelineCategoryButton');
    const menu = byId('timelineCategoryMenu');

    button.addEventListener('click', event => {
      event.stopPropagation();
      const open = menu.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
    });

    menu.addEventListener('click', event => event.stopPropagation());
    document.addEventListener('click', () => {
      menu.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    });

    document.querySelectorAll('.timeline-category-check').forEach(input => {
      input.addEventListener('change', () => {
        updateCategoryLabel();
        render();
      });
    });

    byId('timelineSelectAll').addEventListener('click', () => {
      document.querySelectorAll('.timeline-category-check').forEach(input => input.checked = true);
      updateCategoryLabel();
      render();
    });

    byId('timelineClearTypes').addEventListener('click', () => {
      document.querySelectorAll('.timeline-category-check').forEach(input => input.checked = false);
      updateCategoryLabel();
      render();
    });

    ['timelinePeriod', 'timelineSort'].forEach(id => byId(id).addEventListener('change', render));
    byId('timelineSearch').addEventListener('input', render);
  }

  function dashboardNodes() {
    return [
      document.querySelector('.top'),
      document.querySelector('.section-head'),
      document.querySelector('.kpis'),
      document.querySelector('.table-section')
    ].filter(Boolean);
  }

  function showTimeline() {
    createView();
    dashboardNodes().forEach(node => node.style.display = 'none');
    byId('timelineView').classList.add('active');
    byId('timelineTab')?.classList.add('active');
    document.querySelectorAll('.nav button').forEach(button => button.classList.remove('active'));
    render();
  }

  function showDashboard() {
    dashboardNodes().forEach(node => node.style.display = '');
    byId('timelineView')?.classList.remove('active');
    byId('timelineTab')?.classList.remove('active');
  }

  function getItems() {
    if (!window.state?.data || !window.schemas) return [];

    return allowedCategories.flatMap(category => {
      const list = window.state.data[category] || [];
      return list.map(row => ({
        row,
        category,
        number: clean(row[window.schemas[category].number]) || 'Contract number unavailable',
        supplier: clean(row.Supplier) || 'Supplier not provided',
        project: clean(row.Project),
        created: parse(row['Creation Date']),
        expires: parse(row['Expiration Date'])
      }));
    });
  }

  function expirationLevel(days) {
    if (days < 0) return 'expired';
    if (days <= 30) return 'critical';
    if (days <= 90) return 'warning';
    return 'safe';
  }

  function alertText(days) {
    const absolute = Math.abs(days);
    if (days < 0) return `Expired ${absolute} day${absolute === 1 ? '' : 's'} ago`;
    if (days === 0) return 'Expires today';
    return `${days} day${days === 1 ? '' : 's'} remaining`;
  }

  function timelinePosition(created, expires, today) {
    if (!created || !expires) return { today: 0, width: 0, cssClass: '' };
    const duration = expires - created;
    if (duration <= 0 || today > expires) return { today: 98.5, width: 98.5, cssClass: 'expired' };
    if (today < created) return { today: 1.5, width: 1.5, cssClass: 'not-started' };
    const position = Math.max(0, Math.min(100, ((today - created) / duration) * 100));
    return { today: position, width: Math.max(1.5, position), cssClass: '' };
  }

  function filterItems(items, today) {
    const selected = selectedCategories();
    const period = byId('timelinePeriod').value;
    const query = clean(byId('timelineSearch').value).toLowerCase();

    return items.filter(item => {
      if (!selected.includes(item.category)) return false;

      const searchable = [item.number, item.supplier, item.project, item.row['General Status']]
        .map(clean).join(' ').toLowerCase();
      if (query && !searchable.includes(query)) return false;

      if (period === 'all') return true;
      if (!item.expires) return false;

      const days = dayDiff(today, item.expires);
      return period === 'expired' ? days < 0 : days >= 0 && days <= Number(period);
    });
  }

  function sortItems(items) {
    const mode = byId('timelineSort').value;
    const farFuture = new Date(8640000000000000);
    const farPast = new Date(-8640000000000000);

    return items.sort((a, b) => {
      if (mode === 'expiry_desc') return (b.expires || farPast) - (a.expires || farPast);
      if (mode === 'supplier_asc') return a.supplier.localeCompare(b.supplier);
      if (mode === 'contract_asc') return a.number.localeCompare(b.number);
      if (mode === 'category_asc') return labels[a.category].localeCompare(labels[b.category]);
      return (a.expires || farFuture) - (b.expires || farFuture);
    });
  }

  function updateSummary(items, today) {
    const selected = selectedCategories();
    const counts = { expired: 0, critical: 0, warning: 0, safe: 0 };

    items.filter(item => selected.includes(item.category)).forEach(item => {
      if (item.expires) counts[expirationLevel(dayDiff(today, item.expires))]++;
    });

    byId('timelineExpired').textContent = counts.expired;
    byId('timelineCritical').textContent = counts.critical;
    byId('timelineWarning').textContent = counts.warning;
    byId('timelineSafe').textContent = counts.safe;
  }

  function render() {
    createView();
    const body = byId('timelineBody');
    if (!body) return;

    const today = startOfDay();
    const allItems = getItems();
    updateSummary(allItems, today);
    const items = sortItems(filterItems(allItems, today));

    if (!selectedCategories().length) {
      body.innerHTML = '<div class="timeline-empty">Select at least one contract type.</div>';
      return;
    }

    if (!items.length) {
      body.innerHTML = '<div class="timeline-empty">No contracts found for the selected filters.</div>';
      return;
    }

    body.innerHTML = items.map(item => {
      const status = clean(item.row['General Status']) || 'Status not provided';

      if (!item.expires) {
        return `<div class="timeline-row">
          <div class="timeline-contract">
            <span class="timeline-contract-number">${safe(item.number)}</span>
            <span class="timeline-supplier">${safe(item.supplier)}</span>
            <span class="timeline-category ${item.category}">${labels[item.category]}</span>
          </div>
          <div class="timeline-lifetime">
            <div class="timeline-date-row"><span>Creation: <strong>${safe(dateText(item.created))}</strong></span><span>Expiration: <strong>Not provided</strong></span></div>
            <div class="timeline-track"></div>
            <div class="timeline-duration-info">Add an expiration date to display the contract lifetime.</div>
          </div>
          <div class="timeline-alert warning"><strong>No expiration date</strong><span>${safe(status)}</span></div>
        </div>`;
      }

      const days = dayDiff(today, item.expires);
      const level = expirationLevel(days);
      const position = timelinePosition(item.created || item.expires, item.expires, today);
      const duration = item.created ? dayDiff(item.created, item.expires) : null;
      const durationText = duration === null
        ? 'Creation date not provided'
        : duration < 0
          ? 'Expiration date is earlier than the creation date'
          : `Registered lifetime: ${duration} day${duration === 1 ? '' : 's'}`;

      return `<div class="timeline-row">
        <div class="timeline-contract">
          <span class="timeline-contract-number" title="${safe(item.number)}">${safe(item.number)}</span>
          <span class="timeline-supplier" title="${safe(item.supplier)}">${safe(item.supplier)}</span>
          ${item.project ? `<span class="timeline-supplier">${safe(item.project)}</span>` : ''}
          <span class="timeline-category ${item.category}">${labels[item.category]}</span>
        </div>
        <div class="timeline-lifetime">
          <div class="timeline-date-row"><span>Creation: <strong>${safe(dateText(item.created))}</strong></span><span>Expiration: <strong>${safe(dateText(item.expires))}</strong></span></div>
          <div class="timeline-track">
            <div class="timeline-track-background"><div class="timeline-elapsed ${position.cssClass}" style="width:${position.width}%"></div></div>
            <span class="timeline-today-marker" style="left:${position.today}%"></span>
            <span class="timeline-expiry-marker" style="left:98.5%"></span>
          </div>
          <div class="timeline-duration-info">${durationText}</div>
        </div>
        <div class="timeline-alert ${level}"><strong>${safe(alertText(days))}</strong><span>${safe(status)}</span></div>
      </div>`;
    }).join('');
  }

  injectStyles();
  createView();
  byId('timelineTab')?.addEventListener('click', showTimeline);
  document.querySelectorAll('.nav button').forEach(button => button.addEventListener('click', showDashboard));
  window.renderContractTimeline = render;
  window.addEventListener('load', render);
})();

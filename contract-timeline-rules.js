/* Contract Timeline Rules
   Load after contract-timeline.js.
   1. Date fields accept dates only.
   2. Timeline refreshes after a saved edit.
   3. 2999-12-31 is displayed as Valid Until Terminated.
   4. Hoje is translated to Today.
*/
(function () {
  'use strict';

  const TERMINATED_DATE_ISO = '2999-12-31';
  const $ = id => document.getElementById(id);

  function parseToISO(value) {
    const text = String(value ?? '').trim();
    if (!text) return '';

    let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;

    match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
    }

    const parsed = typeof window.parseDate === 'function' ? window.parseDate(text) : new Date(text);
    if (!parsed || Number.isNaN(parsed.getTime())) return '';

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function enforceDateInputs() {
    document.querySelectorAll('#dynamicFields [data-column]').forEach(input => {
      const column = input.dataset.column || '';
      if (!column.includes('Date')) return;

      const isoValue = parseToISO(input.value);
      if (input.type !== 'date') input.type = 'date';
      input.value = isoValue;
      input.placeholder = '';
      input.setAttribute('inputmode', 'none');
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('aria-label', `${column}. Select a date.`);
    });
  }

  function installDateWatcher() {
    const fields = $('dynamicFields');
    if (!fields) return;

    enforceDateInputs();
    new MutationObserver(enforceDateInputs).observe(fields, {
      childList: true,
      subtree: true
    });
  }

  function addVisualRules() {
    if ($('timelineDateRuleStyles')) return;

    const style = document.createElement('style');
    style.id = 'timelineDateRuleStyles';
    style.textContent = `
      .timeline-today-marker::before {
        content: 'Today' !important;
      }

      .timeline-row.valid-until-terminated .timeline-today-marker::before {
        content: 'Valid until terminated' !important;
        color: var(--text);
      }

      .timeline-row.valid-until-terminated .timeline-elapsed {
        left: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        background: linear-gradient(90deg, var(--primary2), var(--primary)) !important;
      }

      .timeline-row.valid-until-terminated .timeline-expiry-marker {
        display: none !important;
      }

      .timeline-row.valid-until-terminated .timeline-today-marker {
        left: 50% !important;
      }

      .timeline-row.valid-until-terminated .timeline-duration-info {
        color: var(--primary);
        font-weight: 800;
      }
    `;
    document.head.appendChild(style);
  }

  function isTerminatedDateText(text) {
    const normalized = String(text ?? '')
      .replace(/\s+/g, ' ')
      .replace(/\./g, '')
      .trim()
      .toLowerCase();

    return normalized.includes('dec 31, 2999') ||
           normalized.includes('31 dec 2999') ||
           normalized.includes('31/12/2999') ||
           normalized.includes('2999-12-31');
  }

  function applyTimelineRules() {
    const timeline = $('timelineView');
    if (!timeline) return;

    timeline.querySelectorAll('.timeline-row').forEach(row => {
      const dateRow = row.querySelector('.timeline-date-row');
      const isIndefinite = isTerminatedDateText(dateRow?.textContent);
      row.classList.toggle('valid-until-terminated', isIndefinite);

      if (!isIndefinite) return;

      const dateParts = dateRow?.querySelectorAll('span');
      if (dateParts?.length > 1) {
        dateParts[1].innerHTML = 'Expiration: <strong>Valid Until Terminated</strong>';
      }

      const alert = row.querySelector('.timeline-alert');
      if (alert) {
        alert.classList.remove('expired', 'critical', 'warning');
        alert.classList.add('safe');
        const strong = alert.querySelector('strong');
        if (strong) strong.textContent = 'Valid Until Terminated';
      }

      const duration = row.querySelector('.timeline-duration-info');
      if (duration) duration.textContent = 'Valid until terminated';

      const elapsed = row.querySelector('.timeline-elapsed');
      if (elapsed) elapsed.style.width = '100%';
    });
  }

  function installTimelineWatcher() {
    const root = document.documentElement;
    let scheduled = false;

    new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        applyTimelineRules();
      });
    }).observe(root, { childList: true, subtree: true });

    applyTimelineRules();
  }

  function refreshAfterSave() {
    const form = $('recordForm');
    if (!form) return;

    form.addEventListener('submit', () => {
      const startedAt = Date.now();
      const timer = setInterval(() => {
        const overlayClosed = $('recordOverlay')?.classList.contains('hidden');
        if (overlayClosed) {
          clearInterval(timer);
          window.renderContractTimeline?.();
          applyTimelineRules();
        } else if (Date.now() - startedAt > 15000) {
          clearInterval(timer);
        }
      }, 100);
    });
  }

  function initialize() {
    addVisualRules();
    installDateWatcher();
    installTimelineWatcher();
    refreshAfterSave();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();

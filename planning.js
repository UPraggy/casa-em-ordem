(() => {
  const app = window.CasaEmOrdemAssistant;
  if (!app) return;

  const state = app.state;
  const EVENT_CATEGORIES = ['Escola', 'Compromisso', 'Plano', 'Casa', 'Saúde'];
  const FIXED_CATEGORIES = ['Moradia', 'Educação', 'Serviços', 'Saúde', 'Assinaturas', 'Outros'];
  const FREQUENCIES = { weekly: 'toda semana', monthly: 'todo mês', quarterly: 'a cada 3 meses', yearly: 'todo ano' };
  const $ = selector => document.querySelector(selector);
  const today = new Date(); today.setHours(12, 0, 0, 0);
  let selectedDate = dateKey(today);
  let calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  let photoDraft = null;
  let reminderTimer = null;
  let houseImportBusy = false;

  state.events ||= [];
  state.fixedCosts ||= [];
  try { localStorage.setItem('casa-em-ordem', JSON.stringify(state)); } catch (error) { /* The current state can still be used in memory. */ }

  function dateKey(date) {
    const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) || dateKey(date) !== value ? null : date;
  }

  function formatDate(value, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
    const date = parseDate(value);
    return date ? new Intl.DateTimeFormat('pt-BR', options).format(date) : 'Data não definida';
  }

  function safeText(value, max = 240) {
    return String(value ?? '').replace(/[<>"'`]/g, '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
  }

  function money(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
  }

  function monthEquivalent(cost) {
    const amount = Number(cost.amount) || 0;
    if (cost.frequency === 'weekly') return amount * 52 / 12;
    if (cost.frequency === 'quarterly') return amount / 3;
    if (cost.frequency === 'yearly') return amount / 12;
    return amount;
  }

  function monthlyTotal() {
    return state.fixedCosts.filter(cost => cost.active !== false).reduce((sum, cost) => sum + monthEquivalent(cost), 0);
  }

  function addMonths(date, count) {
    const targetMonth = date.getMonth() + count;
    const lastDay = new Date(date.getFullYear(), targetMonth + 1, 0, 12).getDate();
    return new Date(date.getFullYear(), targetMonth, Math.min(date.getDate(), lastDay), 12);
  }

  function occurrenceAt(first, frequency, index) {
    if (frequency === 'weekly') return new Date(first.getFullYear(), first.getMonth(), first.getDate() + 7 * index, 12);
    if (frequency === 'quarterly') return addMonths(first, 3 * index);
    if (frequency === 'yearly') return addMonths(first, 12 * index);
    return addMonths(first, index);
  }

  function fixedOccurrences(cost, start, end) {
    const first = parseDate(cost.dueDate);
    if (!first || cost.active === false) return [];
    let index = 0, guard = 0, cursor = first;
    while (cursor < start && guard++ < 500) cursor = occurrenceAt(first, cost.frequency, ++index);
    const result = [];
    while (cursor <= end && guard++ < 540) {
      result.push({ cost, date: dateKey(cursor) });
      cursor = occurrenceAt(first, cost.frequency, ++index);
    }
    return result;
  }

  function updateHomeBudget() {
    const total = monthlyTotal();
    const totalNode = $('#summary-spent'), limitNode = $('#summary-budget');
    if (totalNode) totalNode.textContent = money(total);
    if (limitNode) limitNode.textContent = money(state.budget);
  }

  function renderFixedBudget() {
    const active = state.fixedCosts.filter(cost => cost.active !== false);
    const total = monthlyTotal();
    const cap = Number(state.budget) || 0;
    const percent = cap > 0 ? Math.round(total / cap * 100) : 0;
    $('#budget-big').textContent = money(total);
    $('#budget-limit').textContent = money(cap);
    $('#budget-percent').textContent = `${percent}%`;

    const totalsByCategory = FIXED_CATEGORIES.map(category => ({
      category,
      amount: active.filter(cost => cost.category === category).reduce((sum, cost) => sum + monthEquivalent(cost), 0)
    })).filter(entry => entry.amount > 0);
    $('#expense-bars').replaceChildren();
    if (!totalsByCategory.length) {
      const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = 'Adicione contas e planos recorrentes para ver a previsão mensal.'; $('#expense-bars').append(empty);
    } else {
      totalsByCategory.forEach(entry => {
        const row = document.createElement('div'); row.className = 'fixed-breakdown-row';
        const head = document.createElement('div'); head.className = 'fixed-breakdown-head';
        const label = document.createElement('span'); label.textContent = entry.category;
        const amount = document.createElement('b'); amount.textContent = money(entry.amount);
        const track = document.createElement('div'); track.className = 'fixed-breakdown-track';
        const fill = document.createElement('i'); fill.style.width = `${total ? Math.min(100, entry.amount / total * 100) : 0}%`;
        track.append(fill); head.append(label, amount); row.append(head, track); $('#expense-bars').append(row);
      });
    }

    const list = $('#transaction-list'); list.replaceChildren();
    if (!active.length) {
      const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = 'Nenhum compromisso recorrente cadastrado. Adicione mensalidade, aluguel, internet ou outro plano.'; list.append(empty); return;
    }
    active.slice().sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')).forEach(cost => {
      const row = document.createElement('article'); row.className = 'fixed-cost-row'; row.dataset.fixedId = cost.id;
      const glyph = document.createElement('span'); glyph.className = 'fixed-cost-icon'; glyph.textContent = cost.category === 'Educação' ? '🎓' : cost.category === 'Saúde' ? '♡' : cost.category === 'Moradia' ? '⌂' : '↻';
      const copy = document.createElement('div'); copy.className = 'fixed-cost-copy';
      const name = document.createElement('strong'); name.textContent = cost.name;
      const detail = document.createElement('small'); detail.textContent = `${cost.category} · ${FREQUENCIES[cost.frequency] || FREQUENCIES.monthly}${cost.dueDate ? ` · próximo vencimento ${formatDate(cost.dueDate)}` : ''}`;
      copy.append(name, detail);
      const amount = document.createElement('b'); amount.className = 'fixed-cost-amount'; amount.textContent = `${money(cost.amount)}${cost.frequency === 'monthly' ? '/mês' : `/${cost.frequency === 'weekly' ? 'sem.' : cost.frequency === 'quarterly' ? 'trim.' : 'ano'}`}`;
      const actions = document.createElement('div'); actions.className = 'fixed-cost-actions';
      actions.append(actionButton('Editar', 'pencil', 'data-edit-fixed', cost.id, cost.name), actionButton('Apagar', 'trash', 'data-delete-fixed', cost.id, cost.name));
      row.append(glyph, copy, amount, actions); list.append(row);
    });
  }

  function actionButton(label, iconName, attribute, id, subject = '') {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'row-action'; button.setAttribute(attribute, id); button.setAttribute('aria-label', `${label}${subject ? ` ${subject}` : ''}`); button.title = label;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('class', 'icon'); svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); use.setAttribute('href', `#icon-${iconName}`); svg.append(use);
    const span = document.createElement('span'); span.textContent = label; button.append(svg, span); return button;
  }

  function listAllOccurrences(start, end) {
    const result = state.events.filter(event => {
      const date = parseDate(event.date); return date && date >= start && date <= end;
    }).map(event => ({ kind: 'event', event, date: event.date }));
    state.fixedCosts.forEach(cost => fixedOccurrences(cost, start, end).forEach(entry => result.push({ kind: 'fixed', cost, date: entry.date })));
    return result.sort((a, b) => `${a.date} ${a.event?.time || '09:00'}`.localeCompare(`${b.date} ${b.event?.time || '09:00'}`));
  }

  function renderCalendar() {
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(calendarMonth);
    $('#calendar-month-label').textContent = label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1);
    const grid = $('#calendar-grid'); grid.replaceChildren();
    const year = calendarMonth.getFullYear(), month = calendarMonth.getMonth();
    const firstWeekday = new Date(year, month, 1, 12).getDay();
    const daysInMonth = new Date(year, month + 1, 0, 12).getDate();
    const start = new Date(year, month, 1, 12), end = new Date(year, month + 1, 0, 12);
    const markers = new Map();
    state.events.forEach(event => { if (event.date >= dateKey(start) && event.date <= dateKey(end)) markers.set(event.date, (markers.get(event.date) || 0) + 1); });
    state.fixedCosts.forEach(cost => fixedOccurrences(cost, start, end).forEach(entry => markers.set(entry.date, (markers.get(entry.date) || 0) + 1)));
    for (let i = 0; i < firstWeekday; i++) { const blank = document.createElement('span'); blank.className = 'calendar-blank'; blank.setAttribute('aria-hidden', 'true'); grid.append(blank); }
    for (let day = 1; day <= daysInMonth; day++) {
      const current = new Date(year, month, day, 12), key = dateKey(current), count = markers.get(key) || 0;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'calendar-day'; button.dataset.calendarDate = key; button.setAttribute('role', 'gridcell'); button.setAttribute('aria-pressed', String(key === selectedDate));
      if (key === dateKey(today)) button.classList.add('today');
      if (key === selectedDate) button.classList.add('selected');
      button.setAttribute('aria-label', `${formatDate(key, { day: 'numeric', month: 'long' })}${count ? `, ${count} compromisso${count === 1 ? '' : 's'}` : ''}`);
      const number = document.createElement('span'); number.className = 'calendar-day-number'; number.textContent = String(day); button.append(number);
      if (count) { const dots = document.createElement('span'); dots.className = 'calendar-dots'; dots.setAttribute('aria-hidden', 'true'); for (let n = 0; n < Math.min(count, 3); n++) { const dot = document.createElement('i'); dots.append(dot); } button.append(dots); }
      grid.append(button);
    }
  }

  function eventCard(event) {
    const article = document.createElement('article'); article.className = `agenda-card ${event.done ? 'is-done' : ''}`; article.dataset.eventId = event.id;
    if (event.photo) { const image = document.createElement('img'); image.className = 'agenda-photo'; image.src = event.photo; image.alt = `Foto de ${event.title}`; article.append(image); }
    const main = document.createElement('div'); main.className = 'agenda-card-main';
    const meta = document.createElement('div'); meta.className = 'agenda-card-meta';
    const date = document.createElement('span'); date.className = 'agenda-date'; date.textContent = formatDate(event.date, { weekday: 'short', day: 'numeric', month: 'short' });
    const category = document.createElement('span'); category.className = `agenda-category category-${safeText(event.category).toLowerCase().replace(/[^a-z]/g, '')}`; category.textContent = event.category;
    meta.append(date, category);
    const title = document.createElement('h3'); title.textContent = event.title;
    const detail = document.createElement('p'); detail.className = 'agenda-detail'; detail.textContent = `${event.time ? `${event.time} · ` : ''}${event.notes || ''}`;
    main.append(meta, title); if (event.notes || event.time) main.append(detail);
    const actions = document.createElement('div'); actions.className = 'agenda-card-actions';
    const doneLabel = document.createElement('label'); doneLabel.className = 'agenda-done-label';
    const done = document.createElement('input'); done.type = 'checkbox'; done.checked = Boolean(event.done); done.dataset.eventDone = event.id; done.setAttribute('aria-label', `Marcar ${event.title} como concluído`);
    const doneText = document.createElement('span'); doneText.textContent = 'Feito'; doneLabel.append(done, doneText);
    actions.append(doneLabel, actionButton('Editar', 'pencil', 'data-edit-event', event.id, event.title), actionButton('Apagar', 'trash', 'data-delete-event', event.id, event.title));
    main.append(actions); article.append(main);
    const checklist = Array.isArray(event.checklist) ? event.checklist : [];
    {
      const list = document.createElement('div'); list.className = 'event-checklist';
      if (checklist.length) {
        const heading = document.createElement('strong'); heading.className = 'event-checklist-heading'; heading.textContent = `Lista · ${checklist.filter(item => item.done).length}/${checklist.length}`; list.append(heading);
        checklist.forEach(item => {
          const line = document.createElement('label'); line.className = 'event-check-item';
          const check = document.createElement('input'); check.type = 'checkbox'; check.checked = Boolean(item.done); check.dataset.eventCheck = event.id; check.dataset.checkId = item.id; check.setAttribute('aria-label', `${item.done ? 'Desmarcar' : 'Marcar'} ${item.text}`);
          const text = document.createElement('span'); text.textContent = item.text; if (item.done) text.className = 'checked';
          const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'check-remove'; remove.dataset.removeCheck = event.id; remove.dataset.checkId = item.id; remove.setAttribute('aria-label', `Apagar ${item.text} da lista`); remove.textContent = '×';
          line.append(check, text, remove); list.append(line);
        });
      }
      const addForm = document.createElement('form'); addForm.className = 'quick-check-form'; addForm.dataset.addCheck = event.id;
      const input = document.createElement('input'); input.required = true; input.maxLength = 100; input.placeholder = 'Adicionar item à lista…'; input.setAttribute('aria-label', `Adicionar item à lista de ${event.title}`);
      const add = document.createElement('button'); add.type = 'submit'; add.setAttribute('aria-label', 'Adicionar item'); add.textContent = '+';
      addForm.append(input, add); list.append(addForm); article.append(list);
    }
    return article;
  }

  function fixedAgendaCard(cost, date) {
    const article = document.createElement('article'); article.className = 'agenda-card fixed-agenda-card';
    const glyph = document.createElement('span'); glyph.className = 'fixed-agenda-mark'; glyph.textContent = '↻';
    const main = document.createElement('div'); main.className = 'agenda-card-main';
    const meta = document.createElement('div'); meta.className = 'agenda-card-meta';
    const dateLabel = document.createElement('span'); dateLabel.className = 'agenda-date'; dateLabel.textContent = `${formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })} · vencimento`;
    const category = document.createElement('span'); category.className = 'agenda-category category-fixed'; category.textContent = cost.category;
    meta.append(dateLabel, category);
    const title = document.createElement('h3'); title.textContent = cost.name;
    const detail = document.createElement('p'); detail.className = 'agenda-detail'; detail.textContent = `${money(cost.amount)} · ${FREQUENCIES[cost.frequency] || FREQUENCIES.monthly}`;
    const actions = document.createElement('div'); actions.className = 'agenda-card-actions'; actions.append(actionButton('Editar', 'pencil', 'data-edit-fixed', cost.id, cost.name), actionButton('Apagar', 'trash', 'data-delete-fixed', cost.id, cost.name));
    main.append(meta, title, detail, actions); article.append(glyph, main); return article;
  }

  function renderAgenda() {
    const search = ($('#agenda-search').value || '').trim().toLocaleLowerCase('pt-BR');
    const filter = $('#agenda-filters .active')?.dataset.agendaFilter || 'Todos';
    const start = parseDate(selectedDate) || today;
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 14, 12);
    const entries = listAllOccurrences(start, end).filter(entry => {
      if (entry.kind === 'fixed') {
        if (filter !== 'Todos' && filter !== 'Casa') return false;
        return !search || `${entry.cost.name} ${entry.cost.category} ${entry.cost.note || ''}`.toLocaleLowerCase('pt-BR').includes(search);
      }
      const event = entry.event;
      return (filter === 'Todos' || event.category === filter) && (!search || `${event.title} ${event.category} ${event.notes || ''} ${(event.checklist || []).map(item => item.text).join(' ')}`.toLocaleLowerCase('pt-BR').includes(search));
    });
    const dateTitle = selectedDate === dateKey(today) ? 'Próximas duas semanas' : `A partir de ${formatDate(selectedDate, { day: 'numeric', month: 'long' })}`;
    $('#agenda-heading').textContent = dateTitle;
    $('#agenda-count').textContent = String(entries.length);
    const list = $('#agenda-list'); list.replaceChildren();
    if (!entries.length) { const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = 'Nada agendado neste período. Toque em “Agendar compromisso” para planejar escola, consultas ou planos da casa.'; list.append(empty); return; }
    entries.forEach(entry => list.append(entry.kind === 'event' ? eventCard(entry.event) : fixedAgendaCard(entry.cost, entry.date)));
  }

  function renderAllPlanning() {
    renderCalendar(); renderAgenda(); renderFixedBudget(); updateHomeBudget(); renderNotificationsButton();
  }

  function openEventModal(event = null) {
    const form = $('#event-form'); form.reset(); photoDraft = event?.photo || null;
    form.dataset.editId = event?.id || '';
    $('#event-modal-title').textContent = event ? 'Editar compromisso' : 'Agendar compromisso';
    $('#event-title').value = event?.title || '';
    $('#event-category').value = event?.category || 'Compromisso';
    $('#event-date').value = event?.date || selectedDate;
    $('#event-time').value = event?.time || '';
    $('#event-reminder').value = String(event?.reminderMinutes ?? 30);
    $('#event-notes').value = event?.notes || '';
    $('#event-checklist').value = (event?.checklist || []).map(item => item.text).join('\n');
    showEventPhoto(photoDraft);
    $('#event-backdrop').classList.add('open');
    setTimeout(() => $('#event-title').focus({ preventScroll: true }), 0);
  }

  function closeEventModal() { $('#event-backdrop').classList.remove('open'); $('#event-form').reset(); $('#event-form').dataset.editId = ''; photoDraft = null; }

  function showEventPhoto(value) {
    const preview = $('#event-photo-preview'); preview.replaceChildren();
    if (value) {
      const image = document.createElement('img'); image.src = value; image.alt = 'Foto anexada ao compromisso';
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'event-photo-remove'; remove.dataset.removeEventPhoto = ''; remove.textContent = 'Remover foto';
      preview.append(image, remove);
    }
    else { preview.append(document.createTextNode('＋')); const hint = document.createElement('small'); hint.textContent = 'Adicionar foto ou anexo visual'; preview.append(hint); }
  }

  function fileAsDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }

  async function compressPhoto(file) {
    if (!file || !file.type.startsWith('image/') || file.type === 'image/svg+xml') throw new Error('Escolha uma foto em formato de imagem compatível.');
    const source = await fileAsDataUrl(file);
    const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = source; });
    const scale = Math.min(1, 800 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.72);
  }

  function checklistFromLines(text, previous = []) {
    const existing = new Map(previous.map(item => [normalize(item.text), item]));
    return [...new Set(String(text || '').split(/\r?\n/).map(line => safeText(line, 100)).filter(Boolean))].slice(0, 30).map((line, index) => {
      const old = existing.get(normalize(line));
      return { id: old?.id || `check-${Date.now()}-${index}`, text: line, done: Boolean(old?.done) };
    });
  }

  function normalize(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }

  $('#add-event').addEventListener('click', () => openEventModal());
  $('#event-close').addEventListener('click', closeEventModal); $('#event-cancel').addEventListener('click', closeEventModal);
  $('#event-backdrop').addEventListener('click', event => { if (event.target === $('#event-backdrop')) closeEventModal(); });
  $('#event-photo').addEventListener('change', async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try { photoDraft = await compressPhoto(file); showEventPhoto(photoDraft); }
    catch (error) { app.toast(error.message || 'Não foi possível ler essa foto.'); }
  });
  $('#event-photo-preview').addEventListener('click', event => {
    const remove = event.target.closest('[data-remove-event-photo]');
    if (!remove) return;
    event.preventDefault(); event.stopPropagation(); photoDraft = null; $('#event-photo').value = ''; showEventPhoto(null);
  });
  $('#event-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget, id = form.dataset.editId;
    const existing = state.events.find(item => item.id === id);
    const title = safeText($('#event-title').value, 120), date = $('#event-date').value;
    if (!title || !parseDate(date)) { app.toast('Informe o nome e uma data válida.'); return; }
    const updated = {
      id: existing?.id || `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title, category: EVENT_CATEGORIES.includes($('#event-category').value) ? $('#event-category').value : 'Compromisso',
      date, time: $('#event-time').value, reminderMinutes: Number($('#event-reminder').value) || 0,
      notes: safeText($('#event-notes').value, 1000), photo: photoDraft,
      checklist: checklistFromLines($('#event-checklist').value, existing?.checklist || []), done: existing?.done || false,
      updatedAt: Date.now()
    };
    if (existing) Object.assign(existing, updated); else state.events.push(updated);
    app.save(); closeEventModal(); app.toast(existing ? 'Compromisso atualizado.' : 'Compromisso adicionado à agenda.');
  });

  function openFixedModal(cost = null) {
    const form = $('#fixed-form'); form.reset(); form.dataset.editId = cost?.id || '';
    $('#fixed-modal-title').textContent = cost ? 'Editar compromisso' : 'Adicionar compromisso';
    $('#fixed-name').value = cost?.name || ''; $('#fixed-category').value = cost?.category || 'Moradia';
    $('#fixed-amount').value = cost?.amount ?? ''; $('#fixed-frequency').value = cost?.frequency || 'monthly';
    $('#fixed-due-date').value = cost?.dueDate || ''; $('#fixed-reminder').value = String(cost?.reminderMinutes ?? 1440); $('#fixed-note').value = cost?.note || '';
    $('#fixed-backdrop').classList.add('open'); setTimeout(() => $('#fixed-name').focus({ preventScroll: true }), 0);
  }

  function closeFixedModal() { $('#fixed-backdrop').classList.remove('open'); $('#fixed-form').reset(); $('#fixed-form').dataset.editId = ''; }
  $('#add-recurring').addEventListener('click', () => openFixedModal());
  $('#fixed-close').addEventListener('click', closeFixedModal); $('#fixed-cancel').addEventListener('click', closeFixedModal);
  $('#fixed-backdrop').addEventListener('click', event => { if (event.target === $('#fixed-backdrop')) closeFixedModal(); });
  $('#fixed-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget, id = form.dataset.editId, existing = state.fixedCosts.find(item => item.id === id);
    const name = safeText($('#fixed-name').value, 100), amount = Number($('#fixed-amount').value);
    if (!name || !Number.isFinite(amount) || amount < 0) { app.toast('Confira o nome e o valor recorrente.'); return; }
    const update = {
      id: existing?.id || `fixed-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name, category: FIXED_CATEGORIES.includes($('#fixed-category').value) ? $('#fixed-category').value : 'Outros',
      amount, frequency: FREQUENCIES[$('#fixed-frequency').value] ? $('#fixed-frequency').value : 'monthly',
      dueDate: parseDate($('#fixed-due-date').value) ? $('#fixed-due-date').value : '',
      reminderMinutes: Number($('#fixed-reminder').value) || 0, note: safeText($('#fixed-note').value, 240), active: true
    };
    if (existing) Object.assign(existing, update); else state.fixedCosts.push(update);
    app.save(); closeFixedModal(); app.toast(existing ? 'Compromisso recorrente atualizado.' : 'Compromisso recorrente adicionado.');
  });

  const budgetBackdrop = $('#budget-backdrop');
  function openBudgetModal() {
    $('#budget-cap-input').value = String(Number(state.budget) || 0);
    budgetBackdrop.classList.add('open');
    setTimeout(() => $('#budget-cap-input').focus({ preventScroll: true }), 0);
  }
  function closeBudgetModal() { budgetBackdrop.classList.remove('open'); $('#budget-form').reset(); }
  $('#set-budget').onclick = openBudgetModal;
  $('#budget-close').addEventListener('click', closeBudgetModal);
  $('#budget-cancel').addEventListener('click', closeBudgetModal);
  budgetBackdrop.addEventListener('click', event => { if (event.target === budgetBackdrop) closeBudgetModal(); });
  $('#budget-form').addEventListener('submit', event => {
    event.preventDefault();
    const amount = Number($('#budget-cap-input').value);
    if (!Number.isFinite(amount) || amount < 0 || amount > 100000000) { app.toast('Informe um limite mensal válido.'); return; }
    state.budget = amount; app.save(); closeBudgetModal(); app.toast('Limite mensal atualizado.');
  });

  const groupBackdrop = $('#group-backdrop');
  function openGroupModal() { $('#group-name').value = ''; groupBackdrop.classList.add('open'); setTimeout(() => $('#group-name').focus({ preventScroll: true }), 0); }
  function closeGroupModal() { groupBackdrop.classList.remove('open'); $('#group-form').reset(); }
  $('#add-group').onclick = openGroupModal;
  $('#group-close').addEventListener('click', closeGroupModal);
  $('#group-cancel').addEventListener('click', closeGroupModal);
  groupBackdrop.addEventListener('click', event => { if (event.target === groupBackdrop) closeGroupModal(); });
  $('#group-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = safeText($('#group-name').value, 40);
    if (!name) { app.toast('Informe um nome para o grupo.'); return; }
    if (state.groups.some(group => normalize(group) === normalize(name))) { app.toast('Esse grupo já existe.'); return; }
    if (state.groups.length >= 50) { app.toast('Você já tem o limite de 50 grupos.'); return; }
    state.groups.push(name); app.save(); closeGroupModal(); app.toast(`Grupo “${name}” criado.`);
  });

  $('#calendar-prev').addEventListener('click', () => { calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1, 12); selectedDate = dateKey(calendarMonth); renderCalendar(); renderAgenda(); });
  $('#calendar-next').addEventListener('click', () => { calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1, 12); selectedDate = dateKey(calendarMonth); renderCalendar(); renderAgenda(); });
  $('#calendar-today').addEventListener('click', () => { calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12); selectedDate = dateKey(today); renderCalendar(); renderAgenda(); });
  $('#calendar-grid').addEventListener('click', event => {
    const day = event.target.closest('[data-calendar-date]'); if (!day) return;
    selectedDate = day.dataset.calendarDate; renderCalendar(); renderAgenda();
  });
  $('#agenda-search').addEventListener('input', renderAgenda);
  $('#agenda-filters').addEventListener('click', event => {
    const button = event.target.closest('[data-agenda-filter]'); if (!button) return;
    $('#agenda-filters').querySelectorAll('.filter').forEach(filter => filter.classList.toggle('active', filter === button)); renderAgenda();
  });

  document.addEventListener('click', event => {
    const editEvent = event.target.closest('[data-edit-event]');
    if (editEvent) { const item = state.events.find(entry => entry.id === editEvent.getAttribute('data-edit-event')); if (item) openEventModal(item); return; }
    const deleteEvent = event.target.closest('[data-delete-event]');
    if (deleteEvent) {
      const id = deleteEvent.getAttribute('data-delete-event'), item = state.events.find(entry => entry.id === id);
      if (item && confirm(`Apagar “${item.title}” da agenda e da lista vinculada?`)) { state.events = state.events.filter(entry => entry.id !== id); app.save(); app.toast('Compromisso apagado.'); }
      return;
    }
    const editFixed = event.target.closest('[data-edit-fixed]');
    if (editFixed) { const item = state.fixedCosts.find(entry => entry.id === editFixed.getAttribute('data-edit-fixed')); if (item) openFixedModal(item); return; }
    const deleteFixed = event.target.closest('[data-delete-fixed]');
    if (deleteFixed) {
      const id = deleteFixed.getAttribute('data-delete-fixed'), item = state.fixedCosts.find(entry => entry.id === id);
      if (item && confirm(`Apagar o compromisso recorrente “${item.name}”?`)) { state.fixedCosts = state.fixedCosts.filter(entry => entry.id !== id); app.save(); app.toast('Compromisso recorrente apagado.'); }
      return;
    }
    const removeCheck = event.target.closest('[data-remove-check]');
    if (removeCheck) {
      const item = state.events.find(entry => entry.id === removeCheck.dataset.removeCheck), id = removeCheck.dataset.checkId;
      if (item) { item.checklist = item.checklist.filter(line => line.id !== id); app.save(); }
    }
  });
  document.addEventListener('change', event => {
    if (event.target.matches('[data-event-done]')) {
      const item = state.events.find(entry => entry.id === event.target.dataset.eventDone); if (item) { item.done = event.target.checked; app.save(); }
    }
    if (event.target.matches('[data-event-check]')) {
      const item = state.events.find(entry => entry.id === event.target.dataset.eventCheck), check = item?.checklist.find(line => line.id === event.target.dataset.checkId);
      if (check) { check.done = event.target.checked; app.save(); }
    }
  });
  document.addEventListener('submit', event => {
    const form = event.target.closest('[data-add-check]'); if (!form) return;
    event.preventDefault();
    const item = state.events.find(entry => entry.id === form.dataset.addCheck), input = form.querySelector('input'), text = safeText(input.value, 100);
    if (!item || !text) return;
    item.checklist ||= []; item.checklist.push({ id: `check-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, text, done: false });
    app.save();
  });

  const notificationKey = 'casa-notificacoes-agenda';
  const sentKey = 'casa-lembretes-enviados';
  function renderNotificationsButton() {
    const button = $('#notifications-toggle');
    const enabled = localStorage.getItem(notificationKey) === '1' && 'Notification' in window && Notification.permission === 'granted';
    button.textContent = enabled ? 'Desativar avisos' : 'Ativar avisos';
    button.classList.toggle('notification-active', enabled);
    $('#reminder-title').textContent = enabled ? 'Lembretes ativados neste aparelho' : 'Lembretes de compromissos';
  }

  $('#notifications-toggle').addEventListener('click', async () => {
    if (!('Notification' in window)) { app.toast('Este navegador não oferece notificações. Exporte o calendário para o app do celular.'); return; }
    if (localStorage.getItem(notificationKey) === '1') { localStorage.removeItem(notificationKey); renderNotificationsButton(); app.toast('Avisos desativados neste aparelho.'); return; }
    if (Notification.permission === 'denied') { app.toast('Notificações bloqueadas. Libere a permissão nas configurações do navegador.'); return; }
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') { app.toast('Permita notificações para receber os lembretes.'); return; }
    localStorage.setItem(notificationKey, '1'); renderNotificationsButton(); app.toast('Lembretes ativados neste aparelho.'); checkReminders();
  });

  function reminderMoment(date, time, minutes) {
    const start = new Date(`${date}T${time || '09:00'}:00`);
    if (Number.isNaN(start.getTime())) return null;
    return { start, remindAt: new Date(start.getTime() - (Number(minutes) || 0) * 60000) };
  }

  function checkReminders() {
    if (!('Notification' in window) || Notification.permission !== 'granted' || localStorage.getItem(notificationKey) !== '1') return;
    const nowTime = Date.now(), startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12), endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90, 12);
    const sent = new Set(JSON.parse(localStorage.getItem(sentKey) || '[]'));
    const candidates = state.events.filter(event => !event.done).map(event => ({
      id: `event:${event.id}:${event.date}:${event.time || ''}:${event.reminderMinutes}`,
      date: event.date, time: event.time, reminder: event.reminderMinutes,
      title: event.title, body: `${event.category}${event.time ? ` · às ${event.time}` : ''}`
    }));
    state.fixedCosts.forEach(cost => fixedOccurrences(cost, startDate, endDate).forEach(entry => candidates.push({
      id: `fixed:${cost.id}:${entry.date}:${cost.reminderMinutes}`, date: entry.date, time: '09:00', reminder: cost.reminderMinutes,
      title: cost.name, body: `Vencimento · ${cost.category}`
    })));
    for (const item of candidates) {
      if (sent.has(item.id)) continue;
      const moment = reminderMoment(item.date, item.time, item.reminder);
      if (!moment || nowTime < moment.remindAt.getTime() || nowTime >= moment.start.getTime() + 5 * 60000) continue;
      const notification = new Notification(item.title, { body: item.body, tag: item.id });
      notification.onclick = () => { window.focus(); notification.close(); };
      sent.add(item.id);
    }
    localStorage.setItem(sentKey, JSON.stringify([...sent].slice(-400)));
  }

  function icsEscape(value) { return String(value || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
  function icsAlarm(minutes, title) {
    if (!minutes) return [];
    const trigger = Number(minutes) >= 1440 ? '-P1D' : `-PT${Number(minutes)}M`;
    return ['BEGIN:VALARM', `TRIGGER:${trigger}`, 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(title)}`, 'END:VALARM'];
  }
  function localIcsStamp(date, time) { return `${date.replace(/-/g, '')}T${(time || '09:00').replace(':', '')}00`; }
  function plusOneHour(time) { const [h, m] = (time || '09:00').split(':').map(Number); const d = new Date(2000, 0, 1, h, m + 60); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

  function exportCalendar() {
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12), until = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate(), 12);
    const items = [];
    state.events.forEach(event => items.push({ type: 'event', event, date: event.date }));
    state.fixedCosts.forEach(cost => fixedOccurrences(cost, from, until).forEach(entry => items.push({ type: 'fixed', cost, date: entry.date })));
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Casa em Ordem//Agenda//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Casa em Ordem'];
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    items.sort((a, b) => a.date.localeCompare(b.date)).forEach(entry => {
      const event = entry.event, cost = entry.cost, allDay = entry.type === 'fixed' || !event.time;
      const title = entry.type === 'event' ? event.title : `Vencimento: ${cost.name}`;
      const description = entry.type === 'event' ? [event.notes, (event.checklist || []).length ? `Lista:\n${event.checklist.map(line => `- [${line.done ? 'x' : ' '}] ${line.text}`).join('\n')}` : ''].filter(Boolean).join('\n\n') : `${cost.category} · ${FREQUENCIES[cost.frequency] || FREQUENCIES.monthly}`;
      lines.push('BEGIN:VEVENT', `UID:${icsEscape(entry.type === 'event' ? event.id : `${cost.id}-${entry.date}`)}@casa.rafaelmr.com.br`, `DTSTAMP:${stamp}`);
      if (allDay) {
        const end = parseDate(entry.date); end.setDate(end.getDate() + 1);
        lines.push(`DTSTART;VALUE=DATE:${entry.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${dateKey(end).replace(/-/g, '')}`);
      } else {
        lines.push(`DTSTART;TZID=America/Sao_Paulo:${localIcsStamp(entry.date, event.time)}`, `DTEND;TZID=America/Sao_Paulo:${localIcsStamp(entry.date, event.endTime || plusOneHour(event.time))}`);
      }
      lines.push(`SUMMARY:${icsEscape(title)}`, `DESCRIPTION:${icsEscape(description)}`);
      lines.push(...icsAlarm(entry.type === 'event' ? event.reminderMinutes : cost.reminderMinutes, title), 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    downloadBlob(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }), 'agenda-casa-em-ordem.ics');
    app.toast('Calendário exportado. Abra o arquivo no calendário do celular para receber os avisos mesmo com o site fechado.');
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name; link.style.display = 'none'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  $('#calendar-export').addEventListener('click', exportCalendar);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkReminders(); });
  reminderTimer = setInterval(checkReminders, 30000);

  function hasMeaningfulLocalData() {
    const originalItems = new Map(seed.map(item => [item.id, item]));
    const itemsChanged = state.items.length !== seed.length || state.items.some(item => {
      const original = originalItems.get(item.id);
      return !original || ['name', 'group', 'price', 'qty', 'min', 'expiry', 'emoji', 'photo', 'inShopping', 'buyQty'].some(key => item[key] !== (key === 'buyQty' ? 1 : key === 'inShopping' ? false : original[key]));
    });
    const originalAid = new Map(aidSeed.map((item, index) => [`aid-${index}`, item]));
    const aidChanged = state.aid.length !== aidSeed.length || state.aid.some(item => {
      const original = originalAid.get(item.id);
      return !original || item.name !== original[0] || item.emoji !== original[1] || item.note !== original[2] || item.checked;
    });
    return Boolean(state.events.length || state.fixedCosts.length || state.expenses.length || Number(state.budget) !== 1500 || state.groups.length > 6 || itemsChanged || aidChanged);
  }

  function snapshotEnvelope(data = state) {
    return { app: 'casa-em-ordem', formatVersion: 1, exportedAt: new Date().toISOString(), data: JSON.parse(JSON.stringify(data)) };
  }

  function downloadHouseSnapshot(data = state, suffix = '') {
    const label = new Intl.DateTimeFormat('sv-SE').format(new Date());
    const name = `casa-em-ordem${suffix ? `-${suffix}` : ''}-${label}.json`;
    const blob = new Blob([JSON.stringify(snapshotEnvelope(data), null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, name);
    return blob;
  }

  async function shareHouse() {
    const file = new File([JSON.stringify(snapshotEnvelope(), null, 2)], `casa-em-ordem-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: 'Casa em Ordem', text: 'Importe este arquivo no Casa em Ordem para receber a lista, estoque, agenda, planos e fotos atualizados.', files: [file] });
      } catch (error) {
        if (error.name === 'AbortError') return;
        downloadHouseSnapshot(); app.toast('Não consegui abrir o compartilhamento. O arquivo completo foi baixado.');
      }
      return;
    }
    downloadHouseSnapshot();
    app.toast('Arquivo completo baixado. Envie-o para sua parceira pelo app de mensagens.');
  }

  $('#share-house').addEventListener('click', shareHouse);
  $('#import-house-button').addEventListener('click', () => $('#import-house-file').click());

  const cleanImage = value => typeof value === 'string' && /^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/.test(value) ? value.replace(/\s/g, '') : null;
  const cleanId = (value, fallback) => String(value || fallback).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100) || fallback;
  const validDay = value => typeof value === 'string' && Boolean(parseDate(value));

  function sanitizeSnapshot(envelope) {
    if (!envelope || envelope.app !== 'casa-em-ordem' || !envelope.data || !Array.isArray(envelope.data.items)) throw new Error('Esse arquivo não parece ser uma cópia válida do Casa em Ordem.');
    const raw = envelope.data;
    const defaults = ['Sacola', 'Supermercado', 'Açougue', 'Limpeza', 'Primeiros socorros', 'Outro'];
    const groups = [...new Set([...defaults, ...(Array.isArray(raw.groups) ? raw.groups : []).map(name => safeText(name, 40)).filter(Boolean), ...raw.items.map(item => safeText(item?.group, 40)).filter(Boolean)])].slice(0, 50);
    const items = raw.items.slice(0, 1000).filter(item => item && typeof item === 'object').map((item, index) => ({
      id: cleanId(item.id, `import-${index}`), name: safeText(item.name, 100) || 'Item sem nome',
      group: groups.includes(item.group) ? item.group : 'Outro', price: Math.max(0, Number(item.price) || 0), qty: Math.max(0, Number(item.qty) || 0),
      min: Math.max(0, Number(item.min) || 0), expiry: validDay(item.expiry) ? item.expiry : '', emoji: safeText(item.emoji, 8) || '📦',
      photo: cleanImage(item.photo), created: Number(item.created) || Date.now(), inShopping: Boolean(item.inShopping), buyQty: Math.max(1, Number(item.buyQty) || 1)
    }));
    const events = (Array.isArray(raw.events) ? raw.events : []).slice(0, 1000).filter(item => item && validDay(item.date)).map((item, index) => ({
      id: cleanId(item.id, `event-import-${index}`), title: safeText(item.title, 120) || 'Compromisso',
      category: EVENT_CATEGORIES.includes(item.category) ? item.category : 'Compromisso', date: item.date,
      time: /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time || '') ? item.time : '',
      endTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(item.endTime || '') ? item.endTime : '',
      reminderMinutes: [0, 10, 30, 60, 1440].includes(Number(item.reminderMinutes)) ? Number(item.reminderMinutes) : 30,
      notes: safeText(item.notes, 1000), photo: cleanImage(item.photo), done: Boolean(item.done), updatedAt: Number(item.updatedAt) || Date.now(),
      checklist: (Array.isArray(item.checklist) ? item.checklist : []).slice(0, 50).map((line, lineIndex) => ({ id: cleanId(line.id, `check-${index}-${lineIndex}`), text: safeText(line.text, 100), done: Boolean(line.done) })).filter(line => line.text)
    }));
    const fixedCosts = (Array.isArray(raw.fixedCosts) ? raw.fixedCosts : []).slice(0, 1000).filter(item => item && typeof item === 'object').map((item, index) => ({
      id: cleanId(item.id, `fixed-import-${index}`), name: safeText(item.name, 100) || 'Compromisso recorrente',
      category: FIXED_CATEGORIES.includes(item.category) ? item.category : 'Outros', amount: Math.max(0, Number(item.amount) || 0),
      frequency: Object.prototype.hasOwnProperty.call(FREQUENCIES, item.frequency) ? item.frequency : 'monthly', dueDate: validDay(item.dueDate) ? item.dueDate : '',
      reminderMinutes: [0, 10, 60, 1440].includes(Number(item.reminderMinutes)) ? Number(item.reminderMinutes) : 1440,
      note: safeText(item.note, 240), active: item.active !== false
    }));
    const aid = (Array.isArray(raw.aid) ? raw.aid : []).slice(0, 500).map((item, index) => ({
      id: cleanId(item.id, `aid-import-${index}`), name: safeText(item.name, 100), emoji: safeText(item.emoji, 8) || '🩹', note: safeText(item.note, 160), checked: Boolean(item.checked)
    })).filter(item => item.name);
    const expenses = (Array.isArray(raw.expenses) ? raw.expenses : []).slice(0, 5000).map(item => ({
      name: safeText(item.name, 100), category: safeText(item.category, 40), value: Math.max(0, Number(item.value) || 0), date: safeText(item.date, 40)
    }));
    return { version: 2, items, events, fixedCosts, aid, expenses, groups, budget: Math.max(0, Number(raw.budget) || 0) };
  }

  $('#import-house-file').addEventListener('change', async event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || houseImportBusy) return;
    if (file.size > 30 * 1024 * 1024) { app.toast('Esse arquivo é grande demais para importar pelo navegador.'); return; }
    houseImportBusy = true;
    try {
      const imported = sanitizeSnapshot(JSON.parse(await file.text()));
      const proceed = confirm(`A atualização vai substituir os dados deste aparelho: compras, estoque, fotos, agenda, planos e primeiros socorros. Se houver mudanças locais, vou baixar um backup primeiro. Continuar?`);
      if (!proceed) return;
      if (hasMeaningfulLocalData()) downloadHouseSnapshot(state, 'backup');
      localStorage.setItem('casa-em-ordem', JSON.stringify(imported));
      Object.keys(state).forEach(key => delete state[key]); Object.assign(state, imported);
      app.renderAll(); app.toast('Dados atualizados a partir do arquivo compartilhado.');
    } catch (error) {
      app.toast(error instanceof SyntaxError ? 'O arquivo não está íntegro. Peça uma nova exportação.' : error.message || 'Não consegui importar os dados. Verifique o espaço deste navegador.');
    } finally { houseImportBusy = false; }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeEventModal(); closeFixedModal(); closeBudgetModal(); closeGroupModal();
  });

  window.addEventListener('casa:render', renderAllPlanning);
  renderAllPlanning();
  checkReminders();
})();

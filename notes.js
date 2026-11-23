(() => {
  const app = window.CasaEmOrdemAssistant;
  if (!app) return;

  const state = app.state;
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const colors = new Set(['cream', 'sage', 'peach', 'blue']);
  let filter = 'all';
  let editId = null;
  let deleteId = null;
  let notes = Array.isArray(state.notes) ? state.notes : [];
  state.notes = notes;

  const form = $('#note-form');
  const title = $('#note-title');
  const body = $('#note-body');
  const color = $('#note-color');
  const compose = $('#notes-compose');
  const grid = $('#notes-grid');
  const deleteDialog = $('#note-delete-backdrop');

  function openComposer(note = null) {
    editId = note?.id || null;
    form.reset();
    title.value = note?.title || '';
    body.value = note?.body || '';
    color.value = colors.has(note?.color) ? note.color : 'cream';
    $('#note-add').textContent = note ? 'Editar nota' : 'Nova nota';
    form.querySelector('button[type="submit"]').textContent = note ? 'Atualizar nota' : 'Salvar nota';
    compose.hidden = false;
    title.focus();
    compose.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function closeComposer() {
    form.reset();
    editId = null;
    compose.hidden = true;
    $('#note-add').textContent = 'Nova nota';
  }

  function visibleNotes() {
    const query = $('#notes-search').value.trim().toLocaleLowerCase('pt-BR');
    return notes.filter(note => {
      if (filter === 'archived' ? !note.archived : note.archived) return false;
      if (filter === 'pinned' && !note.pinned) return false;
      return !query || `${note.title} ${note.body}`.toLocaleLowerCase('pt-BR').includes(query);
    }).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  function render() {
    notes = Array.isArray(state.notes) ? state.notes : [];
    const list = visibleNotes();
    if (!list.length) {
      grid.innerHTML = `<div class="notes-empty"><span>✎</span><strong>${filter === 'archived' ? 'Nenhuma nota arquivada' : $('#notes-search').value.trim() ? 'Nenhuma nota encontrada' : 'Suas notas aparecem aqui'}</strong><p>${$('#notes-search').value.trim() ? 'Tente outra busca.' : 'Crie uma anotação para guardar uma ideia, tarefa ou lembrete.'}</p></div>`;
      return;
    }
    grid.innerHTML = list.map(note => {
      const noteColor = colors.has(note.color) ? note.color : 'cream';
      const label = note.pinned ? 'Desafixar nota' : 'Fixar nota';
      return `<article class="note-card note-${noteColor}${note.archived ? ' is-archived' : ''}" data-note-card="${esc(note.id)}">
        <div class="note-card-head"><div class="note-labels">${note.pinned ? '<span class="note-pin">Fixada</span>' : ''}${note.archived ? '<span class="note-pin">Arquivada</span>' : ''}</div><button type="button" class="note-icon-action" data-note-action="pin" data-note-id="${esc(note.id)}" aria-label="${label}" title="${label}">${note.pinned ? '★' : '☆'}</button></div>
        ${note.title ? `<h2>${esc(note.title)}</h2>` : ''}<p class="note-body">${esc(note.body).replace(/\n/g, '<br>')}</p>
        <footer><small>Atualizada ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(note.updatedAt || Date.now()))}</small><div class="note-actions"><button type="button" data-note-action="edit" data-note-id="${esc(note.id)}">Editar</button><button type="button" data-note-action="archive" data-note-id="${esc(note.id)}">${note.archived ? 'Restaurar' : 'Arquivar'}</button><button type="button" class="note-delete" data-note-action="delete" data-note-id="${esc(note.id)}">Apagar</button></div></footer>
      </article>`;
    }).join('');
  }

  function persist(message) {
    state.notes = notes;
    app.save();
    render();
    if (message) app.toast(message);
  }

  $('#note-add').addEventListener('click', () => openComposer());
  $('#note-cancel').addEventListener('click', closeComposer);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const cleanTitle = title.value.trim();
    const cleanBody = body.value.trim();
    if (!cleanTitle && !cleanBody) { app.toast('Escreva um título ou uma anotação.'); return; }
    const existing = notes.find(note => note.id === editId);
    if (existing) Object.assign(existing, { title: cleanTitle, body: cleanBody, color: color.value, updatedAt: Date.now() });
    else notes.push({ id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: cleanTitle, body: cleanBody, color: color.value, pinned: false, archived: false, createdAt: Date.now(), updatedAt: Date.now() });
    closeComposer();
    persist(existing ? 'Nota atualizada.' : 'Nota salva.');
  });
  $('#notes-search').addEventListener('input', render);
  document.querySelectorAll('[data-notes-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.notesFilter;
    document.querySelectorAll('[data-notes-filter]').forEach(item => item.classList.toggle('active', item === button));
    render();
  }));
  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-note-action]');
    if (!button) return;
    const note = notes.find(item => item.id === button.dataset.noteId);
    if (!note) return;
    if (button.dataset.noteAction === 'edit') { openComposer(note); return; }
    if (button.dataset.noteAction === 'pin') { note.pinned = !note.pinned; note.updatedAt = Date.now(); persist(note.pinned ? 'Nota fixada.' : 'Nota desafixada.'); return; }
    if (button.dataset.noteAction === 'archive') { note.archived = !note.archived; note.updatedAt = Date.now(); persist(note.archived ? 'Nota arquivada.' : 'Nota restaurada.'); return; }
    deleteId = note.id;
    deleteDialog.classList.add('open');
  });
  $('#note-delete-cancel').addEventListener('click', () => { deleteId = null; deleteDialog.classList.remove('open'); });
  $('#note-delete-confirm').addEventListener('click', () => {
    if (deleteId) notes = notes.filter(note => note.id !== deleteId);
    deleteId = null;
    deleteDialog.classList.remove('open');
    persist('Nota apagada.');
  });
  deleteDialog.addEventListener('click', event => { if (event.target === deleteDialog) { deleteId = null; deleteDialog.classList.remove('open'); } });
  window.addEventListener('casa:render', render);
  render();
})();

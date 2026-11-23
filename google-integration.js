(() => {
  const app = window.CasaEmOrdemAssistant;
  if (!app) return;
  const $ = selector => document.querySelector(selector);
  const configKey = 'casa-google-calendar-config-v2';
  const mapKey = 'googleCalendarMap';
  const config = (() => { try { return JSON.parse(localStorage.getItem(configKey)) || {}; } catch { return {}; } })();
  let token = '', expires = 0, busy = false;
  $('#google-client-id').value = config.clientId || '';
  app.state[mapKey] ||= {};

  function status(message) { $('#google-status').textContent = message; }
  function saveConfig() {
    const clientId = $('#google-client-id').value.trim();
    if (clientId && !/^[^\s@]+\.apps\.googleusercontent\.com$/.test(clientId)) { status('O Client ID deve terminar em .apps.googleusercontent.com.'); return false; }
    config.clientId = clientId;
    localStorage.setItem(configKey, JSON.stringify(config));
    status('Configuração do Google Agenda salva neste aparelho.');
    return true;
  }
  function setState(connected) {
    $('#google-connect').disabled = connected || !config.clientId;
    $('#google-sync').disabled = !connected || busy;
    $('#google-disconnect').hidden = !connected;
  }
  function loadIdentity() {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) { resolve(); return; }
      let script = document.querySelector('script[data-google-identity]');
      if (!script) {
        script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.dataset.googleIdentity = 'true';
        script.addEventListener('load', resolve, { once: true });
        script.addEventListener('error', () => reject(new Error('Não foi possível carregar a autorização Google.')), { once: true });
        document.head.append(script);
        return;
      }
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error('Não foi possível carregar a autorização Google.')), { once: true });
    });
  }
  function connect() {
    if (!saveConfig() || !config.clientId) return;
    if (!window.google?.accounts?.oauth2) { status('Carregando o Google. Toque em conectar novamente em alguns segundos.'); loadIdentity().catch(error => status(error.message)); return; }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: config.clientId,
      scope: 'https://www.googleapis.com/auth/calendar.events',
      callback: response => {
        if (response.error || !response.access_token) { status(`O Google não autorizou a Agenda${response.error ? `: ${response.error}` : '.'}`); return; }
        token = response.access_token; expires = Date.now() + (Number(response.expires_in) || 3600) * 1000;
        setState(true); status('Google Agenda conectado.');
      },
      error_callback: () => status('A janela de autorização foi fechada ou bloqueada.')
    });
    client.requestAccessToken(); status('Aguardando autorização do Google…');
  }
  async function api(url, options = {}) {
    if (!token || Date.now() >= expires) { token = ''; expires = 0; setState(false); throw new Error('A autorização expirou. Conecte o Google novamente.'); }
    const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) } });
    if (!response.ok) { let message = ''; try { message = (await response.json()).error?.message || ''; } catch {} throw new Error(message || `Google respondeu ${response.status}.`); }
    return response.status === 204 ? null : response.json();
  }
  function dayKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  function plusHour(time) { const [h, m] = (time || '09:00').split(':').map(Number); const date = new Date(2000, 0, 1, h, m + 60); return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; }
  function eventBody(item) {
    const body = { summary: item.title, description: item.description || '', extendedProperties: { private: { casaEmOrdemKey: item.key } } };
    if (item.allDay) { const end = new Date(`${item.date}T12:00:00`); end.setDate(end.getDate() + 1); body.start = { date: item.date }; body.end = { date: dayKey(end) }; }
    else {
      body.start = { dateTime: `${item.date}T${item.time || '09:00'}:00`, timeZone: 'America/Sao_Paulo' };
      body.end = { dateTime: `${item.date}T${item.endTime || plusHour(item.time)}:00`, timeZone: 'America/Sao_Paulo' };
    }
    const minutes = Number(item.reminderMinutes);
    if (Number.isFinite(minutes)) body.reminders = { useDefault: false, overrides: [{ method: 'popup', minutes: Math.min(40320, Math.max(0, minutes)) }] };
    return body;
  }
  async function syncCalendar() {
    if (!saveConfig()) return;
    busy = true; setState(Boolean(token) && Date.now() < expires); status('Sincronizando com a agenda principal…');
    try {
      const items = [];
      app.state.events.filter(event => event.date).forEach(event => items.push({ key: `event:${event.id}`, title: event.title, date: event.date, time: event.time, endTime: event.endTime, allDay: !event.time, reminderMinutes: event.reminderMinutes, description: [event.category, event.notes, ...(event.checklist || []).map(line => `${line.done ? '✓' : '□'} ${line.text}`)].filter(Boolean).join('\n') }));
      const from = new Date(); from.setHours(12, 0, 0, 0); const until = new Date(from.getFullYear() + 1, from.getMonth(), from.getDate(), 12);
      (app.fixedOccurrences || (() => []))(app.state.fixedCosts, from, until).forEach(entry => items.push({ key: `fixed:${entry.cost.id}:${entry.date}`, title: `Vencimento: ${entry.cost.name}`, date: entry.date, allDay: true, reminderMinutes: entry.cost.reminderMinutes, description: `${entry.cost.category} · ${entry.cost.note || ''}` }));
      const map = app.state[mapKey] || {}, active = new Set(items.map(item => item.key)); let added = 0, updated = 0, removed = 0;
      for (const item of items) {
        if (map[item.key]) {
          try { await api(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(map[item.key])}`, { method: 'PATCH', body: JSON.stringify(eventBody(item)) }); updated++; }
          catch (error) { if (!/404|Not Found/i.test(error.message)) throw error; delete map[item.key]; }
        }
        if (!map[item.key]) { const created = await api('https://www.googleapis.com/calendar/v3/calendars/primary/events', { method: 'POST', body: JSON.stringify(eventBody(item)) }); map[item.key] = created.id; added++; }
      }
      for (const [key, id] of Object.entries(map)) {
        if (active.has(key)) continue;
        try { await api(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}`, { method: 'DELETE' }); removed++; }
        catch (error) { if (!/404|410|Not Found/i.test(error.message)) throw error; }
        delete map[key];
      }
      app.state[mapKey] = map; app.save(); status(`Agenda sincronizada: ${added} novos, ${updated} atualizados, ${removed} removidos.`);
    } catch (error) { status(`Falha na sincronização: ${error.message}`); }
    finally { busy = false; setState(Boolean(token) && Date.now() < expires); }
  }
  $('#google-save').addEventListener('click', () => { if (saveConfig()) setState(Boolean(token) && Date.now() < expires); });
  $('#google-connect').addEventListener('click', connect);
  $('#google-sync').addEventListener('click', syncCalendar);
  $('#google-disconnect').addEventListener('click', () => { if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token, () => {}); token = ''; expires = 0; setState(false); status('Google Agenda desconectado.'); });
  setState(false);
})();

(() => {
  const app = window.CasaEmOrdemAssistant;
  if (!app) return;

  const $ = selector => document.querySelector(selector);
  const configKey = 'casa-google-config-v1';
  const driveFileKey = 'casa-google-drive-file-v1';
  const sentEmailKey = 'casa-google-email-reminders-v1';
  const config = readJson(configKey, { clientId: '', recipients: [] });
  if (Array.isArray(app.state.googleAlertRecipients)) config.recipients = app.state.googleAlertRecipients;
  app.state.googleCalendarMap ||= {};
  let token = '';
  let tokenExpires = 0;
  let tokenClient = null;
  let busy = false;
  let suppressCloudSave = false;
  let emailReminderBusy = false;

  $('#google-client-id').value = config.clientId || '';
  $('#google-recipients').value = (config.recipients || []).join(', ');

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function saveConfig() {
    const clientId = $('#google-client-id').value.trim();
    const recipients = [...new Set($('#google-recipients').value.split(/[;,\s]+/).map(value => value.trim()).filter(Boolean))];
    if (clientId && !/^[^\s@]+\.apps\.googleusercontent\.com$/.test(clientId)) {
      status('Confira o Client ID. Ele termina em .apps.googleusercontent.com.'); return false;
    }
    const invalid = recipients.filter(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (invalid.length) { status(`E-mail inválido: ${invalid[0]}`); return false; }
    config.clientId = clientId;
    config.recipients = recipients;
    app.state.googleAlertRecipients = recipients;
    localStorage.setItem(configKey, JSON.stringify(config));
    app.save();
    status(`Configuração salva neste aparelho · ${recipients.length} destinatário(s).`);
    return true;
  }
  function status(message) { $('#google-status').textContent = message; }
  function setConnected(value) {
    $('#google-connect').disabled = value || !config.clientId;
    $('#google-sync').disabled = !value || busy;
    $('#google-test-email').disabled = !value || busy || !config.recipients.length;
    $('#google-disconnect').hidden = !value;
  }
  function loadGoogleIdentity() {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) { resolve(); return; }
      const previous = document.querySelector('script[data-google-identity]');
      if (previous) {
        previous.addEventListener('load', resolve, { once: true });
        previous.addEventListener('error', () => reject(new Error('Não foi possível carregar a tela segura do Google.')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true; script.dataset.googleIdentity = 'true';
      script.onload = resolve; script.onerror = () => reject(new Error('Não foi possível carregar a tela segura do Google.'));
      document.head.append(script);
    });
  }
  function setBusy(value) { busy = value; setConnected(Boolean(token) && Date.now() < tokenExpires); }
  function connect() {
    if (!saveConfig() || !config.clientId) { status('Informe e salve o Client ID do Google Cloud primeiro.'); return; }
    if (!window.google?.accounts?.oauth2) {
      status('Carregando a autorização segura do Google. Toque em conectar novamente em alguns segundos.');
      loadGoogleIdentity().catch(error => status(error.message));
      return;
    }
    try {
      const scopes = [
        'openid', 'email',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/drive.appdata'
      ].join(' ');
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: scopes,
        callback: async response => {
          if (response.error || !response.access_token) { status(`Google não autorizou o acesso${response.error ? `: ${response.error}` : '.'}`); return; }
          token = response.access_token;
          tokenExpires = Date.now() + (Number(response.expires_in) || 3600) * 1000;
          setConnected(true);
          status('Google conectado. Carregando dados compartilhados desta conta…');
          try {
            const direction = await syncCloudData(true);
            config.recipients = Array.isArray(app.state.googleAlertRecipients) ? app.state.googleAlertRecipients : config.recipients;
            $('#google-recipients').value = config.recipients.join(', ');
            localStorage.setItem(configKey, JSON.stringify(config));
            status(direction === 'downloaded' ? 'Google conectado. Dados carregados do Drive nesta conta.' : 'Google conectado e dados deste aparelho sincronizados com o Drive.');
          }
          catch (error) { status(`Google conectado, mas a sincronização de dados falhou: ${error.message}`); }
        },
        error_callback: error => status(`Janela de autorização fechada ou bloqueada${error?.type ? ` (${error.type})` : ''}.`)
      });
      tokenClient.requestAccessToken();
      status('Aguardando autorização na janela do Google…');
    } catch (error) { status(error.message); }
  }
  function requireToken() {
    if (!token || Date.now() >= tokenExpires) {
      token = ''; tokenExpires = 0; setConnected(false);
      throw new Error('A autorização expirou. Toque em “Conectar Google” novamente.');
    }
    return token;
  }
  async function googleFetch(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${requireToken()}`, ...(options.body instanceof Blob ? {} : { 'Content-Type': 'application/json' }), ...options.headers } });
    if (!response.ok) {
      let detail = ''; try { detail = (await response.json()).error?.message || ''; } catch { /* no JSON response */ }
      throw new Error(detail || `Google respondeu ${response.status}.`);
    }
    if (response.status === 204) return null;
    return response.json();
  }
  async function findDriveFile() {
    const remembered = localStorage.getItem(driveFileKey);
    if (remembered) {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(remembered)}?fields=id,name`, { headers: { Authorization: `Bearer ${requireToken()}` } });
      if (response.ok) return response.json();
      localStorage.removeItem(driveFileKey);
    }
    const query = new URLSearchParams({ spaces: 'appDataFolder', q: "name='casa-em-ordem-data.json' and trashed=false", fields: 'files(id,name,modifiedTime)', pageSize: '10' });
    const result = await googleFetch(`https://www.googleapis.com/drive/v3/files?${query}`);
    const file = result.files?.[0];
    if (file) localStorage.setItem(driveFileKey, file.id);
    return file || null;
  }
  async function createDriveFile() {
    const file = await googleFetch('https://www.googleapis.com/drive/v3/files?fields=id', { method: 'POST', body: JSON.stringify({ name: 'casa-em-ordem-data.json', mimeType: 'application/json', parents: ['appDataFolder'] }) });
    localStorage.setItem(driveFileKey, file.id);
    return file;
  }
  async function uploadCloudData(file) {
    const body = JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), data: app.state });
    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(file.id)}?uploadType=media`, { method: 'PATCH', headers: { Authorization: `Bearer ${requireToken()}`, 'Content-Type': 'application/json' }, body });
    if (!response.ok) throw new Error(`Não foi possível salvar no Google Drive (${response.status}).`);
  }
  async function downloadCloudData(file) {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`, { headers: { Authorization: `Bearer ${requireToken()}` } });
    if (!response.ok) throw new Error(`Não foi possível carregar os dados do Google Drive (${response.status}).`);
    const stored = await response.json();
    if (!stored?.data || typeof stored.data !== 'object') throw new Error('O arquivo sincronizado não tem um formato válido.');
    return stored.data;
  }
  function replaceLocalState(data) {
    const target = app.state;
    for (const key of Object.keys(target)) if (!(key in data)) delete target[key];
    Object.assign(target, data);
    suppressCloudSave = true;
    try { app.save(); app.renderAll(); } finally { suppressCloudSave = false; }
  }
  async function syncCloudData(ask = false) {
    const file = await findDriveFile();
    if (!file) {
      const created = await createDriveFile();
      await uploadCloudData(created);
      return 'uploaded';
    }
    const cloudData = await downloadCloudData(file);
    if (ask) {
      const useCloud = confirm('Já existem dados desta conta Google.\n\nOK: carregar os dados do Drive neste aparelho.\nCancelar: manter os dados deste aparelho e salvá-los no Drive.');
      if (useCloud) { replaceLocalState(cloudData); return 'downloaded'; }
    }
    await uploadCloudData(file);
    return 'uploaded';
  }
  let cloudSaveTimer = 0;
  document.addEventListener('casa:state-saved', () => {
    if (suppressCloudSave || !token || Date.now() >= tokenExpires) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(async () => {
      try {
        let file = await findDriveFile();
        if (!file) file = await createDriveFile();
        await uploadCloudData(file);
        status('Salvo neste aparelho e sincronizado com o Google Drive.');
      } catch (error) { status(`Salvo neste aparelho; erro ao sincronizar: ${error.message}`); }
    }, 900);
  });

  function b64url(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = ''; bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  async function sendEmail(subject, body) {
    if (!config.recipients.length) throw new Error('Cadastre pelo menos um e-mail destinatário.');
    const mime = [`To: ${config.recipients.join(', ')}`, `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', btoa(unescape(encodeURIComponent(body)))].join('\r\n');
    await googleFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', body: JSON.stringify({ raw: b64url(mime) }) });
  }
  $('#google-save').addEventListener('click', () => { if (saveConfig()) setConnected(Boolean(token) && Date.now() < tokenExpires); });
  $('#google-connect').addEventListener('click', connect);
  $('#google-disconnect').addEventListener('click', () => {
    if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token, () => {});
    token = ''; tokenExpires = 0; tokenClient = null; setConnected(false); status('Desconectado. Dados locais e configuração continuam salvos.');
  });
  $('#google-test-email').addEventListener('click', async () => {
    if (!saveConfig()) return;
    setBusy(true);
    try { await sendEmail('Teste Casa em Ordem', 'Este é um e-mail de teste do Casa em Ordem. O envio pelo Gmail está configurado.'); status(`E-mail de teste enviado para ${config.recipients.join(', ')}.`); }
    catch (error) { status(`Falha no envio: ${error.message}`); }
    finally { setBusy(false); }
  });

  function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  function localStart(date, time) { return `${date}T${time || '09:00'}:00`; }
  function plusHour(time) { const [hour, minute] = (time || '09:00').split(':').map(Number); const date = new Date(2000, 0, 1, hour, minute + 60); return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; }
  function eventPayload(item, eventKey) {
    const title = item.title;
    const startTime = item.time || '09:00';
    const endTime = item.endTime || plusHour(startTime);
    const body = { summary: title, description: item.description || '', extendedProperties: { private: { casaEmOrdemKey: eventKey } } };
    if (item.allDay) {
      const end = new Date(`${item.date}T12:00:00`); end.setDate(end.getDate() + 1);
      body.start = { date: item.date }; body.end = { date: dateKey(end) };
    } else {
      body.start = { dateTime: localStart(item.date, startTime), timeZone: 'America/Sao_Paulo' };
      body.end = { dateTime: localStart(item.date, endTime), timeZone: 'America/Sao_Paulo' };
    }
    if (Number.isFinite(Number(item.reminderMinutes))) body.reminders = { useDefault: false, overrides: [{ method: 'popup', minutes: Math.min(40320, Math.max(0, Number(item.reminderMinutes))) }] };
    return body;
  }
  async function calendarSync() {
    if (!saveConfig()) return;
    setBusy(true); status('Sincronizando compromissos com a agenda principal do Google…');
    try {
      const items = [];
      app.state.events.filter(event => event.date).forEach(event => items.push({
        key: `event:${event.id}`, title: event.title, date: event.date, time: event.time, endTime: event.endTime, allDay: !event.time,
        description: [event.category, event.notes, ...(event.checklist || []).map(line => `${line.done ? '✓' : '□'} ${line.text}`)].filter(Boolean).join('\n'), reminderMinutes: event.reminderMinutes
      }));
      const start = new Date(); start.setHours(12, 0, 0, 0);
      const end = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate(), 12);
      (app.fixedOccurrences || (() => []))(app.state.fixedCosts, start, end).forEach(entry => items.push({
        key: `fixed:${entry.cost.id}:${entry.date}`, title: `Vencimento: ${entry.cost.name}`, date: entry.date, allDay: true,
        description: `${entry.cost.category} · ${entry.cost.note || ''}`, reminderMinutes: entry.cost.reminderMinutes
      }));
      const map = app.state.googleCalendarMap || {}, activeKeys = new Set(items.map(item => item.key));
      let added = 0, updated = 0, removed = 0;
      for (const item of items) {
        const data = eventPayload(item, item.key);
        if (map[item.key]) {
          try { await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(map[item.key])}`, { method: 'PATCH', body: JSON.stringify(data) }); updated++; }
          catch (error) {
            if (!/404|Not Found/i.test(error.message)) throw error;
            delete map[item.key];
          }
        }
        if (!map[item.key]) {
          const created = await googleFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', { method: 'POST', body: JSON.stringify(data) });
          map[item.key] = created.id; added++;
        }
      }
      for (const [key, id] of Object.entries(map)) {
        if (activeKeys.has(key)) continue;
        try { await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}`, { method: 'DELETE' }); removed++; }
        catch (error) { if (!/404|410|Not Found/i.test(error.message)) throw error; }
        delete map[key];
      }
      app.state.googleCalendarMap = map;
      app.save();
      status(`Agenda sincronizada: ${added} novos, ${updated} atualizados, ${removed} removidos.`);
    } catch (error) { status(`Falha ao sincronizar agenda: ${error.message}`); }
    finally { setBusy(false); }
  }
  $('#google-sync').addEventListener('click', calendarSync);

  async function sendDueEmailReminders() {
    if (emailReminderBusy || !token || Date.now() >= tokenExpires || !config.recipients.length) return;
    const now = Date.now(), today = new Date(); today.setHours(12, 0, 0, 0);
    const until = new Date(today); until.setDate(until.getDate() + 60);
    const candidates = app.state.events.filter(item => !item.done).map(item => ({ key: `event:${item.id}:${item.date}:${item.time || ''}:${item.reminderMinutes}`, date: item.date, time: item.time || '09:00', minutes: item.reminderMinutes, title: item.title, body: item.category || 'Compromisso' }));
    (app.fixedOccurrences || (() => []))(app.state.fixedCosts, today, until).forEach(entry => candidates.push({ key: `fixed:${entry.cost.id}:${entry.date}:${entry.cost.reminderMinutes}`, date: entry.date, time: '09:00', minutes: entry.cost.reminderMinutes, title: entry.cost.name, body: `Vencimento · ${entry.cost.category}` }));
    const sent = new Set(readJson(sentEmailKey, []));
    emailReminderBusy = true;
    try {
      for (const item of candidates) {
        const start = new Date(`${item.date}T${item.time}:00`).getTime();
        const remindAt = start - (Number(item.minutes) || 0) * 60000;
        const dedupe = `${item.key}|${config.recipients.join(',')}`;
        if (sent.has(dedupe) || now < remindAt || now >= start + 5 * 60000) continue;
        await sendEmail(`Lembrete: ${item.title}`, `${item.body}\nData: ${item.date} às ${item.time}\n\nCasa em Ordem`);
        sent.add(dedupe); localStorage.setItem(sentEmailKey, JSON.stringify([...sent].slice(-400)));
      }
    } catch (error) { status(`Não foi possível enviar um lembrete: ${error.message}`); }
    finally { emailReminderBusy = false; }
  }
  setConnected(false);
  app.state.googleAlertRecipients ||= config.recipients;
  localStorage.setItem(configKey, JSON.stringify(config));
  loadGoogleIdentity().catch(() => {});
  window.setInterval(sendDueEmailReminders, 30000);
})();

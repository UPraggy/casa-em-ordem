(() => {
  const app = window.CasaEmOrdemAssistant;
  if (!app) return;
  const $ = selector => document.querySelector(selector);
  const firebaseConfigKey = 'casa-firebase-web-config-v1';
  const firebaseConsentKey = 'casa-firebase-cloud-consent-v1';
  const moduleUrl = 'https://www.gstatic.com/firebasejs/13.4.0/';
  let firebase = null, firebaseApp = null, auth = null, database = null, dbRef = null, currentUser = null;
  let unsubscribeCloud = null, suppressCloud = false, cloudBusy = false, lastApplied = 0, cloudSaveTimer = 0;
  let emailBusy = false, emailSdkPromise = null;
  const deviceId = crypto.randomUUID ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const savedConfig = (() => { try { return localStorage.getItem(firebaseConfigKey) || ''; } catch { return ''; } })();
  $('#firebase-config').value = savedConfig;
  $('#firebase-consent').checked = localStorage.getItem(firebaseConsentKey) === '1';

  function setStatus(message) { $('#firebase-status').textContent = message; }
  function readEmailConfig() { return app.state.emailProvider || { serviceId: '', templateId: '', publicKey: '', enabled: false }; }
  function updateEmailForm() {
    const value = readEmailConfig();
    $('#emailjs-service').value = value.serviceId || '';
    $('#emailjs-template').value = value.templateId || '';
    $('#emailjs-key').value = value.publicKey || '';
    $('#emailjs-enabled').checked = value.enabled === true;
  }
  function saveEmailConfig() {
    app.state.emailProvider = {
      serviceId: $('#emailjs-service').value.trim(), templateId: $('#emailjs-template').value.trim(),
      publicKey: $('#emailjs-key').value.trim(), enabled: $('#emailjs-enabled').checked
    };
    app.save();
    $('#emailjs-status').textContent = 'Configuração salva neste aparelho.';
    return true;
  }
  function parseFirebaseConfig() {
    let value;
    try { value = JSON.parse($('#firebase-config').value); } catch { throw new Error('Cole a configuração do app Web Firebase em formato JSON válido.'); }
    for (const key of ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId']) if (!value?.[key]) throw new Error(`A configuração Firebase precisa conter “${key}”.`);
    return value;
  }
  async function loadFirebase() {
    if (firebase) return firebase;
    const [appSdk, authSdk, dbSdk] = await Promise.all([
      import(`${moduleUrl}firebase-app.js`), import(`${moduleUrl}firebase-auth.js`), import(`${moduleUrl}firebase-database.js`)
    ]);
    firebase = { ...appSdk, ...authSdk, ...dbSdk };
    return firebase;
  }
  async function initializeFirebase() {
    const sdk = await loadFirebase(), config = parseFirebaseConfig();
    const existing = sdk.getApps().find(item => item.name === 'casa-em-ordem');
    firebaseApp = existing || sdk.initializeApp(config, 'casa-em-ordem');
    auth = sdk.getAuth(firebaseApp); database = sdk.getDatabase(firebaseApp);
    return sdk;
  }
  function replaceState(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) throw new Error('A cópia na nuvem está inválida. Mantive os dados deste aparelho.');
    const state = app.state;
    for (const key of Object.keys(state)) if (!(key in data)) delete state[key];
    Object.assign(state, data);
    suppressCloud = true;
    try { app.save(); app.renderAll(); } finally { suppressCloud = false; }
    updateEmailForm();
  }
  function cloudRecord() { return { data: app.state, updatedAt: Date.now(), writer: deviceId }; }
  function syncBaselineKey(uid) { return `casa-firebase-baseline:${uid}`; }
  function currentStateJson() { return JSON.stringify(app.state); }
  function rememberSyncedState(uid, record) {
    lastApplied = Number(record.updatedAt) || Date.now();
    localStorage.setItem(syncBaselineKey(uid), JSON.stringify({ updatedAt: lastApplied, dataJson: JSON.stringify(record.data) }));
  }
  function hasLocalChanges(uid) {
    try { const baseline = JSON.parse(localStorage.getItem(syncBaselineKey(uid)) || 'null'); return Boolean(baseline && baseline.dataJson !== currentStateJson()); }
    catch { return true; }
  }
  async function overwriteCloudWithLocal(sdk, uid) {
    const record = cloudRecord();
    await sdk.set(dbRef, record);
    rememberSyncedState(uid, record);
  }
  async function attachCloud(user, sdk) {
    if (unsubscribeCloud) unsubscribeCloud();
    currentUser = user;
    dbRef = sdk.ref(database, `users/${user.uid}/houseData`);
    cloudBusy = true;
    try {
      const existing = await sdk.get(dbRef);
      if (existing.exists()) {
        const cloud = existing.val();
        const baseline = (() => { try { return JSON.parse(localStorage.getItem(syncBaselineKey(user.uid)) || 'null'); } catch { return null; } })();
        if (baseline && !hasLocalChanges(user.uid)) {
          replaceState(cloud.data); rememberSyncedState(user.uid, cloud);
        } else {
          const useCloud = confirm('Esta conta já tem uma cópia na nuvem.\n\nOK: carregar os dados da nuvem neste aparelho.\nCancelar: manter os dados locais e decidir se substitui a cópia da nuvem.');
          if (useCloud) {
            if (app.downloadHouseSnapshot) app.downloadHouseSnapshot(app.state, 'backup-antes-da-nuvem');
            replaceState(cloud.data); rememberSyncedState(user.uid, cloud);
          } else {
            const replaceCloud = confirm('Substituirá a cópia compartilhada na nuvem pelos dados deste aparelho. Deseja mesmo substituir?');
            if (!replaceCloud) throw new Error('Sincronização cancelada; as duas cópias foram mantidas.');
            await overwriteCloudWithLocal(sdk, user.uid);
          }
        }
      } else {
        await overwriteCloudWithLocal(sdk, user.uid);
      }
      unsubscribeCloud = sdk.onValue(dbRef, snapshot => {
        if (!snapshot.exists()) return;
        const cloud = snapshot.val();
        if (!cloud?.data || cloud.writer === deviceId || Number(cloud.updatedAt) <= lastApplied) return;
        try {
          if (hasLocalChanges(user.uid)) {
            const useCloud = confirm('Outro aparelho alterou os dados.\n\nOK: carregar a versão da nuvem e substituir as alterações locais.\nCancelar: manter este aparelho e enviar suas alterações para a nuvem.');
            if (!useCloud) { overwriteCloudWithLocal(sdk, user.uid); return; }
            if (app.downloadHouseSnapshot) app.downloadHouseSnapshot(app.state, 'backup-antes-da-nuvem');
          }
          replaceState(cloud.data); rememberSyncedState(user.uid, cloud); setStatus(`Sincronizado · ${user.email || 'conta conectada'}.`);
        } catch (error) { setStatus(error.message); }
      }, error => setStatus(`Erro ao acompanhar a nuvem: ${error.message}`));
      setStatus(`Sincronização ativa · ${user.email || 'conta conectada'}.`);
      $('#firebase-signout').hidden = false;
    } finally { cloudBusy = false; }
  }
  async function authenticate(mode) {
    if (!$('#firebase-consent').checked) { setStatus('Marque a autorização para armazenar os dados da casa na conta Firebase.'); return; }
    const email = $('#firebase-email').value.trim(), password = $('#firebase-password').value;
    if (!email || !password) { setStatus('Informe o e-mail e a senha da conta Firebase.'); return; }
    try {
      const sdk = await initializeFirebase();
      localStorage.setItem(firebaseConfigKey, JSON.stringify(parseFirebaseConfig()));
      localStorage.setItem(firebaseConsentKey, '1');
      const result = mode === 'create'
        ? await sdk.createUserWithEmailAndPassword(auth, email, password)
        : await sdk.signInWithEmailAndPassword(auth, email, password);
      await attachCloud(result.user, sdk);
      $('#firebase-password').value = '';
    } catch (error) {
      const message = error.code === 'auth/invalid-credential' ? 'E-mail ou senha incorretos.' : error.code === 'auth/email-already-in-use' ? 'Essa conta já existe. Use Entrar.' : error.code === 'auth/weak-password' ? 'A senha precisa ter pelo menos 6 caracteres.' : error.message;
      setStatus(`Não foi possível conectar: ${message}`);
    }
  }
  $('#firebase-save-config').addEventListener('click', () => {
    try { const config = parseFirebaseConfig(); localStorage.setItem(firebaseConfigKey, JSON.stringify(config)); setStatus('Configuração Firebase salva neste navegador.'); }
    catch (error) { setStatus(error.message); }
  });
  $('#firebase-signin').addEventListener('click', () => authenticate('signin'));
  $('#firebase-signup').addEventListener('click', () => authenticate('create'));
  $('#firebase-reset').addEventListener('click', async () => {
    const email = $('#firebase-email').value.trim();
    if (!email) { setStatus('Informe o e-mail da conta para enviar o link de recuperação.'); return; }
    try { const sdk = await initializeFirebase(); await sdk.sendPasswordResetEmail(auth, email); setStatus('Link de recuperação solicitado ao Firebase. Confira seu e-mail.'); }
    catch (error) { setStatus(`Não foi possível pedir a recuperação: ${error.message}`); }
  });
  $('#firebase-signout').addEventListener('click', async () => {
    if (unsubscribeCloud) unsubscribeCloud(); unsubscribeCloud = null; currentUser = null; dbRef = null;
    if (auth) await firebase.signOut(auth);
    $('#firebase-signout').hidden = true; setStatus('Saiu da conta. Os dados locais deste aparelho continuam disponíveis.');
  });
  document.addEventListener('casa:state-saved', () => {
    updateEmailForm();
    if (suppressCloud || cloudBusy || !currentUser || !dbRef || !firebase) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(async () => {
      try {
        const stamp = Date.now();
        const record = cloudRecord(); record.updatedAt = stamp;
        await firebase.set(dbRef, record);
        rememberSyncedState(currentUser.uid, record);
        setStatus(`Alterações sincronizadas · ${currentUser.email || 'conta conectada'}.`);
      } catch (error) { setStatus(`Dados salvos neste aparelho, mas não sincronizaram: ${error.message}`); }
    }, 700);
  });

  function loadEmailSdk() {
    if (window.emailjs) return Promise.resolve(window.emailjs);
    if (emailSdkPromise) return emailSdkPromise;
    emailSdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@5/dist/email.min.js'; script.async = true;
      script.onload = () => resolve(window.emailjs);
      script.onerror = () => reject(new Error('Não foi possível carregar o serviço de e-mail.'));
      document.head.append(script);
    });
    return emailSdkPromise;
  }
  async function sendEmail(subject, message) {
    const settings = readEmailConfig();
    if (!settings.serviceId || !settings.templateId || !settings.publicKey) throw new Error('Preencha Service ID, Template ID e Public Key; defina os destinatários fixos no modelo EmailJS.');
    const sdk = await loadEmailSdk();
    return sdk.send(settings.serviceId, settings.templateId, { subject, message }, { publicKey: settings.publicKey });
  }
  $('#emailjs-save').addEventListener('click', () => { if (saveEmailConfig()) $('#emailjs-status').textContent = 'Configuração salva. Os destinatários ficam definidos no modelo EmailJS.'; });
  $('#emailjs-test').addEventListener('click', async () => {
    if (!saveEmailConfig()) return;
    try { await sendEmail('Teste Casa em Ordem', 'Este é um teste dos alertas de e-mail do Casa em Ordem.'); $('#emailjs-status').textContent = 'Teste enviado aos destinatários configurados no modelo EmailJS.'; }
    catch (error) { $('#emailjs-status').textContent = `Falha no envio: ${error.text || error.message}`; }
  });
  function reminderTime(date, time, minutes) { const start = new Date(`${date}T${time || '09:00'}:00`).getTime(); return Number.isFinite(start) ? { start, remindAt: start - (Number(minutes) || 0) * 60000 } : null; }
  function idForClaim(value) { const bytes = new TextEncoder().encode(value); let binary = ''; bytes.forEach(byte => binary += String.fromCharCode(byte)); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }
  async function reserveEmailClaim(claim) {
    if (!currentUser || !database || !firebase) return { allowed: !localStorage.getItem(`email:${claim}`), finish: sent => { if (sent) localStorage.setItem(`email:${claim}`, '1'); } };
    const claimRef = firebase.ref(database, `users/${currentUser.uid}/mailClaims/${idForClaim(claim)}`);
    const result = await firebase.runTransaction(claimRef, value => value ? undefined : { status: 'sending', at: Date.now() });
    return { allowed: result.committed, finish: async sent => { if (sent) await firebase.set(claimRef, { status: 'sent', at: Date.now() }); else await firebase.remove(claimRef); } };
  }
  async function checkEmailReminders() {
    if (emailBusy || document.hidden || !navigator.onLine) return;
    const settings = readEmailConfig();
    if (!settings.enabled || !settings.serviceId || !settings.templateId || !settings.publicKey) return;
    const now = Date.now(), from = new Date(); from.setHours(12, 0, 0, 0); const until = new Date(from); until.setDate(until.getDate() + 60);
    const candidates = app.state.events.filter(item => !item.done && item.date).map(item => ({ key: `event:${item.id}:${item.date}:${item.time || ''}:${item.reminderMinutes}`, date: item.date, time: item.time || '09:00', minutes: item.reminderMinutes, title: item.title, body: `${item.category || 'Compromisso'} · ${item.notes || ''}` }));
    (app.fixedOccurrences || (() => []))(app.state.fixedCosts, from, until).forEach(item => candidates.push({ key: `fixed:${item.cost.id}:${item.date}:${item.cost.reminderMinutes}`, date: item.date, time: '09:00', minutes: item.cost.reminderMinutes, title: item.cost.name, body: `Vencimento · ${item.cost.category}` }));
    emailBusy = true;
    try {
      for (const item of candidates) {
        const moment = reminderTime(item.date, item.time, item.minutes);
        const claim = `${item.key}|${settings.templateId}`;
        if (!moment || now < moment.remindAt || now >= moment.start + 5 * 60000) continue;
        const reservation = await reserveEmailClaim(claim);
        if (!reservation.allowed) continue;
        try {
          await sendEmail(`Lembrete: ${item.title}`, `${item.body}\nData: ${item.date} às ${item.time}\n\nCasa em Ordem`);
          await reservation.finish(true);
        } catch (error) { await reservation.finish(false); $('#emailjs-status').textContent = `Erro no lembrete: ${error.text || error.message}`; }
      }
    } finally { emailBusy = false; }
  }
  updateEmailForm();
  if (savedConfig && localStorage.getItem(firebaseConsentKey) === '1') {
    initializeFirebase().then(sdk => sdk.onAuthStateChanged(auth, user => {
      if (!user) { if (unsubscribeCloud) unsubscribeCloud(); unsubscribeCloud = null; currentUser = null; dbRef = null; return; }
      if (currentUser?.uid === user.uid && dbRef) return;
      attachCloud(user, sdk).catch(error => setStatus(`Não foi possível retomar a sincronização: ${error.message}`));
    })).catch(error => setStatus(`Não foi possível retomar a sessão Firebase: ${error.message}`));
  }
  window.setInterval(checkEmailReminders, 30000);
})();

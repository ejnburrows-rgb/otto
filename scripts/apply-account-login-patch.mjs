import fs from 'node:fs';

const INDEX = new URL('../index.html', import.meta.url);

function functionBounds(source, name) {
  const needle = `function ${name}(`;
  let start = source.indexOf(needle);
  if (start < 0) throw new Error(`Missing function ${name}()`);
  const modifier = source.slice(0, start).match(/(?:async\s+)+$/);
  if (modifier) start -= modifier[0].length;
  const open = source.indexOf('{', start);
  let depth = 0, quote = '', escape = false, lineComment = false, blockComment = false;
  for (let i = open; i < source.length; i++) {
    const c = source[i], n = source[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i++; } continue; }
    if (quote) {
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === quote) quote = '';
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i++; continue; }
    if (c === '/' && n === '*') { blockComment = true; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return [start, i + 1];
  }
  throw new Error(`Unbalanced function ${name}()`);
}

function replaceFunction(source, name, replacement) {
  const [start, end] = functionBounds(source, name);
  return source.slice(0, start) + replacement + source.slice(end);
}

const SHOW_LOGIN = `function showCloudLogin(message = '') {
    $('#app').classList.add('hidden');
    const login = $('#login');
    login.classList.remove('hidden');
    const es = lang === 'es';
    login.innerHTML = \`
      <div style="text-align:center;margin-bottom:24px"><img src="./logo.jpg" alt="OTTO Plumbing" class="otto-login-logo" style="width:min(320px,80vw);max-height:110px;object-fit:contain"></div>
      <h2 style="margin-top:0">\${es ? 'Iniciar sesión en OTTO' : 'Sign in to OTTO'}</h2>
      <p class="muted">\${es ? 'Use su cuenta de OTTO. La sesión permanecerá iniciada en este dispositivo.' : 'Use your OTTO account. Your session will stay signed in on this device.'}</p>
      <div class="field"><label for="cloud-email">\${es ? 'Correo electrónico' : 'Email'}</label><input id="cloud-email" type="email" autocomplete="username" placeholder="name@company.com"></div>
      <div class="field"><label for="cloud-password">\${es ? 'Contraseña' : 'Password'}</label><input id="cloud-password" type="password" autocomplete="current-password" placeholder="••••••••"></div>
      <button class="btn block" onclick="sendCloudSignIn()"><i class="fas fa-right-to-bracket"></i> \${es ? 'Iniciar sesión' : 'Sign in'}</button>
      <button class="btn block ghost" style="margin-top:10px" onclick="sendCloudMagicLink()"><i class="fas fa-envelope"></i> \${es ? 'Enviarme un enlace seguro' : 'Email me a secure link'}</button>
      <div style="text-align:center;margin-top:16px"><button class="btn ghost sm" onclick="showCreateAccount()" style="width:100%"><i class="fas fa-user-plus"></i> \${es ? 'Crear la cuenta inicial del dueño' : 'Create the initial owner account'}</button></div>
      <div id="cloud-login-status" class="muted" style="margin-top:14px" role="status">\${esc(message)}</div>
      <div class="langtoggle"><button class="\${lang === 'en' ? 'on' : ''}" onclick="setLang('en');showCloudLogin()">EN</button><button class="\${lang === 'es' ? 'on' : ''}" onclick="setLang('es');showCloudLogin()">ES</button></div>\`;
  }`;

const SIGN_IN = `async function sendCloudSignIn() {
    const email = ($('#cloud-email') && $('#cloud-email').value || '').trim().toLowerCase();
    const password = ($('#cloud-password') && $('#cloud-password').value || '');
    const status = $('#cloud-login-status');
    if (!/^\\S+@\\S+\\.\\S+$/.test(email)) { if (status) status.textContent = lang === 'es' ? 'Escriba un correo válido.' : 'Enter a valid email.'; return; }
    if (!password) { if (status) status.textContent = lang === 'es' ? 'Escriba su contraseña.' : 'Enter your password.'; return; }
    const client = await initCloudAuth();
    if (!client) { if (status) status.textContent = lang === 'es' ? 'No hay conexión. Intente de nuevo.' : 'No connection. Try again.'; return; }
    if (status) status.textContent = lang === 'es' ? 'Iniciando sesión…' : 'Signing in…';
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data?.session) { if (status) status.textContent = lang === 'es' ? 'Correo o contraseña incorrectos.' : 'Incorrect email or password.'; return; }
    cloudAuthSession = data.session;
    const outcome = await establishCloudSession();
    if (outcome.status === 'signed-in' && session) { startApp(); return; }
    if (status) status.textContent = cloudSessionMessage(outcome) || (lang === 'es' ? 'La cuenta no está vinculada a un perfil activo de OTTO.' : 'This account is not linked to an active OTTO profile.');
  }`;

const EXTRA = `
  async function sendCloudMagicLink() {
    const email = ($('#cloud-email') && $('#cloud-email').value || '').trim().toLowerCase();
    const status = $('#cloud-login-status');
    if (!/^\\S+@\\S+\\.\\S+$/.test(email)) { if (status) status.textContent = lang === 'es' ? 'Escriba un correo válido.' : 'Enter a valid email.'; return; }
    const client = await initCloudAuth();
    if (!client) { if (status) status.textContent = lang === 'es' ? 'No hay conexión. Intente de nuevo.' : 'No connection. Try again.'; return; }
    if (status) status.textContent = lang === 'es' ? 'Enviando…' : 'Sending…';
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: false } });
    if (status) status.textContent = error
      ? (lang === 'es' ? 'No se pudo enviar el enlace.' : 'The sign-in link could not be sent.')
      : (lang === 'es' ? 'Revise su correo y abra el enlace de OTTO.' : 'Check your email and open the OTTO sign-in link.');
  }

  function showCreateAccount() {
    $('#app').classList.add('hidden');
    const login = $('#login');
    login.classList.remove('hidden');
    const es = lang === 'es';
    login.innerHTML = \`
      <div style="text-align:center;margin-bottom:24px"><img src="./logo.jpg" alt="OTTO Plumbing" class="otto-login-logo" style="width:min(320px,80vw);max-height:110px;object-fit:contain"></div>
      <h2 style="margin-top:0">\${es ? 'Crear cuenta del dueño' : 'Create owner account'}</h2>
      <p class="muted">\${es ? 'Disponible únicamente mientras OTTO no tenga una cuenta de dueño vinculada.' : 'Available only while OTTO has no owner account linked.'}</p>
      <div class="field"><label for="register-email">\${es ? 'Correo electrónico' : 'Email'}</label><input id="register-email" type="email" autocomplete="email" placeholder="name@company.com"></div>
      <div class="field"><label for="register-password">\${es ? 'Contraseña' : 'Password'}</label><input id="register-password" type="password" autocomplete="new-password" minlength="8" placeholder="8+ characters"></div>
      <div class="field"><label for="register-password2">\${es ? 'Confirmar contraseña' : 'Confirm password'}</label><input id="register-password2" type="password" autocomplete="new-password" minlength="8" placeholder="8+ characters"></div>
      <button class="btn block" onclick="createCloudAccount()"><i class="fas fa-user-check"></i> \${es ? 'Crear cuenta y entrar' : 'Create account and sign in'}</button>
      <button class="btn block ghost" style="margin-top:10px" onclick="showCloudLogin()">\${es ? 'Volver' : 'Back'}</button>
      <div id="register-status" class="muted" style="margin-top:14px" role="status"></div>\`;
  }

  async function createCloudAccount() {
    const email = ($('#register-email') && $('#register-email').value || '').trim().toLowerCase();
    const password = ($('#register-password') && $('#register-password').value || '');
    const password2 = ($('#register-password2') && $('#register-password2').value || '');
    const status = $('#register-status');
    if (!/^\\S+@\\S+\\.\\S+$/.test(email)) { if (status) status.textContent = lang === 'es' ? 'Escriba un correo válido.' : 'Enter a valid email.'; return; }
    if (password.length < 8) { if (status) status.textContent = lang === 'es' ? 'La contraseña debe tener al menos 8 caracteres.' : 'Password must be at least 8 characters.'; return; }
    if (password !== password2) { if (status) status.textContent = lang === 'es' ? 'Las contraseñas no coinciden.' : 'Passwords do not match.'; return; }
    if (status) status.textContent = lang === 'es' ? 'Creando cuenta…' : 'Creating account…';
    let response;
    try { response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); }
    catch (_) { if (status) status.textContent = lang === 'es' ? 'No hay conexión. Intente de nuevo.' : 'No connection. Try again.'; return; }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const messages = {
        owner_already_registered: lang === 'es' ? 'La cuenta de dueño ya existe. Use Iniciar sesión.' : 'The owner account already exists. Use Sign in.',
        password_too_short: lang === 'es' ? 'La contraseña debe tener al menos 8 caracteres.' : 'Password must be at least 8 characters.',
      };
      if (status) status.textContent = messages[result.error] || (lang === 'es' ? 'No se pudo crear la cuenta.' : 'The account could not be created.');
      return;
    }
    const client = await initCloudAuth();
    const signed = await client.auth.signInWithPassword({ email, password });
    if (signed.error || !signed.data?.session) { if (status) status.textContent = lang === 'es' ? 'Cuenta creada. Inicie sesión para continuar.' : 'Account created. Sign in to continue.'; return; }
    cloudAuthSession = signed.data.session;
    const outcome = await establishCloudSession();
    if (outcome.status === 'signed-in' && session) { startApp(); return; }
    if (status) status.textContent = lang === 'es' ? 'Cuenta creada, pero no se pudo abrir OTTO.' : 'Account created, but OTTO could not open.';
  }
`;

export function patchAccountLogin(source) {
  let out = source.replace(/\r\n/g, '\n');
  out = replaceFunction(out, 'showCloudLogin', SHOW_LOGIN);
  out = replaceFunction(out, 'sendCloudSignIn', SIGN_IN);
  if (!out.includes('async function sendCloudMagicLink()')) {
    const marker = '  function showLogin() {';
    if (!out.includes(marker)) throw new Error('showLogin marker missing');
    out = out.replace(marker, EXTRA + '\n' + marker);
  }
  return out;
}

export function validateAccountLogin(source) {
  return [
    ['password sign-in is available', source.includes('signInWithPassword({ email, password })')],
    ['secure magic-link fallback remains available', source.includes('sendCloudMagicLink()') && source.includes('shouldCreateUser: false')],
    ['first-owner account creation is available', source.includes('createCloudAccount()') && source.includes("fetch('/api/register'")],
    ['local PIN setup is absent', !source.includes('onclick="showLocalSetup()"')],
    ['provider session remains persistent', source.includes('persistSession: true') && source.includes('storage: ottoAuthStorage')],
  ];
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  const index = fs.readFileSync(INDEX, 'utf8');
  const patched = patchAccountLogin(index);
  const failed = validateAccountLogin(patched).filter(([, ok]) => !ok);
  if (failed.length) throw new Error('Account login validation failed: ' + failed.map(([name]) => name).join(', '));
  fs.writeFileSync(INDEX, patched);
  console.log('OTTO cloud account login patch applied.');
}

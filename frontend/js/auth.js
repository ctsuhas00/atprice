const AtAuth = (() => {
  function currentUser() {
    const raw = localStorage.getItem('atprice_user');
    return raw ? JSON.parse(raw) : null;
  }

  function setSession(token, user) {
    localStorage.setItem('atprice_token', token);
    localStorage.setItem('atprice_user', JSON.stringify(user));
    updateAccountLabel();
  }

  function logout() {
    localStorage.removeItem('atprice_token');
    localStorage.removeItem('atprice_user');
    updateAccountLabel();
    closeModal();
  }

  function updateAccountLabel() {
    const el = document.getElementById('accountLabel');
    if (!el) return;
    const user = currentUser();
    el.textContent = user ? `👤 ${user.name.split(' ')[0]}` : '👤 Account';
  }

  function openModal(mode = 'login') {
    render(mode);
    document.getElementById('modal').style.display = 'flex';
  }

  function render(mode) {
    const isLogin = mode === 'login';
    document.getElementById('modalBody').innerHTML = `
      <button class="close" onclick="closeModal()">✕</button>
      <h2>${isLogin ? 'Log in' : 'Create your account'}</h2>
      <div class="form-grid">
        ${isLogin ? '' : '<label class="full">Full name<input id="auth-name"></label>'}
        <label class="full">Email or phone<input id="auth-identifier"></label>
        <label class="full">Password<input id="auth-password" type="password"></label>
      </div>
      <button class="btn" id="auth-submit">${isLogin ? 'Log in' : 'Create account'}</button>
      <p style="margin-top:12px;font-size:13px">
        ${isLogin ? "New to AtPrice?" : 'Already have an account?'}
        <a href="#" id="auth-switch" style="color:#1d4ed8">${isLogin ? 'Create an account' : 'Log in'}</a>
      </p>
      <div id="auth-status"></div>
    `;
    document.getElementById('auth-switch').onclick = (e) => { e.preventDefault(); render(isLogin ? 'register' : 'login'); };
    document.getElementById('auth-submit').onclick = () => submit(isLogin);
  }

  async function submit(isLogin) {
    const status = document.getElementById('auth-status');
    const identifier = document.getElementById('auth-identifier').value.trim();
    const password = document.getElementById('auth-password').value;
    status.innerHTML = `<div class="notice">Please wait…</div>`;
    try {
      let result;
      if (isLogin) {
        result = await Api.loginCustomer({ identifier, password });
      } else {
        const name = document.getElementById('auth-name').value.trim();
        const isEmail = identifier.includes('@');
        result = await Api.registerCustomer({ name, password, email: isEmail ? identifier : undefined, phone: isEmail ? undefined : identifier });
      }
      setSession(result.token, result.user);
      closeModal();
    } catch (e) {
      status.innerHTML = `<div class="notice error">${escapeHtml(e.message)}</div>`;
    }
  }

  return { currentUser, setSession, logout, openModal, updateAccountLabel };
})();

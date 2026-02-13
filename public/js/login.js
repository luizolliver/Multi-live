// Se ja tem token valido, redireciona
if (localStorage.getItem('adminToken')) {
  window.location.href = '/admin/dashboard.html';
}

document.getElementById('login-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  var errorEl = document.getElementById('error-message');
  errorEl.style.display = 'none';

  var username = document.getElementById('username').value.trim();
  var password = document.getElementById('password').value;

  try {
    var res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    });

    var data = await res.json();

    if (res.ok && data.token) {
      localStorage.setItem('adminToken', data.token);
      window.location.href = '/admin/dashboard.html';
    } else {
      errorEl.textContent = data.error || 'Erro ao fazer login';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = 'Erro de conexao com o servidor';
    errorEl.style.display = 'block';
  }
});

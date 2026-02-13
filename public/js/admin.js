// === Auth Helper ===
function getToken() {
  return localStorage.getItem('adminToken');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken()
  };
}

function logout() {
  localStorage.removeItem('adminToken');
  window.location.href = '/admin/login.html';
}

// Verificar autenticação
if (!getToken()) {
  window.location.href = '/admin/login.html';
}

// Fetch com verificação de auth
async function authFetch(url, options) {
  options = options || {};
  options.headers = Object.assign({}, options.headers, authHeaders());
  var res = await fetch(url, options);
  if (res.status === 401 || res.status === 403) {
    logout();
    return null;
  }
  return res;
}

// === Toast ===
function showToast(message, type) {
  type = type || 'success';
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3000);
}

// === Modal ===
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Fechar modal clicando fora
document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      overlay.classList.remove('active');
    }
  });
});

// === Tabs ===
document.querySelectorAll('.tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// === Escape HTML ===
function esc(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================
// EVENTOS
// ==========================================

var allEvents = [];

async function loadEvents() {
  var res = await authFetch('/api/events/all');
  if (!res) return;
  allEvents = await res.json();
  renderEventsTable();
  updateEventSelectors();
}

function renderEventsTable() {
  var tbody = document.getElementById('events-table-body');
  if (allEvents.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary)">Nenhum evento cadastrado</td></tr>';
    return;
  }

  tbody.innerHTML = allEvents.map(function(ev) {
    var statusBadge = ev.ativo
      ? '<span class="badge badge-active">Ativo</span>'
      : '<span class="badge badge-inactive">Inativo</span>';
    var data = new Date(ev.data_criacao).toLocaleDateString('pt-BR');
    return '<tr>' +
      '<td>' + ev.id + '</td>' +
      '<td>' + esc(ev.titulo) + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td>' + data + '</td>' +
      '<td><div class="actions">' +
        '<button class="btn btn-small btn-success" onclick="editEvent(' + ev.id + ')">Editar</button>' +
        '<button class="btn btn-small btn-danger" onclick="deleteEvent(' + ev.id + ')">Excluir</button>' +
      '</div></td>' +
    '</tr>';
  }).join('');
}

function updateEventSelectors() {
  // Selector no filtro de lives
  var filterSelect = document.getElementById('live-event-filter');
  var currentFilter = filterSelect.value;
  filterSelect.innerHTML = '<option value="">Selecione um evento...</option>';
  allEvents.forEach(function(ev) {
    filterSelect.innerHTML += '<option value="' + ev.id + '">' + esc(ev.titulo) + '</option>';
  });
  filterSelect.value = currentFilter;

  // Selector no modal de live
  var modalSelect = document.getElementById('live-evento-id');
  modalSelect.innerHTML = '<option value="">Selecione...</option>';
  allEvents.forEach(function(ev) {
    modalSelect.innerHTML += '<option value="' + ev.id + '">' + esc(ev.titulo) + '</option>';
  });
}

// Novo evento
document.getElementById('btn-new-event').addEventListener('click', function() {
  document.getElementById('modal-event-title').textContent = 'Novo Evento';
  document.getElementById('event-id').value = '';
  document.getElementById('event-titulo').value = '';
  document.getElementById('event-ativo').value = 'true';
  openModal('modal-event');
});

// Editar evento
function editEvent(id) {
  var ev = allEvents.find(function(e) { return e.id === id; });
  if (!ev) return;
  document.getElementById('modal-event-title').textContent = 'Editar Evento';
  document.getElementById('event-id').value = ev.id;
  document.getElementById('event-titulo').value = ev.titulo;
  document.getElementById('event-ativo').value = ev.ativo ? 'true' : 'false';
  openModal('modal-event');
}

// Salvar evento (criar ou editar)
document.getElementById('form-event').addEventListener('submit', async function(e) {
  e.preventDefault();
  var id = document.getElementById('event-id').value;
  var titulo = document.getElementById('event-titulo').value.trim();
  var ativo = document.getElementById('event-ativo').value === 'true';

  if (!titulo) return;

  var url, method;
  if (id) {
    url = '/api/events/' + id;
    method = 'PUT';
  } else {
    url = '/api/events';
    method = 'POST';
  }

  var res = await authFetch(url, {
    method: method,
    body: JSON.stringify({ titulo: titulo, ativo: ativo })
  });

  if (!res) return;

  if (res.ok) {
    closeModal('modal-event');
    showToast(id ? 'Evento atualizado' : 'Evento criado');
    loadEvents();
  } else {
    var err = await res.json();
    showToast(err.error || 'Erro ao salvar evento', 'error');
  }
});

// Deletar evento
async function deleteEvent(id) {
  if (!confirm('Tem certeza que deseja excluir este evento e todas as suas lives?')) return;

  var res = await authFetch('/api/events/' + id, { method: 'DELETE' });
  if (!res) return;

  if (res.ok) {
    showToast('Evento excluido');
    loadEvents();
    // Limpar tabela de lives se o evento deletado era o selecionado
    var filterSelect = document.getElementById('live-event-filter');
    if (filterSelect.value == id) {
      filterSelect.value = '';
      document.getElementById('lives-table-body').innerHTML = '';
    }
  } else {
    var err = await res.json();
    showToast(err.error || 'Erro ao excluir', 'error');
  }
}

// ==========================================
// LIVES
// ==========================================

var currentLives = [];

// Filtro de evento para lives
document.getElementById('live-event-filter').addEventListener('change', function() {
  if (this.value) {
    loadLives(this.value);
  } else {
    currentLives = [];
    document.getElementById('lives-table-body').innerHTML = '';
  }
});

async function loadLives(eventId) {
  var res = await fetch('/api/lives/event/' + eventId);
  currentLives = await res.json();
  renderLivesTable();
}

function renderLivesTable() {
  var tbody = document.getElementById('lives-table-body');
  if (currentLives.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">Nenhuma live cadastrada</td></tr>';
    return;
  }

  tbody.innerHTML = currentLives.map(function(live) {
    return '<tr>' +
      '<td>' + live.ordem + '</td>' +
      '<td>' + esc(live.nome_streamer) + '</td>' +
      '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(live.url_youtube) + '</td>' +
      '<td><div class="actions">' +
        '<button class="btn btn-small btn-success" onclick="editLive(' + live.id + ')">Editar</button>' +
        '<button class="btn btn-small btn-danger" onclick="deleteLive(' + live.id + ')">Excluir</button>' +
      '</div></td>' +
    '</tr>';
  }).join('');
}

// Nova live
document.getElementById('btn-new-live').addEventListener('click', function() {
  document.getElementById('modal-live-title').textContent = 'Nova Live';
  document.getElementById('live-id').value = '';
  document.getElementById('live-nome').value = '';
  document.getElementById('live-url').value = '';
  document.getElementById('live-ordem').value = '1';

  // Pre-selecionar o evento do filtro
  var filterValue = document.getElementById('live-event-filter').value;
  if (filterValue) {
    document.getElementById('live-evento-id').value = filterValue;
  }

  openModal('modal-live');
});

// Editar live
function editLive(id) {
  var live = currentLives.find(function(l) { return l.id === id; });
  if (!live) return;
  document.getElementById('modal-live-title').textContent = 'Editar Live';
  document.getElementById('live-id').value = live.id;
  document.getElementById('live-evento-id').value = live.evento_id;
  document.getElementById('live-nome').value = live.nome_streamer;
  document.getElementById('live-url').value = live.url_youtube;
  document.getElementById('live-ordem').value = live.ordem;
  openModal('modal-live');
}

// Salvar live (criar ou editar)
document.getElementById('form-live').addEventListener('submit', async function(e) {
  e.preventDefault();
  var id = document.getElementById('live-id').value;
  var evento_id = parseInt(document.getElementById('live-evento-id').value);
  var nome_streamer = document.getElementById('live-nome').value.trim();
  var url_youtube = document.getElementById('live-url').value.trim();
  var ordem = parseInt(document.getElementById('live-ordem').value);

  if (!evento_id || !nome_streamer || !url_youtube) return;

  var url, method, body;
  if (id) {
    url = '/api/lives/' + id;
    method = 'PUT';
    body = { nome_streamer: nome_streamer, url_youtube: url_youtube, ordem: ordem };
  } else {
    url = '/api/lives';
    method = 'POST';
    body = { evento_id: evento_id, nome_streamer: nome_streamer, url_youtube: url_youtube, ordem: ordem };
  }

  var res = await authFetch(url, {
    method: method,
    body: JSON.stringify(body)
  });

  if (!res) return;

  if (res.ok) {
    closeModal('modal-live');
    showToast(id ? 'Live atualizada' : 'Live criada');
    var filterValue = document.getElementById('live-event-filter').value;
    if (filterValue) loadLives(filterValue);
  } else {
    var err = await res.json();
    showToast(err.error || 'Erro ao salvar live', 'error');
  }
});

// Deletar live
async function deleteLive(id) {
  if (!confirm('Tem certeza que deseja excluir esta live?')) return;

  var res = await authFetch('/api/lives/' + id, { method: 'DELETE' });
  if (!res) return;

  if (res.ok) {
    showToast('Live excluida');
    var filterValue = document.getElementById('live-event-filter').value;
    if (filterValue) loadLives(filterValue);
  } else {
    var err = await res.json();
    showToast(err.error || 'Erro ao excluir', 'error');
  }
}

// === Logout ===
document.getElementById('btn-logout').addEventListener('click', logout);

// === Init ===
loadEvents();

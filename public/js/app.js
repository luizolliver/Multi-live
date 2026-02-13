// === Estado global ===
const players = [null, null, null, null, null];
let apiReady = false;
let pendingEventId = null;

// === YouTube IFrame API callback ===
function onYouTubeIframeAPIReady() {
  apiReady = true;
  if (pendingEventId) {
    loadEvent(pendingEventId);
    pendingEventId = null;
  }
}

// === Extrair ID do YouTube ===
function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// === Criar slots dos players ===
function createPlayerSlots(lives) {
  const container = document.getElementById('player-container');
  container.innerHTML = '';

  lives.forEach((live) => {
    const i = live.ordem - 1;
    const slot = document.createElement('div');
    slot.className = 'player-slot';
    slot.dataset.ordem = live.ordem;
    slot.innerHTML = `
      <div class="player-wrapper">
        <div id="player-${i}"></div>
      </div>
      <div class="player-controls">
        <span class="streamer-name" id="name-${i}">${escapeHtml(live.nome_streamer)}</span>
        <button class="mute-btn" id="mute-${i}" data-index="${i}">Mudo</button>
      </div>
    `;
    container.appendChild(slot);
  });
}

// === Escapar HTML para prevenir XSS ===
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// === Destruir todos os players ===
function destroyAllPlayers() {
  players.forEach((player, i) => {
    if (player && typeof player.destroy === 'function') {
      try { player.destroy(); } catch (e) { /* ignora */ }
    }
    players[i] = null;
  });
}

// === Carregar evento ===
async function loadEvent(eventId) {
  if (!apiReady) {
    pendingEventId = eventId;
    return;
  }

  destroyAllPlayers();

  try {
    const response = await fetch(`/api/events/${eventId}`);
    if (!response.ok) throw new Error('Evento nao encontrado');
    const data = await response.json();

    if (!data.lives || data.lives.length === 0) {
      const container = document.getElementById('player-container');
      container.innerHTML = '<div id="empty-state"><h2>Nenhuma live</h2><p>Este evento nao possui lives cadastradas.</p></div>';
      return;
    }

    createPlayerSlots(data.lives);

    data.lives.forEach((live) => {
      const videoId = extractYouTubeId(live.url_youtube);
      if (!videoId) return;

      const i = live.ordem - 1;
      players[i] = new YT.Player(`player-${i}`, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1
        },
        events: {
          onReady: function(event) {
            event.target.mute();
          },
          onError: function(event) {
            console.error(`Player ${i + 1} erro:`, event.data);
          }
        }
      });
    });
  } catch (err) {
    console.error('Erro ao carregar evento:', err);
  }
}

// === Controle de mute ===
document.addEventListener('click', function(e) {
  if (!e.target.classList.contains('mute-btn')) return;

  const index = parseInt(e.target.dataset.index);
  const player = players[index];
  if (!player || typeof player.isMuted !== 'function') return;

  if (player.isMuted()) {
    player.unMute();
    player.setVolume(100);
    e.target.textContent = 'Som';
    e.target.classList.add('unmuted');
  } else {
    player.mute();
    e.target.textContent = 'Mudo';
    e.target.classList.remove('unmuted');
  }
});

// === Layout switching ===
const layoutButtons = document.querySelectorAll('#layout-buttons button');
const playerContainer = document.getElementById('player-container');

layoutButtons.forEach(function(btn) {
  btn.addEventListener('click', function() {
    const layout = btn.dataset.layout;

    layoutButtons.forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');

    playerContainer.className = 'layout-' + layout;
    localStorage.setItem('preferredLayout', layout);
  });
});

// Restaurar layout salvo
(function restoreLayout() {
  const saved = localStorage.getItem('preferredLayout');
  if (saved) {
    playerContainer.className = 'layout-' + saved;
    layoutButtons.forEach(function(b) {
      b.classList.toggle('active', b.dataset.layout === saved);
    });
  }
})();

// === Event selector ===
async function loadEvents() {
  try {
    const response = await fetch('/api/events');
    const events = await response.json();
    const selector = document.getElementById('event-selector');

    events.forEach(function(event) {
      const option = document.createElement('option');
      option.value = event.id;
      option.textContent = event.titulo;
      selector.appendChild(option);
    });

    // Restaurar evento selecionado
    const savedEvent = localStorage.getItem('selectedEvent');
    if (savedEvent) {
      selector.value = savedEvent;
      if (selector.value === savedEvent) {
        loadEvent(savedEvent);
      }
    }
  } catch (err) {
    console.error('Erro ao carregar eventos:', err);
  }
}

document.getElementById('event-selector').addEventListener('change', function(e) {
  const eventId = e.target.value;
  if (eventId) {
    localStorage.setItem('selectedEvent', eventId);
    loadEvent(eventId);
  } else {
    destroyAllPlayers();
    const container = document.getElementById('player-container');
    container.innerHTML = '<div id="empty-state"><h2>Bem-vindo ao Multi-Live</h2><p>Selecione um evento acima para assistir as lives.</p></div>';
  }
});

// Inicializar
loadEvents();

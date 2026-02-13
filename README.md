# Multi-Live

Visualizador multi-stream para assistir ate 5 lives do YouTube simultaneamente. Inclui painel admin para gerenciar eventos e lives.

## Requisitos

- Node.js 18+
- npm

## Instalacao

```bash
git clone <repo-url>
cd Multi-live
cp .env.example .env
# Edite o .env com suas configuracoes
npm install
npm start
```

O servidor inicia em `http://localhost:3000` (ou porta configurada no .env).

## Variaveis de Ambiente

| Variavel | Descricao | Padrao |
|----------|-----------|--------|
| PORT | Porta do servidor | 3000 |
| JWT_SECRET | Chave secreta para JWT (mude em producao!) | - |
| ADMIN_USERNAME | Usuario admin inicial | admin |
| ADMIN_PASSWORD | Senha admin inicial | admin123 |
| DB_PATH | Caminho do banco SQLite | ./database.db |
| CORS_ORIGIN | Origem permitida para CORS | * |

## Uso

### Pagina publica
Acesse `http://localhost:3000` para ver os players. Selecione um evento no dropdown e escolha o layout.

### Painel admin
Acesse `http://localhost:3000/admin/login.html` para fazer login. No dashboard voce pode:
- Criar, editar e excluir eventos
- Adicionar ate 5 lives por evento (com URL do YouTube e nome do streamer)
- Ativar/desativar eventos

### Layouts disponiveis
- **2x2 + 1**: Grade com 4 videos em cima e 1 centralizado embaixo
- **1 + 4**: Video principal grande + 4 secundarios menores
- **3x2**: Grade com 3 colunas

## API

### Rotas publicas
- `GET /api/events` — Lista eventos ativos
- `GET /api/events/:id` — Evento com suas lives
- `GET /api/lives/event/:eventId` — Lives de um evento

### Rotas admin (requer Bearer token)
- `POST /api/auth/login` — Login (retorna JWT)
- `GET /api/events/all` — Todos os eventos
- `POST /api/events` — Criar evento
- `PUT /api/events/:id` — Editar evento
- `DELETE /api/events/:id` — Deletar evento
- `POST /api/lives` — Criar live
- `PUT /api/lives/:id` — Editar live
- `DELETE /api/lives/:id` — Deletar live

## Deploy (VPS Linux)

### Com systemd

Crie `/etc/systemd/system/multi-live.service`:

```ini
[Unit]
Description=Multi-Live Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/caminho/para/Multi-live
ExecStart=/usr/bin/node server/server.js
Restart=on-failure
EnvironmentFile=/caminho/para/Multi-live/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable multi-live
sudo systemctl start multi-live
```

### Com nginx (proxy reverso)

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Seguranca

- Helmet.js para headers de seguranca
- Rate limiting (100 req/15min geral, 10 req/15min login)
- JWT com expiracao de 24h
- bcrypt para hash de senhas
- Queries parametrizadas (protecao contra SQL injection)
- Validacao de inputs com express-validator
- CSP configurado para permitir embeds do YouTube

## Tecnologias

- Node.js + Express
- SQLite (better-sqlite3)
- HTML/CSS/JS vanilla
- YouTube IFrame Player API

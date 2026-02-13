const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(process.env.DB_PATH || './database.db');
const db = new Database(dbPath);

// Otimizações
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Criar tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    criado_em TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    data_criacao TEXT DEFAULT (datetime('now')),
    ativo INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS lives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evento_id INTEGER NOT NULL,
    nome_streamer TEXT NOT NULL,
    url_youtube TEXT NOT NULL,
    ordem INTEGER NOT NULL CHECK(ordem >= 1 AND ordem <= 5),
    FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE,
    UNIQUE(evento_id, ordem)
  );
`);

// Seed admin user
const existingAdmin = db.prepare('SELECT id FROM usuarios LIMIT 1').get();
if (!existingAdmin) {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO usuarios (username, password) VALUES (?, ?)').run(username, hash);
  console.log(`Admin user "${username}" created.`);
}

module.exports = db;

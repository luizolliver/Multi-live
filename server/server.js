require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Inicializa banco de dados (cria tabelas e seed)
require('./database');

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const liveRoutes = require('./routes/lives');

const app = express();

// Helmet com CSP customizado para YouTube
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.youtube.com", "https://s.ytimg.com"],
      frameSrc: ["'self'", "https://www.youtube.com"],
      imgSrc: ["'self'", "https://img.youtube.com", "https://i.ytimg.com", "data:"],
      connectSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"]
    }
  }
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));

// Parse JSON
app.use(express.json({ limit: '1mb' }));

// Rate limiting geral para API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisicoes. Tente novamente em 15 minutos.' }
});

// Rate limiting estrito para autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

// Arquivos estáticos
app.use(express.static(path.join(__dirname, '..', 'public')));

// Rotas
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/events', apiLimiter, eventRoutes);
app.use('/api/lives', apiLimiter, liveRoutes);

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro interno:', err.message);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Multi-Live server running on port ${PORT}`);
});

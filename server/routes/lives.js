const express = require('express');
const { body, param } = require('express-validator');
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Extrair ID do YouTube de diversas URLs
function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Validação customizada de URL do YouTube
const youtubeUrlValidator = body('url_youtube')
  .trim()
  .notEmpty().withMessage('URL do YouTube e obrigatoria')
  .custom((value) => {
    if (!extractYouTubeId(value)) {
      throw new Error('URL do YouTube invalida. Use formatos: youtube.com/watch?v=XXX, youtu.be/XXX ou youtube.com/live/XXX');
    }
    return true;
  });

// GET /api/lives/event/:eventId — lives de um evento (público)
router.get('/event/:eventId', [
  param('eventId').isInt({ min: 1 }).withMessage('ID do evento invalido'),
  validate
], (req, res) => {
  const lives = db.prepare('SELECT * FROM lives WHERE evento_id = ? ORDER BY ordem').all(req.params.eventId);
  res.json(lives);
});

// POST /api/lives — criar live (admin)
router.post('/', authenticateToken, [
  body('evento_id').isInt({ min: 1 }).withMessage('ID do evento invalido'),
  body('nome_streamer').trim().notEmpty().withMessage('Nome do streamer e obrigatorio').isLength({ max: 100 }).withMessage('Nome muito longo'),
  youtubeUrlValidator,
  body('ordem').isInt({ min: 1, max: 5 }).withMessage('Ordem deve ser entre 1 e 5'),
  validate
], (req, res) => {
  const { evento_id, nome_streamer, url_youtube, ordem } = req.body;

  // Verificar se o evento existe
  const evento = db.prepare('SELECT id FROM eventos WHERE id = ?').get(evento_id);
  if (!evento) {
    return res.status(404).json({ error: 'Evento nao encontrado' });
  }

  // Verificar se a posição já está ocupada
  const existing = db.prepare('SELECT id FROM lives WHERE evento_id = ? AND ordem = ?').get(evento_id, ordem);
  if (existing) {
    return res.status(409).json({ error: `Posicao ${ordem} ja esta ocupada neste evento` });
  }

  // Verificar limite de 5 lives por evento
  const count = db.prepare('SELECT COUNT(*) as total FROM lives WHERE evento_id = ?').get(evento_id);
  if (count.total >= 5) {
    return res.status(400).json({ error: 'Limite de 5 lives por evento atingido' });
  }

  const result = db.prepare('INSERT INTO lives (evento_id, nome_streamer, url_youtube, ordem) VALUES (?, ?, ?, ?)').run(evento_id, nome_streamer, url_youtube, ordem);
  const live = db.prepare('SELECT * FROM lives WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(live);
});

// PUT /api/lives/:id — editar live (admin)
router.put('/:id', authenticateToken, [
  param('id').isInt({ min: 1 }).withMessage('ID invalido'),
  body('nome_streamer').optional().trim().notEmpty().withMessage('Nome nao pode ser vazio').isLength({ max: 100 }).withMessage('Nome muito longo'),
  body('url_youtube').optional().trim().notEmpty().custom((value) => {
    if (!extractYouTubeId(value)) {
      throw new Error('URL do YouTube invalida');
    }
    return true;
  }),
  body('ordem').optional().isInt({ min: 1, max: 5 }).withMessage('Ordem deve ser entre 1 e 5'),
  validate
], (req, res) => {
  const live = db.prepare('SELECT * FROM lives WHERE id = ?').get(req.params.id);
  if (!live) {
    return res.status(404).json({ error: 'Live nao encontrada' });
  }

  const nome_streamer = req.body.nome_streamer !== undefined ? req.body.nome_streamer : live.nome_streamer;
  const url_youtube = req.body.url_youtube !== undefined ? req.body.url_youtube : live.url_youtube;
  const ordem = req.body.ordem !== undefined ? req.body.ordem : live.ordem;

  // Se a ordem mudou, verificar conflito
  if (req.body.ordem !== undefined && req.body.ordem !== live.ordem) {
    const conflict = db.prepare('SELECT id FROM lives WHERE evento_id = ? AND ordem = ? AND id != ?').get(live.evento_id, ordem, live.id);
    if (conflict) {
      return res.status(409).json({ error: `Posicao ${ordem} ja esta ocupada neste evento` });
    }
  }

  db.prepare('UPDATE lives SET nome_streamer = ?, url_youtube = ?, ordem = ? WHERE id = ?').run(nome_streamer, url_youtube, ordem, req.params.id);
  const updated = db.prepare('SELECT * FROM lives WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/lives/:id — deletar live (admin)
router.delete('/:id', authenticateToken, [
  param('id').isInt({ min: 1 }).withMessage('ID invalido'),
  validate
], (req, res) => {
  const live = db.prepare('SELECT * FROM lives WHERE id = ?').get(req.params.id);
  if (!live) {
    return res.status(404).json({ error: 'Live nao encontrada' });
  }

  db.prepare('DELETE FROM lives WHERE id = ?').run(req.params.id);
  res.json({ message: 'Live removida com sucesso' });
});

module.exports = router;

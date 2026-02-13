const express = require('express');
const { body, param } = require('express-validator');
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// GET /api/events — lista eventos ativos (público)
router.get('/', (req, res) => {
  const events = db.prepare('SELECT * FROM eventos WHERE ativo = 1 ORDER BY data_criacao DESC').all();
  res.json(events);
});

// GET /api/events/all — lista todos os eventos (admin)
router.get('/all', authenticateToken, (req, res) => {
  const events = db.prepare('SELECT * FROM eventos ORDER BY data_criacao DESC').all();
  res.json(events);
});

// GET /api/events/:id — evento + lives (público)
router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID invalido'),
  validate
], (req, res) => {
  const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(req.params.id);
  if (!evento) {
    return res.status(404).json({ error: 'Evento nao encontrado' });
  }

  const lives = db.prepare('SELECT * FROM lives WHERE evento_id = ? ORDER BY ordem').all(req.params.id);
  res.json({ ...evento, lives });
});

// POST /api/events — criar evento (admin)
router.post('/', authenticateToken, [
  body('titulo').trim().notEmpty().withMessage('Titulo e obrigatorio').isLength({ max: 200 }).withMessage('Titulo muito longo'),
  body('ativo').optional().isBoolean().withMessage('Ativo deve ser booleano'),
  validate
], (req, res) => {
  const { titulo, ativo } = req.body;
  const ativoVal = ativo === false ? 0 : 1;

  const result = db.prepare('INSERT INTO eventos (titulo, ativo) VALUES (?, ?)').run(titulo, ativoVal);
  const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(evento);
});

// PUT /api/events/:id — editar evento (admin)
router.put('/:id', authenticateToken, [
  param('id').isInt({ min: 1 }).withMessage('ID invalido'),
  body('titulo').optional().trim().notEmpty().withMessage('Titulo nao pode ser vazio').isLength({ max: 200 }).withMessage('Titulo muito longo'),
  body('ativo').optional().isBoolean().withMessage('Ativo deve ser booleano'),
  validate
], (req, res) => {
  const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(req.params.id);
  if (!evento) {
    return res.status(404).json({ error: 'Evento nao encontrado' });
  }

  const titulo = req.body.titulo !== undefined ? req.body.titulo : evento.titulo;
  const ativo = req.body.ativo !== undefined ? (req.body.ativo ? 1 : 0) : evento.ativo;

  db.prepare('UPDATE eventos SET titulo = ?, ativo = ? WHERE id = ?').run(titulo, ativo, req.params.id);
  const updated = db.prepare('SELECT * FROM eventos WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/events/:id — deletar evento (admin)
router.delete('/:id', authenticateToken, [
  param('id').isInt({ min: 1 }).withMessage('ID invalido'),
  validate
], (req, res) => {
  const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(req.params.id);
  if (!evento) {
    return res.status(404).json({ error: 'Evento nao encontrado' });
  }

  db.prepare('DELETE FROM eventos WHERE id = ?').run(req.params.id);
  res.json({ message: 'Evento removido com sucesso' });
});

module.exports = router;

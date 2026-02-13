const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const validate = require('../middleware/validate');

const router = express.Router();

// POST /api/auth/login
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username e obrigatorio'),
  body('password').notEmpty().withMessage('Senha e obrigatoria'),
  validate
], (req, res) => {
  const { username, password } = req.body;

  const user = db.prepare('SELECT * FROM usuarios WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Credenciais invalidas' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Credenciais invalidas' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token });
});

module.exports = router;

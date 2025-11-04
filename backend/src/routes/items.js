const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/auth');
const { createItem, getItems, getItem } = require('../controllers/itemController');

router.get('/', authenticateJWT, getItems);
router.get('/:id', authenticateJWT, getItem);
router.post('/', authenticateJWT, createItem);

module.exports = router;

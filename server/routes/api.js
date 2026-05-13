const express = require('express');

function buildRouter(db) {
  return express.Router();
}

module.exports = buildRouter;

const express = require('express');
const app = express();

// ⚠️ SECURITY: Endpoint removido por seguridad
// Este archivo ya no expone configuración sensible
// La configuración debe obtenerse exclusivamente desde variables de entorno

// Este archivo se mantiene por compatibilidad pero no debe usarse
// Todos los endpoints deben migrar a obtener configuración desde process.env

app.get('/api/odoo-config', (req, res) => {
  res.status(410).json({
    success: false,
    message: 'Este endpoint ha sido removido por razones de seguridad. La configuración debe obtenerse desde variables de entorno.',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;

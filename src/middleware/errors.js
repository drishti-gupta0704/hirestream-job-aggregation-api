function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  if (res.headersSent) return next(err);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large.' });
  }
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with these unique fields already exists.' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record does not exist.' });
  }

  res.status(err.status || 500).json({
    error: err.status && err.status < 500 ? err.message : 'Internal server error'
  });
}

module.exports = { notFound, errorHandler };
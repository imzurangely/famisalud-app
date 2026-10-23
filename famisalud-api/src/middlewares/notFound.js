export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: 'No encontramos esa opción. Vuelve al módulo e inténtalo de nuevo.'
  });
}

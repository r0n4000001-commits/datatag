function parseYear(dateString) {
  const str = String(dateString || '').trim();
  const match = str.match(/\b(19\d{2}|20\d{2})\b/);
  if (match) return match[1];
  if (str.length === 8 && str.startsWith('20')) return str.substring(0, 4);
  const first4 = str.substring(0, 4);
  if (!isNaN(parseInt(first4, 10))) return first4;
  return 'Desconocido';
}

function parseYear(dateString) {
  const str = String(dateString || '').trim();
  // try to find YYYY
  const match = str.match(/\b(19\d{2}|20\d{2})\b/);
  if (match) return match[1];
  
  if (str.length === 8) {
    // YYYYMMDD?
    if (str.startsWith('20')) return str.substring(0, 4);
  }
  return 'Desconocido';
}
console.log(parseYear("24/05/2026"));
console.log(parseYear("20260516"));
console.log(parseYear("26"));

const parseWeightValue = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const clean = String(val).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

const records = [
  { code: '01', name: 'Prod A', date: '20250101', weight: 10, recordType: 'Físico SIFPRO' },
  { code: '01', name: 'Prod A', date: '20260101', weight: 20, recordType: 'Físico SIFPRO' },
  { code: '01', name: 'Prod A', date: '20260201', weight: 12, recordType: 'Venta Diaria' },
];

function parseYear(dateString) {
  const str = String(dateString || '').trim();
  const match = str.match(/\b(19\d{2}|20\d{2})\b/);
  if (match) {
    const yr = parseInt(match[1], 10);
    return yr < 2020 ? 'Anterior a 2020' : yr.toString();
  }
  if (str.length === 8 && str.startsWith('20')) {
     const yr = parseInt(str.substring(0, 4), 10);
     return yr < 2020 ? 'Anterior a 2020' : yr.toString();
  }
  return 'Desconocido';
}

const productMap = new Map();

records.forEach(r => {
  if (r.isReserved) return;
  const key = r.code;
  if (!productMap.has(key)) {
     productMap.set(key, {
       code: r.code,
       name: r.name,
       incomingByYear: {},
       salesCount: 0,
       salesWeight: 0
     });
  }
  const item = productMap.get(key);
  const w = parseWeightValue(r.weight);
  
  if (r.recordType === 'Venta Diaria') {
     item.salesCount += 1;
     item.salesWeight += w;
  } else {
     const year = parseYear(r.date);
     if (!item.incomingByYear[year]) {
       item.incomingByYear[year] = { count: 0, weight: 0 };
     }
     item.incomingByYear[year].count += 1;
     item.incomingByYear[year].weight += w;
  }
});

// Now apply FIFO to each product
const finalByYear = {}; // { '2026': [ { code, name, count, weight } ] }

Array.from(productMap.values()).forEach(item => {
   let { salesCount, salesWeight, incomingByYear } = item;
   
   // sort years
   const years = Object.keys(incomingByYear).sort((a, b) => {
     if (a === 'Desconocido') return 1;
     if (b === 'Desconocido') return -1;
     if (a === 'Anterior a 2020') return -1;
     if (b === 'Anterior a 2020') return 1;
     return parseInt(a) - parseInt(b);
   });
   
   years.forEach(year => {
     const yearData = incomingByYear[year];
     
     const deductCount = Math.min(yearData.count, salesCount);
     yearData.count -= deductCount;
     salesCount -= deductCount;
     
     const deductWeight = Math.min(yearData.weight, salesWeight);
     yearData.weight -= deductWeight;
     salesWeight -= deductWeight;
     
     if (yearData.count > 0 || yearData.weight > 0) {
       if (!finalByYear[year]) finalByYear[year] = [];
       finalByYear[year].push({
         code: item.code,
         name: item.name,
         count: yearData.count,
         weight: yearData.weight
       });
     }
   });
});

console.log(JSON.stringify(finalByYear, null, 2));


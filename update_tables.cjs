const fs = require('fs');

let content = fs.readFileSync('src/components/SifproInventorySubmenu.tsx', 'utf8');

// Sub-table A: Físico SIFPRO
content = content.replace(
  /<tr className="bg-\[#242420\] text-amber-300 uppercase font-black border-b border-\[#33332E\]">([\s\S]*?)<\/tr>/,
  `<tr className="bg-[#242420] text-amber-300 uppercase font-black border-b border-[#33332E]">
  {isMarketDevelopmentMode && (
    <th className="p-2 border-r border-[#33332E] text-center min-w-[50px]">Apartar</th>
  )}
  <th className="p-2 border-r border-[#33332E]">Código</th>
  <th className="p-2 border-r border-[#33332E]">Nombre</th>
  <th className="p-2 border-r border-[#33332E]">Fecha de Producción</th>
  <th className="p-2 border-r border-[#33332E]">Folio / Caja</th>
  <th className="p-2 border-r border-[#33332E]">Lote</th>
  <th className="p-2 border-r border-[#33332E] text-right">Peso Físico (KG)</th>
  <th className="p-2 border-r border-[#33332E]">Fecha Lectura</th>
  <th className="p-2 border-r border-[#33332E] text-center">Almacén</th>
  <th className="p-2 border-r border-[#33332E]">Estatus / Origen</th>
  {!isMarketDevelopmentMode && (
    <th className="p-2 text-center">Acción</th>
  )}
</tr>`
);

content = content.replace(
  /<td className="p-2 border-r border-\[#242420\] font-bold text-gray-100">\{r\.folio\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-gray-300">\{r\.date\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-amber-300 font-bold">\{r\.lot\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-right font-black text-emerald-300">\s*\{parseWeightValue\(r\.weight\)\.toFixed\(2\)\} KG\s*<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-gray-300">\{r\.readingDate\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-center font-bold text-amber-400">\{r\.warehouseId\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-gray-300 text-\[10px\]">/,
  `<td className="p-2 border-r border-[#242420] text-gray-300 font-bold">{r.code}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.name}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.date}</td>
  <td className="p-2 border-r border-[#242420] font-bold text-gray-100">{r.folio}</td>
  <td className="p-2 border-r border-[#242420] text-amber-300 font-bold">{r.lot}</td>
  <td className="p-2 border-r border-[#242420] text-right font-black text-emerald-300">
    {parseWeightValue(r.weight).toFixed(2)} KG
  </td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.readingDate}</td>
  <td className="p-2 border-r border-[#242420] text-center font-bold text-amber-400">{r.warehouseId}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300 text-[10px]">`
);

// Sub-table B: Recepción Matriz
content = content.replace(
  /<tr className="bg-\[#242420\] text-cyan-300 uppercase font-black border-b border-\[#33332E\]">([\s\S]*?)<\/tr>/,
  `<tr className="bg-[#242420] text-cyan-300 uppercase font-black border-b border-[#33332E]">
  <th className="p-2 border-r border-[#33332E]">Código</th>
  <th className="p-2 border-r border-[#33332E]">Nombre</th>
  <th className="p-2 border-r border-[#33332E]">Fecha de Producción</th>
  <th className="p-2 border-r border-[#33332E]">Folio</th>
  <th className="p-2 border-r border-[#33332E]">Lote</th>
  <th className="p-2 border-r border-[#33332E] text-right">Peso Físico (KG)</th>
  <th className="p-2 border-r border-[#33332E]">Fecha Lectura</th>
  <th className="p-2 border-r border-[#33332E] text-center">Almacén</th>
  <th className="p-2 border-r border-[#33332E]">Fecha de Recepción</th>
  <th className="p-2 text-center">Acción</th>
</tr>`
);

content = content.replace(
  /<td className="p-2 border-r border-\[#242420\] font-bold text-cyan-300">\{r\.folio\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-gray-300">\{r\.date\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-gray-300">\{r\.lot\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-right font-black text-cyan-300">\s*\+\{parseWeightValue\(r\.weight\)\.toFixed\(2\)\} KG\s*<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-gray-300">\{r\.readingDate\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-center font-bold text-amber-400">\{r\.warehouseId\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-gray-400 italic text-\[10px\]">\{r\.fileName \|\| 'Recepción Matriz'\}<\/td>/,
  `<td className="p-2 border-r border-[#242420] text-gray-300 font-bold">{r.code}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.name}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.date}</td>
  <td className="p-2 border-r border-[#242420] font-bold text-cyan-300">{r.folio}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.lot}</td>
  <td className="p-2 border-r border-[#242420] text-right font-black text-cyan-300">
    {parseWeightValue(r.weight).toFixed(2)} KG
  </td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.readingDate}</td>
  <td className="p-2 border-r border-[#242420] text-center font-bold text-amber-400">{r.warehouseId}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.docDate || r.uploadedAt}</td>`
);


// Sub-table C: Devoluciones SIFPRO (Note: The script currently targets text-orange-300)
content = content.replace(
  /<tr className="bg-\[#242420\] text-orange-300 uppercase font-black border-b border-\[#33332E\]">([\s\S]*?)<\/tr>/,
  `<tr className="bg-[#242420] text-orange-300 uppercase font-black border-b border-[#33332E]">
  <th className="p-2 border-r border-[#33332E]">Código</th>
  <th className="p-2 border-r border-[#33332E]">Nombre</th>
  <th className="p-2 border-r border-[#33332E]">Fecha de Producción</th>
  <th className="p-2 border-r border-[#33332E]">Folio</th>
  <th className="p-2 border-r border-[#33332E]">Lote</th>
  <th className="p-2 border-r border-[#33332E] text-right">Peso Físico (KG)</th>
  <th className="p-2 border-r border-[#33332E]">Fecha Lectura</th>
  <th className="p-2 border-r border-[#33332E] text-center">Almacén</th>
  <th className="p-2 border-r border-[#33332E]">Fecha de Devolución</th>
  <th className="p-2 border-r border-[#33332E] text-right">Peso Devuelto</th>
  <th className="p-2 border-r border-[#33332E]">Motivo / Cliente</th>
  <th className="p-2 text-center">Acción</th>
</tr>`
);

content = content.replace(
  /<td className="p-2 border-r border-\[#242420\] font-bold text-orange-300">\{r\.folio\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-gray-300">\{r\.date\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-gray-300">\{r\.lot\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-right font-black text-orange-300">\s*\+\{parseWeightValue\(r\.weight\)\.toFixed\(2\)\} KG\s*<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-gray-300 italic text-\[10px\]">\{r\.reason \|\| 'Devolución \/ Rechazo'\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-center font-bold text-amber-400">\{r\.warehouseId\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-gray-400 italic text-\[10px\]">\{r\.fileName \|\| 'Devolución SIFPRO'\}<\/td>/,
  `<td className="p-2 border-r border-[#242420] text-gray-300 font-bold">{r.code}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.name}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.date}</td>
  <td className="p-2 border-r border-[#242420] font-bold text-orange-300">{r.folio}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.lot}</td>
  <td className="p-2 border-r border-[#242420] text-right font-black text-gray-300">
    {parseWeightValue(r.weight).toFixed(2)} KG
  </td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.readingDate}</td>
  <td className="p-2 border-r border-[#242420] text-center font-bold text-amber-400">{r.warehouseId}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.docDate || r.uploadedAt}</td>
  <td className="p-2 border-r border-[#242420] text-right font-black text-orange-300">
    {parseWeightValue(r.weight).toFixed(2)} KG
  </td>
  <td className="p-2 border-r border-[#242420] text-gray-300 italic text-[10px]">{r.reason || 'Devolución / Rechazo'}</td>`
);


// Sub-table D: Venta Diaria
content = content.replace(
  /<tr className="bg-\[#242420\] text-purple-300 uppercase font-black border-b border-\[#33332E\]">([\s\S]*?)<\/tr>/,
  `<tr className="bg-[#242420] text-purple-300 uppercase font-black border-b border-[#33332E]">
  <th className="p-2 border-r border-[#33332E]">Código</th>
  <th className="p-2 border-r border-[#33332E]">Nombre</th>
  <th className="p-2 border-r border-[#33332E]">Fecha de Producción</th>
  <th className="p-2 border-r border-[#33332E]">Folio</th>
  <th className="p-2 border-r border-[#33332E]">Lote</th>
  <th className="p-2 border-r border-[#33332E] text-right">Peso Físico (KG)</th>
  <th className="p-2 border-r border-[#33332E]">Fecha Lectura</th>
  <th className="p-2 border-r border-[#33332E] text-center">Almacén</th>
  <th className="p-2 border-r border-[#33332E]">Fecha de Venta</th>
  <th className="p-2 border-r border-[#33332E]">Folio de Venta</th>
  <th className="p-2 text-center">Acción</th>
</tr>`
);

content = content.replace(
  /<td className="p-2 border-r border-\[#242420\] font-bold text-purple-300">\{r\.folio\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-gray-300">\{r\.date\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-gray-300">\{r\.lot\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-right font-black text-purple-300">\s*-\{parseWeightValue\(r\.weight\)\.toFixed\(2\)\} KG\s*<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-gray-300">\{r\.readingDate\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-center font-bold text-amber-400">\{r\.warehouseId\}<\/td>\s*<td className="p-2 border-r border-\[#242420\] text-gray-400 italic text-\[10px\]">\{r\.fileName \|\| 'Venta Diaria'\}<\/td>/,
  `<td className="p-2 border-r border-[#242420] text-gray-300 font-bold">{r.code}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.name}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.date}</td>
  <td className="p-2 border-r border-[#242420] font-bold text-purple-300">{r.folio}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.lot}</td>
  <td className="p-2 border-r border-[#242420] text-right font-black text-purple-300">
    {parseWeightValue(r.weight).toFixed(2)} KG
  </td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.readingDate}</td>
  <td className="p-2 border-r border-[#242420] text-center font-bold text-amber-400">{r.warehouseId}</td>
  <td className="p-2 border-r border-[#242420] text-gray-300">{r.docDate || r.uploadedAt}</td>
  <td className="p-2 border-r border-[#242420] text-gray-400 italic text-[10px]">{r.fileName || 'Venta Diaria'}</td>`
);


fs.writeFileSync('src/components/SifproInventorySubmenu.tsx', content);

console.log('Replacements complete');

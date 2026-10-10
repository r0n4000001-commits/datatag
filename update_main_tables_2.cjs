const fs = require('fs');
let content = fs.readFileSync('src/components/SifproInventorySubmenu.tsx', 'utf8');

// --- MAIN SALES TABLE ---
const mainSalesHeadersRegex = /<tr className="bg-\[#383834\] text-gray-200 border-b border-\[#4F4F4A\] uppercase text-\[11px\] font-black tracking-wide">[\s\S]*?<span>Código<\/span>[\s\S]*?<span>Nombre<\/span>[\s\S]*?<span>Fecha Venta<\/span>[\s\S]*?<span>Folio Venta<\/span>[\s\S]*?<span>Lote<\/span>[\s\S]*?<span>Peso Salida<\/span>[\s\S]*?<span>Fecha Lectura<\/span>[\s\S]*?<span>Almacén<\/span>[\s\S]*?<span>Acción<\/span>[\s\S]*?<\/tr>/;

content = content.replace(mainSalesHeadersRegex,
`<tr className="bg-[#383834] text-gray-200 border-b border-[#4F4F4A] uppercase text-[11px] font-black tracking-wide">
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">
    <div className="flex items-center justify-between"><span>Código</span><Filter className="w-3 h-3 text-gray-400" /></div>
  </th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[180px]">
    <div className="flex items-center justify-between"><span>Nombre</span><Filter className="w-3 h-3 text-gray-400" /></div>
  </th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[100px]">
    <div className="flex items-center justify-between"><span>Fecha de Producción</span><Filter className="w-3 h-3 text-gray-400" /></div>
  </th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">
    <div className="flex items-center justify-between"><span>Folio</span><Filter className="w-3 h-3 text-gray-400" /></div>
  </th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">
    <div className="flex items-center justify-between"><span>Lote</span><Filter className="w-3 h-3 text-gray-400" /></div>
  </th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px] text-right">
    <div className="flex items-center justify-between"><span>Peso Físico</span><Filter className="w-3 h-3 text-gray-400" /></div>
  </th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[120px]">
    <div className="flex items-center justify-between"><span>Fecha Lectura</span><Filter className="w-3 h-3 text-gray-400" /></div>
  </th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[80px] text-center">
    <div className="flex items-center justify-center gap-1"><span>Almacén</span><Filter className="w-3 h-3 text-gray-400" /></div>
  </th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[100px]">
    <div className="flex items-center justify-between"><span>Fecha de Venta</span><Filter className="w-3 h-3 text-gray-400" /></div>
  </th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">
    <div className="flex items-center justify-between"><span>Folio de Venta</span><Filter className="w-3 h-3 text-gray-400" /></div>
  </th>
  <th className="p-2.5 text-center min-w-[70px]">
    <span>Acción</span>
  </th>
</tr>`);

// Body of Sales
content = content.replace(
/<td className="p-2\.5 border-r border-\[#2C2C28\] font-bold text-purple-300">\s*\{r\.code\}\s*<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] font-bold text-white">\s*\{r\.name\}\s*<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] text-gray-300">\s*\{r\.date\}\s*<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] font-bold text-gray-200">\s*\{r\.folio\}\s*<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] text-gray-300">\s*\{r\.lot\}\s*<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] font-black text-right text-purple-300">\s*\{typeof r\.weight === 'number' \? `\$\{r\.weight\.toFixed\(2\)\} KG` : `\$\{String\(r\.weight\)\.replace\('\$', ''\)\} KG`\}\s*<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] text-gray-300">\s*\{r\.readingDate\}\s*<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] text-center font-bold text-amber-400">\s*\{r\.warehouseId\}\s*<\/td>\s*<td className="p-2\.5 text-center">/,
`<td className="p-2.5 border-r border-[#2C2C28] font-bold text-purple-300">{r.code}</td>
<td className="p-2.5 border-r border-[#2C2C28] font-bold text-white">{r.name}</td>
<td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.date}</td>
<td className="p-2.5 border-r border-[#2C2C28] font-bold text-gray-200">{r.folio}</td>
<td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.lot}</td>
<td className="p-2.5 border-r border-[#2C2C28] font-black text-right text-purple-300">
  {typeof r.weight === 'number' ? \`\${r.weight.toFixed(2)} KG\` : \`\${String(r.weight).replace('$', '')} KG\`}
</td>
<td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.readingDate}</td>
<td className="p-2.5 border-r border-[#2C2C28] text-center font-bold text-amber-400">{r.warehouseId}</td>
<td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.docDate || r.uploadedAt}</td>
<td className="p-2.5 border-r border-[#2C2C28] text-gray-400 italic text-[10px]">{r.fileName || 'Venta Diaria'}</td>
<td className="p-2.5 text-center">`
);

// --- MAIN RETURNS TABLE ---
const mainReturnsHeadersRegex = /<tr className="bg-\[#282824\] text-gray-200 border-b border-\[#3A3A36\] uppercase text-\[11px\] font-black tracking-wide">\s*<th className="p-2\.5 border-r border-\[#3A3A36\]">Código<\/th>\s*<th className="p-2\.5 border-r border-\[#3A3A36\] min-w-\[160px\]">Nombre Producto<\/th>[\s\S]*?<\/tr>/;

content = content.replace(mainReturnsHeadersRegex,
`<tr className="bg-[#282824] text-gray-200 border-b border-[#3A3A36] uppercase text-[11px] font-black tracking-wide">
  <th className="p-2.5 border-r border-[#3A3A36]">Código</th>
  <th className="p-2.5 border-r border-[#3A3A36] min-w-[160px]">Nombre</th>
  <th className="p-2.5 border-r border-[#3A3A36]">Fecha de Producción</th>
  <th className="p-2.5 border-r border-[#3A3A36]">Folio</th>
  <th className="p-2.5 border-r border-[#3A3A36]">Lote</th>
  <th className="p-2.5 border-r border-[#3A3A36] text-right text-orange-300 font-black">Peso Físico</th>
  <th className="p-2.5 border-r border-[#3A3A36]">Fecha Lectura</th>
  <th className="p-2.5 border-r border-[#3A3A36] text-center">Almacén</th>
  <th className="p-2.5 border-r border-[#3A3A36]">Fecha de Devolución</th>
  <th className="p-2.5 border-r border-[#3A3A36] text-right">Peso Devuelto</th>
  <th className="p-2.5 border-r border-[#3A3A36]">Motivo / Cliente</th>
  <th className="p-2.5 text-center min-w-[70px]">
    <span>Acción</span>
  </th>
</tr>`);

// Body of Returns
content = content.replace(
/<td className="p-2\.5 border-r border-\[#2C2C28\] font-bold text-orange-300">\s*\{r\.code\}\s*<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] font-bold text-white">\s*\{r\.name\}\s*<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] text-gray-300">\s*\{r\.date\}\s*<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] font-bold text-gray-200">\s*\{r\.folio\}\s*<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] text-gray-300">\s*\{r\.lot\}\s*<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] font-black text-right text-orange-300">\s*\{typeof r\.weight === 'number' \? `\$\{r\.weight\.toFixed\(2\)\} KG` : `\$\{String\(r\.weight\)\.replace\('\$', ''\)\} KG`\}\s*<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] text-gray-300">\s*\{r\.readingDate\}\s*<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] text-center font-bold text-amber-400">\s*\{r\.warehouseId\}\s*<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] text-gray-400 italic text-xs">\s*\{r\.reason \|\| 'Devolución \/ Rechazo'\}\s*<\/td>\s*<td className="p-2\.5 text-center">/,
`<td className="p-2.5 border-r border-[#2C2C28] font-bold text-orange-300">{r.code}</td>
<td className="p-2.5 border-r border-[#2C2C28] font-bold text-white">{r.name}</td>
<td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.date}</td>
<td className="p-2.5 border-r border-[#2C2C28] font-bold text-gray-200">{r.folio}</td>
<td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.lot}</td>
<td className="p-2.5 border-r border-[#2C2C28] font-black text-right text-gray-300">
  {typeof r.weight === 'number' ? \`\${r.weight.toFixed(2)} KG\` : \`\${String(r.weight).replace('$', '')} KG\`}
</td>
<td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.readingDate}</td>
<td className="p-2.5 border-r border-[#2C2C28] text-center font-bold text-amber-400">{r.warehouseId}</td>
<td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.docDate || r.uploadedAt}</td>
<td className="p-2.5 border-r border-[#2C2C28] font-black text-right text-orange-300">
  {typeof r.weight === 'number' ? \`\${r.weight.toFixed(2)} KG\` : \`\${String(r.weight).replace('$', '')} KG\`}
</td>
<td className="p-2.5 border-r border-[#2C2C28] text-gray-400 italic text-xs">
  {r.reason || 'Devolución / Rechazo'}
</td>
<td className="p-2.5 text-center">`
);

fs.writeFileSync('src/components/SifproInventorySubmenu.tsx', content);

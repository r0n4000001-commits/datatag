const fs = require('fs');

let content = fs.readFileSync('src/components/SifproInventorySubmenu.tsx', 'utf8');

// --- MAIN PHYSICAL TABLE ---
const mainPhysicalHeadersRegex = /<tr className="bg-\[#383834\] text-gray-200 border-b border-\[#4F4F4A\] uppercase text-\[11px\] font-black tracking-wide">[\s\S]*?<span>Fecha<\/span>[\s\S]*?<span>Folio<\/span>[\s\S]*?<span>Acción<\/span>\s*<\/th>\s*<\/tr>/;

content = content.replace(mainPhysicalHeadersRegex, 
`<tr className="bg-[#383834] text-gray-200 border-b border-[#4F4F4A] uppercase text-[11px] font-black tracking-wide">
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">
    <div className="flex items-center justify-between">
      <span>Código</span>
      <Filter className="w-3 h-3 text-gray-400" />
    </div>
  </th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[180px]">
    <div className="flex items-center justify-between">
      <span>Nombre</span>
      <Filter className="w-3 h-3 text-gray-400" />
    </div>
  </th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[100px]">
    <div className="flex items-center justify-between">
      <span>Fecha de Producción</span>
      <Filter className="w-3 h-3 text-gray-400" />
    </div>
  </th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">
    <div className="flex items-center justify-between">
      <span>Folio</span>
      <Filter className="w-3 h-3 text-gray-400" />
    </div>
  </th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">
    <div className="flex items-center justify-between">
      <span>Lote</span>
      <Filter className="w-3 h-3 text-gray-400" />
    </div>
  </th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px] text-right">
    <div className="flex items-center justify-between">
      <span>Peso Físico</span>
      <Filter className="w-3 h-3 text-gray-400" />
    </div>
  </th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[120px]">
    <div className="flex items-center justify-between">
      <span>Fecha Lectura</span>
      <Filter className="w-3 h-3 text-gray-400" />
    </div>
  </th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[80px] text-center">
    <div className="flex items-center justify-center gap-1">
      <span>Almacén</span>
      <Filter className="w-3 h-3 text-gray-400" />
    </div>
  </th>
  <th className="p-2.5 text-center min-w-[70px]">
    <span>Acción</span>
  </th>
</tr>`);

// The physical body is already correct, just replace "Fecha" header to "Fecha de Producción" which is done.

// --- MAIN RECEPTION TABLE ---
const mainReceptionHeadersRegex = /<tr className="bg-\[#383834\] text-gray-200 border-b border-\[#4F4F4A\] uppercase text-\[11px\] font-black tracking-wide">\s*<th className="p-2\.5 border-r border-\[#4F4F4A\] min-w-\[90px\]">Código<\/th>\s*<th className="p-2\.5 border-r border-\[#4F4F4A\] min-w-\[180px\]">Nombre<\/th>\s*<th className="p-2\.5 border-r border-\[#4F4F4A\] min-w-\[100px\]">Fecha Recepción<\/th>[\s\S]*?<\/tr>/;

content = content.replace(mainReceptionHeadersRegex,
`<tr className="bg-[#383834] text-gray-200 border-b border-[#4F4F4A] uppercase text-[11px] font-black tracking-wide">
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">Código</th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[180px]">Nombre</th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[100px]">Fecha de Producción</th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">Folio</th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">Lote</th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px] text-right">Peso Físico</th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[120px]">Fecha Lectura</th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[80px] text-center">Almacén</th>
  <th className="p-2.5 border-r border-[#4F4F4A] min-w-[120px]">Fecha de Recepción</th>
  <th className="p-2.5 text-center min-w-[70px]">Acción</th>
</tr>`);

// Body of Reception
content = content.replace(
/<td className="p-2\.5 border-r border-\[#2C2C28\] font-bold text-cyan-300">\{r\.code\}<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] font-bold text-white">\{r\.name\}<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] text-gray-300">\{r\.date\}<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] font-bold text-gray-200">\{r\.folio\}<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] text-gray-300">\{r\.lot\}<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] font-black text-right text-cyan-300">\s*\{typeof r\.weight === 'number' \? `\$\{r\.weight\.toFixed\(2\)\} KG` : `\$\{String\(r\.weight\)\.replace\('\$', ''\)\} KG`\}\s*<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] text-gray-300">\{r\.readingDate\}<\/td>\s*<td className="p-2\.5 border-r border-\[#2C2C28\] text-center font-bold text-amber-400">\{r\.warehouseId\}<\/td>\s*<td className="p-2\.5 text-center">/,
`<td className="p-2.5 border-r border-[#2C2C28] font-bold text-cyan-300">{r.code}</td>
<td className="p-2.5 border-r border-[#2C2C28] font-bold text-white">{r.name}</td>
<td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.date}</td>
<td className="p-2.5 border-r border-[#2C2C28] font-bold text-gray-200">{r.folio}</td>
<td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.lot}</td>
<td className="p-2.5 border-r border-[#2C2C28] font-black text-right text-cyan-300">
  {typeof r.weight === 'number' ? \`\${r.weight.toFixed(2)} KG\` : \`\${String(r.weight).replace('$', '')} KG\`}
</td>
<td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.readingDate}</td>
<td className="p-2.5 border-r border-[#2C2C28] text-center font-bold text-amber-400">{r.warehouseId}</td>
<td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.docDate || r.uploadedAt}</td>
<td className="p-2.5 text-center">`
);

fs.writeFileSync('src/components/SifproInventorySubmenu.tsx', content);

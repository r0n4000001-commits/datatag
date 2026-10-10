const fs = require('fs');

const original = fs.readFileSync('src/components/SifproInventorySubmenu.tsx', 'utf8');
const lines = original.split('\n');

const part1 = lines.slice(0, 1965).join('\n'); // Up to <table className="..."> for Physical
const part4 = lines.slice(5460).join('\n'); // From {/* TAB 3: VENTA DIARIA */} to end

// Generate Physical Table
const physicalTable = `
                <thead>
                  <tr className="bg-[#383834] text-gray-200 border-b border-[#4F4F4A] uppercase text-[11px] font-black tracking-wide">
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
                    <th className="p-2.5 text-center min-w-[70px]">
                      <span>Acción</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2C2C28] text-[#E0E0DC]">
                  {physicalRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500 italic bg-[#10100E]">
                        No hay registros en el Inventario Físico SIFPRO. Seleccione un archivo para cargar.
                      </td>
                    </tr>
                  ) : (
                    (showAllPhysical ? physicalRecords : physicalRecords.slice(0, 50)).map((r, idx) => (
                      <tr
                        key={r.id}
                        className={\`hover:bg-[#282824] transition-colors text-xs \${
                          idx % 2 === 0 ? 'bg-[#181816]' : 'bg-[#141414]'
                        }\`}
                      >
                        <td className="p-2.5 border-r border-[#2C2C28] font-bold text-amber-300">{r.code}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] font-bold text-white">{r.name}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.date}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] font-bold text-gray-200">{r.folio}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.lot}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] font-black text-right text-emerald-300">
                          {typeof r.weight === 'number' ? \`\${r.weight.toFixed(2)} KG\` : \`\${String(r.weight).replace('$', '')} KG\`}
                        </td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-gray-300">{r.readingDate}</td>
                        <td className="p-2.5 border-r border-[#2C2C28] text-center font-bold text-amber-400">{r.warehouseId}</td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleDeleteRecord(r.id)}
                            className="p-1 hover:bg-red-950 text-gray-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
`;

const receptionTab = `
      {/* TAB 2: RECEPCIÓN MATRIZ */}
      {activeTab === 'reception' && (
        <div className="space-y-4">
          {/* File Upload Banner for Reception */}
          <div className="bg-[#1D1D1B] p-4 border border-[#3A3A36] rounded text-white space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-[#2C2C28] pb-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-cyan-300">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Cargar Archivo Excel de Recepción Matriz</span>
              </div>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700 px-2 py-0.5 rounded font-mono">
                Recepción SIFPRO
              </span>
            </div>
            <p className="text-xs text-gray-300">
              Seleccione la fecha deseada para la carga y adjunte el archivo Excel o CSV con las entradas (Recepción Matriz).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-extrabold text-cyan-300 uppercase mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Fecha Recepción / Documento:</span>
                </label>
                <input
                  type="date"
                  value={customReceptionDate}
                  onChange={(e) => setCustomReceptionDate(e.target.value)}
                  className="w-full bg-[#181816] text-cyan-300 border border-cyan-400/60 px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-cyan-400 rounded cursor-pointer"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-extrabold text-cyan-300 uppercase mb-1">
                  <span>Seleccionar Archivo (Excel / CSV / TXT):</span>
                </label>
                <label className="flex items-center justify-center gap-2 w-full py-1.5 px-3 bg-cyan-400/10 hover:bg-cyan-400/20 border border-dashed border-cyan-400 text-cyan-300 hover:text-cyan-200 text-xs font-bold rounded cursor-pointer transition-all">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Subir Archivo Recepción ({customReceptionDate || 'Sin Fecha'})</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handleReceptionFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Control Panel: Consult and Delete Reception Load by Date */}
          <div className="bg-[#181816] p-3.5 border border-red-500/30 rounded text-white space-y-2 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2C2C28] pb-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-red-400">
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Borrar Carga de Recepción Matriz</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeleteAllReception}
                  className="px-2.5 py-1 bg-red-950 hover:bg-red-900 border border-red-500/50 text-red-300 hover:text-red-100 text-[11px] font-extrabold rounded flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                  <span>Borrar Todo de Recepción</span>
                </button>
              </div>
            </div>
            {receptionBatchDates.length === 0 ? (
              <div className="text-xs text-gray-500 italic py-1">
                No hay cargas de recepción matriz registradas por fecha.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-bold text-gray-300">Consultar y Borrar Carga:</span>
                  <select
                    value={selectedReceptionDateToDelete}
                    onChange={(e) => setSelectedReceptionDateToDelete(e.target.value)}
                    className="bg-[#10100E] text-cyan-300 border border-red-500/50 px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none rounded cursor-pointer min-w-[280px]"
                  >
                    <option value="">-- Seleccionar Carga a Borrar --</option>
                    {receptionBatchDates.map((b) => (
                      <option key={b.key} value={b.key}>
                        Documento: {b.date} {b.fileName ? \`[\${b.fileName}]\` : ''} ({b.count} productos - {b.totalWeight.toFixed(2)} KG)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedReceptionDateToDelete}
                    onClick={() => handleDeleteReceptionByDate(selectedReceptionDateToDelete)}
                    className="px-3.5 py-1.5 bg-red-900 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer transition-colors shadow"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-200" />
                    <span>Borrar Carga Completa</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[11px] text-gray-400 font-bold self-center">Documentos Cargados:</span>
                  {receptionBatchDates.map((b) => (
                    <div
                      key={b.key}
                      className="bg-[#10100E] border border-[#3A3A36] hover:border-red-500/60 px-2.5 py-1 rounded text-[11px] flex items-center gap-2 text-gray-200"
                    >
                      <span className="font-bold text-cyan-300">{b.date}</span>
                      {b.fileName && <span className="text-gray-400 font-sans italic text-[10px]">({b.fileName})</span>}
                      <span className="text-gray-400 font-bold">({b.count} prod | {b.totalWeight.toFixed(2)} KG)</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteReceptionByDate(b.key)}
                        className="p-1 hover:bg-red-950 text-red-400 hover:text-red-200 rounded cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reception Data Table */}
          <div className="bg-[#141414] border border-cyan-500/30 rounded-xs overflow-hidden shadow-lg font-mono">
            <div className="bg-[#1D1D1B] px-4 py-2.5 border-b border-[#3A3A36] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-black text-cyan-300 uppercase">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Registros de Entradas (Recepción Matriz)</span>
                <span className="bg-cyan-950 text-cyan-200 px-2 py-0.5 rounded ml-2 border border-cyan-700">
                  {receptionRecords.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {receptionRecords.length > 50 && (
                  <button
                    type="button"
                    onClick={() => setShowAllReception(!showAllReception)}
                    className="px-2.5 py-1 bg-[#22221E] hover:bg-[#33332D] border border-cyan-500/40 text-cyan-200 text-[11px] font-bold rounded cursor-pointer transition-colors shadow-xs"
                  >
                    {showAllReception ? 'Ver solo primeros 50' : \`Ver los \${receptionRecords.length} registros\`}
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#383834] text-gray-200 border-b border-[#4F4F4A] uppercase text-[11px] font-black tracking-wide">
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">Código</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[180px]">Nombre</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[100px]">Fecha de Producción</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">Folio</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px]">Lote</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[90px] text-right">Peso Físico (KG)</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[120px]">Fecha Lectura</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[80px] text-center">Almacén</th>
                    <th className="p-2.5 border-r border-[#4F4F4A] min-w-[120px]">Fecha de Recepción</th>
                    <th className="p-2.5 text-center min-w-[70px]">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2C2C28] text-[#E0E0DC]">
                  {receptionRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-gray-500 italic bg-[#10100E]">
                        No hay registros de Recepción Matriz. Cargue el archivo correspondiente.
                      </td>
                    </tr>
                  ) : (
                    (showAllReception ? receptionRecords : receptionRecords.slice(0, 50)).map((r, idx) => (
                      <tr
                        key={r.id}
                        className={\`hover:bg-[#282824] transition-colors text-xs \${
                          idx % 2 === 0 ? 'bg-[#181816]' : 'bg-[#141414]'
                        }\`}
                      >
                        <td className="p-2.5 border-r border-[#2C2C28] font-bold text-cyan-300">{r.code}</td>
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
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleDeleteRecord(r.id)}
                            className="p-1 hover:bg-red-950 text-gray-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
`;

fs.writeFileSync('src/components/SifproInventorySubmenu.tsx', part1 + '\n' + physicalTable + '\n' + receptionTab + '\n' + part4);
console.log('Reconstruction step 1 complete.');

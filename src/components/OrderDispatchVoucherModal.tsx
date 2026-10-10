import React from 'react';
import { MarketReservation, DischargeRecord } from '../types';
import { Printer, X, CheckCircle2, Package, ShieldCheck, User, Calendar, Clock, MapPin, Truck, RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
  reservation: MarketReservation;
  onClose: () => void;
  onPrint?: () => void;
}

function formatWeight(val: any): string {
  const num = Number(val);
  return isNaN(num) ? '0.00' : num.toFixed(2);
}

function formatDateTime(isoString?: string): { date: string; time: string } {
  if (!isoString) return { date: 'N/A', time: 'N/A' };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { date: 'N/A', time: 'N/A' };
  return {
    date: d.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    time: d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

export const OrderDispatchVoucherModal: React.FC<Props> = ({ reservation, onClose, onPrint }) => {
  const isOrder = reservation.orderType === 'PEDIDO_VENTA' ||
    reservation.reason === 'Venta Directa' ||
    reservation.reason === 'Reserva Venta Especial' ||
    reservation.reason === 'Apartado Comercial';

  const orderCreated = formatDateTime(reservation.reservationDate);
  const warehouseDischarged = formatDateTime(reservation.dischargedAt || reservation.approvedAt || new Date().toISOString());

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const orderFolio = reservation.internalFolio || reservation.id;
  const telemarketingName = reservation.approvedBy || 'Telemarketing Central';
  const sellerName = reservation.developerName || 'Vendedor Comercial';
  const clientName = reservation.clientOrEvent;
  const totalItems = reservation.items?.length || reservation.labelIds?.length || 0;
  const totalWeight = reservation.totalWeight || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fade-in font-mono">
      <div className="bg-white border-2 border-black max-w-3xl w-full shadow-2xl overflow-hidden my-auto">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="bg-[#141414] text-white p-3 sm:px-5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-black text-[10px] font-black px-2 py-0.5 uppercase">
              DOCUMENTO OFICIAL
            </span>
            <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-amber-200">
              Comprobante de Pedido y Salida de Almacén
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-amber-400 hover:bg-amber-300 text-black font-black px-4 py-1.5 rounded-xs text-xs flex items-center gap-1.5 cursor-pointer uppercase shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white px-3 py-1.5 text-xs font-bold rounded-xs cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* PRINTABLE VOUCHER DOCUMENT CONTENT */}
        <div id="order-dispatch-voucher-printable" className="p-5 sm:p-8 bg-white text-black space-y-4 text-xs">
          {/* Document Header */}
          <div className="border-b-2 border-black pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black">
                  YOREME CORTES Y PROCESOS
                </h1>
                <p className="text-[11px] text-gray-700 font-sans">
                  Blvd. Circunvalación 1049 Sur, Parque Industrial C.P. 85065, Cd. Obregón, SON.
                </p>
                <p className="text-[10px] text-gray-600 font-sans">
                  Control de Almacén Frigorífico — Producto No Conforme (PNC)
                </p>
              </div>
              <div className="sm:text-right border border-black bg-gray-50 p-2 sm:p-2.5 shrink-0 rounded-xs min-w-[200px]">
                <span className="block text-[10px] font-black uppercase text-gray-600">
                  {isOrder ? 'COMPROBANTE DE PEDIDO DE VENTA' : 'COMPROBANTE DE SOLICITUD DE MUESTRAS'}
                </span>
                <span className="block text-base sm:text-lg font-black font-mono text-black">
                  {orderFolio}
                </span>
                <span className="inline-block mt-0.5 px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-500 rounded-xs">
                  ✓ SALIDA DE ALMACÉN AUTORIZADA
                </span>
              </div>
            </div>
          </div>

          {/* Core Required Metadata Grid: Telemarketing, Vendedor, Cliente, Folio, Horas */}
          <div className="bg-[#FAF9F6] border-2 border-black p-3.5 rounded-xs space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* 1. Cliente */}
              <div className="border-b sm:border-b-0 sm:border-r border-gray-300 pb-2 sm:pb-0 sm:pr-2">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">
                  Cliente / Destino:
                </span>
                <span className="text-sm font-black text-black block truncate" title={clientName}>
                  {clientName}
                </span>
                <span className="text-[10px] text-gray-600 font-sans block">
                  Motivo: <strong>{reservation.reason}</strong>
                </span>
              </div>

              {/* 2. Vendedor / Desarrollador */}
              <div className="border-b sm:border-b-0 sm:border-r border-gray-300 pb-2 sm:pb-0 sm:pr-2">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">
                  Vendedor / Solicitante:
                </span>
                <span className="text-sm font-black text-black block truncate" title={sellerName}>
                  {sellerName}
                </span>
                {reservation.developerZone && (
                  <span className="text-[10px] text-gray-600 font-sans block">
                    Zona: <strong>{reservation.developerZone}</strong>
                  </span>
                )}
              </div>

              {/* 3. Telemarketing Responsable */}
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 block">
                  Atención Telemarketing:
                </span>
                <span className="text-sm font-black text-black block truncate" title={telemarketingName}>
                  {telemarketingName}
                </span>
                <span className="text-[10px] text-emerald-800 font-bold block">
                  Estado: Aprobado y Despachado
                </span>
              </div>
            </div>

            {/* Timestamps Row: Hora que se generó el pedido vs Hora de salida de almacén */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-black/20 text-xs">
              <div className="bg-white border border-gray-300 p-2 rounded-xs flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase block leading-tight">
                    Hora en que se Generó el Pedido:
                  </span>
                  <span className="font-black text-xs text-black">
                    {orderCreated.date} a las {orderCreated.time}
                  </span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-400 p-2 rounded-xs flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block leading-tight">
                    Hora de Salida de Almacén (Despacho Físico):
                  </span>
                  <span className="font-black text-xs text-emerald-950">
                    {warehouseDischarged.date} a las {warehouseDischarged.time}
                  </span>
                </div>
              </div>
            </div>

            {reservation.notes && (
              <div className="pt-1 text-[11px] text-gray-700 bg-amber-50/70 p-2 border border-amber-200 rounded-xs">
                <strong>Instrucciones / Notas Especiales:</strong> {reservation.notes}
              </div>
            )}
          </div>

          {/* Merchandise Detail Table */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="font-black text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
                <Package className="w-4 h-4 text-black" />
                <span>Desglose de Cajas y Pesaje de Salida (PNC)</span>
              </h4>
              <span className="text-[10px] font-bold text-gray-600 uppercase">
                Almacén: Congelado (-18°C)
              </span>
            </div>

            <table className="w-full text-left border-collapse border border-black text-[11px]">
              <thead>
                <tr className="bg-gray-200 border-b border-black text-black">
                  <th className="p-1.5 border-r border-black w-8 text-center">#</th>
                  <th className="p-1.5 border-r border-black font-black uppercase w-28">ID Etiqueta (LBL)</th>
                  <th className="p-1.5 border-r border-black font-black uppercase w-20">Código</th>
                  <th className="p-1.5 border-r border-black font-black uppercase">Descripción del Producto</th>
                  <th className="p-1.5 border-r border-black font-black uppercase w-24">Lote</th>
                  <th className="p-1.5 font-black uppercase text-right w-24">Peso Neto</th>
                </tr>
              </thead>
              <tbody>
                {reservation.items && reservation.items.length > 0 ? (
                  reservation.items.map((item, index) => {
                    const subInfo = reservation.substitutions?.find(
                      (s) => s.substitutedWithLabelId === item.labelId
                    );
                    return (
                      <tr key={index} className={`border-b border-gray-300 hover:bg-gray-50 ${subInfo ? 'bg-amber-50/60' : ''}`}>
                        <td className="p-1.5 border-r border-black text-center font-bold text-gray-500">
                          {index + 1}
                        </td>
                        <td className="p-1.5 border-r border-black font-mono font-black text-black">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span>{item.labelId}</span>
                            {subInfo && (
                              <span className="text-[9px] bg-amber-200 text-amber-950 font-bold px-1 rounded-xs border border-amber-400">
                                🔄 SUSTITUTA
                              </span>
                            )}
                          </div>
                          {subInfo && (
                            <span className="text-[9px] text-gray-600 font-sans block">
                              Reemplazó a: <strong className="font-mono">{subInfo.originalLabelId}</strong>
                            </span>
                          )}
                        </td>
                        <td className="p-1.5 border-r border-black font-mono font-bold text-gray-700">
                          {item.productCode}
                        </td>
                        <td className="p-1.5 border-r border-black font-bold text-gray-900 truncate max-w-xs">
                          {item.productName}
                        </td>
                        <td className="p-1.5 border-r border-black font-mono text-gray-700">
                          {item.lot}
                        </td>
                        <td className="p-1.5 font-mono font-black text-right text-black">
                          {formatWeight(item.weight)} {item.unit || 'KG'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-3 text-center text-gray-500 italic">
                      {totalItems} caja(s) registradas con un peso total de {formatWeight(totalWeight)} KG.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-black border-t-2 border-black text-xs">
                  <td colSpan={4} className="p-2 border-r border-black text-right uppercase">
                    Totales Despachados:
                  </td>
                  <td className="p-2 border-r border-black font-mono text-center">
                    {totalItems} Cajas
                  </td>
                  <td className="p-2 font-mono text-right text-black text-sm">
                    {formatWeight(totalWeight)} KG
                  </td>
                </tr>
                {reservation.originalTotalWeight && reservation.originalTotalWeight !== totalWeight && (
                  <tr className="bg-amber-50 font-bold border-t border-gray-300 text-[10px] text-gray-700">
                    <td colSpan={4} className="p-1.5 border-r border-black text-right">
                      Peso Solicitado Originalmente: <span className="font-mono">{formatWeight(reservation.originalTotalWeight)} KG</span> | Variación Neta por Sustituciones:
                    </td>
                    <td colSpan={2} className="p-1.5 font-mono text-right font-black text-amber-900">
                      {(totalWeight - reservation.originalTotalWeight) >= 0 ? '+' : ''}
                      {formatWeight(totalWeight - reservation.originalTotalWeight)} KG
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          {/* Official Substitutions Section if order has substitutions */}
          {reservation.substitutions && reservation.substitutions.length > 0 && (
            <div className="border-2 border-amber-500 bg-amber-50/50 p-3 rounded-xs space-y-2">
              <div className="flex items-center justify-between border-b border-amber-300 pb-1.5">
                <h4 className="font-black text-xs uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-amber-700" />
                  <span>Registro Oficial de Sustituciones en Almacén ({reservation.substitutions.length} cajas)</span>
                </h4>
                <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-xs border border-amber-400">
                  Operador de Embarque
                </span>
              </div>

              <p className="text-[10px] text-amber-900 font-sans">
                Por no encontrarse físicamente en congelador las cajas originalmente solicitadas, se realizaron las siguientes sustituciones autorizadas para surtir la orden:
              </p>

              <table className="w-full text-left border-collapse border border-amber-400 text-[10px] bg-white">
                <thead>
                  <tr className="bg-amber-100/80 border-b border-amber-400 text-amber-950 font-black uppercase">
                    <th className="p-1 border-r border-amber-400 text-center w-6">#</th>
                    <th className="p-1 border-r border-amber-400 w-44">Caja Original (No Encontrada)</th>
                    <th className="p-1 border-r border-amber-400 w-44">Caja Sustituta Escaneada</th>
                    <th className="p-1 border-r border-amber-400 text-right w-20">Dif. Peso</th>
                    <th className="p-1 border-r border-amber-400">Motivo / Justificación</th>
                    <th className="p-1 w-28">Operador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-200">
                  {reservation.substitutions.map((sub, sIdx) => {
                    const diff = sub.weightDifference ?? Number((sub.substitutedWithWeight - sub.originalWeight).toFixed(2));
                    return (
                      <tr key={sIdx} className="hover:bg-amber-50/40">
                        <td className="p-1 border-r border-amber-400 text-center font-bold text-gray-500">
                          {sIdx + 1}
                        </td>
                        <td className="p-1 border-r border-amber-400">
                          <span className="font-mono font-black text-rose-900 block leading-tight">
                            {sub.originalLabelId}
                          </span>
                          <span className="text-[9px] text-gray-700 block truncate font-sans">
                            {sub.originalProductName}
                          </span>
                          <span className="text-[9px] text-gray-500 block font-sans">
                            Lote: <strong className="font-mono">{sub.originalLot}</strong> | <strong>{formatWeight(sub.originalWeight)} KG</strong>
                          </span>
                        </td>
                        <td className="p-1 border-r border-amber-400">
                          <span className="font-mono font-black text-emerald-900 block leading-tight">
                            {sub.substitutedWithLabelId}
                          </span>
                          <span className="text-[9px] text-gray-800 block truncate font-sans font-bold">
                            {sub.substitutedWithProductName}
                          </span>
                          <span className="text-[9px] text-gray-600 block font-sans">
                            Lote: <strong className="font-mono">{sub.substitutedWithLot}</strong> | <strong className="text-emerald-950">{formatWeight(sub.substitutedWithWeight)} KG</strong>
                          </span>
                        </td>
                        <td className="p-1 border-r border-amber-400 text-right font-mono font-black text-gray-900">
                          <span className={diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-gray-700'}>
                            {diff >= 0 ? `+${formatWeight(diff)}` : formatWeight(diff)} KG
                          </span>
                        </td>
                        <td className="p-1 border-r border-amber-400 text-gray-700 font-sans">
                          {sub.reason || 'Caja física no localizada en rack / Sustitución por stock equivalente'}
                        </td>
                        <td className="p-1 font-mono text-[9px] text-gray-600 truncate" title={sub.substitutedBy}>
                          {sub.substitutedBy || 'Operador Embarque'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="bg-amber-100/70 p-1.5 border border-amber-300 text-[9px] text-amber-950 rounded-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>
                  <strong>Aviso de inventario:</strong> Las cajas no encontradas ({reservation.substitutions.map(s => s.originalLabelId).join(', ')}) cambiaron automáticamente su estatus a <strong>DISPONIBLES en stock</strong> para posterior ubicación física o recuento.
                </span>
              </div>
            </div>
          )}

          {/* Certification & Audit Notice */}
          <div className="bg-gray-50 border border-gray-300 p-2.5 rounded-xs text-[10px] text-gray-700 space-y-1">
            <p className="flex items-center gap-1 font-bold text-black uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Garantía de Descuento de Inventario y Trazabilidad PNC</span>
            </p>
            <p className="font-sans leading-tight text-gray-600">
              El presente documento certifica que el producto arriba detallado ha sido verificado, escaneado y descontado formalmente del stock activo de Almacén Congelado. Los sellos de calidad y registro de folio son únicos para esta orden.
              {reservation.substitutions && reservation.substitutions.length > 0 && (
                <strong className="block mt-0.5 text-amber-950">
                  * Contiene registro oficial de {reservation.substitutions.length} sustitución(es) de cajas autorizadas en almacén; las cajas no encontradas fueron devueltas a disponibilidad de stock.
                </strong>
              )}
            </p>
          </div>

          {/* Required Signature Boxes */}
          <div className="pt-6 border-t-2 border-black grid grid-cols-4 gap-3 text-center text-[10px]">
            <div>
              <div className="border-b border-black mb-1 h-9"></div>
              <span className="font-black block uppercase text-black">Telemarketing</span>
              <span className="text-gray-600 truncate block">({telemarketingName})</span>
              <span className="text-[9px] text-gray-400">Autorización Pedido</span>
            </div>

            <div>
              <div className="border-b border-black mb-1 h-9"></div>
              <span className="font-black block uppercase text-black">Vendedor</span>
              <span className="text-gray-600 truncate block">({sellerName})</span>
              <span className="text-[9px] text-gray-400">Solicitante Comercial</span>
            </div>

            <div>
              <div className="border-b border-black mb-1 h-9"></div>
              <span className="font-black block uppercase text-black">Almacén / Embarque</span>
              <span className="text-gray-600 truncate block">
                ({reservation.dischargedBy || 'Personal Frigorífico'})
              </span>
              <span className="text-[9px] text-gray-400">Despachó y Descontó</span>
            </div>

            <div>
              <div className="border-b border-black mb-1 h-9"></div>
              <span className="font-black block uppercase text-black">Recibido Cliente</span>
              <span className="text-gray-600 truncate block">(Firma y Sello)</span>
              <span className="text-[9px] text-gray-400">Recepción Mercancía</span>
            </div>
          </div>

          {/* Footer Voucher Timestamp */}
          <div className="pt-2 border-t border-gray-300 flex items-center justify-between text-[9px] text-gray-500 font-sans">
            <span>Yoreme Cortes y Procesos — Sistema de Control ZPL y Almacenes PNC</span>
            <span>Folio: {orderFolio} | Impreso: {new Date().toLocaleString('es-MX')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

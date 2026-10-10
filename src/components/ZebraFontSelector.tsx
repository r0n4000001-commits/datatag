import React, { useState } from 'react';
import { Type, Check, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { ZebraFontId } from '../types';
import { ZEBRA_FONTS, getZebraFontOption } from '../utils/zebraFonts';

interface ZebraFontSelectorProps {
  label?: string;
  value?: ZebraFontId;
  onChange: (newFont: ZebraFontId) => void;
  previewText?: string;
  compact?: boolean;
}

export const ZebraFontSelector: React.FC<ZebraFontSelectorProps> = ({
  label = 'Tipo de Letra Zebra (ZPL)',
  value = '0' as ZebraFontId,
  onChange,
  previewText,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentFont = getZebraFontOption(value);

  // Quick shortcuts for most frequently used Zebra fonts
  const quickFonts: ZebraFontId[] = ['0', 'GS', 'D', 'E', 'G', 'F'];

  return (
    <div className="space-y-1.5 p-2 bg-gray-50 border border-gray-300 rounded-xs">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#141414] flex items-center gap-1">
          <Type className="w-3 h-3 text-amber-600" />
          <span>{label}</span>
        </label>
        <span className="font-mono text-[9px] font-black px-1.5 py-0.2 bg-black text-amber-300 rounded-xs">
          {currentFont.zplCode}
        </span>
      </div>

      {/* Main Trigger / Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left p-2 bg-white border border-[#141414] hover:border-amber-600 transition-colors flex items-center justify-between cursor-pointer shadow-2xs"
        >
          <div className="flex flex-col min-w-0 pr-2">
            <span
              style={{
                fontFamily: currentFont.cssFamily,
                fontWeight: currentFont.cssWeight as any,
                letterSpacing: currentFont.cssLetterSpacing,
              }}
              className="text-xs text-[#141414] truncate font-bold"
            >
              {currentFont.name}
            </span>
            <span className="text-[9px] text-gray-500 truncate">
              {currentFont.familyDescription}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 text-gray-700">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {/* Dropdown Options */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-[#141414] shadow-xl max-h-64 overflow-y-auto divide-y divide-gray-200">
            <div className="p-1.5 bg-gray-100 text-[9px] font-bold text-gray-600 uppercase flex items-center justify-between">
              <span>Fuentes Residentes en Firmware Zebra (ZPL II)</span>
              <span className="text-amber-700 font-mono">9 Opciones</span>
            </div>
            {ZEBRA_FONTS.map((font) => {
              const isSelected = font.id === (value || '0');
              const displaySample = previewText ? previewText.slice(0, 20) : font.sampleText;

              return (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => {
                    onChange(font.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2 transition-colors flex items-center justify-between cursor-pointer ${
                    isSelected ? 'bg-amber-50 border-l-4 border-amber-600' : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#141414]">{font.name}</span>
                      <span className="font-mono text-[9px] font-bold px-1 bg-gray-200 text-gray-800 rounded-xs">
                        {font.zplCode}
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-500 line-clamp-1 mt-0.5">
                      {font.familyDescription}
                    </div>
                    {/* Live Preview Sample */}
                    <div
                      style={{
                        fontFamily: font.cssFamily,
                        fontWeight: font.cssWeight as any,
                        letterSpacing: font.cssLetterSpacing,
                      }}
                      className="text-xs font-bold text-black mt-1 bg-white/80 px-1.5 py-0.5 border border-dashed border-gray-300 inline-block uppercase"
                    >
                      {displaySample}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="shrink-0 text-amber-600 font-bold flex items-center gap-0.5 text-[10px]">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick shortcuts pills */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <span className="text-[9px] text-gray-500 font-bold flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-2.5 text-amber-600" /> Rápidos:
          </span>
          {quickFonts.map((fid) => {
            const f = getZebraFontOption(fid);
            const isSel = (value || '0') === fid;
            return (
              <button
                key={fid}
                type="button"
                onClick={() => onChange(fid)}
                className={`text-[9px] font-mono px-1.5 py-0.5 border cursor-pointer transition-colors ${
                  isSel
                    ? 'bg-amber-400 font-black border-black text-black shadow-2xs'
                    : 'bg-white hover:bg-gray-200 text-gray-700 border-gray-300'
                }`}
                title={`${f.name} (${f.zplCode})`}
              >
                {f.zplCode} {fid === '0' ? 'Sans' : fid === 'GS' ? 'Swiss' : fid === 'E' ? 'OCR-B' : fid === 'G' ? 'Heavy' : fid}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

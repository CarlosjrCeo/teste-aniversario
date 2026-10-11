import React, { useState } from 'react';
import { PartySettings } from '../types.js';
import { Share2, Check, ArrowLeft, LogOut, Calendar } from 'lucide-react';

interface NavbarProps {
  settings: PartySettings;
  isAdmin: boolean;
  onExitAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  isAdmin,
  onExitAdmin,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      const url = window.location.origin + window.location.pathname;
      if (navigator.share) {
        await navigator.share({
          title: settings.title,
          text: `Confirme sua presença no evento: ${settings.title}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // User cancelled or unsupported
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#F9F7F4]/95 backdrop-blur-md border-b border-[#EADCCF]/80 transition-all shadow-xs">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand / Logo reflecting Lalo & Sassá */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#DC4E3E] text-white flex items-center justify-center font-black text-sm shadow-sm">
            <span>LS</span>
          </div>
          <div>
            <span className="font-extrabold text-[#2A2422] tracking-tight text-base sm:text-lg block leading-tight font-serif">
              Lalo &amp; Sassá
            </span>
            <span className="text-[11px] text-[#A66155] font-semibold block uppercase tracking-wider">
              {isAdmin ? 'Painel do Anfitrião' : 'Save the Date • RSVP'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isAdmin ? (
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DECBC0] bg-white/80 hover:bg-white text-[#5C453F] text-xs font-semibold transition cursor-pointer shadow-2xs"
              title="Copiar link do convite"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Link Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[#DC4E3E]" />
                  <span>Compartilhar Convite</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onExitAdmin}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#DC4E3E] hover:bg-[#C84032] text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Convite</span>
              </button>

              <button
                onClick={onExitAdmin}
                title="Sair do painel administrativo"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import { FamilyGroup, PartySettings } from '../types.js';
import { formatShortDate } from '../utils/helpers.js';
import { X, Send, Copy, Check, MessageSquare, ExternalLink } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  family: FamilyGroup | null;
  settings: PartySettings;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  family,
  settings,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !family) return null;

  const directLink = `${window.location.origin}${window.location.pathname}?familia=${family.id}`;

  const messageText = `Olá, ${family.familyName}! 🎉\n\nEstamos muito felizes em convidar vocês para: *${settings.title}*!\n\n📅 *Data:* ${formatShortDate(settings.eventDate)} às ${settings.eventTime}h\n📍 *Local:* ${settings.locationName} (${settings.address})\n\nPor favor, confirmem a presença da família acessando este link exclusivo:\n👉 ${directLink}\n\nEsperamos vocês com muito carinho! ❤️`;

  const cleanPhone = (family.phone || '').replace(/\D/g, '');
  const waUrl = cleanPhone
    ? `https://wa.me/55${cleanPhone.replace(/^55/, '')}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // copy fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Convite WhatsApp</h3>
              <p className="text-xs text-slate-500">Para: {family.familyName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Mensagem personalizada pronta para envio:
          </label>
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-xs sm:text-sm text-slate-800 whitespace-pre-line font-sans leading-relaxed">
            {messageText}
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Link direto da família:
          </label>
          <input
            type="text"
            readOnly
            value={directLink}
            className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 select-all"
          />
        </div>

        <div className="flex items-center gap-3 pt-5 border-t border-slate-100 mt-5">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Mensagem Copiada!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copiar Mensagem</span>
              </>
            )}
          </button>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Send className="w-4 h-4" />
            <span>Abrir no WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { PartySettings } from '../types.js';
import { uploadHeroImage } from '../api.js';
import { X, Settings, RefreshCw, Key, MapPin, Calendar, Clock, Image, Upload, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PartySettings;
  onSave: (settings: Partial<PartySettings>) => Promise<void>;
  onResetDemo: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onResetDemo,
}) => {
  const [formData, setFormData] = useState<PartySettings>({ ...settings });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      if (base64) {
        try {
          const uploadedUrl = await uploadHeroImage(base64);
          setFormData((prev) => ({ ...prev, heroImageUrl: uploadedUrl }));
          setMessage('Arte do convite carregada com sucesso!');
        } catch {
          setMessage('Erro ao enviar imagem.');
        } finally {
          setIsUploadingImage(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    try {
      await onSave(formData);
      setMessage('Configurações salvas com sucesso!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch {
      setMessage('Erro ao salvar alterações.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Tem certeza que deseja restaurar os dados de exemplo? As confirmações atuais serão resetadas para o exemplo.')) {
      setIsResetting(true);
      try {
        await onResetDemo();
        onClose();
      } catch {
        alert('Erro ao restaurar dados.');
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Configurações da Festa</h3>
              <p className="text-xs text-slate-500">Altere informações do evento, arte e PIN</p>
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

        {message && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* UPLOAD EXACT HERO PNG */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Image className="w-4 h-4 text-amber-700" />
                <span>Arte do Convite (Hero PNG)</span>
              </label>
              {formData.heroImageUrl && (
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> Imagem ativa
                </span>
              )}
            </div>
            <p className="text-xs text-amber-900/80">
              Selecione o arquivo <strong>Hero Carlos e Zé.png</strong> do seu computador para exibir exatamente a sua imagem:
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="py-2 px-3.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploadingImage ? 'Carregando...' : 'Selecionar Arquivo PNG'}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageFile}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome do Evento / Festa *
            </label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E05341]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Subtítulo / Mensagem
            </label>
            <textarea
              rows={2}
              name="subtitle"
              value={formData.subtitle}
              onChange={handleChange}
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E05341]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#E05341]" />
                <span>Data do Evento</span>
              </label>
              <input
                type="date"
                name="eventDate"
                required
                value={formData.eventDate}
                onChange={handleChange}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E05341]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#E05341]" />
                <span>Horário</span>
              </label>
              <input
                type="time"
                name="eventTime"
                required
                value={formData.eventTime}
                onChange={handleChange}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E05341]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Data Limite para Confirmar (RSVP)
              </label>
              <input
                type="date"
                name="deadlineDate"
                value={formData.deadlineDate}
                onChange={handleChange}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E05341]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>PIN do Admin</span>
              </label>
              <input
                type="text"
                name="adminPin"
                required
                value={formData.adminPin}
                onChange={handleChange}
                placeholder="Ex: 1234"
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E05341] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>Nome do Local</span>
            </label>
            <input
              type="text"
              name="locationName"
              value={formData.locationName}
              onChange={handleChange}
              placeholder="Ex: Buffet Estrela Azul"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E05341]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Endereço Completo
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Rua, Número, Bairro, Cidade - UF"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E05341]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Link do Google Maps (Opcional)
            </label>
            <input
              type="url"
              name="mapsUrl"
              value={formData.mapsUrl || ''}
              onChange={handleChange}
              placeholder="https://maps.google.com/..."
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E05341]"
            />
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>

        {/* Demo reset section */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            <span>Deseja recarregar os dados de exemplo?</span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Restaurar Demonstração</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, FileText, UploadCloud, AlertCircle } from 'lucide-react';

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (text: string) => Promise<void>;
}

export const BatchImportModal: React.FC<BatchImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [inputText, setInputText] = useState(
`Família Ferreira: Marcos Ferreira, Laura Ferreira, Enzo Ferreira
Família Barbosa: Thiago Barbosa, Rafaela Barbosa
Guilherme Mendes, Letícia Mendes
Família Castro: Felipe Castro, Mariana Castro, Luísa Castro, Lucas Castro`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setError('Cole pelo menos uma linha de convidados.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onImport(inputText);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao importar famílias.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Importar Famílias em Lote</h3>
              <p className="text-xs text-slate-500">Cole múltiplos convidados de uma vez</p>
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

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
          <div className="font-bold text-slate-800 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-purple-600" />
            <span>Formatos aceitos (um por linha):</span>
          </div>
          <p className="font-mono text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
            Nome da Família: Nome 1, Nome 2, Nome 3<br />
            ou simplesmente: Nome 1, Nome 2, Nome 3
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <textarea
              rows={8}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Cole sua lista aqui..."
              className="w-full text-xs sm:text-sm font-mono p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
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
              className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Importando...' : 'Importar Lista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

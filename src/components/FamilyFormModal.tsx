import React, { useState, useEffect } from 'react';
import { FamilyGroup } from '../types.js';
import { X, Plus, Trash2, Users, User, Baby, Sparkles } from 'lucide-react';

interface FamilyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (familyData: {
    familyName: string;
    phone?: string;
    isSolo?: boolean;
    members: { id?: string; name: string; isChild?: boolean; isAttending?: boolean | null }[];
  }) => Promise<void>;
  editingFamily?: FamilyGroup | null;
  defaultMode?: 'solo' | 'family';
}

export const FamilyFormModal: React.FC<FamilyFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingFamily,
  defaultMode = 'family',
}) => {
  // Mode: 'solo' (convidado avulso) vs 'family' (família com acompanhantes)
  const [mode, setMode] = useState<'solo' | 'family'>(defaultMode);

  // Solo fields
  const [soloName, setSoloName] = useState('');
  const [soloPhone, setSoloPhone] = useState('');
  const [soloIsChild, setSoloIsChild] = useState(false);

  // Family fields
  const [familyName, setFamilyName] = useState('');
  const [familyPhone, setFamilyPhone] = useState('');
  const [members, setMembers] = useState<{ id?: string; name: string; isChild: boolean; isAttending: boolean | null }[]>([
    { name: '', isChild: false, isAttending: null },
    { name: '', isChild: false, isAttending: null },
  ]);

  const [quickPaste, setQuickPaste] = useState('');
  const [showQuickPaste, setShowQuickPaste] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingFamily) {
      if (editingFamily.isSolo || editingFamily.members.length === 1) {
        setMode('solo');
        setSoloName(editingFamily.members[0]?.name || editingFamily.familyName);
        setSoloPhone(editingFamily.phone || '');
        setSoloIsChild(Boolean(editingFamily.members[0]?.isChild));
      } else {
        setMode('family');
        setFamilyName(editingFamily.familyName);
        setFamilyPhone(editingFamily.phone || '');
        setMembers(
          editingFamily.members.map((m) => ({
            id: m.id,
            name: m.name,
            isChild: Boolean(m.isChild),
            isAttending: m.isAttending,
          }))
        );
      }
    } else {
      setMode(defaultMode);
      setSoloName('');
      setSoloPhone('');
      setSoloIsChild(false);
      setFamilyName('');
      setFamilyPhone('');
      setMembers([
        { name: '', isChild: false, isAttending: null },
        { name: '', isChild: false, isAttending: null },
      ]);
    }
    setQuickPaste('');
    setShowQuickPaste(false);
    setError('');
  }, [editingFamily, isOpen, defaultMode]);

  if (!isOpen) return null;

  const handleAddMember = () => {
    setMembers((prev) => [...prev, { name: '', isChild: false, isAttending: null }]);
  };

  const handleRemoveMember = (index: number) => {
    if (members.length <= 1) {
      setError('A família precisa ter ao menos um integrante.');
      return;
    }
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, name: string) => {
    const updated = [...members];
    updated[index].name = name;
    setMembers(updated);
  };

  const handleToggleChild = (index: number) => {
    const updated = [...members];
    updated[index].isChild = !updated[index].isChild;
    setMembers(updated);
  };

  const handleApplyQuickPaste = () => {
    const names = quickPaste
      .split(/[,;\n]/)
      .map((n) => n.trim())
      .filter(Boolean);

    if (names.length > 0) {
      setMembers(names.map((name) => ({ name, isChild: false, isAttending: null })));
      setShowQuickPaste(false);
      setQuickPaste('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (mode === 'solo') {
        if (!soloName.trim()) {
          setError('O nome do convidado é obrigatório.');
          setIsSubmitting(false);
          return;
        }

        await onSave({
          familyName: soloName.trim(),
          phone: soloPhone.trim() || undefined,
          isSolo: true,
          members: [
            {
              id: editingFamily?.members[0]?.id,
              name: soloName.trim(),
              isChild: soloIsChild,
              isAttending: editingFamily ? editingFamily.members[0]?.isAttending : null,
            },
          ],
        });
      } else {
        if (!familyName.trim()) {
          setError('O nome da família ou grupo é obrigatório.');
          setIsSubmitting(false);
          return;
        }

        const validMembers = members
          .map((m) => ({ ...m, name: m.name.trim() }))
          .filter((m) => m.name.length > 0);

        if (validMembers.length === 0) {
          setError('Informe o nome de pelo menos uma pessoa para a família.');
          setIsSubmitting(false);
          return;
        }

        await onSave({
          familyName: familyName.trim(),
          phone: familyPhone.trim() || undefined,
          isSolo: false,
          members: validMembers,
        });
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar convidado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">
              {editingFamily ? 'Editar Convidado / Família' : 'Adicionar Convidado'}
            </h3>
            <p className="text-xs text-slate-500">
              Escolha se é um convidado avulso ou um grupo familiar com acompanhantes
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Convidado Avulso vs Família) */}
        {!editingFamily && (
          <div className="grid grid-cols-2 gap-2 mt-4 p-1 rounded-2xl bg-slate-100">
            <button
              type="button"
              onClick={() => setMode('solo')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'solo'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5 text-[#E05341]" />
              <span>Convidado Avulso (Sem Família)</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('family')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'family'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Família com Acompanhantes</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* MODE 1: CONVIDADO AVULSO */}
          {mode === 'solo' ? (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nome Completo do Convidado *
                </label>
                <input
                  type="text"
                  required
                  value={soloName}
                  onChange={(e) => setSoloName(e.target.value)}
                  placeholder="Ex: Carlos Silva, Roberto Lima, etc."
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E05341]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Telefone / WhatsApp (Opcional)
                </label>
                <input
                  type="text"
                  value={soloPhone}
                  onChange={(e) => setSoloPhone(e.target.value)}
                  placeholder="Ex: 11987654321"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E05341]"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Baby className="w-4 h-4 text-amber-600" />
                  <span>Este convidado é criança?</span>
                </span>
                <input
                  type="checkbox"
                  checked={soloIsChild}
                  onChange={(e) => setSoloIsChild(e.target.checked)}
                  className="w-4 h-4 rounded text-[#E05341] focus:ring-[#E05341] cursor-pointer"
                />
              </div>
            </div>
          ) : (
            /* MODE 2: FAMÍLIA COM ACOMPANHANTES */
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nome da Família ou Grupo *
                </label>
                <input
                  type="text"
                  required
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="Ex: Família Silva, Casal Oliveira..."
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E05341]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Telefone / WhatsApp do Responsável (Opcional)
                </label>
                <input
                  type="text"
                  value={familyPhone}
                  onChange={(e) => setFamilyPhone(e.target.value)}
                  placeholder="Ex: 11987654321"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E05341]"
                />
              </div>

              {/* Members List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Integrantes da Família ({members.length})
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowQuickPaste(!showQuickPaste)}
                    className="text-xs text-[#E05341] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{showQuickPaste ? 'Lista individual' : 'Colar vários'}</span>
                  </button>
                </div>

                {showQuickPaste && (
                  <div className="mb-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Cole os nomes separados por vírgula (ex: João Silva, Maria Silva, Pedro Silva):
                    </label>
                    <textarea
                      rows={2}
                      value={quickPaste}
                      onChange={(e) => setQuickPaste(e.target.value)}
                      placeholder="Nome 1, Nome 2, Nome 3..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleApplyQuickPaste}
                      className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                    >
                      Preencher Lista
                    </button>
                  </div>
                )}

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {members.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-5 text-center text-xs font-bold text-slate-400">
                        {idx + 1}.
                      </div>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => handleMemberChange(idx, e.target.value)}
                        placeholder={`Nome completo ${idx + 1}`}
                        className="flex-1 text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E05341]"
                      />

                      <button
                        type="button"
                        onClick={() => handleToggleChild(idx)}
                        title={member.isChild ? 'Marcado como criança' : 'Marcar como criança'}
                        className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 ${
                          member.isChild
                            ? 'bg-amber-100 border-amber-300 text-amber-800'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <Baby className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Criança</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveMember(idx)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddMember}
                  className="mt-2.5 w-full py-2 border-2 border-dashed border-[#E05341]/40 hover:border-[#E05341] text-[#E05341] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer bg-[#E05341]/5 hover:bg-[#E05341]/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Adicionar Outro Membro na Família</span>
                </button>
              </div>
            </div>
          )}

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
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#E05341] hover:bg-[#C84032] text-white font-bold text-sm transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : editingFamily ? 'Salvar Alterações' : 'Cadastrar Convidado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

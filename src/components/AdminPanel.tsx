import React, { useState, useMemo } from 'react';
import { PartySettings, FamilyGroup, GuestMember } from '../types.js';
import { normalizeText, formatShortDate } from '../utils/helpers.js';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  UploadCloud,
  FileSpreadsheet,
  Printer,
  Settings,
  Search,
  MessageSquare,
  Edit2,
  Trash2,
  Copy,
  Check,
  Baby,
  User,
  Heart,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Sparkles,
  Lock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  UserPlus
} from 'lucide-react';
import { FamilyFormModal } from './FamilyFormModal.js';
import { BatchImportModal } from './BatchImportModal.js';
import { SpreadsheetImportModal } from './SpreadsheetImportModal.js';
import { SettingsModal } from './SettingsModal.js';
import { WhatsAppModal } from './WhatsAppModal.js';
import { PrintView } from './PrintView.js';

interface AdminPanelProps {
  settings: PartySettings;
  families: FamilyGroup[];
  isUnlocked: boolean;
  onUnlock: () => void;
  onAddFamily: (familyName: string, members: { name: string; isChild?: boolean }[], phone?: string, isSolo?: boolean) => Promise<void>;
  onUpdateFamily: (id: string, updates: Partial<FamilyGroup>) => Promise<void>;
  onDeleteFamily: (id: string) => Promise<void>;
  onClearAllGuests: () => Promise<void>;
  onResetAllRsvps: () => Promise<void>;
  onSpreadsheetImport: (items: any[]) => Promise<void>;
  onUpdateSettings: (settings: Partial<PartySettings>) => Promise<void>;
  onBatchImport: (text: string) => Promise<void>;
  onResetDemo: () => Promise<void>;
  onExitAdmin: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  settings,
  families,
  isUnlocked,
  onUnlock,
  onAddFamily,
  onUpdateFamily,
  onDeleteFamily,
  onClearAllGuests,
  onResetAllRsvps,
  onSpreadsheetImport,
  onUpdateSettings,
  onBatchImport,
  onResetDemo,
  onExitAdmin,
}) => {
  // PIN Verification State
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Modals state
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [familyModalDefaultMode, setFamilyModalDefaultMode] = useState<'solo' | 'family'>('family');
  const [editingFamily, setEditingFamily] = useState<FamilyGroup | null>(null);
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [whatsAppFamily, setWhatsAppFamily] = useState<FamilyGroup | null>(null);
  const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'declined' | 'pending' | 'solo' | 'family'>('all');
  const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>({});
  const [copiedFamilyId, setCopiedFamilyId] = useState<string | null>(null);

  // Check PIN
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === (settings.adminPin || '1234')) {
      onUnlock();
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Toggle family card accordion
  const toggleAccordion = (id: string) => {
    setExpandedFamilies((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Stats calculation
  const stats = useMemo(() => {
    let totalGuests = 0;
    let confirmedGuests = 0;
    let declinedGuests = 0;
    let pendingGuests = 0;
    let confirmedChildren = 0;
    let totalFamilies = families.length;
    let soloCount = 0;

    families.forEach((fam) => {
      if (fam.isSolo || fam.members.length === 1) soloCount++;
      fam.members.forEach((m) => {
        totalGuests++;
        if (m.isAttending === true) {
          confirmedGuests++;
          if (m.isChild) confirmedChildren++;
        } else if (m.isAttending === false) {
          declinedGuests++;
        } else {
          pendingGuests++;
        }
      });
    });

    const confirmationRate = totalGuests > 0 ? Math.round((confirmedGuests / totalGuests) * 100) : 0;

    return {
      totalGuests,
      confirmedGuests,
      declinedGuests,
      pendingGuests,
      confirmedChildren,
      totalFamilies,
      soloCount,
      confirmationRate,
    };
  }, [families]);

  // Filtered families
  const filteredFamilies = useMemo(() => {
    const term = normalizeText(searchTerm);

    return families.filter((fam) => {
      // 1. Search term match
      const matchesSearch =
        !term ||
        normalizeText(fam.familyName).includes(term) ||
        fam.members.some((m) => normalizeText(m.name).includes(term));

      if (!matchesSearch) return false;

      // 2. Status filter
      if (statusFilter === 'all') return true;
      if (statusFilter === 'confirmed') {
        return fam.members.some((m) => m.isAttending === true);
      }
      if (statusFilter === 'declined') {
        return fam.members.some((m) => m.isAttending === false);
      }
      if (statusFilter === 'pending') {
        return fam.members.some((m) => m.isAttending === null);
      }
      if (statusFilter === 'solo') {
        return fam.isSolo || fam.members.length === 1;
      }
      if (statusFilter === 'family') {
        return !fam.isSolo && fam.members.length > 1;
      }
      return true;
    });
  }, [families, searchTerm, statusFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    const rows = [
      ['Tipo', 'Família / Grupo', 'Telefone', 'Nome do Convidado', 'Categoria', 'Presença', 'Restrições', 'Confirmado Por', 'Mensagem', 'Data Atualização'],
    ];

    families.forEach((fam) => {
      fam.members.forEach((m) => {
        let statusStr = 'Pendente';
        if (m.isAttending === true) statusStr = 'Confirmado (Vai)';
        if (m.isAttending === false) statusStr = 'Recusado (Não vai)';

        rows.push([
          fam.isSolo ? 'Avulso' : 'Família',
          fam.familyName,
          fam.phone || '',
          m.name,
          m.isChild ? 'Criança' : 'Adulto',
          statusStr,
          m.dietaryRestrictions || '',
          fam.confirmedBy || '',
          fam.message ? fam.message.replace(/[\n\r]+/g, ' ') : '',
          fam.lastUpdated ? formatShortDate(fam.lastUpdated.split('T')[0]) : '',
        ]);
      });
    });

    const csvContent = '\uFEFF' + rows.map((e) => e.map((val) => `"${val}"`).join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lista_convidados_${settings.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Direct Link for a family
  const handleCopyLink = async (famId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?familia=${famId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedFamilyId(famId);
      setTimeout(() => setCopiedFamilyId(null), 2000);
    } catch {
      // ignore
    }
  };

  // Quick toggle attendance of a member right from Admin
  const handleToggleMemberAttendance = async (famId: string, memberId: string, newStatus: boolean | null) => {
    const family = families.find((f) => f.id === famId);
    if (!family) return;

    const updatedMembers = family.members.map((m) => {
      if (m.id === memberId) {
        return { ...m, isAttending: newStatus };
      }
      return m;
    });

    await onUpdateFamily(famId, {
      members: updatedMembers,
      lastUpdated: new Date().toISOString(),
      confirmedBy: family.confirmedBy || 'Atualizado pelo Anfitrião',
    });
  };

  // Delete family with confirmation
  const handleDelete = async (famId: string, famName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir "${famName}" da lista?`)) {
      await onDeleteFamily(famId);
    }
  };

  // Delete ALL guests
  const handleClearAll = async () => {
    if (window.confirm('⚠️ ATENÇÃO: Tem certeza que deseja APAGAR TODOS OS CONVIDADOS da lista?\n\nEssa ação irá remover todas as famílias e convidados cadastrados.')) {
      await onClearAllGuests();
    }
  };

  // Reset ALL RSVPs to pending (start from zero)
  const handleResetRsvps = async () => {
    if (window.confirm('Deseja zerar todas as confirmações para recomeçar?\n\nOs nomes dos convidados serão mantidos, mas todas as respostas (Sim/Não) voltarão para o status "Pendente".')) {
      await onResetAllRsvps();
    }
  };

  // Open modal for Solo Guest
  const handleOpenAddSolo = () => {
    setEditingFamily(null);
    setFamilyModalDefaultMode('solo');
    setIsFamilyModalOpen(true);
  };

  // Open modal for Family
  const handleOpenAddFamily = () => {
    setEditingFamily(null);
    setFamilyModalDefaultMode('family');
    setIsFamilyModalOpen(true);
  };

  // If locked, render PIN screen
  if (!isUnlocked) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-xl border border-slate-100 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-rose-400 flex items-center justify-center mx-auto mb-4 shadow-md shadow-slate-900/10">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Acesso Restrito ao Anfitrião
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6">
            Digite o PIN de segurança para gerenciar a lista de convidados e ver as confirmações em tempo real.
          </p>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={8}
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="Digite o PIN (ex: 1234)"
                className="w-full text-center text-2xl tracking-widest font-mono py-3.5 px-4 rounded-2xl border-2 border-slate-200 focus:border-[#E05341] focus:outline-none focus:ring-4 focus:ring-[#E05341]/10 text-slate-900 bg-slate-50"
              />
              {pinError && (
                <p className="text-xs text-rose-600 font-semibold mt-2 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> PIN incorreto. Tente novamente.
                </p>
              )}
            </div>

            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-xs text-amber-800 text-left flex items-start gap-2">
              <KeyRound className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                <strong>Dica:</strong> O PIN padrão inicial é <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-amber-300">1234</span> (você pode alterá-lo nas configurações).
              </span>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onExitAdmin}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-sm transition cursor-pointer"
              >
                Voltar ao Convite
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Entrar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Print Mode
  if (isPrintViewOpen) {
    return (
      <PrintView
        families={families}
        settings={settings}
        onClose={() => setIsPrintViewOpen(false)}
      />
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-slate-50/70">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#E05341] uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Painel do Anfitrião</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {settings.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Gerencie seus convidados individuais e famílias, acompanhe quem vai e importe planilhas.
            </p>
          </div>

          {/* Action buttons toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Add solo guest */}
            <button
              onClick={handleOpenAddSolo}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
              title="Adicionar convidado avulso sem família"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>+ Convidado Avulso</span>
            </button>

            {/* Add family with members */}
            <button
              onClick={handleOpenAddFamily}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E05341] hover:bg-[#C84032] text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
              title="Adicionar família com múltiplos membros"
            >
              <Plus className="w-4 h-4" />
              <span>+ Família / Grupo</span>
            </button>

            {/* Import spreadsheet */}
            <button
              onClick={() => setIsSpreadsheetModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-bold transition cursor-pointer shadow-2xs"
              title="Importar planilha Excel (.xlsx, .csv)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Importar Planilha</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
              title="Baixar planilha CSV"
            >
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            {/* Print list */}
            <button
              onClick={() => setIsPrintViewOpen(true)}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition cursor-pointer"
              title="Imprimir lista de portaria"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Settings */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition cursor-pointer"
              title="Configurações da festa e PIN"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* KPI METRIC CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Confirmed Card (Vai) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-200 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Vão Comparecer
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              {stats.confirmedGuests}
              <span className="text-xs sm:text-sm font-semibold text-emerald-600 ml-2">
                ({stats.confirmationRate}%)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Inclui {stats.confirmedChildren} {stats.confirmedChildren === 1 ? 'criança' : 'crianças'}
            </p>
          </div>

          {/* Declined Card (Não vai) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                Não Poderão Ir
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              {stats.declinedGuests}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Respostas de recusa registradas
            </p>
          </div>

          {/* Pending Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                Aguardando Resposta
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              {stats.pendingGuests}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ainda não responderam o RSVP
            </p>
          </div>

          {/* Total Guests Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total de Convidados
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              {stats.totalGuests}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.totalFamilies} grupos ({stats.soloCount} avulsos)
            </p>
          </div>
        </div>

        {/* FUNCTIONAL CONTROLS: QUICK ACTIONS (RESET ALL, CLEAR ALL) & SEARCH */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome do convidado ou da família..."
                className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#E05341]"
              />
            </div>

            {/* Reset & Clear actions */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleResetRsvps}
                title="Zera todas as respostas (Sim/Não) para começar de novo, mantendo a lista de nomes"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                <span>Resetar Respostas</span>
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                title="Apaga todos os convidados e famílias da lista"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Apagar Todos</span>
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pt-2 border-t border-slate-100 pb-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos ({families.length})
            </button>
            <button
              onClick={() => setStatusFilter('confirmed')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'confirmed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Confirmados ({stats.confirmedGuests})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              Pendentes ({stats.pendingGuests})
            </button>
            <button
              onClick={() => setStatusFilter('declined')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'declined'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              Recusados ({stats.declinedGuests})
            </button>
            <button
              onClick={() => setStatusFilter('solo')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'solo'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              Avulsos ({stats.soloCount})
            </button>
            <button
              onClick={() => setStatusFilter('family')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'family'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-700 hover:bg-purple-50'
              }`}
            >
              Famílias ({families.length - stats.soloCount})
            </button>
          </div>
        </div>

        {/* FAMILIES & GUEST LIST CARDS */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            <span>Lista de Convidados Cadastrados ({filteredFamilies.length})</span>
            <span>Controle em Tempo Real</span>
          </div>

          {filteredFamilies.length > 0 ? (
            <div className="space-y-3">
              {filteredFamilies.map((family) => {
                const isExpanded = expandedFamilies[family.id] !== false; // default open
                const confirmedCount = family.members.filter((m) => m.isAttending === true).length;
                const declinedCount = family.members.filter((m) => m.isAttending === false).length;
                const pendingCount = family.members.filter((m) => m.isAttending === null).length;
                const totalCount = family.members.length;
                const isSolo = family.isSolo || totalCount === 1;

                return (
                  <div
                    key={family.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition overflow-hidden"
                  >
                    {/* Family Card Header */}
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isSolo ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {isSolo ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                              {family.familyName}
                            </h3>

                            {isSolo ? (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                                Convidado Avulso
                              </span>
                            ) : (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                                Família ({totalCount} pessoas)
                              </span>
                            )}
                          </div>

                          {!isSolo && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {family.members.map((m) => m.name).join(', ')}
                            </p>
                          )}

                          {family.phone && (
                            <span className="text-xs text-slate-400 block mt-0.5">
                              Tel: {family.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badges & Quick Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                        <div className="flex items-center gap-1.5 mr-2">
                          {confirmedCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {confirmedCount} Vai
                            </span>
                          )}
                          {declinedCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
                              <XCircle className="w-3.5 h-3.5" />
                              {declinedCount} Não vai
                            </span>
                          )}
                          {pendingCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                              <Clock className="w-3.5 h-3.5" />
                              {pendingCount} Pendente
                            </span>
                          )}
                        </div>

                        {/* WhatsApp Invite Button */}
                        <button
                          type="button"
                          onClick={() => setWhatsAppFamily(family)}
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                          title="Enviar convite pelo WhatsApp"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        {/* Copy Direct Link Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(family.id)}
                          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer"
                          title="Copiar link exclusivo"
                        >
                          {copiedFamilyId === family.id ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        {/* Edit Family Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFamily(family);
                            setFamilyModalDefaultMode(isSolo ? 'solo' : 'family');
                            setIsFamilyModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer"
                          title="Editar convidado ou membros"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(family.id, family.familyName)}
                          className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition cursor-pointer"
                          title="Excluir da lista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Accordion toggle */}
                        <button
                          type="button"
                          onClick={() => toggleAccordion(family.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Member interactive table */}
                    {isExpanded && (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 border-t border-slate-100 bg-slate-50/50">
                        <div className="space-y-2">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Marcar presença manualmente:
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {family.members.map((member) => (
                              <div
                                key={member.id}
                                className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-900 text-sm truncate">
                                      {member.name}
                                    </span>
                                    {member.isChild && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                        Criança
                                      </span>
                                    )}
                                  </div>
                                  {member.dietaryRestrictions && (
                                    <span className="text-[11px] text-emerald-700 block italic truncate">
                                      Restrição: {member.dietaryRestrictions}
                                    </span>
                                  )}
                                </div>

                                {/* Three state selector for Admin: Vai / Não Vai / Pendente */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMemberAttendance(family.id, member.id, true)}
                                    title="Marcar como Vai"
                                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                      member.isAttending === true
                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                    }`}
                                  >
                                    Vai
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleMemberAttendance(family.id, member.id, false)}
                                    title="Marcar como Não Vai"
                                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                      member.isAttending === false
                                        ? 'bg-rose-600 text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                                    }`}
                                  >
                                    Não
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleMemberAttendance(family.id, member.id, null)}
                                    title="Marcar como Pendente"
                                    className={`px-2 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                                      member.isAttending === null
                                        ? 'bg-amber-400 text-amber-950 shadow-2xs'
                                        : 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-700'
                                    }`}
                                  >
                                    ?
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Additional details: Message & Timestamp */}
                        {(family.message || family.confirmedBy || family.lastUpdated) && (
                          <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            {family.message ? (
                              <div className="flex items-center gap-1.5 text-slate-700">
                                <Heart className="w-3.5 h-3.5 text-[#E05341] shrink-0" />
                                <span className="italic">"{family.message}"</span>
                              </div>
                            ) : (
                              <span></span>
                            )}

                            <div className="text-[11px] text-slate-400 self-end sm:self-auto">
                              {family.confirmedBy && <span>Por: {family.confirmedBy} • </span>}
                              {family.lastUpdated && <span>Atualizado em: {formatShortDate(family.lastUpdated.split('T')[0])}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">Nenhum convidado na lista</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Adicione convidados avulsos, famílias completas ou importe sua planilha Excel diretamente.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={handleOpenAddSolo}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
                >
                  + Convidado Avulso
                </button>
                <button
                  onClick={handleOpenAddFamily}
                  className="px-3.5 py-2 rounded-xl bg-[#E05341] hover:bg-[#C84032] text-white font-bold text-xs transition cursor-pointer"
                >
                  + Família com Membros
                </button>
                <button
                  onClick={() => setIsSpreadsheetModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                >
                  Importar Planilha
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODALS */}
      <FamilyFormModal
        isOpen={isFamilyModalOpen}
        defaultMode={familyModalDefaultMode}
        onClose={() => {
          setIsFamilyModalOpen(false);
          setEditingFamily(null);
        }}
        editingFamily={editingFamily}
        onSave={async (famData) => {
          if (editingFamily) {
            await onUpdateFamily(editingFamily.id, {
              familyName: famData.familyName,
              phone: famData.phone,
              isSolo: famData.isSolo,
              members: famData.members.map((m, idx) => ({
                id: m.id || `m_${Date.now()}_${idx}`,
                name: m.name,
                isChild: m.isChild,
                isAttending: m.isAttending !== undefined ? m.isAttending : null,
              })),
            });
          } else {
            await onAddFamily(famData.familyName, famData.members, famData.phone, famData.isSolo);
          }
        }}
      />

      <SpreadsheetImportModal
        isOpen={isSpreadsheetModalOpen}
        onClose={() => setIsSpreadsheetModalOpen(false)}
        onImport={onSpreadsheetImport}
      />

      <BatchImportModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onImport={onBatchImport}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSave={onUpdateSettings}
        onResetDemo={onResetDemo}
      />

      <WhatsAppModal
        isOpen={!!whatsAppFamily}
        onClose={() => setWhatsAppFamily(null)}
        family={whatsAppFamily}
        settings={settings}
      />
    </div>
  );
};

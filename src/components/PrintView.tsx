import React from 'react';
import { FamilyGroup, PartySettings } from '../types.js';
import { formatDateBR } from '../utils/helpers.js';
import { Printer, ArrowLeft } from 'lucide-react';

interface PrintViewProps {
  families: FamilyGroup[];
  settings: PartySettings;
  onClose: () => void;
}

export const PrintView: React.FC<PrintViewProps> = ({
  families,
  settings,
  onClose,
}) => {
  // Flatten all confirmed and pending guests
  const allGuests = families.flatMap((fam) =>
    fam.members.map((m) => ({
      member: m,
      familyName: fam.familyName,
    }))
  ).sort((a, b) => a.member.name.localeCompare(b.member.name));

  const confirmedGuests = allGuests.filter((g) => g.member.isAttending === true);
  const pendingGuests = allGuests.filter((g) => g.member.isAttending === null);
  const declinedGuests = allGuests.filter((g) => g.member.isAttending === false);

  return (
    <div className="min-h-screen bg-white text-slate-900 p-8">
      {/* Non-printed action bar */}
      <div className="print:hidden mb-6 flex items-center justify-between bg-slate-100 p-4 rounded-2xl">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-semibold text-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Painel</span>
        </button>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm cursor-pointer shadow-sm"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Salvar em PDF</span>
        </button>
      </div>

      {/* Printable Sheet Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight">{settings.title}</h1>
        <p className="text-sm text-slate-600 mt-1">
          {formatDateBR(settings.eventDate)} às {settings.eventTime}h • {settings.locationName} ({settings.address})
        </p>
        <div className="flex gap-6 mt-3 text-xs font-bold text-slate-700 uppercase">
          <span>Total Confirmados: {confirmedGuests.length}</span>
          <span>Pendentes: {pendingGuests.length}</span>
          <span>Não comparecerão: {declinedGuests.length}</span>
          <span>Total na Lista: {allGuests.length}</span>
        </div>
      </div>

      {/* Confirmed Guests Checklist (Primary for Reception) */}
      <div className="mb-8">
        <h2 className="text-base font-bold uppercase tracking-wider mb-3 bg-slate-100 p-2 border-l-4 border-emerald-600">
          Convidados Confirmados ({confirmedGuests.length})
        </h2>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-300 font-bold text-slate-500 uppercase">
              <th className="py-2 px-2 w-10">Entrada</th>
              <th className="py-2 px-2">Nome do Convidado</th>
              <th className="py-2 px-2">Família / Grupo</th>
              <th className="py-2 px-2">Tipo</th>
              <th className="py-2 px-2">Restrições / Observações</th>
            </tr>
          </thead>
          <tbody>
            {confirmedGuests.map(({ member, familyName }) => (
              <tr key={member.id} className="border-b border-slate-200">
                <td className="py-2 px-2">
                  <div className="w-4 h-4 border-2 border-slate-400 rounded-sm"></div>
                </td>
                <td className="py-2 px-2 font-bold text-slate-900">{member.name}</td>
                <td className="py-2 px-2 text-slate-600">{familyName}</td>
                <td className="py-2 px-2">
                  {member.isChild ? (
                    <span className="font-semibold text-amber-700">Criança</span>
                  ) : (
                    <span className="text-slate-500">Adulto</span>
                  )}
                </td>
                <td className="py-2 px-2 text-slate-500 italic">
                  {member.dietaryRestrictions || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending Guests Section */}
      {pendingGuests.length > 0 && (
        <div className="mb-8 page-break-inside-avoid">
          <h2 className="text-base font-bold uppercase tracking-wider mb-3 bg-slate-100 p-2 border-l-4 border-amber-500">
            Convidados Aguardando Resposta ({pendingGuests.length})
          </h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-300 font-bold text-slate-500 uppercase">
                <th className="py-2 px-2 w-10">Entrada</th>
                <th className="py-2 px-2">Nome do Convidado</th>
                <th className="py-2 px-2">Família / Grupo</th>
                <th className="py-2 px-2">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {pendingGuests.map(({ member, familyName }) => (
                <tr key={member.id} className="border-b border-slate-200">
                  <td className="py-2 px-2">
                    <div className="w-4 h-4 border-2 border-slate-300 rounded-sm"></div>
                  </td>
                  <td className="py-2 px-2 font-medium text-slate-700">{member.name}</td>
                  <td className="py-2 px-2 text-slate-500">{familyName}</td>
                  <td className="py-2 px-2 text-slate-500">{member.isChild ? 'Criança' : 'Adulto'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

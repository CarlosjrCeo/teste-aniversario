import React, { useState, useEffect } from 'react';
import { PartySettings, FamilyGroup, GuestMember, RsvpSubmissionPayload } from '../types.js';
import { normalizeText, formatDateBR, createGoogleCalendarUrl } from '../utils/helpers.js';
import confetti from 'canvas-confetti';
import heroImg from '../assets/images/hero_carlos_jose.jpg';
import { uploadHeroImage } from '../api.js';
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  CheckCircle2,
  CalendarPlus,
  ExternalLink,
  Send,
  AlertCircle,
  Edit3,
  Check,
  X,
  Lock,
  ArrowRight,
  Heart,
  Upload,
  Camera
} from 'lucide-react';

interface GuestViewProps {
  settings: PartySettings;
  families: FamilyGroup[];
  onConfirmRsvp: (payload: RsvpSubmissionPayload) => Promise<void>;
  onOpenAdmin: () => void;
}

export const GuestView: React.FC<GuestViewProps> = ({
  settings,
  families,
  onConfirmRsvp,
  onOpenAdmin,
}) => {
  // Input search name
  const [typedName, setTypedName] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Search results
  const [matchedResults, setMatchedResults] = useState<{ family: FamilyGroup; matchedMember: GuestMember }[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<FamilyGroup | null>(null);
  const [identifiedGuest, setIdentifiedGuest] = useState<GuestMember | null>(null);

  // Form attendance state
  const [memberAttendance, setMemberAttendance] = useState<Record<string, boolean>>({});
  const [memberDiet, setMemberDiet] = useState<Record<string, string>>({});
  const [confirmedByName, setConfirmedByName] = useState('');
  const [guestMessage, setGuestMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-check query params for direct family link (e.g., ?familia=fam_1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const familyParam = params.get('familia') || params.get('family');
    const nameParam = params.get('nome') || params.get('name');

    if (familyParam) {
      const match = families.find((f) => f.id === familyParam);
      if (match) {
        selectFamilyForRsvp(match, match.members[0]);
      }
    } else if (nameParam) {
      setTypedName(nameParam);
      executeSearch(nameParam);
    }
  }, [families]);

  // Execute Search by name
  const executeSearch = (nameToSearch?: string) => {
    const query = normalizeText(nameToSearch !== undefined ? nameToSearch : typedName);
    setHasSearched(true);
    setErrorMessage('');

    if (!query || query.length < 2) {
      setMatchedResults([]);
      return;
    }

    const matches: { family: FamilyGroup; matchedMember: GuestMember }[] = [];

    families.forEach((fam) => {
      fam.members.forEach((m) => {
        const normMemberName = normalizeText(m.name);
        if (normMemberName.includes(query) || query.includes(normMemberName)) {
          matches.push({ family: fam, matchedMember: m });
        }
      });
    });

    setMatchedResults(matches);

    // If exactly 1 match, auto-open that family
    if (matches.length === 1) {
      selectFamilyForRsvp(matches[0].family, matches[0].matchedMember);
    } else {
      setSelectedFamily(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  // Open family attendance box
  const selectFamilyForRsvp = (family: FamilyGroup, specificMember?: GuestMember) => {
    setSelectedFamily(family);
    setIdentifiedGuest(specificMember || family.members[0]);
    setSubmitSuccess(false);
    setErrorMessage('');

    const attendance: Record<string, boolean> = {};
    const diets: Record<string, string> = {};

    family.members.forEach((m) => {
      attendance[m.id] = m.isAttending !== null ? m.isAttending : true;
      diets[m.id] = m.dietaryRestrictions || '';
    });

    setMemberAttendance(attendance);
    setMemberDiet(diets);
    setConfirmedByName(specificMember ? specificMember.name : family.confirmedBy || family.members[0]?.name || '');
    setGuestMessage(family.message || '');
  };

  const toggleAttendance = (memberId: string, willAttend: boolean) => {
    setMemberAttendance((prev) => ({
      ...prev,
      [memberId]: willAttend,
    }));
  };

  const handleSubmitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamily) return;

    if (!confirmedByName.trim()) {
      setErrorMessage('Por favor, informe quem está preenchendo a confirmação.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const membersPayload = selectedFamily.members.map((m) => ({
      id: m.id,
      isAttending: memberAttendance[m.id] ?? false,
      dietaryRestrictions: memberDiet[m.id] || '',
    }));

    try {
      await onConfirmRsvp({
        familyId: selectedFamily.id,
        confirmedBy: confirmedByName.trim(),
        members: membersPayload,
        message: guestMessage.trim(),
      });

      // Confetti animation
      try {
        confetti({
          particleCount: 130,
          spread: 85,
          origin: { y: 0.55 },
          colors: ['#E05341', '#9E5B3E', '#F59E0B', '#10B981', '#EADCCF'],
        });
      } catch {
        // ignore
      }

      setSubmitSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar confirmação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fileHeroInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [localHeroUrl, setLocalHeroUrl] = useState<string | null>(null);

  const handleHeroFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingHero(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      if (base64) {
        try {
          const url = await uploadHeroImage(base64);
          setLocalHeroUrl(url);
          settings.heroImageUrl = url;
        } catch {
          alert('Erro ao atualizar imagem');
        } finally {
          setIsUploadingHero(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const heroSource = localHeroUrl || settings.heroImageUrl || heroImg;

  const attendingCount = selectedFamily
    ? selectedFamily.members.filter((m) => memberAttendance[m.id]).length
    : 0;

  const calendarUrl = createGoogleCalendarUrl(
    'Carlos & José • 60 Anos',
    `Comemoração especial dos 60 anos de Carlos & José!\nLocal: ${settings.locationName} - ${settings.address}`,
    `${settings.locationName}, ${settings.address}`,
    settings.eventDate,
    settings.eventTime
  );

  return (
    <div className="min-h-screen pb-16 bg-[#FDFBF7] text-[#2A2422]">
      {/* HERO SECTION WITH EXACT HERO ARTWORK */}
      <section className="pt-8 pb-4 sm:pt-12 sm:pb-8 px-4">
        <div className="max-w-xl mx-auto text-center">
          {/* Exact Hero image - seamless, without any weird frame or border */}
          <div className="mx-auto max-w-sm sm:max-w-md relative group">
            <img
              src={heroSource}
              alt="Carlos & José - 60 Anos"
              referrerPolicy="no-referrer"
              className="w-full h-auto object-contain block mx-auto mix-blend-multiply"
            />

            {/* Quick button to upload/replace with the exact Hero Carlos e Zé.png */}
            <div className="mt-1">
              <button
                type="button"
                onClick={() => fileHeroInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8C756E] hover:text-[#E05341] transition cursor-pointer px-2.5 py-1 rounded-lg hover:bg-white/80 border border-transparent hover:border-[#E8DDD2]"
                title="Clique para selecionar o arquivo 'Hero Carlos e Zé.png' do seu computador"
              >
                <Camera className="w-3 h-3 text-[#E05341]" />
                <span>{isUploadingHero ? 'Enviando imagem...' : 'Carregar / Trocar Arte PNG'}</span>
              </button>
              <input
                ref={fileHeroInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleHeroFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Event Date & Location Badges */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#E8DDD2] shadow-2xs text-xs font-bold text-[#2A2422]">
              <Calendar className="w-3.5 h-3.5 text-[#E05341]" />
              <span>28 de Novembro de 2026</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#E8DDD2] shadow-2xs text-xs font-bold text-[#2A2422]">
              <Clock className="w-3.5 h-3.5 text-[#E05341]" />
              <span>Às {settings.eventTime}h</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#E8DDD2] shadow-2xs text-xs font-bold text-[#2A2422]">
              <MapPin className="w-3.5 h-3.5 text-[#E05341]" />
              <span>{settings.locationName}</span>
            </div>
          </div>

          <div className="mt-3">
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold text-[#8C756E] hover:text-[#2A2422] transition"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-[#E05341]" />
              <span className="underline">Salvar no Google Agenda</span>
              <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
            </a>
          </div>
        </div>
      </section>

      {/* CONFIRMATION INTERACTION CARD */}
      <main className="max-w-lg mx-auto px-4 mt-2 relative z-20">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-[#5C453F]/5 border border-[#EDE2D7]">
          {/* STEP 1: NAME SEARCH INPUT (PRIVACY RESPECTED - NO FULL LIST VISIBLE) */}
          {!selectedFamily && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-xs font-black uppercase tracking-widest text-[#E05341] block mb-1">
                  Confirmação de Presença
                </span>
                <h2 className="text-2xl font-black text-[#2A2422] tracking-tight font-serif">
                  Você vai comparecer?
                </h2>
                <p className="text-xs sm:text-sm text-[#735E57] mt-1 max-w-sm mx-auto">
                  Digite seu nome abaixo para localizar seu convite e confirmar quem da sua família poderá ir:
                </p>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSearchSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => {
                      setTypedName(e.target.value);
                      if (hasSearched) setHasSearched(false);
                    }}
                    placeholder="Digite seu nome ou sobrenome..."
                    className="w-full py-3.5 pl-4 pr-12 text-base rounded-2xl border-2 border-[#EADCCF] focus:border-[#E05341] focus:outline-none focus:ring-4 focus:ring-[#E05341]/10 bg-[#FAF8F5] text-[#2A2422] placeholder:text-[#A89891] transition"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-[#E05341] hover:bg-[#C84032] text-white transition cursor-pointer shadow-xs"
                    title="Buscar convite"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#E05341] hover:bg-[#C84032] text-white font-bold text-sm sm:text-base shadow-md shadow-[#E05341]/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Localizar Meu Convite</span>
                </button>
              </form>

              {/* If multiple guests matched with the same name, disambiguate */}
              {hasSearched && matchedResults.length > 1 && (
                <div className="space-y-2 pt-2 border-t border-[#F2EAE2] animate-in fade-in">
                  <p className="text-xs font-bold text-[#735E57] uppercase tracking-wider">
                    Encontramos mais de um convidado com este nome. Qual é você?
                  </p>
                  <div className="space-y-2">
                    {matchedResults.map(({ family, matchedMember }) => (
                      <button
                        key={`${family.id}_${matchedMember.id}`}
                        type="button"
                        onClick={() => selectFamilyForRsvp(family, matchedMember)}
                        className="w-full text-left p-3.5 rounded-xl border border-[#EADCCF] hover:border-[#E05341] bg-[#FAF8F5] hover:bg-white transition flex items-center justify-between cursor-pointer group"
                      >
                        <div>
                          <span className="font-bold text-[#2A2422] text-sm block group-hover:text-[#E05341]">
                            {matchedMember.name}
                          </span>
                          <span className="text-xs text-[#8C756E]">
                            {family.familyName} ({family.members.length} {family.members.length === 1 ? 'pessoa' : 'pessoas'})
                          </span>
                        </div>
                        <span className="text-xs font-bold text-[#E05341] group-hover:translate-x-1 transition-transform">
                          Selecionar →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Not found state */}
              {hasSearched && matchedResults.length === 0 && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-center animate-in fade-in">
                  <AlertCircle className="w-6 h-6 text-amber-600 mx-auto mb-1.5" />
                  <p className="text-xs sm:text-sm font-bold text-amber-900">
                    Não encontramos um convite com "{typedName}"
                  </p>
                  <p className="text-xs text-amber-800/80 mt-1">
                    Verifique se o nome foi digitado corretamente (primeiro nome ou sobrenome) ou fale diretamente com Carlos & José para adicionar sua família na lista!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: FAMILY ATTENDANCE BOX (ONCE GUEST MATCHED) */}
          {selectedFamily && (
            <div>
              {submitSuccess ? (
                /* SUCCESS RECEIPT */
                <div className="text-center py-4 space-y-4 animate-in fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-10 h-10 animate-bounce" />
                  </div>

                  <h3 className="text-2xl font-extrabold text-[#2A2422] tracking-tight font-serif">
                    Presença Confirmada!
                  </h3>

                  <p className="text-xs sm:text-sm text-[#735E57] max-w-sm mx-auto">
                    A confirmação da <span className="font-bold text-[#2A2422]">{selectedFamily.familyName}</span> foi registrada com muito carinho para os 60 anos de Carlos &amp; José!
                  </p>

                  {/* Summary ticket */}
                  <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-[#EADCCF] text-left space-y-2.5">
                    <div className="flex justify-between items-center pb-2 border-b border-[#EADCCF] text-xs font-bold text-[#8C756E] uppercase tracking-wider">
                      <span>Membros da Família</span>
                      <span>Por: {confirmedByName}</span>
                    </div>

                    <div className="space-y-1.5">
                      {selectedFamily.members.map((m) => {
                        const willGo = memberAttendance[m.id];
                        return (
                          <div key={m.id} className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="font-semibold text-[#2A2422]">
                              {m.name}
                              {m.isChild && <span className="text-[11px] text-[#A66155] ml-1">(Criança)</span>}
                            </span>
                            {willGo ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                                <Check className="w-3.5 h-3.5" /> Vai
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-xs bg-rose-100/80 px-2.5 py-0.5 rounded-full">
                                <X className="w-3.5 h-3.5" /> Não vai
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {guestMessage && (
                      <div className="pt-2 border-t border-[#EADCCF] text-xs text-[#735E57] italic">
                        "{guestMessage}"
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <a
                      href={calendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-xl bg-[#E05341] hover:bg-[#C84032] text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-xs"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      <span>Salvar na Agenda (Google Calendar)</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setSubmitSuccess(false)}
                      className="w-full py-2.5 px-4 rounded-xl border border-[#EADCCF] hover:bg-[#FAF8F5] text-[#5C453F] font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Alterar Resposta</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* INTERACTIVE SELECTION FORM FOR ALL MEMBERS OF THE FAMILY */
                <form onSubmit={handleSubmitRsvp} className="space-y-5 animate-in fade-in">
                  {/* Header of Modal */}
                  <div className="flex items-start justify-between pb-3 border-b border-[#F0E6DE]">
                    <div>
                      <span className="text-xs font-bold text-[#E05341] uppercase tracking-wider block">
                        {selectedFamily.isSolo || selectedFamily.members.length === 1 ? 'Convite Individual' : 'Convite Familiar'}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-[#2A2422] tracking-tight font-serif">
                        {selectedFamily.isSolo || selectedFamily.members.length === 1 ? selectedFamily.members[0]?.name : selectedFamily.familyName}
                      </h3>
                      <p className="text-xs text-[#735E57] mt-0.5">
                        {selectedFamily.isSolo || selectedFamily.members.length === 1
                          ? `Olá ${selectedFamily.members[0]?.name}! Confirme se você poderá comparecer:`
                          : `Olá ${identifiedGuest?.name}! Marque quem da família poderá comparecer:`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFamily(null);
                        setMatchedResults([]);
                        setHasSearched(false);
                      }}
                      className="text-xs font-semibold text-[#8C756E] hover:text-[#2A2422] underline cursor-pointer"
                    >
                      Trocar nome
                    </button>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* MEMBERS ATTENDANCE CHECKBOXES / BUTTONS */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-[#8C756E] uppercase tracking-wider">
                      <span>Integrantes da Família ({selectedFamily.members.length})</span>
                      <span className="text-[#E05341] font-extrabold">
                        {attendingCount} confirmados
                      </span>
                    </div>

                    <div className="space-y-2">
                      {selectedFamily.members.map((member) => {
                        const isAttending = memberAttendance[member.id] === true;

                        return (
                          <div
                            key={member.id}
                            className={`p-3 rounded-2xl border-2 transition-all ${
                              isAttending
                                ? 'border-emerald-300 bg-emerald-50/50'
                                : 'border-[#EADCCF] bg-[#FAF8F5]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-[#2A2422] text-sm sm:text-base truncate">
                                    {member.name}
                                  </span>
                                  {member.isChild && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                      Criança
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-[#8C756E]">
                                  {isAttending ? '✓ Confirmado(a)' : '✗ Não poderá ir'}
                                </span>
                              </div>

                              {/* Toggle Options: Sim / Não */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => toggleAttendance(member.id, true)}
                                  className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1 transition cursor-pointer ${
                                    isAttending
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-white text-[#735E57] border border-[#D9C8BC] hover:border-emerald-400'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Sim</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleAttendance(member.id, false)}
                                  className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1 transition cursor-pointer ${
                                    !isAttending
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'bg-white text-[#735E57] border border-[#D9C8BC] hover:border-rose-400'
                                  }`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Não</span>
                                </button>
                              </div>
                            </div>

                            {/* Dietary Restriction if attending */}
                            {isAttending && (
                              <div className="mt-2 pt-2 border-t border-emerald-200/60">
                                <input
                                  type="text"
                                  placeholder="Alguma restrição alimentar ou alergia? (opcional)"
                                  value={memberDiet[member.id] || ''}
                                  onChange={(e) =>
                                    setMemberDiet((prev) => ({
                                      ...prev,
                                      [member.id]: e.target.value,
                                    }))
                                  }
                                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Who is filling this out & warm message */}
                  <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#EADCCF] space-y-3">
                    {selectedFamily.members.length > 1 ? (
                      <div>
                        <label className="block text-xs font-bold text-[#5C453F] uppercase tracking-wider mb-1">
                          Quem está confirmando por esta família? *
                        </label>
                        <select
                          value={confirmedByName}
                          onChange={(e) => setConfirmedByName(e.target.value)}
                          className="w-full text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl border border-[#D9C8BC] bg-white focus:outline-none focus:ring-2 focus:ring-[#E05341] text-[#2A2422]"
                        >
                          <option value="">Selecione quem está preenchendo...</option>
                          {selectedFamily.members.map((m) => (
                            <option key={m.id} value={m.name}>
                              {m.name}
                            </option>
                          ))}
                          <option value="Outro membro da família">Outro membro da família</option>
                        </select>
                      </div>
                    ) : (
                      <div className="text-xs text-[#5C453F] font-semibold">
                        Confirmando resposta para: <span className="font-bold text-[#2A2422]">{selectedFamily.members[0]?.name}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-[#735E57] mb-1 flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-[#E05341]" />
                        <span>Recado para Carlos &amp; José (opcional):</span>
                      </label>
                      <textarea
                        rows={2}
                        value={guestMessage}
                        onChange={(e) => setGuestMessage(e.target.value)}
                        placeholder="Deixe uma mensagem para os aniversariantes..."
                        className="w-full text-xs p-2.5 rounded-xl border border-[#D9C8BC] bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E05341] text-[#2A2422]"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFamily(null);
                        setMatchedResults([]);
                        setHasSearched(false);
                      }}
                      className="py-3 px-4 rounded-xl border border-[#EADCCF] hover:bg-[#FAF8F5] text-[#5C453F] font-semibold text-xs sm:text-sm transition cursor-pointer"
                    >
                      Voltar
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-3 px-4 rounded-xl bg-[#E05341] hover:bg-[#C84032] text-white font-bold text-sm sm:text-base shadow-md shadow-[#E05341]/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>
                            Confirmar Presença ({attendingCount} {attendingCount === 1 ? 'vai' : 'vão'})
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </main>

      {/* DISCREET FOOTER WITH HIDDEN "ADMIN" BUTTON AT THE VERY BOTTOM */}
      <footer className="mt-16 pt-8 pb-6 text-center text-xs text-[#A89891]">
        <div className="max-w-md mx-auto px-4 space-y-2">
          <p className="font-serif text-sm font-semibold text-[#735E57]">
            Carlos &amp; José • 60 Anos
          </p>
          <p className="text-[11px] text-[#A89891]">
            Comemoração especial em 28 de Novembro de 2026
          </p>

          {/* Subtly placed admin button in the footer as requested */}
          <div className="pt-3">
            <button
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-[#C4B5AC] hover:text-[#735E57] hover:underline transition opacity-50 hover:opacity-100 cursor-pointer"
              title="Acesso restrito ao anfitrião"
            >
              <Lock className="w-2.5 h-2.5" />
              <span>admin</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

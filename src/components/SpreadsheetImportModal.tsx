import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { X, FileSpreadsheet, Upload, Download, CheckCircle2, AlertCircle, Users, User, ArrowRight } from 'lucide-react';

interface ParsedGroup {
  familyName: string;
  isSolo: boolean;
  phone?: string;
  members: { name: string; isChild?: boolean }[];
}

interface SpreadsheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: ParsedGroup[]) => Promise<void>;
}

export const SpreadsheetImportModal: React.FC<SpreadsheetImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [pasteContent, setPasteContent] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [parsedGroups, setParsedGroups] = useState<ParsedGroup[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Process rows from either file or text
  const processRawRows = (rows: any[][]) => {
    if (!rows || rows.length === 0) {
      setError('A planilha parece estar vazia.');
      return;
    }

    // Filter out completely empty rows
    const cleanRows = rows.filter((r) => r.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''));

    if (cleanRows.length === 0) {
      setError('Nenhuma linha preenchida encontrada na planilha.');
      return;
    }

    // Check if the first row is header
    const firstRowStr = cleanRows[0].map((c) => String(c).toLowerCase()).join(' ');
    const hasHeader =
      firstRowStr.includes('nome') ||
      firstRowStr.includes('família') ||
      firstRowStr.includes('familia') ||
      firstRowStr.includes('convidado') ||
      firstRowStr.includes('guest');

    const dataRows = hasHeader ? cleanRows.slice(1) : cleanRows;

    const familyMap = new Map<string, { members: { name: string; isChild?: boolean }[]; phone?: string; isSolo: boolean }>();

    dataRows.forEach((row, rowIdx) => {
      const col0 = row[0] ? String(row[0]).trim() : '';
      const col1 = row[1] ? String(row[1]).trim() : '';
      const col2 = row[2] ? String(row[2]).trim() : '';
      const col3 = row[3] ? String(row[3]).trim() : '';

      let familyName = '';
      let guestName = '';
      let phone = '';
      let isChild = false;
      let isSolo = false;

      // Format detection:
      // Case 1: Col 0 = Família, Col 1 = Convidado
      if (col0 && col1) {
        familyName = col0;
        guestName = col1;
        phone = col2 || '';
        isChild = col3.toLowerCase().includes('sim') || col3.toLowerCase().includes('criança') || col3.toLowerCase().includes('crianca');
      } 
      // Case 2: Only 1 column filled = Individual Guest
      else if (col0 && !col1) {
        guestName = col0;
        familyName = col0; // solo
        isSolo = true;
      } else if (!col0 && col1) {
        guestName = col1;
        familyName = col1;
        isSolo = true;
      }

      if (guestName) {
        const key = isSolo ? `solo_${rowIdx}_${guestName}` : familyName.toLowerCase();

        if (!familyMap.has(key)) {
          familyMap.set(key, {
            members: [],
            phone: phone || undefined,
            isSolo,
          });
        }

        const existing = familyMap.get(key)!;
        existing.members.push({
          name: guestName,
          isChild,
        });
        if (phone && !existing.phone) {
          existing.phone = phone;
        }
      }
    });

    const result: ParsedGroup[] = [];
    familyMap.forEach((val, key) => {
      const displayFamilyName = val.isSolo ? val.members[0].name : (key.startsWith('solo_') ? val.members[0].name : (val.members[0]?.name ? key : 'Família'));
      result.push({
        familyName: val.isSolo ? val.members[0].name : (dataRows.find((r) => String(r[0]).toLowerCase() === key)?.[0] || displayFamilyName),
        isSolo: val.isSolo || val.members.length === 1,
        phone: val.phone,
        members: val.members,
      });
    });

    if (result.length === 0) {
      setError('Não foi possível identificar convidados. Verifique as colunas da planilha.');
      setParsedGroups([]);
    } else {
      setParsedGroups(result);
      setError('');
    }
  };

  // Handle file upload (.xlsx, .csv, .xls)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsProcessing(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        processRawRows(rawData);
      } catch (err: any) {
        setError('Erro ao ler o arquivo. Certifique-se de que é um formato válido (.xlsx, .xls ou .csv).');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setError('Falha ao carregar arquivo.');
      setIsProcessing(false);
    };
    reader.readAsBinaryString(uploadedFile);
  };

  // Handle pasted rows from Excel/Sheets
  const handlePasteProcess = () => {
    if (!pasteContent.trim()) {
      setError('Cole o conteúdo da planilha no campo de texto.');
      return;
    }

    const lines = pasteContent.split('\n').filter((l) => l.trim().length > 0);
    const rawRows = lines.map((line) => {
      // Split by tab (Excel/Google Sheets copy) or comma/semicolon (CSV)
      if (line.includes('\t')) {
        return line.split('\t');
      }
      if (line.includes(';')) {
        return line.split(';');
      }
      if (line.includes(',')) {
        return line.split(',');
      }
      return [line];
    });

    processRawRows(rawRows);
  };

  // Download Sample Template Spreadsheet (.csv)
  const handleDownloadTemplate = () => {
    const csvContent =
      '\uFEFF' +
      [
        ['Nome da Família / Grupo', 'Nome do Convidado', 'Telefone (Opcional)', 'Criança (Sim/Não)'],
        ['Família Silva', 'Carlos Silva', '11987654321', 'Não'],
        ['Família Silva', 'Mariana Silva', '11987654321', 'Não'],
        ['Família Silva', 'Lucas Silva', '11987654321', 'Sim'],
        ['Família Silva', 'Beatriz Silva', '11987654321', 'Sim'],
        ['Casal Oliveira', 'Roberto Oliveira', '11977778888', 'Não'],
        ['Casal Oliveira', 'Camila Oliveira', '11977778888', 'Não'],
        ['Roberto Lima', 'Roberto Lima', '11966665555', 'Não'],
        ['Fernanda Castro', 'Fernanda Castro', '11955554444', 'Não'],
      ]
        .map((r) => r.map((c) => `"${c}"`).join(';'))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo_importacao_convidados.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Confirm import
  const handleConfirmImport = async () => {
    if (parsedGroups.length === 0) return;
    setIsSubmitting(true);
    try {
      await onImport(parsedGroups);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao importar convidados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalGuests = parsedGroups.reduce((acc, g) => acc + g.members.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                Importar Convidados via Planilha
              </h3>
              <p className="text-xs text-slate-500">
                Envie um arquivo Excel (.xlsx, .csv) ou cole diretamente do Google Sheets
              </p>
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

        {/* Modal Body */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Tabs: Upload file vs Paste */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-[#E05341] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Upload de Arquivo (.xlsx / .csv)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'paste'
                    ? 'bg-[#E05341] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Colar do Excel / Google Sheets
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-xl border border-emerald-200 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Modelo (.csv)</span>
            </button>
          </div>

          {/* Tab 1: Upload File */}
          {activeTab === 'upload' && (
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#E05341] rounded-2xl p-6 text-center bg-slate-50/60 hover:bg-[#E05341]/5 transition cursor-pointer"
              >
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">
                  {file ? file.name : 'Clique para selecionar a planilha'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Formatos aceitos: .xlsx, .xls ou .csv
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {isProcessing && (
                <p className="text-xs text-slate-500 text-center mt-2 animate-pulse">
                  Lendo planilha e identificando famílias...
                </p>
              )}
            </div>
          )}

          {/* Tab 2: Paste Rows */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Copie as colunas da sua planilha e cole diretamente abaixo:
              </label>
              <textarea
                rows={5}
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="Exemplo colado:
Família Silva	Carlos Silva	11987654321	Não
Família Silva	Mariana Silva	11987654321	Não
Roberto Costa	Roberto Costa	11977778888	Não"
                className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E05341] bg-white"
              />
              <button
                type="button"
                onClick={handlePasteProcess}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Processar Texto Colado
              </button>
            </div>
          )}

          {/* PREVIEW OF PARSED GROUPS & GUESTS */}
          {parsedGroups.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Prévia de Importação:</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {parsedGroups.length} famílias/grupos • {totalGuests} convidados no total
                </span>
              </div>

              <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 text-xs">
                {parsedGroups.map((group, idx) => (
                  <div key={idx} className="p-3 bg-white flex items-start justify-between gap-2 hover:bg-slate-50">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{group.familyName}</span>
                        {group.isSolo ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                            <User className="w-2.5 h-2.5" /> Convidado Avulso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                            <Users className="w-2.5 h-2.5" /> Família ({group.members.length})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {group.members.map((m) => `${m.name}${m.isChild ? ' (Criança)' : ''}`).join(', ')}
                      </p>
                    </div>

                    {group.phone && (
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {group.phone}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={parsedGroups.length === 0 || isSubmitting}
            onClick={handleConfirmImport}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <span>Importando...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar e Importar ({totalGuests} convidados)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

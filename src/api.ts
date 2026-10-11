import { PartyData, FamilyGroup, PartySettings, RsvpSubmissionPayload } from './types.js';
import { initialPartyData } from './initialData.js';

const LOCAL_STORAGE_KEY = 'festa_rsvp_local_data';

// Helper to get fallback data from localStorage or initialPartyData
function getLocalFallback(): PartyData {
  try {
    const item = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (item) {
      return JSON.parse(item);
    }
  } catch (e) {
    console.warn('Could not read from localStorage', e);
  }
  return initialPartyData;
}

function saveLocalFallback(data: PartyData) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not write to localStorage', e);
  }
}

export async function fetchPartyData(): Promise<PartyData> {
  try {
    const res = await fetch('/api/party');
    if (!res.ok) throw new Error('Falha ao carregar dados do servidor');
    const data: PartyData = await res.json();
    saveLocalFallback(data);
    return data;
  } catch (err) {
    console.warn('Using local fallback data:', err);
    return getLocalFallback();
  }
}

export async function submitRsvp(payload: RsvpSubmissionPayload): Promise<{ success: boolean; family: FamilyGroup }> {
  try {
    const res = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
    throw new Error('Erro na resposta do servidor');
  } catch (err) {
    console.warn('Offline RSVP update fallback:', err);
    // Offline simulation update in local storage
    const current = getLocalFallback();
    const famIndex = current.families.findIndex((f) => f.id === payload.familyId);
    if (famIndex !== -1) {
      const updatedMembers = current.families[famIndex].members.map((m) => {
        const found = payload.members.find((pm) => pm.id === m.id);
        if (found) {
          return {
            ...m,
            isAttending: found.isAttending,
            dietaryRestrictions: found.dietaryRestrictions || m.dietaryRestrictions || '',
          };
        }
        return m;
      });

      current.families[famIndex] = {
        ...current.families[famIndex],
        members: updatedMembers,
        confirmedBy: payload.confirmedBy,
        message: payload.message,
        phone: payload.phone || current.families[famIndex].phone,
        lastUpdated: new Date().toISOString(),
      };
      saveLocalFallback(current);
      return { success: true, family: current.families[famIndex] };
    }
    throw new Error('Família não encontrada');
  }
}

export async function addFamily(
  familyName: string,
  members: { name: string; isChild?: boolean }[],
  phone?: string,
  isSolo?: boolean
): Promise<FamilyGroup> {
  try {
    const res = await fetch('/api/admin/family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ familyName, members, phone, isSolo }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.family;
    }
    throw new Error('Falha ao adicionar família');
  } catch (err) {
    const current = getLocalFallback();
    const newFam: FamilyGroup = {
      id: `fam_${Date.now()}`,
      familyName,
      isSolo: Boolean(isSolo),
      phone,
      members: members.map((m, idx) => ({
        id: `m_${Date.now()}_${idx}`,
        name: m.name,
        isAttending: null,
        isChild: !!m.isChild,
      })),
    };
    current.families.unshift(newFam);
    saveLocalFallback(current);
    return newFam;
  }
}

export async function clearAllGuests(): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/clear-all', { method: 'POST' });
    if (res.ok) return true;
  } catch (err) {
    console.warn('Fallback clear all guests', err);
  }
  const current = getLocalFallback();
  current.families = [];
  saveLocalFallback(current);
  return true;
}

export async function resetAllRsvps(): Promise<FamilyGroup[]> {
  try {
    const res = await fetch('/api/admin/reset-rsvps', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      return data.families;
    }
  } catch (err) {
    console.warn('Fallback reset all rsvps', err);
  }
  const current = getLocalFallback();
  current.families = current.families.map((fam) => ({
    ...fam,
    confirmedBy: undefined,
    message: undefined,
    lastUpdated: undefined,
    members: fam.members.map((m) => ({
      ...m,
      isAttending: null,
      dietaryRestrictions: undefined,
    })),
  }));
  saveLocalFallback(current);
  return current.families;
}

export async function bulkAddSpreadsheetGuests(items: { familyName: string; isSolo?: boolean; members: { name: string; isChild?: boolean }[]; phone?: string }[]): Promise<FamilyGroup[]> {
  try {
    const res = await fetch('/api/admin/bulk-add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.families;
    }
  } catch (err) {
    console.warn('Fallback bulk add', err);
  }
  const current = getLocalFallback();
  const added: FamilyGroup[] = items.map((item, idx) => ({
    id: `fam_${Date.now()}_${idx}`,
    familyName: item.familyName,
    isSolo: Boolean(item.isSolo),
    phone: item.phone,
    members: item.members.map((m, mIdx) => ({
      id: `m_${Date.now()}_${idx}_${mIdx}`,
      name: m.name,
      isAttending: null,
      isChild: Boolean(m.isChild),
    })),
  }));
  current.families.unshift(...added);
  saveLocalFallback(current);
  return added;
}

export async function updateFamily(id: string, updates: Partial<FamilyGroup>): Promise<FamilyGroup> {
  try {
    const res = await fetch(`/api/admin/family/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      return data.family;
    }
    throw new Error('Falha ao atualizar família');
  } catch (err) {
    const current = getLocalFallback();
    const idx = current.families.findIndex((f) => f.id === id);
    if (idx !== -1) {
      current.families[idx] = { ...current.families[idx], ...updates };
      saveLocalFallback(current);
      return current.families[idx];
    }
    throw new Error('Família não encontrada');
  }
}

export async function deleteFamily(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/family/${id}`, { method: 'DELETE' });
    if (res.ok) return true;
    throw new Error('Falha ao excluir família');
  } catch (err) {
    const current = getLocalFallback();
    current.families = current.families.filter((f) => f.id !== id);
    saveLocalFallback(current);
    return true;
  }
}

export async function updateSettings(settings: Partial<PartySettings>): Promise<PartySettings> {
  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      const data = await res.json();
      return data.settings;
    }
    throw new Error('Falha ao atualizar configurações');
  } catch (err) {
    const current = getLocalFallback();
    current.settings = { ...current.settings, ...settings };
    saveLocalFallback(current);
    return current.settings;
  }
}

export async function batchImportFamilies(text: string): Promise<FamilyGroup[]> {
  try {
    const res = await fetch('/api/admin/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.families;
    }
    throw new Error('Falha na importação');
  } catch (err) {
    console.error('Batch import error', err);
    throw err;
  }
}

export async function resetDemoData(): Promise<PartyData> {
  try {
    const res = await fetch('/api/admin/reset', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
  } catch (err) {
    console.warn('Fallback reset demo data', err);
  }
  const clean = JSON.parse(JSON.stringify(initialPartyData));
  saveLocalFallback(clean);
  return clean;
}

export async function uploadHeroImage(imageBase64: string): Promise<string> {
  try {
    const res = await fetch('/api/admin/upload-hero', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.heroImageUrl;
    }
    throw new Error('Falha ao enviar imagem');
  } catch (err) {
    console.warn('Fallback upload image locally', err);
    const current = getLocalFallback();
    current.settings.heroImageUrl = imageBase64;
    saveLocalFallback(current);
    return imageBase64;
  }
}

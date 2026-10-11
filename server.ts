import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { initialPartyData } from './src/initialData.ts';
import { PartyData, FamilyGroup, RsvpSubmissionPayload, PartySettings } from './src/types.ts';

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.resolve(process.cwd(), 'public')));

const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'party-data.json');

// Ensure data file exists with initial data
function loadPartyData(): PartyData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading party data file, using default data:', err);
  }

  // Save initial data
  savePartyData(initialPartyData);
  return initialPartyData;
}

function savePartyData(data: PartyData): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving party data:', err);
    return false;
  }
}

// In-memory cache synced with disk
let cachedPartyData: PartyData = loadPartyData();

// GET party data
app.get('/api/party', (_req: Request, res: Response) => {
  res.json(cachedPartyData);
});

// POST RSVP submission
app.post('/api/rsvp', (req: Request, res: Response) => {
  const payload: RsvpSubmissionPayload = req.body;
  if (!payload || !payload.familyId || !payload.members) {
    res.status(400).json({ error: 'Dados inválidos para confirmação.' });
    return;
  }

  const familyIndex = cachedPartyData.families.findIndex((f) => f.id === payload.familyId);
  if (familyIndex === -1) {
    res.status(404).json({ error: 'Família não encontrada.' });
    return;
  }

  const family = cachedPartyData.families[familyIndex];
  
  // Update each member attendance
  const updatedMembers = family.members.map((member) => {
    const updated = payload.members.find((m) => m.id === member.id);
    if (updated) {
      return {
        ...member,
        isAttending: updated.isAttending,
        dietaryRestrictions: updated.dietaryRestrictions || member.dietaryRestrictions || '',
      };
    }
    return member;
  });

  const updatedFamily: FamilyGroup = {
    ...family,
    members: updatedMembers,
    confirmedBy: payload.confirmedBy || family.confirmedBy,
    message: payload.message !== undefined ? payload.message : family.message,
    phone: payload.phone || family.phone,
    lastUpdated: new Date().toISOString(),
  };

  cachedPartyData.families[familyIndex] = updatedFamily;
  savePartyData(cachedPartyData);

  res.json({ success: true, family: updatedFamily });
});

// POST /api/admin/family - Add new family or solo guest
app.post('/api/admin/family', (req: Request, res: Response) => {
  const { familyName, members, phone, isSolo } = req.body;
  if (!familyName || !Array.isArray(members) || members.length === 0) {
    res.status(400).json({ error: 'Nome da família e pelo menos um membro são obrigatórios.' });
    return;
  }

  const familyId = `fam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newFamily: FamilyGroup = {
    id: familyId,
    familyName: familyName.trim(),
    isSolo: Boolean(isSolo),
    phone: phone ? phone.trim() : undefined,
    members: members.map((m: { name: string; isChild?: boolean }, idx: number) => ({
      id: `m_${Date.now()}_${idx}`,
      name: (typeof m === 'string' ? m : m.name).trim(),
      isAttending: null,
      isChild: typeof m === 'object' ? Boolean(m.isChild) : false,
    })),
  };

  cachedPartyData.families.unshift(newFamily);
  savePartyData(cachedPartyData);

  res.status(201).json({ success: true, family: newFamily });
});

// POST /api/admin/bulk-add - Add multiple families/guests from spreadsheet import
app.post('/api/admin/bulk-add', (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Nenhum item válido para importar.' });
    return;
  }

  const added: FamilyGroup[] = items.map((item: any, idx: number) => {
    const familyId = `fam_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
    const members = Array.isArray(item.members) ? item.members : [{ name: item.name || item.familyName, isChild: false }];
    
    return {
      id: familyId,
      familyName: (item.familyName || item.name || `Família ${idx + 1}`).trim(),
      isSolo: Boolean(item.isSolo),
      phone: item.phone ? String(item.phone).trim() : undefined,
      members: members.map((m: any, mIdx: number) => ({
        id: `m_${Date.now()}_${idx}_${mIdx}`,
        name: (typeof m === 'string' ? m : m.name).trim(),
        isAttending: null,
        isChild: typeof m === 'object' ? Boolean(m.isChild) : false,
      })),
    };
  });

  cachedPartyData.families.unshift(...added);
  savePartyData(cachedPartyData);

  res.status(201).json({ success: true, count: added.length, families: added });
});

// POST /api/admin/clear-all - Delete ALL guests and families
app.post('/api/admin/clear-all', (_req: Request, res: Response) => {
  cachedPartyData.families = [];
  savePartyData(cachedPartyData);
  res.json({ success: true, message: 'Todos os convidados foram apagados.' });
});

// POST /api/admin/reset-rsvps - Reset all confirmations to pending
app.post('/api/admin/reset-rsvps', (_req: Request, res: Response) => {
  cachedPartyData.families = cachedPartyData.families.map((fam) => ({
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

  savePartyData(cachedPartyData);
  res.json({ success: true, families: cachedPartyData.families });
});

// PUT /api/admin/family/:id - Update family
app.put('/api/admin/family/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const familyIndex = cachedPartyData.families.findIndex((f) => f.id === id);
  if (familyIndex === -1) {
    res.status(404).json({ error: 'Família não encontrada.' });
    return;
  }

  const incoming = req.body as Partial<FamilyGroup>;
  const current = cachedPartyData.families[familyIndex];

  cachedPartyData.families[familyIndex] = {
    ...current,
    ...incoming,
    id: current.id, // preserve ID
  };

  savePartyData(cachedPartyData);
  res.json({ success: true, family: cachedPartyData.families[familyIndex] });
});

// DELETE /api/admin/family/:id - Delete family
app.delete('/api/admin/family/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  cachedPartyData.families = cachedPartyData.families.filter((f) => f.id !== id);
  savePartyData(cachedPartyData);
  res.json({ success: true });
});

// PUT /api/admin/settings - Update party settings
app.put('/api/admin/settings', (req: Request, res: Response) => {
  const newSettings = req.body as Partial<PartySettings>;
  cachedPartyData.settings = {
    ...cachedPartyData.settings,
    ...newSettings,
  };
  savePartyData(cachedPartyData);
  res.json({ success: true, settings: cachedPartyData.settings });
});

// POST /api/admin/upload-hero - Upload custom hero PNG artwork
app.post('/api/admin/upload-hero', (req: Request, res: Response) => {
  const { imageBase64 } = req.body;
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    return;
  }

  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const publicDir = path.resolve(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const targetFile = path.join(publicDir, 'hero-carlos-e-ze.png');
    fs.writeFileSync(targetFile, buffer);

    cachedPartyData.settings.heroImageUrl = '/hero-carlos-e-ze.png';
    savePartyData(cachedPartyData);

    res.json({ success: true, heroImageUrl: '/hero-carlos-e-ze.png' });
  } catch (err: any) {
    console.error('Error saving hero image:', err);
    res.status(500).json({ error: 'Erro ao salvar imagem.' });
  }
});

// POST /api/admin/batch - Import multiple families from text lines
app.post('/api/admin/batch', (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Texto não fornecido.' });
    return;
  }

  // Format supported:
  // Família Silva: Carlos, Mariana, Lucas, Beatriz
  // or simply lines of names separated by comma
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const added: FamilyGroup[] = [];

  lines.forEach((line, lineIdx) => {
    let familyName = '';
    let membersStr = '';

    if (line.includes(':')) {
      const parts = line.split(':');
      familyName = parts[0].trim();
      membersStr = parts.slice(1).join(':').trim();
    } else {
      const names = line.split(',').map((n) => n.trim()).filter(Boolean);
      if (names.length > 0) {
        familyName = names.length === 1 ? names[0] : `Família ${names[0].split(' ').pop() || names[0]}`;
        membersStr = line;
      }
    }

    const memberNames = membersStr
      .split(/[,;/]/)
      .map((n) => n.trim())
      .filter(Boolean);

    if (memberNames.length > 0) {
      const newFam: FamilyGroup = {
        id: `fam_${Date.now()}_${lineIdx}_${Math.random().toString(36).substring(2, 5)}`,
        familyName: familyName || `Família ${memberNames[0]}`,
        members: memberNames.map((name, mIdx) => ({
          id: `m_${Date.now()}_${lineIdx}_${mIdx}`,
          name,
          isAttending: null,
          isChild: false,
        })),
      };
      added.push(newFam);
    }
  });

  cachedPartyData.families.push(...added);
  savePartyData(cachedPartyData);

  res.json({ success: true, count: added.length, families: added });
});

// POST /api/admin/reset - Reset to default demo data
app.post('/api/admin/reset', (_req: Request, res: Response) => {
  cachedPartyData = JSON.parse(JSON.stringify(initialPartyData));
  savePartyData(cachedPartyData);
  res.json({ success: true, data: cachedPartyData });
});

// Start server with Vite integration
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Party RSVP Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

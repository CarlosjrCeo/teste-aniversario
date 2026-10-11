/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PartyData, RsvpSubmissionPayload, PartySettings, FamilyGroup } from './types.js';
import { initialPartyData } from './initialData.js';
import {
  fetchPartyData,
  submitRsvp,
  addFamily,
  updateFamily,
  deleteFamily,
  updateSettings,
  batchImportFamilies,
  resetDemoData,
  clearAllGuests,
  resetAllRsvps,
  bulkAddSpreadsheetGuests,
} from './api.js';
import { Navbar } from './components/Navbar.js';
import { GuestView } from './components/GuestView.js';
import { AdminPanel } from './components/AdminPanel.js';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [partyData, setPartyData] = useState<PartyData>(initialPartyData);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'guest' | 'admin'>('guest');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return sessionStorage.getItem('admin_unlocked') === 'true';
  });

  // Load party data from server on mount
  const loadData = useCallback(async () => {
    try {
      const data = await fetchPartyData();
      if (data && data.families) {
        setPartyData(data);
      }
    } catch (e) {
      console.error('Failed to load party data', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check URL query parameters: ?admin=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true' || params.get('painel') === 'true') {
      setCurrentView('admin');
    }
  }, []);

  // Handle RSVP confirmation by guest
  const handleConfirmRsvp = async (payload: RsvpSubmissionPayload) => {
    const result = await submitRsvp(payload);
    if (result && result.family) {
      setPartyData((prev) => ({
        ...prev,
        families: prev.families.map((f) => (f.id === result.family.id ? result.family : f)),
      }));
    }
  };

  // Handle Add Family from Admin
  const handleAddFamily = async (
    familyName: string,
    members: { name: string; isChild?: boolean }[],
    phone?: string,
    isSolo?: boolean
  ) => {
    const newFamily = await addFamily(familyName, members, phone, isSolo);
    setPartyData((prev) => ({
      ...prev,
      families: [newFamily, ...prev.families],
    }));
  };

  // Handle Clear ALL guests
  const handleClearAllGuests = async () => {
    await clearAllGuests();
    setPartyData((prev) => ({
      ...prev,
      families: [],
    }));
  };

  // Handle Reset ALL RSVPs to pending
  const handleResetAllRsvps = async () => {
    const resetList = await resetAllRsvps();
    setPartyData((prev) => ({
      ...prev,
      families: resetList,
    }));
  };

  // Handle Spreadsheet bulk import
  const handleSpreadsheetImport = async (items: any[]) => {
    const added = await bulkAddSpreadsheetGuests(items);
    setPartyData((prev) => ({
      ...prev,
      families: [...added, ...prev.families],
    }));
  };

  // Handle Update Family from Admin
  const handleUpdateFamily = async (id: string, updates: Partial<FamilyGroup>) => {
    const updated = await updateFamily(id, updates);
    setPartyData((prev) => ({
      ...prev,
      families: prev.families.map((f) => (f.id === id ? updated : f)),
    }));
  };

  // Handle Delete Family from Admin
  const handleDeleteFamily = async (id: string) => {
    await deleteFamily(id);
    setPartyData((prev) => ({
      ...prev,
      families: prev.families.filter((f) => f.id !== id),
    }));
  };

  // Handle Update Settings
  const handleUpdateSettings = async (newSettings: Partial<PartySettings>) => {
    const updated = await updateSettings(newSettings);
    setPartyData((prev) => ({
      ...prev,
      settings: updated,
    }));
  };

  // Handle Batch Import
  const handleBatchImport = async (text: string) => {
    const newFamilies = await batchImportFamilies(text);
    setPartyData((prev) => ({
      ...prev,
      families: [...newFamilies, ...prev.families],
    }));
  };

  // Handle Reset to Demo
  const handleResetDemo = async () => {
    const clean = await resetDemoData();
    setPartyData(clean);
  };

  // Unlock Admin
  const handleUnlockAdmin = () => {
    setIsAdminUnlocked(true);
    sessionStorage.setItem('admin_unlocked', 'true');
  };

  // Exit Admin
  const handleExitAdmin = () => {
    setCurrentView('guest');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-white shadow-lg animate-pulse mb-4">
          <Sparkles className="w-7 h-7" />
        </div>
        <p className="text-slate-600 font-semibold text-sm">Carregando lista de convidados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Navbar only visible in Admin View */}
      {currentView === 'admin' && (
        <Navbar
          settings={partyData.settings}
          isAdmin={true}
          onExitAdmin={handleExitAdmin}
        />
      )}

      {/* Main Views */}
      {currentView === 'guest' ? (
        <GuestView
          settings={partyData.settings}
          families={partyData.families}
          onConfirmRsvp={handleConfirmRsvp}
          onOpenAdmin={() => setCurrentView('admin')}
        />
      ) : (
        <AdminPanel
          settings={partyData.settings}
          families={partyData.families}
          isUnlocked={isAdminUnlocked}
          onUnlock={handleUnlockAdmin}
          onAddFamily={handleAddFamily}
          onUpdateFamily={handleUpdateFamily}
          onDeleteFamily={handleDeleteFamily}
          onClearAllGuests={handleClearAllGuests}
          onResetAllRsvps={handleResetAllRsvps}
          onSpreadsheetImport={handleSpreadsheetImport}
          onUpdateSettings={handleUpdateSettings}
          onBatchImport={handleBatchImport}
          onResetDemo={handleResetDemo}
          onExitAdmin={handleExitAdmin}
        />
      )}
    </div>
  );
}

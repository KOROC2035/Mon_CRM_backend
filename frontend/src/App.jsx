import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

const API_URL = 'http://127.0.0.1:8080/prospects';

export default function App() {
  const [prospects, setProspects] = useState([]);
  const [activeTab, setActiveTab] = useState('calls'); 
  
  const [formData, setFormData] = useState({
    entreprise: '', nom_contact: '', 
    outils_actuels: '', temps_perdu: '', point_de_douleur: '', notes_brutes: ''
  });

  // États pour l'édition en ligne
  const [editingFrictionId, setEditingFrictionId] = useState(null);
  const [tempFrictionValue, setTempFrictionValue] = useState("");
  
  const [editingNotesId, setEditingNotesId] = useState(null);
  const [tempNotesValue, setTempNotesValue] = useState("");

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    try {
      const response = await fetch(`${API_URL}/`);
      if (response.ok) {
        const data = await response.json();
        setProspects(data);
      }
    } catch (error) { console.error("Erreur API:", error); }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e, canal) => {
    e.preventDefault();
    try {
      const payload = { ...formData, secteur: canal };
      const response = await fetch(`${API_URL}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        await fetchProspects();
        setFormData({ entreprise: '', nom_contact: '', outils_actuels: '', temps_perdu: '', point_de_douleur: '', notes_brutes: '' });
      }
    } catch (error) { console.error("Erreur création:", error); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const payload = { statut: newStatus };
      if (newStatus !== 'Appel Réservé') payload.date_appel = null;
      if (newStatus === 'Appelé' || newStatus === 'DM Envoyé') {
        payload.date_contact = new Date().toISOString();
      }

      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) fetchProspects();
    } catch (error) { console.error("Erreur modification:", error); }
  };

  const handleCallDateChange = async (id, dateValue) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_appel: dateValue ? new Date(dateValue).toISOString() : null })
      });
      if (response.ok) fetchProspects();
    } catch (error) { console.error("Erreur modification date:", error); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer définitivement ce prospect ?")) {
      try {
        const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (response.ok) fetchProspects();
      } catch (error) { console.error("Erreur suppression:", error); }
    }
  };

  // Gestion Édition Friction
  const startEditingFriction = (prospect) => {
    setEditingFrictionId(prospect.id);
    setTempFrictionValue(prospect.point_de_douleur || "");
  };

  const saveFriction = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ point_de_douleur: tempFrictionValue })
      });
      if (response.ok) fetchProspects();
    } catch (error) { console.error("Erreur modification friction:", error); }
    setEditingFrictionId(null);
  };

  // Gestion Édition Notes
  const startEditingNotes = (prospect) => {
    setEditingNotesId(prospect.id);
    setTempNotesValue(prospect.notes_brutes || "");
  };

  const saveNotes = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes_brutes: tempNotesValue })
      });
      if (response.ok) fetchProspects();
    } catch (error) { console.error("Erreur modification notes:", error); }
    setEditingNotesId(null);
  };

  // Formateurs de Date
  const formatDateTimeForInput = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const formatDisplayDate = (isoString) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('fr-FR', { 
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
    }).format(date);
  };

  const callProspects = prospects.filter(p => p.secteur !== 'LinkedIn');
  const linkedinProspects = prospects.filter(p => p.secteur === 'LinkedIn');

  // KPI Calculations
  const callStatusCounts = callProspects.reduce((acc, p) => { acc[p.statut] = (acc[p.statut] || 0) + 1; return acc; }, {});
  const callStatusData = Object.keys(callStatusCounts).map(key => ({ name: key, value: callStatusCounts[key] }));
  const linkedinSent = linkedinProspects.filter(p => p.statut !== 'À contacter').length;
  const linkedinReplies = linkedinProspects.filter(p => ['Réponse Reçue', 'Appel Réservé'].includes(p.statut)).length;
  const linkedinBooked = linkedinProspects.filter(p => p.statut === 'Appel Réservé').length;
  const replyRate = linkedinSent > 0 ? Math.round((linkedinReplies / linkedinSent) * 100) : 0;
  const bookingRate = linkedinSent > 0 ? Math.round((linkedinBooked / linkedinSent) * 100) : 0;

  const STATUS_COLORS = {
    "À contacter": "#a3a3a3", "Appelé": "#3b82f6", "Suivi à faire": "#eab308", "Rejeté": "#ef4444",
    "DM Envoyé": "#8b5cf6", "Réponse Reçue": "#10b981", "Appel Réservé": "#059669"
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 p-8 font-sans transition-colors duration-200">
      <div className="max-w-[90rem] mx-auto space-y-8">
        
        <header className="border-b border-neutral-200 dark:border-neutral-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ombra CRM</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">Niche : Agences de Marketing Digital</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-neutral-200 dark:bg-neutral-800 p-1 rounded-lg">
              <button onClick={() => setActiveTab('calls')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'calls' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>Cold Calls</button>
              <button onClick={() => setActiveTab('linkedin')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'linkedin' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>LinkedIn DMs</button>
              <button onClick={() => setActiveTab('stats')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'stats' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>Statistiques</button>
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">{isDarkMode ? '☀️' : '🌙'}</button>
          </div>
        </header>

        {/* --- VUE 1 : COLD CALLS --- */}
        {activeTab === 'calls' && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 animate-in fade-in duration-300">
            <div className="xl:col-span-1">
              <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">📞 Appel Sortant</h2>
                <form onSubmit={(e) => handleSubmit(e, 'Cold Call')} className="space-y-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Agence Marketing</label>
                    <input required type="text" name="entreprise" value={formData.entreprise} onChange={handleChange} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Décideur</label>
                    <input required type="text" name="nom_contact" value={formData.nom_contact} onChange={handleChange} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none" />
                  </div>
                  <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Friction & Notes</label>
                    <input type="text" name="point_de_douleur" value={formData.point_de_douleur} onChange={handleChange} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm mb-3 focus:outline-none" placeholder="Friction clé..." />
                    <textarea name="notes_brutes" value={formData.notes_brutes} onChange={handleChange} rows="3" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none" placeholder="Notes brutes..."></textarea>
                  </div>
                  <button type="submit" className="w-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium py-2.5 rounded-lg text-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors">Ajouter cible d'appel</button>
                </form>
              </div>
            </div>

            <div className="xl:col-span-3">
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-4 font-medium w-48">Agence</th>
                        <th className="px-4 py-4 font-medium w-48">Friction</th>
                        <th className="px-4 py-4 font-medium min-w-[250px]">Notes Brutes</th>
                        <th className="px-4 py-4 font-medium w-36">Statut & Date</th>
                        <th className="px-4 py-4 font-medium text-right w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {callProspects.map((p) => (
                        <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                          {/* Agence */}
                          <td className="px-4 py-4">
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">{p.entreprise}</div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">{p.nom_contact}</div>
                          </td>
                          
                          {/* Friction Éditable */}
                          <td className="px-4 py-4">
                            {editingFrictionId === p.id ? (
                              <input type="text" autoFocus value={tempFrictionValue} onChange={(e) => setTempFrictionValue(e.target.value)} onBlur={() => saveFriction(p.id)} onKeyDown={(e) => { if (e.key === 'Enter') saveFriction(p.id); }} className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-neutral-500" />
                            ) : (
                              <div onClick={() => startEditingFriction(p)} className="truncate cursor-pointer text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white" title={p.point_de_douleur || "Modifier la friction"}>
                                {p.point_de_douleur || <span className="text-neutral-400 italic">Aucune</span>}
                              </div>
                            )}
                          </td>

                          {/* Notes Éditable */}
                          <td className="px-4 py-4">
                            {editingNotesId === p.id ? (
                              <textarea 
                                autoFocus 
                                value={tempNotesValue} 
                                onChange={(e) => setTempNotesValue(e.target.value)} 
                                onBlur={() => saveNotes(p.id)} 
                                className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-neutral-500 resize-none h-16" 
                              />
                            ) : (
                              <div 
                                onClick={() => startEditingNotes(p)} 
                                className="cursor-pointer text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white text-xs whitespace-normal line-clamp-2" 
                                title={p.notes_brutes || "Cliquer pour ajouter une note"}
                              >
                                {p.notes_brutes || <span className="text-neutral-400 italic">+ Ajouter une note...</span>}
                              </div>
                            )}
                          </td>

                          {/* Statut & Date */}
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <select value={p.statut} onChange={(e) => handleStatusChange(p.id, e.target.value)} className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium px-2 py-1 rounded-md border-none outline-none cursor-pointer">
                                <option value="À contacter">À contacter</option>
                                <option value="Appelé">Appelé</option>
                                <option value="Suivi à faire">Suivi à faire</option>
                                <option value="Rejeté">Rejeté</option>
                              </select>
                              {p.date_contact && (
                                <span className="text-[10px] text-neutral-400 uppercase tracking-wide">
                                  {formatDisplayDate(p.date_contact)}
                                </span>
                              )}
                            </div>
                          </td>
                          
                          {/* Actions */}
                          <td className="px-4 py-4 text-right">
                            <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-xs font-medium">Supprimer</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- VUE 2 : LINKEDIN DMs --- */}
        {activeTab === 'linkedin' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm border-t-4 border-t-blue-600">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">🔗 Pipeline LinkedIn</h2>
                <form onSubmit={(e) => handleSubmit(e, 'LinkedIn')} className="space-y-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Agence Marketing</label>
                    <input required type="text" name="entreprise" value={formData.entreprise} onChange={handleChange} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Cible (Décideur)</label>
                    <input required type="text" name="nom_contact" value={formData.nom_contact} onChange={handleChange} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Lien Profil LinkedIn</label>
                    <input type="url" name="outils_actuels" value={formData.outils_actuels} onChange={handleChange} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none text-blue-600 dark:text-blue-400" placeholder="https://linkedin.com/in/..." />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg text-sm hover:bg-blue-700 transition-colors">Ajouter au Pipeline</button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs uppercase tracking-wider">
                      <tr><th className="px-6 py-4 font-medium">Cible</th><th className="px-6 py-4 font-medium">Profil</th><th className="px-6 py-4 font-medium">Statut DM & Date</th><th className="px-6 py-4 font-medium text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {linkedinProspects.map((p) => (
                        <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                          <td className="px-6 py-4"><div className="font-medium text-neutral-900 dark:text-neutral-100">{p.entreprise}</div><div className="text-xs text-neutral-500 dark:text-neutral-400">{p.nom_contact}</div></td>
                          <td className="px-6 py-4">
                            {p.outils_actuels ? (
                              <a href={p.outils_actuels} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:underline text-xs">Ouvrir Profil ↗</a>
                            ) : (
                              <span className="text-neutral-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <select value={p.statut} onChange={(e) => handleStatusChange(p.id, e.target.value)} className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium px-2 py-1 rounded-md border-none outline-none cursor-pointer w-36">
                                <option value="À contacter">À contacter</option>
                                <option value="DM Envoyé">DM Envoyé</option>
                                <option value="Réponse Reçue">Réponse Reçue</option>
                                <option value="Appel Réservé">Appel Réservé</option>
                                <option value="Rejeté">Rejeté</option>
                              </select>
                              
                              {p.date_contact && p.statut !== 'À contacter' && (
                                <span className="text-[10px] text-neutral-400 uppercase tracking-wide">
                                  {formatDisplayDate(p.date_contact)}
                                </span>
                              )}

                              {p.statut === 'Appel Réservé' && (
                                <input 
                                  type="datetime-local" 
                                  value={formatDateTimeForInput(p.date_appel)}
                                  onChange={(e) => handleCallDateChange(p.id, e.target.value)}
                                  className="mt-2 text-xs p-1 border border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded outline-none"
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right"><button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-xs font-medium">Supprimer</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- VUE 3 : STATISTIQUES GLOBALES --- */}
        {activeTab === 'stats' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-bold mb-4 text-blue-600 dark:text-blue-400">Performances LinkedIn DM</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <p className="text-xs font-medium text-neutral-500 uppercase">Cibles Totales</p>
                  <p className="text-3xl font-bold mt-1 text-neutral-900 dark:text-white">{linkedinProspects.length}</p>
                </div>
                <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <p className="text-xs font-medium text-neutral-500 uppercase">DM Envoyés</p>
                  <p className="text-3xl font-bold mt-1 text-purple-600">{linkedinSent}</p>
                </div>
                <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <p className="text-xs font-medium text-neutral-500 uppercase">Taux de Réponse</p>
                  <p className="text-3xl font-bold mt-1 text-emerald-500">{replyRate}%</p>
                </div>
                <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm border-b-4 border-b-emerald-600">
                  <p className="text-xs font-medium text-neutral-500 uppercase">Réservation d'appels</p>
                  <p className="text-3xl font-bold mt-1 text-emerald-600">{bookingRate}%</p>
                </div>
              </div>
            </div>

            <hr className="border-neutral-200 dark:border-neutral-800" />

            <div>
              <h3 className="text-lg font-bold mb-4 text-neutral-900 dark:text-white">Performances Cold Call</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <p className="text-sm font-medium text-neutral-500 uppercase">Total Appels Prévus</p>
                  <p className="text-3xl font-bold mt-2 text-neutral-900 dark:text-white">{callProspects.length}</p>
                </div>
                <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <p className="text-sm font-medium text-neutral-500 uppercase">Taux d'intérêt (Suivi)</p>
                  <p className="text-3xl font-bold mt-2 text-eab308">
                    {callProspects.length > 0 ? Math.round((callStatusCounts["Suivi à faire"] || 0) / callProspects.length * 100) : 0}%
                  </p>
                </div>
                <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={callStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                        {callStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#a3a3a3'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#171717' : '#ffffff', borderColor: isDarkMode ? '#262626' : '#e5e5e5', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
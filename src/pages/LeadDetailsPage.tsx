import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, Globe, MapPin, Star, ExternalLink,
  Facebook, Instagram, Check, X, Loader2, Building2, User,
  Tag, AlertCircle, ChevronRight, Send,
  Edit2, Plus,
} from 'lucide-react';
import { leadsAPI, notesAPI, usersAPI } from '../services/api';
import type { Lead, Note, LeadDetailsResponse, SocialProfile, User as UserType } from '../services/api';
import { formatCategory } from '../utils/formatters';
import ContactStatusModal from '../components/ContactStatusModal';
import LocationMap from '../components/LocationMap';

type Tab = 'contact' | 'notes' | 'tags';

const STATUS_STEPS: { key: Lead['status']; label: string }[] = [
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'converted', label: 'Converted' },
  { key: 'lost', label: 'Rejected' },
];

const STATUS_ORDER = ['new', 'contacted', 'qualified', 'converted', 'lost'];

export default function LeadDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<Lead | null>(null);
  const [contacts, setContacts] = useState<LeadDetailsResponse['contacts']>([]);
  const [socialProfiles, setSocialProfiles] = useState<SocialProfile[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('contact');

  // Inline field edit
  const [editingField, setEditingField] = useState<'phone' | 'email' | 'website' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Lead['status'] | null>(null);

  // Custom tags
  const [addingTag, setAddingTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [savingTag, setSavingTag] = useState(false);

  // Notes
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);


  useEffect(() => {
    if (id) { fetchLeadDetails(); fetchNotes(); }
  }, [id]);

  const fetchLeadDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await leadsAPI.getById(id);
      if (res.data.success && res.data.data) {
        const { lead: l, contacts: c, socialProfiles: s } = res.data.data;
        setLead(l); setContacts(c || []); setSocialProfiles(s || []);
      } else { setError('Lead not found'); }
    } catch { setError('Failed to load lead details.'); }
    finally { setLoading(false); }
  };

  const fetchNotes = async () => {
    if (!id) return;
    try {
      const res = await notesAPI.getForLead(id);
      if (res.data.success) setNotes(res.data.data || []);
    } catch { /* silent */ }
  };

  const fetchUsers = async () => {
    if (allUsers.length > 0) return;
    try {
      const res = await usersAPI.getAll();
      if (res.data.success) setAllUsers(res.data.data);
    } catch { /* silent */ }
  };

  // Inline edit
  const handleSaveEdit = async () => {
    if (!lead || !editingField) return;
    try {
      setSaving(true);
      const res = await leadsAPI.update(lead._id, { [editingField]: editValue });
      if (res.data.success) { setLead(res.data.data); setEditingField(null); setEditValue(''); }
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  // Status pipeline click — requires confirmation
  const handleStatusClick = (status: Lead['status']) => {
    if (!lead || status === lead.status) return;
    setPendingStatus(status);
  };

  const confirmStatusChange = async () => {
    if (!lead || !pendingStatus) return;
    try {
      setUpdatingStatus(true);
      const res = await leadsAPI.update(lead._id, { status: pendingStatus });
      if (res.data.success) setLead(res.data.data);
    } catch { /* silent */ }
    finally { setUpdatingStatus(false); setPendingStatus(null); }
  };

  // Tags
  const handleAddTag = async () => {
    if (!lead || !newTagValue.trim()) return;
    const tag = newTagValue.trim();
    const existing = lead.custom_tags || [];
    if (existing.includes(tag)) { setNewTagValue(''); setAddingTag(false); return; }
    try {
      setSavingTag(true);
      const res = await leadsAPI.update(lead._id, { custom_tags: [...existing, tag] });
      if (res.data.success) setLead(res.data.data);
    } catch { /* silent */ }
    finally { setSavingTag(false); setNewTagValue(''); setAddingTag(false); }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!lead) return;
    const res = await leadsAPI.update(lead._id, { custom_tags: (lead.custom_tags || []).filter(t => t !== tag) });
    if (res.data.success) setLead(res.data.data);
  };

  // @mention
  const handleNoteTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNoteText(val);
    const cursor = e.target.selectionStart;
    const match = val.slice(0, cursor).match(/@(\w*)$/);
    if (match) { setMentionQuery(match[1]); fetchUsers(); }
    else setMentionQuery(null);
  };

  const filteredMentionUsers = mentionQuery !== null
    ? allUsers.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : [];

  const handleSelectMention = (user: UserType) => {
    const cursor = noteTextareaRef.current?.selectionStart ?? noteText.length;
    const before = noteText.slice(0, cursor).replace(/@\w*$/, `@${user.name} `);
    setNoteText(before + noteText.slice(cursor));
    setMentionedUserIds(prev => prev.includes(user._id) ? prev : [...prev, user._id]);
    setMentionQuery(null);
    noteTextareaRef.current?.focus();
  };

  const handleSubmitNote = async () => {
    if (!lead || !noteText.trim()) return;
    try {
      setSavingNote(true);
      await notesAPI.create(lead._id, noteText.trim(), 'Team', undefined, undefined, mentionedUserIds);
      setNoteText(''); setMentionedUserIds([]); fetchNotes();
    } catch { /* silent */ }
    finally { setSavingNote(false); }
  };

  const renderNoteContent = (content: string) =>
    content.split(/(@\w[\w\s]*)/g).map((part, i) =>
      part.startsWith('@')
        ? <span key={i} className="inline px-1 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold">{part}</span>
        : <span key={i}>{part}</span>
    );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getSocialIcon = (platform: string) => {
    if (platform.toLowerCase() === 'facebook') return <Facebook className="w-4 h-4" />;
    if (platform.toLowerCase() === 'instagram') return <Instagram className="w-4 h-4" />;
    return <Globe className="w-4 h-4" />;
  };

  const currentStatusIdx = STATUS_ORDER.indexOf(lead?.status || 'new');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#CE0505]" />
        <p className="text-sm text-gray-400">Loading lead details...</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4">
        <AlertCircle className="w-10 h-10 text-[#CE0505]" />
        <p className="text-gray-700 font-semibold">{error || 'Lead not found'}</p>
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#CE0505] rounded-lg">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Leads Detail
        </button>
      </div>

      {/* Business header card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{lead.business_name}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                {lead.category && (
                  <span className="text-sm text-gray-500">{formatCategory(lead.category)}</span>
                )}
                {lead.rating && (
                  <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    {lead.rating.toFixed(1)}
                    {lead.total_ratings && <span className="text-gray-400">({lead.total_ratings.toLocaleString()})</span>}
                  </span>
                )}
                {lead.address && (
                  <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {lead.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick contact icons */}
          <div className="flex items-center gap-2 shrink-0">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#CE0505] hover:border-[#CE0505]/30 transition-colors">
                <Mail className="w-4 h-4" />
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#CE0505] hover:border-[#CE0505]/30 transition-colors">
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Metadata row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
          {[
            { label: 'Phone', value: lead.phone, href: lead.phone ? `tel:${lead.phone}` : undefined },
            { label: 'Email', value: lead.email, href: lead.email ? `mailto:${lead.email}` : undefined },
            { label: 'Website', value: lead.website, href: lead.website ? (lead.website.startsWith('http') ? lead.website : `https://${lead.website}`) : undefined, external: true },
            { label: 'Category', value: lead.category ? formatCategory(lead.category) : undefined },
          ].map(({ label, value, href, external }) => (
            <div key={label}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
              {value && href ? (
                <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} className="text-sm text-[#CE0505] font-medium truncate block hover:underline">
                  {value}
                </a>
              ) : (
                <p className="text-sm text-gray-700 font-medium truncate">{value || <span className="text-gray-300 font-normal italic">—</span>}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status pipeline — prominent stepper */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            lead.status === 'converted' ? 'bg-emerald-100' :
            lead.status === 'lost' ? 'bg-red-100' :
            'bg-[#CE0505]/10'
          }`}>
            <ChevronRight className={`w-5 h-5 ${
              lead.status === 'converted' ? 'text-emerald-600' :
              lead.status === 'lost' ? 'text-red-600' :
              'text-[#CE0505]'
            }`} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Lead Progress</h3>
            <p className="text-sm text-gray-500">
              Current status: <span className={`font-semibold ${
                lead.status === 'converted' ? 'text-emerald-600' :
                lead.status === 'lost' ? 'text-red-600' :
                lead.status === 'qualified' ? 'text-blue-600' :
                lead.status === 'contacted' ? 'text-amber-600' :
                'text-gray-600'
              }`}>{lead.status === 'lost' ? 'Rejected' : (lead.status || 'new').charAt(0).toUpperCase() + (lead.status || 'new').slice(1)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-start">
          {STATUS_STEPS.map((step, i) => {
            const stepIdx = STATUS_ORDER.indexOf(step.key!);
            const isDone = stepIdx < currentStatusIdx;
            const isCurrent = stepIdx === currentStatusIdx;

            return (
              <div key={step.key} className="flex-1 flex flex-col items-center relative">
                {/* Connector line */}
                {i > 0 && (
                  <div className={`absolute top-5 right-1/2 w-full h-0.5 -translate-y-1/2 ${
                    isDone || isCurrent ? 'bg-emerald-400' : 'bg-gray-200'
                  }`} />
                )}

                {/* Step circle */}
                <button
                  onClick={() => handleStatusClick(step.key)}
                  disabled={updatingStatus}
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ring-4 ${
                    isDone
                      ? 'bg-emerald-500 text-white ring-emerald-100 hover:bg-emerald-600'
                      : isCurrent
                      ? 'bg-[#CE0505] text-white ring-red-100 hover:bg-[#b00404] scale-110'
                      : 'bg-white text-gray-400 ring-gray-100 border-2 border-gray-200 hover:border-gray-400 hover:text-gray-600'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : (i + 1)}
                </button>

                {/* Label */}
                <p className={`mt-2.5 text-xs font-semibold text-center ${
                  isDone ? 'text-emerald-600' :
                  isCurrent ? 'text-[#CE0505]' :
                  'text-gray-400'
                }`}>
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Tabs */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-gray-100">
              {([
                { key: 'contact', label: 'Contact Info' },
                { key: 'notes', label: 'Notes & Activity' },
                { key: 'tags', label: 'Tags & Analysis' },
              ] as { key: Tab; label: string }[]).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                    tab === t.key
                      ? 'border-[#CE0505] text-[#CE0505]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Notes & Activity tab */}
            {tab === 'notes' && (
              <div className="p-5">
                {/* Note input */}
                <div className="relative mb-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#CE0505]/10 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-3.5 h-3.5 text-[#CE0505]" />
                    </div>
                    <div className="flex-1">
                      <textarea
                        ref={noteTextareaRef}
                        value={noteText}
                        onChange={handleNoteTextChange}
                        placeholder="Write a note... Use @ to mention a team member"
                        rows={3}
                        className="w-full px-4 py-3 text-sm text-gray-700 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-[#CE0505]/10 resize-none transition-all"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] text-gray-400">Press @ to mention team members</p>
                        <button
                          onClick={handleSubmitNote}
                          disabled={savingNote || !noteText.trim()}
                          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#CE0505] rounded-lg hover:bg-[#b00404] disabled:opacity-40 transition-colors"
                        >
                          {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          Post Note
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* @mention dropdown */}
                  {mentionQuery !== null && filteredMentionUsers.length > 0 && (
                    <div className="absolute left-11 right-0 top-0 -translate-y-full mb-1 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden">
                      {filteredMentionUsers.map(user => (
                        <button
                          key={user._id}
                          type="button"
                          onMouseDown={e => { e.preventDefault(); handleSelectMention(user); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-[#CE0505]/10 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-[#CE0505]" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timeline */}
                {notes.length === 0 ? (
                  <div className="text-center py-12 border-t border-gray-100">
                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                      <Send className="w-5 h-5 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-400">No notes yet</p>
                    <p className="text-xs text-gray-300 mt-0.5">Add a note above to start the activity feed</p>
                  </div>
                ) : (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                      Activity Timeline <span className="text-gray-300 font-normal">({notes.length})</span>
                    </p>
                    <div className="max-h-[520px] overflow-y-auto pr-1">
                      <div className="relative pl-6">
                        {/* Timeline line */}
                        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200" />

                        {notes.map((note, i) => (
                          <div key={note._id} className="relative pb-5 last:pb-0">
                            {/* Timeline dot */}
                            <div className={`absolute -left-6 top-1 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center ${
                              note.contact_method
                                ? 'border-[#0CA684] bg-[#0CA684]/10'
                                : i === 0
                                ? 'border-[#CE0505] bg-[#CE0505]/10'
                                : 'border-gray-300 bg-white'
                            }`}>
                              {note.contact_method ? (
                                <Phone className="w-2.5 h-2.5 text-[#0CA684]" />
                              ) : (
                                <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-[#CE0505]' : 'bg-gray-300'}`} />
                              )}
                            </div>

                            {/* Note card */}
                            <div className="bg-gray-50 rounded-xl p-4 ml-2 hover:bg-gray-100/80 transition-colors">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-sm font-semibold text-gray-900">
                                  {note.created_by || 'Team'}
                                </span>
                                {note.contact_method && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-[#0CA684]/10 text-[#0CA684] rounded-full uppercase tracking-wide">
                                    {note.contact_method}
                                  </span>
                                )}
                                {note.mentioned_users && note.mentioned_users.length > 0 && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-full">
                                    @{note.mentioned_users.length} mentioned
                                  </span>
                                )}
                                <span className="text-[11px] text-gray-400 ml-auto shrink-0 font-medium">
                                  {formatDate(note.contact_date || note.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 leading-relaxed">{renderNoteContent(note.content)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Contact Info tab */}
            {tab === 'contact' && (
              <div className="p-5 space-y-4">
                {([
                  { field: 'phone' as const, label: 'Phone', icon: <Phone className="w-4 h-4" />, type: 'tel', placeholder: '+27 10 000 0000' },
                  { field: 'email' as const, label: 'Email', icon: <Mail className="w-4 h-4" />, type: 'email', placeholder: 'name@business.com' },
                  { field: 'website' as const, label: 'Website', icon: <Globe className="w-4 h-4" />, type: 'url', placeholder: 'https://' },
                ]).map(({ field, label, icon, type, placeholder }) => (
                  <div key={field} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 text-gray-400">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                      {editingField === field ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type={type}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
                            placeholder={placeholder}
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') { setEditingField(null); setEditValue(''); } }}
                          />
                          <button onClick={handleSaveEdit} disabled={saving} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button onClick={() => { setEditingField(null); setEditValue(''); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {lead[field]
                            ? field === 'website'
                              ? <a href={lead[field]!.startsWith('http') ? lead[field]! : `https://${lead[field]}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[#CE0505] font-medium hover:underline inline-flex items-center gap-1">{lead[field]} <ExternalLink className="w-3 h-3" /></a>
                              : field === 'email'
                              ? <a href={`mailto:${lead[field]}`} className="text-sm text-[#CE0505] font-medium hover:underline">{lead[field]}</a>
                              : field === 'phone'
                              ? <a href={`tel:${lead[field]}`} className="text-sm text-[#CE0505] font-medium hover:underline">{lead[field]}</a>
                              : <span className="text-sm text-gray-800 font-medium">{lead[field]}</span>
                            : <span className="text-sm text-gray-400 italic">Not provided</span>
                          }
                          <button
                            onClick={() => { setEditingField(field); setEditValue(lead[field] || ''); }}
                            className="p-1 text-gray-300 hover:text-gray-600 rounded-lg"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Address (read-only) */}
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 text-gray-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Address</p>
                    <p className="text-sm text-gray-800">{lead.address || <span className="text-gray-400 italic">Not provided</span>}</p>
                  </div>
                </div>

                {/* Contact People */}
                {contacts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-2">Contact People</p>
                    <div className="space-y-2">
                      {contacts.map(contact => (
                        <div key={contact._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center border border-gray-200 shrink-0">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900">{contact.name || 'Unknown'}</p>
                            {contact.role && <p className="text-xs text-gray-400">{contact.role}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            {contact.phone && <a href={`tel:${contact.phone}`} className="p-2 text-gray-400 hover:text-[#CE0505] rounded-lg"><Phone className="w-3.5 h-3.5" /></a>}
                            {contact.email && <a href={`mailto:${contact.email}`} className="p-2 text-gray-400 hover:text-[#CE0505] rounded-lg"><Mail className="w-3.5 h-3.5" /></a>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tags & Analysis tab */}
            {tab === 'tags' && (
              <div className="p-5 space-y-5">
                {/* System tags */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">System Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {lead.is_small_business && <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700">Small Business</span>}
                    {lead.is_informal_business && <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-purple-50 text-purple-700">Informal</span>}
                    {lead.has_website === false && <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-orange-50 text-orange-700">No Website</span>}
                    {lead.has_website && <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-green-50 text-green-700">Has Website</span>}
                    {lead.social_media_only && <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-pink-50 text-pink-700">Social Only</span>}
                    {!lead.is_small_business && !lead.is_informal_business && lead.has_website !== false && !lead.social_media_only && !lead.has_website && (
                      <span className="text-sm text-gray-400 italic">No system tags</span>
                    )}
                  </div>
                </div>

                {/* Custom tags */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Custom Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {(lead.custom_tags || []).map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-[#CE0505]/10 text-[#CE0505]">
                        <Tag className="w-3 h-3" />
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:bg-[#CE0505]/20 rounded-full p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {addingTag ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newTagValue}
                          onChange={e => setNewTagValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
                            if (e.key === 'Escape') { setAddingTag(false); setNewTagValue(''); }
                          }}
                          placeholder="Tag name..."
                          autoFocus
                          className="px-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-gray-400"
                        />
                        <button onClick={handleAddTag} disabled={savingTag || !newTagValue.trim()} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-full disabled:opacity-40">
                          {savingTag ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => { setAddingTag(false); setNewTagValue(''); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setAddingTag(true)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 border border-dashed border-gray-200 rounded-full hover:border-gray-300 transition-colors">
                        <Plus className="w-3 h-3" /> Add tag
                      </button>
                    )}
                  </div>
                </div>

                {/* AI Analysis */}
                {lead.advertisingAnalysis && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">AI Analysis</p>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Ad Score</p>
                          <p className="text-2xl font-bold text-gray-900 font-mono">
                            {lead.advertisingAnalysis.score}<span className="text-sm font-normal text-gray-400">/100</span>
                          </p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          lead.advertisingAnalysis.priority === 'high' ? 'bg-red-50 text-[#CE0505]'
                          : lead.advertisingAnalysis.priority === 'medium' ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>
                          {lead.advertisingAnalysis.priority} priority
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#CE0505] rounded-full" style={{ width: `${lead.advertisingAnalysis.score}%` }} />
                      </div>
                      {lead.advertisingAnalysis.recommendations.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Recommendations</p>
                          <ul className="space-y-1">
                            {lead.advertisingAnalysis.recommendations.map((r, i) => (
                              <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                                <ChevronRight className="w-3 h-3 text-[#0CA684] mt-0.5 shrink-0" />
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Quick contact card */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact Summary</p>
            <div className="space-y-2.5">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-[#CE0505] group">
                  <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-[#CE0505]/10">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-mono text-xs">{lead.phone}</span>
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-[#CE0505] group">
                  <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-[#CE0505]/10">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs truncate">{lead.email}</span>
                </a>
              )}
              {lead.website && (
                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-[#CE0505] group">
                  <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-[#CE0505]/10">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs flex items-center gap-1">Website <ExternalLink className="w-3 h-3" /></span>
                </a>
              )}
              {!lead.phone && !lead.email && !lead.website && (
                <p className="text-sm text-gray-400 italic">No contact info yet</p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowStatusModal(true)}
                className="w-full py-2.5 text-sm font-semibold rounded-lg transition-colors bg-[#CE0505] text-white hover:bg-[#b00404]"
              >
                {['contacted', 'qualified', 'converted'].includes(lead.status || '') ? 'Update Status' : 'Mark Contacted'}
              </button>
            </div>
          </div>

          {/* Map */}
          {lead.lat && lead.lng && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <LocationMap lat={lead.lat} lng={lead.lng} businessName={lead.business_name} address={lead.address} />
            </div>
          )}

          {/* Social profiles */}
          {socialProfiles.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Social Profiles</p>
              {socialProfiles.map(profile => (
                <a
                  key={profile._id}
                  href={profile.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 py-2.5 px-2 hover:bg-gray-50 rounded-lg transition-colors group"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-white border border-gray-100 text-gray-500">
                    {getSocialIcon(profile.platform)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 capitalize">{profile.platform}</p>
                    {profile.followers_count && <p className="text-xs text-gray-400">{profile.followers_count.toLocaleString()} followers</p>}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status change confirmation */}
      {pendingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPendingStatus(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5">
              <p className="font-semibold text-gray-900 mb-1">Change lead status?</p>
              <p className="text-sm text-gray-500">
                Move <strong>{lead.business_name}</strong> to <strong className="capitalize">{pendingStatus === 'lost' ? 'Rejected' : pendingStatus}</strong>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button onClick={() => setPendingStatus(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={confirmStatusChange}
                disabled={updatingStatus}
                className="px-4 py-2 text-sm font-bold text-white bg-[#CE0505] hover:bg-[#b00404] rounded-lg disabled:opacity-50 inline-flex items-center gap-2"
              >
                {updatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <ContactStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        lead={lead}
        onSuccess={updated => { setLead(updated); fetchNotes(); }}
      />
    </div>
  );
}

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
import { useToast } from '../contexts/ToastContext';

type Tab = 'contact' | 'notes' | 'tags';

const CATEGORIES = [
  'Automotive', 'Beauty & Wellness', 'Car Repair', 'Car Wash', 'Construction', 'Education',
  'Entertainment', 'Fashion', 'Finance', 'Food & Beverage',
  'Healthcare', 'Home Services', 'Legal', 'Professional Services',
  'Real Estate', 'Restaurant', 'Retail', 'Technology',
  'Travel & Tourism', 'Other',
];

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
  const { toast } = useToast();

  const [lead, setLead] = useState<Lead | null>(null);
  const [contacts, setContacts] = useState<LeadDetailsResponse['contacts']>([]);
  const [socialProfiles, setSocialProfiles] = useState<SocialProfile[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('contact');

  // Contact edit mode — single toggle for all fields
  const [editingContact, setEditingContact] = useState(false);
  const [editForm, setEditForm] = useState({ phone: '', email: '', website: '', category: '' });
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

  // Enter edit mode — populate form with current values
  const startEditingContact = () => {
    if (!lead) return;
    setEditForm({
      phone: lead.phone || '',
      email: lead.email || '',
      website: lead.website || '',
      category: lead.category || '',
    });
    setEditingContact(true);
  };

  const cancelEditingContact = () => {
    setEditingContact(false);
    setEditForm({ phone: '', email: '', website: '', category: '' });
  };

  const handleSaveContact = async () => {
    if (!lead) return;
    try {
      setSaving(true);
      const updates: Partial<Lead> = {};
      if (editForm.phone !== (lead.phone || '')) updates.phone = editForm.phone || undefined;
      if (editForm.email !== (lead.email || '')) updates.email = editForm.email || undefined;
      if (editForm.website !== (lead.website || '')) updates.website = editForm.website || undefined;
      if (editForm.category !== (lead.category || '')) updates.category = editForm.category || undefined;
      if (Object.keys(updates).length === 0) { cancelEditingContact(); return; }
      const res = await leadsAPI.update(lead._id, updates);
      if (res.data.success) { setLead(res.data.data); cancelEditingContact(); toast('Contact info updated', 'success'); }
    } catch { toast('Failed to update contact info', 'error'); }
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
      if (res.data.success) { setLead(res.data.data); toast('Status updated', 'success'); }
    } catch { toast('Failed to update status', 'error'); }
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
      if (res.data.success) { setLead(res.data.data); toast('Tag added', 'success'); }
    } catch { toast('Failed to add tag', 'error'); }
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
      toast('Note posted', 'success');
    } catch { toast('Failed to post note', 'error'); }
    finally { setSavingNote(false); }
  };

  const renderNoteContent = (content: string) =>
    content.split(/(@\w[\w\s]*)/g).map((part, i) =>
      part.startsWith('@')
        ? <span key={i} className="inline px-1 py-0.5 rounded bg-blue-50 text-blue-600 text-xs font-medium">{part}</span>
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
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#CE0505] rounded-md">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Leads
        </button>
        <button
          onClick={() => setShowStatusModal(true)}
          className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors bg-[#CE0505] text-white hover:bg-[#b00404]"
        >
          {['contacted', 'qualified', 'converted'].includes(lead.status || '') ? 'Update Status' : 'Mark Contacted'}
        </button>
      </div>

      {/* Business header card */}
      <div className="bg-white rounded-md border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{lead.business_name}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
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
                  <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {lead.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick contact icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#CE0505] hover:border-[#CE0505]/30 transition-colors">
                <Mail className="w-3.5 h-3.5" />
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#CE0505] hover:border-[#CE0505]/30 transition-colors">
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Metadata row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
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

      {/* Status pipeline */}
      <div className="bg-white rounded-md border border-gray-200 p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <ChevronRight className={`w-4 h-4 ${
            lead.status === 'converted' ? 'text-emerald-600' :
            lead.status === 'lost' ? 'text-red-500' :
            'text-[#CE0505]'
          }`} />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Lead Progress</h3>
            <p className="text-xs text-gray-400">
              Current: <span className={`font-medium ${
                lead.status === 'converted' ? 'text-emerald-600' :
                lead.status === 'lost' ? 'text-red-500' :
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
                {i > 0 && (
                  <div className={`absolute top-4 right-1/2 w-full h-px ${
                    isDone || isCurrent ? 'bg-emerald-400' : 'bg-gray-200'
                  }`} />
                )}
                <button
                  onClick={() => handleStatusClick(step.key)}
                  disabled={updatingStatus}
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    isDone
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : isCurrent
                      ? 'bg-[#CE0505] text-white hover:bg-[#b00404]'
                      : 'bg-white text-gray-400 border border-gray-200 hover:border-gray-400 hover:text-gray-600'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : (i + 1)}
                </button>
                <p className={`mt-2 text-[11px] font-medium text-center ${
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

      {/* Main content — full width */}
      <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-gray-200">
              {([
                { key: 'contact', label: 'Contact Info' },
                { key: 'notes', label: 'Notes & Activity' },
                { key: 'tags', label: 'Tags & Analysis' },
              ] as { key: Tab; label: string }[]).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                    tab === t.key
                      ? 'border-[#CE0505] text-[#CE0505]'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Notes & Activity tab */}
            {tab === 'notes' && (
              <div className="p-4">
                {/* Note input */}
                <div className="relative mb-4">
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <textarea
                        ref={noteTextareaRef}
                        value={noteText}
                        onChange={handleNoteTextChange}
                        placeholder="Write a note... Use @ to mention a team member"
                        rows={3}
                        className="w-full px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:bg-white focus:border-gray-400 resize-none transition-all"
                      />
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[10px] text-gray-400">Type @ to mention</p>
                        <button
                          onClick={handleSubmitNote}
                          disabled={savingNote || !noteText.trim()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#CE0505] rounded-md hover:bg-[#b00404] disabled:opacity-40 transition-colors"
                        >
                          {savingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* @mention dropdown */}
                  {mentionQuery !== null && filteredMentionUsers.length > 0 && (
                    <div className="absolute left-10 right-0 top-0 -translate-y-full mb-1 bg-white rounded-md border border-gray-200 z-20 overflow-hidden">
                      {filteredMentionUsers.map(user => (
                        <button
                          key={user._id}
                          type="button"
                          onMouseDown={e => { e.preventDefault(); handleSelectMention(user); }}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left transition-colors"
                        >
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <User className="w-3 h-3 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            <p className="text-[11px] text-gray-400">{user.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timeline */}
                {notes.length === 0 ? (
                  <div className="text-center py-10 border-t border-gray-100">
                    <Send className="w-5 h-5 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No notes yet</p>
                    <p className="text-xs text-gray-300 mt-0.5">Add a note above to start tracking activity</p>
                  </div>
                ) : (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Activity <span className="text-gray-300">({notes.length})</span>
                    </p>
                    <div className="max-h-[520px] overflow-y-auto">
                      <div className="relative pl-5">
                        <div className="absolute left-[7px] top-2 bottom-2 w-px" style={{ backgroundColor: '#e8e8e8' }} />
                        {notes.map((note, i) => (
                          <div key={note._id} className="relative pb-4 last:pb-0">
                            <div className={`absolute -left-5 top-1.5 w-[14px] h-[14px] rounded-full border-2 flex items-center justify-center ${
                              note.contact_method
                                ? 'border-[#0CA684] bg-[#0CA684]/10'
                                : i === 0
                                ? 'border-[#CE0505] bg-[#CE0505]/10'
                                : 'border-gray-300 bg-white'
                            }`}>
                              {note.contact_method ? (
                                <Phone className="w-1.5 h-1.5 text-[#0CA684]" />
                              ) : (
                                <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-[#CE0505]' : 'bg-gray-300'}`} />
                              )}
                            </div>
                            <div className="ml-1 p-3 rounded-md bg-gray-50 hover:bg-gray-100/60 transition-colors">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-gray-800">
                                  {note.created_by || 'Team'}
                                </span>
                                {note.contact_method && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-[#0CA684]/10 text-[#0CA684] rounded uppercase tracking-wide">
                                    {note.contact_method}
                                  </span>
                                )}
                                {note.mentioned_users && note.mentioned_users.length > 0 && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-blue-50 text-blue-600 rounded">
                                    @{note.mentioned_users.length}
                                  </span>
                                )}
                                <span className="text-[10px] text-gray-400 ml-auto shrink-0">
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
              <div className="p-4">
                {/* Header with single Edit button */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Contact Details</p>
                  {!editingContact ? (
                    <button
                      onClick={startEditingContact}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 rounded-md hover:border-gray-300 transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={cancelEditingContact}
                        className="px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveContact}
                        disabled={saving}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#CE0505] rounded-md hover:bg-[#b00404] disabled:opacity-50 transition-colors"
                      >
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Save
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  {/* Category */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                    <div className="w-7 h-7 rounded-md bg-white border border-gray-200 flex items-center justify-center shrink-0 text-gray-400">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Category</p>
                      {editingContact ? (
                        <select
                          value={editForm.category}
                          onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-gray-400 bg-white appearance-none cursor-pointer"
                        >
                          <option value="">No category</option>
                          {CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                          {lead.category && !CATEGORIES.includes(lead.category) && (
                            <option value={lead.category}>{formatCategory(lead.category)}</option>
                          )}
                        </select>
                      ) : lead.category ? (
                        <span className="text-sm text-gray-800">{formatCategory(lead.category)}</span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Not set</span>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                    <div className="w-7 h-7 rounded-md bg-white border border-gray-200 flex items-center justify-center shrink-0 text-gray-400">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Phone</p>
                      {editingContact ? (
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-gray-400 bg-white"
                          placeholder="+27 10 000 0000"
                        />
                      ) : lead.phone ? (
                        <a href={`tel:${lead.phone}`} className="text-sm text-[#CE0505] font-medium hover:underline">{lead.phone}</a>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Not provided</span>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                    <div className="w-7 h-7 rounded-md bg-white border border-gray-200 flex items-center justify-center shrink-0 text-gray-400">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Email</p>
                      {editingContact ? (
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-gray-400 bg-white"
                          placeholder="name@business.com"
                        />
                      ) : lead.email ? (
                        <a href={`mailto:${lead.email}`} className="text-sm text-[#CE0505] font-medium hover:underline">{lead.email}</a>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Not provided</span>
                      )}
                    </div>
                  </div>

                  {/* Website */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                    <div className="w-7 h-7 rounded-md bg-white border border-gray-200 flex items-center justify-center shrink-0 text-gray-400">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Website</p>
                      {editingContact ? (
                        <input
                          type="url"
                          value={editForm.website}
                          onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-gray-400 bg-white"
                          placeholder="https://"
                        />
                      ) : lead.website ? (
                        <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[#CE0505] font-medium hover:underline inline-flex items-center gap-1">
                          {lead.website} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Not provided</span>
                      )}
                    </div>
                  </div>

                  {/* Address (read-only) */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                    <div className="w-7 h-7 rounded-md bg-white border border-gray-200 flex items-center justify-center shrink-0 text-gray-400">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Address</p>
                      <p className="text-sm text-gray-800">{lead.address || <span className="text-gray-400 italic">Not provided</span>}</p>
                    </div>
                  </div>
                </div>

                {/* Contact People */}
                {contacts.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Contact People</p>
                    <div className="space-y-1.5">
                      {contacts.map(contact => (
                        <div key={contact._id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-md">
                          <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center border border-gray-200 shrink-0">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900">{contact.name || 'Unknown'}</p>
                            {contact.role && <p className="text-[11px] text-gray-400">{contact.role}</p>}
                          </div>
                          <div className="flex items-center gap-0.5">
                            {contact.phone && <a href={`tel:${contact.phone}`} className="p-1.5 text-gray-400 hover:text-[#CE0505] rounded"><Phone className="w-3 h-3" /></a>}
                            {contact.email && <a href={`mailto:${contact.email}`} className="p-1.5 text-gray-400 hover:text-[#CE0505] rounded"><Mail className="w-3 h-3" /></a>}
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
              <div className="p-4 space-y-4">
                {/* System tags */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">System Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.is_small_business && <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-600">Small Business</span>}
                    {lead.is_informal_business && <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-purple-50 text-purple-600">Informal</span>}
                    {lead.has_website === false && <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-orange-50 text-orange-600">No Website</span>}
                    {lead.has_website && <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-green-50 text-green-600">Has Website</span>}
                    {lead.social_media_only && <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-pink-50 text-pink-600">Social Only</span>}
                    {!lead.is_small_business && !lead.is_informal_business && lead.has_website !== false && !lead.social_media_only && !lead.has_website && (
                      <span className="text-sm text-gray-400 italic">No system tags</span>
                    )}
                  </div>
                </div>

                {/* Custom tags */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Custom Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(lead.custom_tags || []).map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-[#CE0505]/8 text-[#CE0505]">
                        <Tag className="w-3 h-3" />
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:bg-[#CE0505]/15 rounded p-0.5 ml-0.5">
                          <X className="w-2.5 h-2.5" />
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
                          className="px-2.5 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-gray-400"
                        />
                        <button onClick={handleAddTag} disabled={savingTag || !newTagValue.trim()} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-40">
                          {savingTag ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </button>
                        <button onClick={() => { setAddingTag(false); setNewTagValue(''); }} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setAddingTag(true)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-400 hover:text-gray-700 border border-dashed border-gray-200 rounded-md hover:border-gray-300 transition-colors">
                        <Plus className="w-3 h-3" /> Add tag
                      </button>
                    )}
                  </div>
                </div>

                {/* Social profiles */}
                {socialProfiles.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Social Profiles</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {socialProfiles.map(profile => (
                        <a
                          key={profile._id}
                          href={profile.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-md hover:bg-gray-100/60 transition-colors group"
                        >
                          <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center border border-gray-200 text-gray-400 group-hover:text-gray-600 shrink-0">
                            {getSocialIcon(profile.platform)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 capitalize">{profile.platform}</p>
                            {profile.followers_count && <p className="text-[10px] text-gray-400">{profile.followers_count.toLocaleString()}</p>}
                          </div>
                          <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-gray-500 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Analysis */}
                {lead.advertisingAnalysis && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">AI Analysis</p>
                    <div className="bg-gray-50 rounded-md p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Ad Score</p>
                          <p className="text-xl font-bold text-gray-900 font-mono">
                            {lead.advertisingAnalysis.score}<span className="text-sm font-normal text-gray-400">/100</span>
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                          lead.advertisingAnalysis.priority === 'high' ? 'bg-red-50 text-[#CE0505]'
                          : lead.advertisingAnalysis.priority === 'medium' ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                        }`}>
                          {lead.advertisingAnalysis.priority}
                        </span>
                      </div>
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#CE0505] rounded-full" style={{ width: `${lead.advertisingAnalysis.score}%` }} />
                      </div>
                      {lead.advertisingAnalysis.recommendations.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Recommendations</p>
                          <ul className="space-y-1">
                            {lead.advertisingAnalysis.recommendations.map((r, i) => (
                              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
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

      {/* Map — full width at bottom */}
      {lead.lat && lead.lng && (
        <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
          <LocationMap lat={lead.lat} lng={lead.lng} businessName={lead.business_name} address={lead.address} />
        </div>
      )}

      {/* Status change confirmation */}
      {pendingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPendingStatus(null)}>
          <div className="bg-white rounded-md w-full max-w-sm mx-4 overflow-hidden border border-gray-200" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4">
              <p className="font-semibold text-gray-900 mb-1 text-sm">Change lead status?</p>
              <p className="text-sm text-gray-500">
                Move <strong>{lead.business_name}</strong> to <strong className="capitalize">{pendingStatus === 'lost' ? 'Rejected' : pendingStatus}</strong>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-100">
              <button onClick={() => setPendingStatus(null)} className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={confirmStatusChange}
                disabled={updatingStatus}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#CE0505] hover:bg-[#b00404] rounded-md disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {updatingStatus && <Loader2 className="w-3 h-3 animate-spin" />}
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

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
  ExternalLink,
  Facebook,
  Instagram,
  UserCheck,
  UserX,
  Edit2,
  Check,
  X,
  Loader2,
  Building2,
  PhoneCall,
  PhoneOff,
  User,
  Clock,
  Tag,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { leadsAPI, notesAPI } from '../services/api';
import type { Lead, Note, LeadDetailsResponse, SocialProfile } from '../services/api';
import { formatCategory } from '../utils/formatters';
import ContactStatusModal from '../components/ContactStatusModal';
import LocationMap from '../components/LocationMap';

export default function LeadDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<Lead | null>(null);
  const [contacts, setContacts] = useState<LeadDetailsResponse['contacts']>([]);
  const [socialProfiles, setSocialProfiles] = useState<SocialProfile[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingField, setEditingField] = useState<'phone' | 'email' | 'website' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchLeadDetails();
      fetchNotes();
    }
  }, [id]);

  const fetchLeadDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const response = await leadsAPI.getById(id);
      if (response.data.success && response.data.data) {
        const { lead: leadData, contacts: contactsData, socialProfiles: profilesData } = response.data.data;
        setLead(leadData);
        setContacts(contactsData || []);
        setSocialProfiles(profilesData || []);
      } else {
        setError('Lead not found');
      }
    } catch (err) {
      setError('Failed to load lead details. Please try again.');
      console.error('Error fetching lead:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    if (!id) return;
    try {
      const response = await notesAPI.getForLead(id);
      if (response.data.success) {
        setNotes(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  const handleStartEdit = (field: 'phone' | 'email' | 'website') => {
    setEditingField(field);
    setEditValue(lead?.[field] || '');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleSaveEdit = async () => {
    if (!lead || !editingField) return;
    try {
      setSaving(true);
      const response = await leadsAPI.update(lead._id, { [editingField]: editValue });
      if (response.data.success) {
        setLead(response.data.data);
        setEditingField(null);
        setEditValue('');
      }
    } catch (err) {
      console.error('Failed to update:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = (updatedLead: Lead) => {
    setLead(updatedLead);
    fetchNotes();
  };

  const isContacted = lead?.status === 'contacted' || lead?.status === 'qualified' || lead?.status === 'converted';

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return <Facebook className="w-4 h-4" />;
      case 'instagram': return <Instagram className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const getContactMethodIcon = (method?: string) => {
    switch (method?.toLowerCase()) {
      case 'phone': return <Phone className="w-3.5 h-3.5" />;
      case 'email': return <Mail className="w-3.5 h-3.5" />;
      default: return <User className="w-3.5 h-3.5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-dynaton-red" />
        <p className="text-sm text-dynaton-muted font-mono">Loading lead details...</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-dynaton-red" />
        </div>
        <div className="text-center">
          <p className="text-gray-900 font-semibold mb-1">{error || 'Lead not found'}</p>
          <p className="text-dynaton-muted text-sm">The lead you're looking for doesn't exist or couldn't be loaded.</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-dynaton-red rounded-lg hover:bg-dynaton-red-dark transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-sm text-dynaton-muted hover:text-gray-900 font-medium transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Dashboard
      </button>

      {/* Hero Header Card */}
      <div className="bg-white rounded-2xl border border-dynaton-border overflow-hidden">
        {/* Top accent */}
        <div className="h-1 bg-dynaton-red w-full" />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
            {/* Left: identity */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-dynaton-gray rounded-2xl flex items-center justify-center shrink-0 border border-dynaton-border">
                <Building2 className="w-7 h-7 text-dynaton-muted" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-2xl font-bold text-gray-900 tracking-tight leading-tight">
                  {lead.business_name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                  {lead.category && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-dynaton-muted">
                      <Tag className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{formatCategory(lead.category)}</span>
                    </span>
                  )}
                  {lead.rating && (
                    <div className="inline-flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-semibold text-gray-700">{lead.rating.toFixed(1)}</span>
                      {lead.total_ratings && (
                        <span className="text-sm text-dynaton-muted">({lead.total_ratings.toLocaleString()})</span>
                      )}
                    </div>
                  )}
                  {lead.address && (
                    <div className="inline-flex items-center gap-1.5 text-sm text-dynaton-muted">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-sm">{lead.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: status + action */}
            <div className="flex items-center gap-2.5 shrink-0">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border ${
                isContacted
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-amber-50 text-amber-700 border-amber-100'
              }`}>
                {isContacted ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                {isContacted ? 'Contacted' : 'Not Contacted'}
              </span>
              <button
                onClick={() => setShowStatusModal(true)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                  isContacted
                    ? 'text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100'
                    : 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100'
                }`}
              >
                {isContacted ? (
                  <><PhoneOff className="w-4 h-4" /> Undo Contact</>
                ) : (
                  <><PhoneCall className="w-4 h-4" /> Mark Contacted</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2/3 */}
        <div className="lg:col-span-2 space-y-5">

          {/* Contact Information */}
          <div className="bg-white rounded-2xl border border-dynaton-border overflow-hidden">
            <div className="px-6 py-4 border-b border-dynaton-border flex items-center justify-between">
              <h2 className="font-display font-bold text-gray-900">Contact Information</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Phone */}
              <ContactField
                label="Phone"
                icon={<Phone className="w-4 h-4" />}
                isEditing={editingField === 'phone'}
                value={lead.phone}
                editValue={editValue}
                saving={saving}
                onEdit={() => handleStartEdit('phone')}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
                onEditValueChange={setEditValue}
                inputType="tel"
                placeholder="Enter phone number"
                renderValue={(v) => <a href={`tel:${v}`} className="text-dynaton-red font-mono text-sm hover:underline">{v}</a>}
              />
              {/* Email */}
              <ContactField
                label="Email"
                icon={<Mail className="w-4 h-4" />}
                isEditing={editingField === 'email'}
                value={lead.email}
                editValue={editValue}
                saving={saving}
                onEdit={() => handleStartEdit('email')}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
                onEditValueChange={setEditValue}
                inputType="email"
                placeholder="Enter email"
                renderValue={(v) => <a href={`mailto:${v}`} className="text-dynaton-red font-mono text-sm hover:underline break-all">{v}</a>}
              />
              {/* Website */}
              <ContactField
                label="Website"
                icon={<Globe className="w-4 h-4" />}
                isEditing={editingField === 'website'}
                value={lead.website}
                editValue={editValue}
                saving={saving}
                onEdit={() => handleStartEdit('website')}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
                onEditValueChange={setEditValue}
                inputType="url"
                placeholder="https://"
                renderValue={(v) => (
                  <a href={v} target="_blank" rel="noopener noreferrer" className="text-dynaton-red text-sm hover:underline flex items-center gap-1 break-all">
                    {v}<ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
              />
              {/* Address (read-only) */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-dynaton-gray border border-dynaton-border flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-dynaton-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-dynaton-muted uppercase tracking-widest mb-1">Address</p>
                  {lead.address
                    ? <p className="text-sm text-gray-800 leading-snug">{lead.address}</p>
                    : <span className="text-sm text-gray-300 italic">Not provided</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Contact People */}
          {contacts.length > 0 && (
            <div className="bg-white rounded-2xl border border-dynaton-border overflow-hidden">
              <div className="px-6 py-4 border-b border-dynaton-border">
                <h2 className="font-display font-bold text-gray-900">Contact People</h2>
              </div>
              <div className="p-5 space-y-2">
                {contacts.map((contact) => (
                  <div key={contact._id} className="flex items-center gap-3 p-3 bg-dynaton-gray rounded-xl">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-dynaton-border shrink-0">
                      <User className="w-5 h-5 text-dynaton-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{contact.name || 'Unknown'}</p>
                      {contact.role && <p className="text-xs text-dynaton-muted">{contact.role}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="p-2 text-dynaton-muted hover:text-dynaton-red hover:bg-white rounded-lg transition-colors">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="p-2 text-dynaton-muted hover:text-dynaton-red hover:bg-white rounded-lg transition-colors">
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact History */}
          <div className="bg-white rounded-2xl border border-dynaton-border overflow-hidden">
            <div className="px-6 py-4 border-b border-dynaton-border flex items-center justify-between">
              <h2 className="font-display font-bold text-gray-900">Contact History</h2>
              {notes.length > 0 && (
                <span className="text-xs font-mono text-dynaton-muted bg-dynaton-gray border border-dynaton-border px-2.5 py-1 rounded-full">
                  {notes.length} {notes.length === 1 ? 'entry' : 'entries'}
                </span>
              )}
            </div>
            <div className="p-6">
              {notes.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-12 h-12 bg-dynaton-gray rounded-2xl flex items-center justify-center mx-auto mb-3 border border-dynaton-border">
                    <Clock className="w-6 h-6 text-dynaton-muted" />
                  </div>
                  <p className="text-sm text-dynaton-muted font-medium">No contact history yet</p>
                  <p className="text-xs text-gray-300 mt-1">Click "Mark Contacted" above to add your first entry</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note, index) => (
                    <div key={note._id} className="relative pl-7">
                      {index < notes.length - 1 && (
                        <div className="absolute left-2.5 top-7 bottom-0 w-px bg-dynaton-border" />
                      )}
                      {/* Dot */}
                      <div className="absolute left-0 top-1 w-5 h-5 bg-dynaton-red rounded-full flex items-center justify-center text-white">
                        {getContactMethodIcon(note.contact_method)}
                      </div>
                      {/* Card */}
                      <div className="bg-dynaton-gray border border-dynaton-border rounded-xl p-4 ml-2">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-gray-700 font-mono">
                            {formatDate(note.contact_date || note.created_at)}
                          </span>
                          {note.contact_method && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-white border border-dynaton-border text-gray-600 uppercase tracking-wide">
                              {note.contact_method}
                            </span>
                          )}
                          {note.created_by && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-dynaton-red/10 text-dynaton-red border border-dynaton-red/20 uppercase tracking-wide">
                              {note.created_by}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar 1/3 */}
        <div className="space-y-5">
          {/* Map */}
          {lead.lat && lead.lng && (
            <LocationMap
              lat={lead.lat}
              lng={lead.lng}
              businessName={lead.business_name}
              address={lead.address}
            />
          )}

          {/* Business Tags */}
          <div className="bg-white rounded-2xl border border-dynaton-border overflow-hidden">
            <div className="px-5 py-4 border-b border-dynaton-border">
              <h2 className="font-display font-bold text-gray-900 text-sm">Business Tags</h2>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-2">
                {lead.is_small_business && (
                  <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    Small Business
                  </span>
                )}
                {lead.is_informal_business && (
                  <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                    Informal
                  </span>
                )}
                {lead.has_website === false && (
                  <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-orange-50 text-orange-700 border border-orange-100">
                    No Website
                  </span>
                )}
                {lead.social_media_only && (
                  <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-pink-50 text-pink-700 border border-pink-100">
                    Social Only
                  </span>
                )}
                {lead.has_website && (
                  <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-100">
                    Has Website
                  </span>
                )}
                {!lead.is_small_business && !lead.is_informal_business && lead.has_website !== false && !lead.social_media_only && !lead.has_website && (
                  <span className="text-sm text-gray-300 italic">No tags</span>
                )}
              </div>
            </div>
          </div>

          {/* Social Profiles */}
          {socialProfiles.length > 0 && (
            <div className="bg-white rounded-2xl border border-dynaton-border overflow-hidden">
              <div className="px-5 py-4 border-b border-dynaton-border">
                <h2 className="font-display font-bold text-gray-900 text-sm">Social Profiles</h2>
              </div>
              <div className="p-3">
                {socialProfiles.map((profile) => (
                  <a
                    key={profile._id}
                    href={profile.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 hover:bg-dynaton-gray rounded-xl transition-colors group"
                  >
                    <div className="w-9 h-9 bg-dynaton-gray rounded-xl flex items-center justify-center group-hover:bg-white border border-dynaton-border transition-colors">
                      {getSocialIcon(profile.platform)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 capitalize">{profile.platform}</p>
                      {profile.followers_count && (
                        <p className="text-xs text-dynaton-muted font-mono">{profile.followers_count.toLocaleString()} followers</p>
                      )}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-dynaton-muted group-hover:text-gray-600" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {lead.advertisingAnalysis && (
            <div className="bg-white rounded-2xl border border-dynaton-border overflow-hidden">
              <div className="px-5 py-4 border-b border-dynaton-border flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-dynaton-red" />
                <h2 className="font-display font-bold text-gray-900 text-sm">AI Analysis</h2>
              </div>
              <div className="p-5 space-y-4">
                {/* Score row */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-dynaton-muted uppercase tracking-widest mb-0.5">Ad Score</p>
                    <p className="font-mono text-3xl font-bold text-gray-900">
                      {lead.advertisingAnalysis.score}
                      <span className="text-sm font-normal text-dynaton-muted">/100</span>
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                    lead.advertisingAnalysis.priority === 'high'
                      ? 'bg-red-50 text-dynaton-red border-red-200'
                      : lead.advertisingAnalysis.priority === 'medium'
                      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      : 'bg-gray-50 text-gray-600 border-dynaton-border'
                  }`}>
                    {lead.advertisingAnalysis.priority} priority
                  </span>
                </div>

                {/* Score bar */}
                <div className="h-1.5 bg-dynaton-gray rounded-full overflow-hidden">
                  <div
                    className="h-full bg-dynaton-red rounded-full transition-all"
                    style={{ width: `${lead.advertisingAnalysis.score}%` }}
                  />
                </div>

                {/* Reasons */}
                {lead.advertisingAnalysis.reasons.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-dynaton-muted uppercase tracking-widest mb-2">Why They Need Ads</p>
                    <ul className="space-y-1.5">
                      {lead.advertisingAnalysis.reasons.map((reason, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-dynaton-red mt-1.5 shrink-0" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {lead.advertisingAnalysis.recommendations.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-dynaton-muted uppercase tracking-widest mb-2">Recommendations</p>
                    <ul className="space-y-1.5">
                      {lead.advertisingAnalysis.recommendations.map((rec, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-dynaton-teal mt-1.5 shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ContactStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        lead={lead}
        onSuccess={handleStatusUpdate}
      />
    </div>
  );
}

/* ─── Reusable editable contact field ─── */
interface ContactFieldProps {
  label: string;
  icon: React.ReactNode;
  isEditing: boolean;
  value?: string;
  editValue: string;
  saving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onEditValueChange: (v: string) => void;
  inputType: string;
  placeholder: string;
  renderValue: (v: string) => React.ReactNode;
}

function ContactField({
  label, icon, isEditing, value, editValue, saving,
  onEdit, onSave, onCancel, onEditValueChange, inputType, placeholder, renderValue,
}: ContactFieldProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-dynaton-gray border border-dynaton-border flex items-center justify-center shrink-0 text-dynaton-muted">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-dynaton-muted uppercase tracking-widest mb-1">{label}</p>
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <input
              type={inputType}
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-dynaton-border rounded-lg focus:outline-none focus:ring-2 focus:ring-dynaton-red/20 focus:border-dynaton-red bg-dynaton-gray"
              placeholder={placeholder}
              autoFocus
            />
            <button onClick={onSave} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button onClick={onCancel} className="p-1.5 text-dynaton-muted hover:bg-dynaton-gray rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            {value ? renderValue(value) : <span className="text-sm text-gray-300 italic">Not provided</span>}
            <button onClick={onEdit} className="p-1 text-dynaton-muted hover:text-gray-600 hover:bg-dynaton-gray rounded-lg shrink-0">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

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
      case 'facebook':
        return <Facebook className="w-4 h-4" />;
      case 'instagram':
        return <Instagram className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getContactMethodIcon = (method?: string) => {
    switch (method?.toLowerCase()) {
      case 'phone':
        return <Phone className="w-3.5 h-3.5" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5" />;
      case 'whatsapp':
        return <Phone className="w-3.5 h-3.5" />;
      default:
        return <User className="w-3.5 h-3.5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#CE0505]" />
        <p className="text-gray-500">Loading lead details...</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-gray-900 font-medium mb-1">{error || 'Lead not found'}</p>
          <p className="text-gray-500 text-sm">The lead you're looking for doesn't exist or couldn't be loaded.</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#CE0505] rounded-lg hover:bg-[#B80404] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 text-gray-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-gray-900">{lead.business_name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {lead.category && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                    <Tag className="w-3.5 h-3.5 flex-shrink-0" />
                    {lead.category}
                  </span>
                )}
                {lead.rating && (
                  <div className="inline-flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">{lead.rating.toFixed(1)}</span>
                    {lead.total_ratings && (
                      <span className="text-sm text-gray-400">({lead.total_ratings} reviews)</span>
                    )}
                  </div>
                )}
              </div>
              {lead.address && (
                <div className="flex items-start gap-1.5 text-sm text-gray-500 mt-2">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{lead.address}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {isContacted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                <UserCheck className="w-4 h-4" />
                Contacted
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                <UserX className="w-4 h-4" />
                Not Contacted
              </span>
            )}
            <button
              onClick={() => setShowStatusModal(true)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isContacted
                  ? 'text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100'
                  : 'text-green-700 bg-green-50 border border-green-200 hover:bg-green-100'
              }`}
            >
              {isContacted ? (
                <>
                  <PhoneOff className="w-4 h-4" />
                  Undo Contact
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4" />
                  Mark Contacted
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Contact Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Phone */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Phone</p>
                    {editingField === 'phone' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="tel"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CE0505]/20 focus:border-[#CE0505]"
                          placeholder="Enter phone"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button onClick={handleCancelEdit} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {lead.phone ? (
                          <a href={`tel:${lead.phone}`} className="text-gray-900 hover:text-[#CE0505] font-medium">
                            {lead.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">Not provided</span>
                        )}
                        <button onClick={() => handleStartEdit('phone')} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</p>
                    {editingField === 'email' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="email"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CE0505]/20 focus:border-[#CE0505]"
                          placeholder="Enter email"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button onClick={handleCancelEdit} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {lead.email ? (
                          <a href={`mailto:${lead.email}`} className="text-gray-900 hover:text-[#CE0505] font-medium">
                            {lead.email}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">Not provided</span>
                        )}
                        <button onClick={() => handleStartEdit('email')} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Website */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Website</p>
                    {editingField === 'website' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CE0505]/20 focus:border-[#CE0505]"
                          placeholder="Enter website URL"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button onClick={handleCancelEdit} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {lead.website ? (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-900 hover:text-[#CE0505] font-medium flex items-center gap-1"
                          >
                            {lead.website}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">Not provided</span>
                        )}
                        <button onClick={() => handleStartEdit('website')} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Address</p>
                    {lead.address ? (
                      <p className="text-gray-900 font-medium">{lead.address}</p>
                    ) : (
                      <span className="text-gray-400 italic">Not provided</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Contacts */}
          {contacts.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Contact People</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {contacts.map((contact) => (
                    <div key={contact._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{contact.name || 'Unknown'}</p>
                        {contact.role && <p className="text-sm text-gray-500">{contact.role}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="p-2 text-gray-500 hover:text-[#CE0505] hover:bg-white rounded-lg">
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="p-2 text-gray-500 hover:text-[#CE0505] hover:bg-white rounded-lg">
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Contact History */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Contact History</h2>
              {notes.length > 0 && (
                <span className="text-sm text-gray-500">{notes.length} {notes.length === 1 ? 'entry' : 'entries'}</span>
              )}
            </div>
            <div className="p-6">
              {notes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No contact history yet</p>
                  <p className="text-gray-400 text-xs mt-1">Click "Mark Contacted" to add your first entry</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note, index) => (
                    <div key={note._id} className="relative pl-6">
                      {/* Timeline line */}
                      {index < notes.length - 1 && (
                        <div className="absolute left-[9px] top-8 bottom-0 w-0.5 bg-gray-200" />
                      )}
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-1 w-[18px] h-[18px] bg-[#CE0505] rounded-full flex items-center justify-center">
                        {getContactMethodIcon(note.contact_method)}
                        <div className="absolute inset-0 bg-[#CE0505] rounded-full" />
                        <div className="relative text-white">
                          {getContactMethodIcon(note.contact_method)}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 ml-2">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {formatDate(note.contact_date || note.created_at)}
                          </span>
                          {note.contact_method && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-white text-gray-600 border border-gray-200">
                              {note.contact_method}
                            </span>
                          )}
                          {note.created_by && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-[#CE0505]/10 text-[#CE0505] border border-[#CE0505]/20">
                              by {note.created_by}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 text-sm">{note.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Location Map */}
          {lead.lat && lead.lng && (
            <LocationMap
              lat={lead.lat}
              lng={lead.lng}
              businessName={lead.business_name}
              address={lead.address}
            />
          )}

          {/* Business Tags */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Business Tags</h2>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {lead.is_small_business && (
                  <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Small Business
                  </span>
                )}
                {lead.is_informal_business && (
                  <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    Informal Business
                  </span>
                )}
                {lead.has_website === false && (
                  <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                    No Website
                  </span>
                )}
                {lead.social_media_only && (
                  <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                    Social Media Only
                  </span>
                )}
                {lead.has_website && (
                  <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                    Has Website
                  </span>
                )}
                {!lead.is_small_business && !lead.is_informal_business && lead.has_website !== false && !lead.social_media_only && !lead.has_website && (
                  <span className="text-sm text-gray-400 italic">No tags available</span>
                )}
              </div>
            </div>
          </div>

          {/* Social Profiles */}
          {socialProfiles.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Social Profiles</h2>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {socialProfiles.map((profile) => (
                    <a
                      key={profile._id}
                      href={profile.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                        {getSocialIcon(profile.platform)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 capitalize">{profile.platform}</p>
                        {profile.followers_count && (
                          <p className="text-xs text-gray-500">{profile.followers_count.toLocaleString()} followers</p>
                        )}
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {lead.advertisingAnalysis && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">AI Analysis</h2>
              </div>
              <div className="p-6 space-y-4">
                {/* Score */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                      <TrendingUp className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Ad Score</p>
                      <p className="text-xl font-bold text-gray-900">{lead.advertisingAnalysis.score}<span className="text-sm font-normal text-gray-400">/100</span></p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    lead.advertisingAnalysis.priority === 'high'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : lead.advertisingAnalysis.priority === 'medium'
                      ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      : 'bg-gray-50 text-gray-700 border border-gray-200'
                  }`}>
                    {lead.advertisingAnalysis.priority} priority
                  </span>
                </div>

                {/* Reasons */}
                {lead.advertisingAnalysis.reasons.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Why They Need Ads</p>
                    <ul className="space-y-1.5">
                      {lead.advertisingAnalysis.reasons.map((reason, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {lead.advertisingAnalysis.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Recommendations</p>
                    <ul className="space-y-1.5">
                      {lead.advertisingAnalysis.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">•</span>
                          <span>{rec}</span>
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

      {/* Contact Status Modal */}
      <ContactStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        lead={lead}
        onSuccess={handleStatusUpdate}
      />
    </div>
  );
}

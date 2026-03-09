import { useState, useEffect } from 'react';
import { X, Phone, Mail, Users, MessageCircle, MoreHorizontal, Loader2, AlertCircle } from 'lucide-react';
import { leadsAPI, notesAPI } from '../services/api';
import type { Lead, LeadStatus } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ContactStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onSuccess: (updatedLead: Lead) => void;
}

type ContactMethod = 'phone' | 'email' | 'in-person' | 'whatsapp' | 'other';

const contactMethods: { value: ContactMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'phone',     label: 'Phone',     icon: <Phone className="w-4 h-4" /> },
  { value: 'email',     label: 'Email',     icon: <Mail className="w-4 h-4" /> },
  { value: 'in-person', label: 'In Person', icon: <Users className="w-4 h-4" /> },
  { value: 'whatsapp',  label: 'WhatsApp',  icon: <MessageCircle className="w-4 h-4" /> },
  { value: 'other',     label: 'Other',     icon: <MoreHorizontal className="w-4 h-4" /> },
];

export default function ContactStatusModal({ isOpen, onClose, lead, onSuccess }: ContactStatusModalProps) {
  const { user } = useAuth();
  const [contactMethod, setContactMethod] = useState<ContactMethod>('phone');
  const [contactDate, setContactDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isContacted = lead.status === 'contacted' || lead.status === 'qualified' || lead.status === 'converted';
  const newStatus: LeadStatus = isContacted ? 'new' : 'contacted';
  const requiresNotes = !isContacted;

  useEffect(() => {
    if (isOpen) {
      setContactMethod('phone');
      setContactDate(new Date().toISOString().slice(0, 16));
      setNotes('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requiresNotes && notes.trim().length < 10) {
      setError('Please add notes about the contact (minimum 10 characters)');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const updateResponse = await leadsAPI.update(lead._id, { status: newStatus });
      if (!updateResponse.data.success) throw new Error('Failed to update status');
      if (requiresNotes && notes.trim() && user) {
        try {
          await notesAPI.create(lead._id, notes.trim(), user.firstName, contactMethod, contactDate);
        } catch (noteErr) {
          console.warn('Could not save notes:', noteErr);
        }
      }
      onSuccess(updateResponse.data.data);
      onClose();
    } catch (err) {
      setError('Failed to update status. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-dynaton-border">
        {/* Accent bar */}
        <div className={`h-1 w-full ${isContacted ? 'bg-orange-400' : 'bg-green-500'}`} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dynaton-border">
          <div>
            <h3 className="font-display text-base font-bold text-gray-900">
              {isContacted ? 'Mark as Not Contacted' : 'Log Contact'}
            </h3>
            <p className="text-xs text-dynaton-muted mt-0.5 truncate max-w-75">{lead.business_name}</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-dynaton-gray text-dynaton-muted disabled:opacity-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {!requiresNotes ? (
            <p className="text-sm text-gray-600 leading-relaxed bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
              This will reset <span className="font-semibold text-gray-800">{lead.business_name}</span> back to "Not Contacted" status.
            </p>
          ) : (
            <>
              {/* Contact Method */}
              <div>
                <label className="block text-xs font-semibold text-dynaton-muted uppercase tracking-widest mb-2">
                  How did you reach out?
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {contactMethods.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setContactMethod(method.value)}
                      className={`flex flex-col items-center gap-1 px-2 py-2.5 text-xs rounded-xl border transition-colors ${
                        contactMethod === method.value
                          ? 'border-dynaton-red bg-dynaton-red/5 text-dynaton-red font-semibold'
                          : 'border-dynaton-border text-dynaton-muted hover:bg-dynaton-gray hover:text-gray-700'
                      }`}
                    >
                      {method.icon}
                      <span>{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Date */}
              <div>
                <label className="block text-xs font-semibold text-dynaton-muted uppercase tracking-widest mb-2">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={contactDate}
                  onChange={(e) => setContactDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-dynaton-border rounded-xl bg-dynaton-gray focus:outline-none focus:ring-2 focus:ring-dynaton-red/20 focus:border-dynaton-red focus:bg-white"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-dynaton-muted uppercase tracking-widest mb-2">
                  Notes <span className="text-dynaton-red">*</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What did you discuss? Any follow-up actions needed?"
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-dynaton-border rounded-xl bg-dynaton-gray focus:outline-none focus:ring-2 focus:ring-dynaton-red/20 focus:border-dynaton-red focus:bg-white resize-none"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-dynaton-muted">Minimum 10 characters</p>
                  <p className={`text-xs font-mono font-medium ${notes.length >= 10 ? 'text-green-600' : 'text-dynaton-muted'}`}>
                    {notes.length} chars
                  </p>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 text-dynaton-red text-sm bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-dynaton-gray border-t border-dynaton-border">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-dynaton-border rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (requiresNotes && notes.trim().length < 10)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors ${
              isContacted
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isContacted ? 'Mark Not Contacted' : 'Save Contact'}
          </button>
        </div>
      </div>
    </div>
  );
}

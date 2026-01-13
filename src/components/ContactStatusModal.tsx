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
  { value: 'phone', label: 'Phone', icon: <Phone className="w-4 h-4" /> },
  { value: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
  { value: 'in-person', label: 'In Person', icon: <Users className="w-4 h-4" /> },
  { value: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-4 h-4" /> },
  { value: 'other', label: 'Other', icon: <MoreHorizontal className="w-4 h-4" /> },
];

export default function ContactStatusModal({ isOpen, onClose, lead, onSuccess }: ContactStatusModalProps) {
  const { user } = useAuth();
  const [contactMethod, setContactMethod] = useState<ContactMethod>('phone');
  const [contactDate, setContactDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
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
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
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
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
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
      if (!updateResponse.data.success) {
        throw new Error('Failed to update status');
      }

      // Try to save notes, but don't fail the whole operation if it doesn't work
      if (requiresNotes && notes.trim() && user) {
        try {
          await notesAPI.create(lead._id, notes.trim(), user.firstName, contactMethod, contactDate);
        } catch (noteErr) {
          // Notes endpoint may not exist yet - log but continue
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isContacted ? 'Mark as Not Contacted' : 'Mark as Contacted'}
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <p className="text-gray-600">
            {isContacted
              ? `Are you sure you want to mark "${lead.business_name}" as not contacted?`
              : `Record your contact with "${lead.business_name}"`}
          </p>

          {requiresNotes && (
            <>
              {/* Contact Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {contactMethods.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setContactMethod(method.value)}
                      className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                        contactMethod === method.value
                          ? 'border-[#CE0505] bg-red-50 text-[#CE0505]'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {method.icon}
                      <span className="hidden sm:inline">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Date/Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={contactDate}
                  onChange={(e) => setContactDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CE0505]/20 focus:border-[#CE0505]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes <span className="text-[#CE0505]">*</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What did you discuss? Any follow-up actions needed?"
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CE0505]/20 focus:border-[#CE0505] resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {notes.length}/10 characters minimum
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (requiresNotes && notes.trim().length < 10)}
            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50 ${
              isContacted
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isContacted ? 'Mark Not Contacted' : 'Mark Contacted'}
          </button>
        </div>
      </div>
    </div>
  );
}

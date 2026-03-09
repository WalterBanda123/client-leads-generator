import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Loader2, Plus } from 'lucide-react';
import { leadsAPI } from '../services/api';
import type { Lead } from '../services/api';

const CATEGORIES = [
  'Automotive', 'Beauty & Wellness', 'Construction', 'Education',
  'Entertainment', 'Fashion', 'Finance', 'Food & Beverage',
  'Healthcare', 'Home Services', 'Legal', 'Professional Services',
  'Real Estate', 'Restaurant', 'Retail', 'Technology',
  'Travel & Tourism', 'Other',
];

const FIELD_CLASS =
  'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 transition-colors';

export default function AddBusinessPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    business_name: '',
    category: '',
    phone: '',
    email: '',
    website: '',
    address: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ business_name?: string }>({});

  const set = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'business_name' && value.trim()) {
      setErrors(prev => ({ ...prev, business_name: undefined }));
    }
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.business_name.trim()) e.business_name = 'Business name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSaving(true);
      const payload: Omit<Lead, '_id'> = {
        business_name: form.business_name.trim(),
        category: form.category || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        website: form.website.trim() || undefined,
        address: form.address.trim() || undefined,
        status: 'new',
        custom_tags: [],
      };
      const res = await leadsAPI.create(payload);
      if (res.data.success) {
        navigate(`/leads/${res.data.data._id}`);
      }
    } catch (err) {
      console.error('Failed to create business:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-sm text-dynaton-muted hover:text-gray-900 font-medium transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Dashboard
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl overflow-hidden">
        <div className="h-1 bg-dynaton-red w-full" />
        <div className="flex items-center gap-4 px-6 py-5">
          <div className="w-11 h-11 bg-dynaton-red/10 rounded-2xl flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-dynaton-red" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-gray-900 tracking-tight">Add New Business</h1>
            <p className="text-sm text-dynaton-muted font-mono mt-0.5">Manually add a lead to the database</p>
          </div>
        </div>
      </div>

      {/* Form card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 space-y-5">
        {/* Business Name */}
        <div>
          <label className="block text-[10px] font-semibold text-dynaton-muted uppercase tracking-widest mb-1.5">
            Business Name <span className="text-dynaton-red">*</span>
          </label>
          <input
            type="text"
            value={form.business_name}
            onChange={e => set('business_name', e.target.value)}
            placeholder="e.g. Acme Restaurant"
            autoFocus
            className={`${FIELD_CLASS} ${errors.business_name ? 'border-dynaton-red' : ''}`}
          />
          {errors.business_name && (
            <p className="text-xs text-dynaton-red mt-1">{errors.business_name}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-[10px] font-semibold text-dynaton-muted uppercase tracking-widest mb-1.5">
            Category
          </label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            className={`${FIELD_CLASS} appearance-none cursor-pointer`}
          >
            <option value="">Select a category...</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Phone + Email */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-semibold text-dynaton-muted uppercase tracking-widest mb-1.5">
              Phone
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="+27 10 000 0000"
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-dynaton-muted uppercase tracking-widest mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="info@business.com"
              className={FIELD_CLASS}
            />
          </div>
        </div>

        {/* Website */}
        <div>
          <label className="block text-[10px] font-semibold text-dynaton-muted uppercase tracking-widest mb-1.5">
            Website
          </label>
          <input
            type="url"
            value={form.website}
            onChange={e => set('website', e.target.value)}
            placeholder="https://www.business.com"
            className={FIELD_CLASS}
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-[10px] font-semibold text-dynaton-muted uppercase tracking-widest mb-1.5">
            Address
          </label>
          <input
            type="text"
            value={form.address}
            onChange={e => set('address', e.target.value)}
            placeholder="123 Main Street, Johannesburg"
            className={FIELD_CLASS}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2.5 text-sm font-semibold text-gray-600 bg-dynaton-gray rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-dynaton-red rounded-lg hover:bg-dynaton-red-dark disabled:opacity-60 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {saving ? 'Adding...' : 'Add Business'}
          </button>
        </div>
      </form>
    </div>
  );
}

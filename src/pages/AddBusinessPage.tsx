import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Plus, Building2,
  Phone, Mail, Globe, MapPin,
} from 'lucide-react';
import { leadsAPI } from '../services/api';
import type { Lead } from '../services/api';

const CATEGORIES = [
  'Automotive', 'Beauty & Wellness', 'Construction', 'Education',
  'Entertainment', 'Fashion', 'Finance', 'Food & Beverage',
  'Healthcare', 'Home Services', 'Legal', 'Professional Services',
  'Real Estate', 'Restaurant', 'Retail', 'Technology',
  'Travel & Tourism', 'Other',
];

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

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:border-gray-400 transition-colors placeholder-gray-400';

  return (
    <div className="max-w-2xl">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Leads
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-md bg-[#CE0505]/8 flex items-center justify-center">
          <Building2 className="w-4.5 h-4.5 text-[#CE0505]" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Add New Business</h1>
          <p className="text-xs text-gray-400">Manually add a lead to the database</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-md border border-gray-200">
        {/* Business Name — prominent */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Business Name <span className="text-[#CE0505]">*</span>
          </label>
          <input
            type="text"
            value={form.business_name}
            onChange={e => set('business_name', e.target.value)}
            placeholder="e.g. Acme Restaurant"
            autoFocus
            className={`${inputClass} ${errors.business_name ? 'border-red-300 bg-red-50/30' : ''}`}
          />
          {errors.business_name && (
            <p className="text-[11px] text-red-500 mt-1">{errors.business_name}</p>
          )}
        </div>

        {/* Category */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Category
          </label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            className={`${inputClass} appearance-none cursor-pointer`}
          >
            <option value="">Select a category...</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Contact details section */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact Details</p>
          <div className="space-y-3">
            {/* Phone */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                <Phone className="w-3 h-3 text-gray-400" />
              </div>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+27 10 000 0000"
                className={inputClass}
              />
            </div>

            {/* Email */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                <Mail className="w-3 h-3 text-gray-400" />
              </div>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="info@business.com"
                className={inputClass}
              />
            </div>

            {/* Website */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                <Globe className="w-3 h-3 text-gray-400" />
              </div>
              <input
                type="url"
                value={form.website}
                onChange={e => set('website', e.target.value)}
                placeholder="https://www.business.com"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-3 h-3 text-gray-400" />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="123 Main Street, Johannesburg"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 p-4 bg-gray-50">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#CE0505] rounded-md hover:bg-[#b00404] disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {saving ? 'Adding...' : 'Add Business'}
          </button>
        </div>
      </form>
    </div>
  );
}

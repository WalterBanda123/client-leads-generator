import { useState } from 'react';
import { X, Tag, Plus, Loader2 } from 'lucide-react';
import { leadsAPI } from '../services/api';
import type { Lead } from '../services/api';

interface Props {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSuccess: (updated: Lead) => void;
}

export default function ManageTagsModal({ isOpen, lead, onClose, onSuccess }: Props) {
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen || !lead) return null;

  const tags = lead.custom_tags || [];

  const save = async (updated: string[]) => {
    try {
      setSaving(true);
      const res = await leadsAPI.update(lead._id, { custom_tags: updated });
      if (res.data.success) onSuccess(res.data.data);
    } catch (err) {
      console.error('Failed to update tags:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    const tag = newTag.trim();
    if (!tag || tags.includes(tag)) { setNewTag(''); return; }
    await save([...tags, tag]);
    setNewTag('');
  };

  const handleRemove = (tag: string) => save(tags.filter(t => t !== tag));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1 bg-dynaton-red" />
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-dynaton-red/10 rounded-lg flex items-center justify-center">
              <Tag className="w-4 h-4 text-dynaton-red" />
            </div>
            <div>
              <p className="font-display font-bold text-gray-900 text-sm">Manage Tags</p>
              <p className="text-xs text-dynaton-muted font-mono truncate max-w-48">{lead.business_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-dynaton-muted hover:text-gray-700 hover:bg-dynaton-gray rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Existing tags */}
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-dynaton-red/10 text-dynaton-red"
                >
                  {tag}
                  <button
                    onClick={() => handleRemove(tag)}
                    disabled={saving}
                    className="hover:bg-dynaton-red/20 rounded-full p-0.5 disabled:opacity-40"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-dynaton-muted italic">No custom tags yet</p>
          )}

          {/* Add new */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
              placeholder="Add a tag..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={saving || !newTag.trim()}
              className="p-2 text-dynaton-red bg-dynaton-red/10 hover:bg-dynaton-red hover:text-white rounded-lg disabled:opacity-40 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold text-gray-600 bg-dynaton-gray rounded-lg hover:bg-gray-100 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

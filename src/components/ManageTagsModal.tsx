import { useState } from 'react';
import { X, Tag, Plus, Loader2 } from 'lucide-react';
import { leadsAPI } from '../services/api';
import type { Lead } from '../services/api';
import { useToast } from '../contexts/ToastContext';

interface Props {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSuccess: (updated: Lead) => void;
}

export default function ManageTagsModal({ isOpen, lead, onClose, onSuccess }: Props) {
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  if (!isOpen || !lead) return null;

  const tags = lead.custom_tags || [];

  const save = async (updated: string[], action: 'added' | 'removed', tagName: string) => {
    try {
      setSaving(true);
      const res = await leadsAPI.update(lead._id, { custom_tags: updated });
      if (res.data.success) {
        onSuccess(res.data.data);
        toast(`Tag "${tagName}" ${action}`, 'success');
      }
    } catch {
      toast('Failed to update tags', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    const tag = newTag.trim();
    if (!tag || tags.includes(tag)) { setNewTag(''); return; }
    await save([...tags, tag], 'added', tag);
    setNewTag('');
  };

  const handleRemove = (tag: string) => save(tags.filter(t => t !== tag), 'removed', tag);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-white rounded-md border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#CE0505]/8 rounded-md flex items-center justify-center">
              <Tag className="w-4 h-4 text-[#CE0505]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Manage Tags</p>
              <p className="text-xs text-gray-400 truncate max-w-48">{lead.business_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Existing tags */}
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-gray-50 border border-gray-200 text-gray-700"
                >
                  {tag}
                  <button
                    onClick={() => handleRemove(tag)}
                    disabled={saving}
                    className="hover:bg-gray-200 rounded p-0.5 disabled:opacity-40 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No custom tags yet</p>
          )}

          {/* Add new */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
              placeholder="Add a tag..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:border-gray-400 transition-colors placeholder-gray-400"
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={saving || !newTag.trim()}
              className="p-2 text-white bg-[#CE0505] hover:bg-[#b00404] rounded-md disabled:opacity-40 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

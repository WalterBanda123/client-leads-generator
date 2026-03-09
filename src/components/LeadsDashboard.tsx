import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, RefreshCw, Loader2, ChevronLeft, ChevronRight,
  Phone, Mail, Globe, ExternalLink, Eye,
  PhoneCall, ChevronDown, MoreHorizontal, Trash2,
  Download, Tag, Plus, Flame, LayoutGrid, List,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { leadsAPI } from '../services/api';
import type { Lead, LeadsStats } from '../services/api';
import { formatCategory } from '../utils/formatters';
import ContactStatusModal from './ContactStatusModal';
import ConfirmModal from './ConfirmModal';
import ManageTagsModal from './ManageTagsModal';

type StatusFilter = 'all' | 'not_contacted' | 'contacted';
type ViewMode = 'table' | 'kanban';

const isValidStatusFilter = (value: string | null): value is StatusFilter =>
  value === 'all' || value === 'not_contacted' || value === 'contacted';

const KANBAN_COLUMNS = [
  { key: 'new', label: 'New', color: 'bg-amber-400', statuses: ['new', undefined] },
  { key: 'contacted', label: 'In Progress', color: 'bg-blue-500', statuses: ['contacted'] },
  { key: 'qualified', label: 'Follow Up', color: 'bg-purple-500', statuses: ['qualified'] },
  { key: 'archive', label: 'Archive', color: 'bg-gray-400', statuses: ['converted', 'lost'] },
] as const;

const TAG_COLORS = [
  'bg-violet-50 text-violet-600',
  'bg-sky-50 text-sky-600',
  'bg-emerald-50 text-emerald-600',
  'bg-amber-50 text-amber-600',
  'bg-rose-50 text-rose-600',
];

function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

// Stale = created > 48h ago and still "new" status
function isStale(lead: Lead): boolean {
  if (lead.status && lead.status !== 'new') return false;
  if (!lead.created_at) return false;
  const created = new Date(lead.created_at).getTime();
  const hoursAgo = (Date.now() - created) / (1000 * 60 * 60);
  return hoursAgo > 48;
}

const EXCLUDED_CATEGORIES = new Set([
  'point_of_interest', 'point of interest', 'establishment',
]);

export default function LeadsDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [allLeadsForCategories, setAllLeadsForCategories] = useState<Lead[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const param = searchParams.get('status');
    return isValidStatusFilter(param) ? param : 'all';
  });
  const [categoryFilter, setCategoryFilter] = useState<string>(() => searchParams.get('category') || 'all');
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
    const param = searchParams.get('limit');
    const parsed = param ? parseInt(param, 10) : 15;
    return [10, 15, 25, 50].includes(parsed) ? parsed : 15;
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const param = searchParams.get('page');
    const parsed = param ? parseInt(param, 10) : 1;
    return parsed > 0 ? parsed : 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<LeadsStats>({ all: 0, notContacted: 0, contacted: 0 });

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    allLeadsForCategories.forEach(lead => {
      if (lead.category) {
        const mainCategory = lead.category.split(',')[0].trim();
        if (!EXCLUDED_CATEGORIES.has(mainCategory.toLowerCase())) {
          categorySet.add(mainCategory);
        }
      }
    });
    return Array.from(categorySet).sort();
  }, [allLeadsForCategories]);

  useEffect(() => {
    const fetchAllLeads = async () => {
      try {
        const response = await leadsAPI.getAll({ limit: 9999 });
        if (response.data.success) {
          setAllLeadsForCategories(response.data.data);
          setDataReady(true);
        }
      } catch (error) {
        console.error('Error fetching all leads:', error);
      }
    };
    fetchAllLeads();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (searchQuery) params.set('search', searchQuery);
    if (itemsPerPage !== 15) params.set('limit', String(itemsPerPage));
    if (currentPage !== 1) params.set('page', String(currentPage));
    setSearchParams(params, { replace: true });
  }, [statusFilter, categoryFilter, searchQuery, itemsPerPage, currentPage, setSearchParams]);

  const fetchLeads = useCallback(async () => {
    if (!dataReady) return;
    try {
      setLoading(true);
      let filtered = [...allLeadsForCategories];

      if (categoryFilter !== 'all') {
        filtered = filtered.filter(lead => {
          if (!lead.category) return false;
          return lead.category.split(',')[0].trim().toLowerCase() === categoryFilter.toLowerCase();
        });
      }

      if (statusFilter === 'contacted') {
        filtered = filtered.filter(lead =>
          lead.status === 'contacted' || lead.status === 'qualified' || lead.status === 'converted'
        );
      } else if (statusFilter === 'not_contacted') {
        filtered = filtered.filter(lead =>
          lead.status === 'new' || !lead.status
        );
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(lead =>
          lead.business_name.toLowerCase().includes(q)
        );
      }

      // Stale leads float to top within their group
      filtered.sort((a, b) => {
        const aStale = isStale(a) ? 0 : 1;
        const bStale = isStale(b) ? 0 : 1;
        if (aStale !== bStale) return aStale - bStale;
        return 0; // preserve existing order otherwise
      });

      const allData = allLeadsForCategories;
      const contactedTotal = allData.filter(l =>
        l.status === 'contacted' || l.status === 'qualified' || l.status === 'converted'
      ).length;
      setStats({
        all: allData.length,
        contacted: contactedTotal,
        notContacted: allData.length - contactedTotal,
      });

      const startIndex = (currentPage - 1) * itemsPerPage;
      setLeads(filtered.slice(startIndex, startIndex + itemsPerPage));
      setTotalPages(Math.ceil(filtered.length / itemsPerPage) || 1);
      setTotal(filtered.length);
    } catch (error) {
      console.error('Error filtering leads:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, searchQuery, currentPage, itemsPerPage, allLeadsForCategories, dataReady]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { setCurrentPage(1); }, [statusFilter, categoryFilter, searchQuery, itemsPerPage]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await leadsAPI.getAll({ limit: 9999 });
      if (response.data.success) {
        setAllLeadsForCategories(response.data.data);
        setDataReady(true);
      }
    } catch (error) {
      console.error('Error refreshing leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusSuccess = (updatedLead: Lead) => {
    setAllLeadsForCategories(prev => prev.map(l => l._id === updatedLead._id ? updatedLead : l));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDeleteModal(true);
    setOpenMenuId(null);
  };

  const handleContactClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowContactModal(true);
    setOpenMenuId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedLead) return;
    setActionLoading(true);
    try {
      await leadsAPI.delete(selectedLead._id);
      setAllLeadsForCategories(prev => prev.filter(l => l._id !== selectedLead._id));
    } catch (error) {
      console.error('Error deleting lead:', error);
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
      setSelectedLead(null);
    }
  };

  const handleContactConfirm = async () => {
    if (!selectedLead) return;
    setActionLoading(true);
    try {
      const newStatus = isContacted(selectedLead) ? 'new' : 'contacted';
      const response = await leadsAPI.update(selectedLead._id, { status: newStatus });
      if (response.data.success) fetchLeads();
    } catch (error) {
      console.error('Error updating lead status:', error);
    } finally {
      setActionLoading(false);
      setShowContactModal(false);
      setSelectedLead(null);
    }
  };

  const isContacted = (lead: Lead) =>
    lead.status === 'contacted' || lead.status === 'qualified' || lead.status === 'converted';

  const handleTagsClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowTagsModal(true);
    setOpenMenuId(null);
  };

  const handleTagsSuccess = (updated: Lead) => {
    setAllLeadsForCategories(prev => prev.map(l => l._id === updated._id ? updated : l));
  };

  // Bulk operations
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l._id)));
    }
  };

  const handleBulkDelete = async () => {
    setActionLoading(true);
    try {
      await Promise.all([...selectedIds].map(id => leadsAPI.delete(id)));
      setAllLeadsForCategories(prev => prev.filter(l => !selectedIds.has(l._id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error bulk deleting:', error);
    } finally {
      setActionLoading(false);
      setShowBulkDeleteModal(false);
    }
  };

  const handleBulkStatusChange = async (status: 'contacted' | 'new') => {
    try {
      await Promise.all([...selectedIds].map(id => leadsAPI.update(id, { status })));
      const response = await leadsAPI.getAll({ limit: 9999 });
      if (response.data.success) {
        setAllLeadsForCategories(response.data.data);
      }
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error bulk status change:', error);
    }
  };

  const handleExportExcel = () => {
    let filtered = [...allLeadsForCategories];
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(lead => {
        if (!lead.category) return false;
        return lead.category.split(',')[0].trim().toLowerCase() === categoryFilter.toLowerCase();
      });
    }
    if (statusFilter === 'contacted') {
      filtered = filtered.filter(lead =>
        lead.status === 'contacted' || lead.status === 'qualified' || lead.status === 'converted'
      );
    } else if (statusFilter === 'not_contacted') {
      filtered = filtered.filter(lead => lead.status === 'new' || !lead.status);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(lead => lead.business_name.toLowerCase().includes(q));
    }

    const rows = filtered.map(lead => ({
      'Business Name': lead.business_name,
      'Category': lead.category ? formatCategory(lead.category) : '',
      'Status': lead.status || 'new',
      'Phone': lead.phone || '',
      'Email': lead.email || '',
      'Website': lead.website || '',
      'Address': lead.address || '',
      'Rating': lead.rating ?? '',
      'Custom Tags': (lead.custom_tags || []).join(', '),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, `leads-export-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Kanban: group all leads by status
  const kanbanLeads = useMemo(() => {
    let filtered = [...allLeadsForCategories];
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(lead => {
        if (!lead.category) return false;
        return lead.category.split(',')[0].trim().toLowerCase() === categoryFilter.toLowerCase();
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(lead => lead.business_name.toLowerCase().includes(q));
    }
    const groups: Record<string, Lead[]> = { new: [], contacted: [], qualified: [], archive: [] };
    filtered.forEach(lead => {
      const status = lead.status || 'new';
      if (status === 'new' || !lead.status) groups.new.push(lead);
      else if (status === 'contacted') groups.contacted.push(lead);
      else if (status === 'qualified') groups.qualified.push(lead);
      else groups.archive.push(lead); // converted, lost
    });
    // Sort stale leads to top in "new" column
    groups.new.sort((a, b) => {
      const aStale = isStale(a) ? 0 : 1;
      const bStale = isStale(b) ? 0 : 1;
      return aStale - bStale;
    });
    return groups;
  }, [allLeadsForCategories, categoryFilter, searchQuery]);

  const handleKanbanStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const response = await leadsAPI.update(leadId, { status: newStatus as Lead['status'] });
      if (response.data.success) {
        setAllLeadsForCategories(prev => prev.map(l => l._id === leadId ? response.data.data : l));
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  };

  const contactedPct = stats.all > 0 ? Math.round((stats.contacted / stats.all) * 100) : 0;
  const allChecked = leads.length > 0 && selectedIds.size === leads.length;
  const someChecked = selectedIds.size > 0 && selectedIds.size < leads.length;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Leads</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              title="Table view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'kanban' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              title="Kanban view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={handleExportExcel}
            disabled={loading || allLeadsForCategories.length === 0}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30"
            title="Export Excel"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/leads/new')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#CE0505] rounded-md hover:bg-[#b00404] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Stat cards — subtle */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`text-left px-4 py-3 rounded-md bg-white transition-colors ${
            statusFilter === 'all' ? 'ring-1 ring-gray-300' : 'hover:bg-gray-50'
          }`}
        >
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Total Leads</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums mt-0.5">
            {loading ? '—' : stats.all.toLocaleString()}
          </p>
          <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden flex">
            <div className="bg-emerald-400 h-full transition-all" style={{ width: `${contactedPct}%` }} />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('not_contacted')}
          className={`text-left px-4 py-3 rounded-md bg-white transition-colors ${
            statusFilter === 'not_contacted' ? 'ring-1 ring-amber-300' : 'hover:bg-gray-50'
          }`}
        >
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums mt-0.5">
            {loading ? '—' : stats.notContacted.toLocaleString()}
          </p>
          <p className="text-[10px] text-amber-600 font-medium mt-2">
            {!loading && stats.all > 0 ? `${100 - contactedPct}% awaiting contact` : '—'}
          </p>
        </button>

        <button
          onClick={() => setStatusFilter('contacted')}
          className={`text-left px-4 py-3 rounded-md bg-white transition-colors ${
            statusFilter === 'contacted' ? 'ring-1 ring-emerald-300' : 'hover:bg-gray-50'
          }`}
        >
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Contacted</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums mt-0.5">
            {loading ? '—' : stats.contacted.toLocaleString()}
          </p>
          <p className="text-[10px] text-emerald-600 font-medium mt-2">
            {!loading && stats.all > 0 ? `${contactedPct}% reached` : '—'}
          </p>
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:border-gray-400 transition-colors"
          />
        </div>
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-md px-3 py-2 pr-8 text-xs font-medium text-gray-600 focus:outline-none focus:border-gray-400 cursor-pointer"
          >
            <option value="all">All categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{formatCategory(c)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="appearance-none bg-white border border-gray-200 rounded-md px-3 py-2 pr-8 text-xs font-medium text-gray-600 focus:outline-none focus:border-gray-400 cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 text-white rounded-md text-xs">
          <span className="font-medium">{selectedIds.size} selected</span>
          <div className="w-px h-4 bg-gray-700" />
          <button
            onClick={() => handleBulkStatusChange('contacted')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-gray-800 transition-colors font-medium"
          >
            <PhoneCall className="w-3 h-3" /> Mark Contacted
          </button>
          <button
            onClick={() => handleBulkStatusChange('new')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-gray-800 transition-colors font-medium"
          >
            Reset Status
          </button>
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-red-900 text-red-400 transition-colors font-medium ml-auto"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-2.5 py-1 rounded hover:bg-gray-800 transition-colors font-medium text-gray-400"
          >
            Clear
          </button>
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-4 gap-3 min-h-[500px]">
          {KANBAN_COLUMNS.map(col => {
            const columnLeads = kanbanLeads[col.key] || [];
            return (
              <div key={col.key} className="flex flex-col">
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-2 h-2 rounded-full ${col.color}`} />
                  <span className="text-xs font-semibold text-gray-700">{col.label}</span>
                  <span className="text-[10px] text-gray-400 font-medium">{columnLeads.length}</span>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] pr-0.5">
                  {columnLeads.length === 0 ? (
                    <div className="bg-gray-50 rounded-md border border-dashed border-gray-200 p-6 text-center">
                      <p className="text-[11px] text-gray-400">No leads</p>
                    </div>
                  ) : (
                    columnLeads.map(lead => {
                      const stale = isStale(lead);
                      return (
                        <div
                          key={lead._id}
                          className="bg-white rounded-md border border-gray-200 p-3 hover:border-gray-300 transition-colors group cursor-pointer"
                          onClick={() => navigate(`/leads/${lead._id}`)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {stale && <Flame className="w-3 h-3 text-orange-400 shrink-0" />}
                              <p className="text-sm font-medium text-gray-900 truncate">{lead.business_name}</p>
                            </div>
                          </div>

                          {lead.category && (
                            <p className="text-[10px] text-gray-400 mb-2 truncate">{formatCategory(lead.category)}</p>
                          )}

                          {/* Contact info */}
                          <div className="flex flex-col gap-0.5 mb-2">
                            {lead.phone && (
                              <span className="text-[10px] text-gray-500 flex items-center gap-1 font-mono">
                                <Phone className="w-2.5 h-2.5 text-gray-400" />
                                {lead.phone}
                              </span>
                            )}
                            {lead.email && (
                              <span className="text-[10px] text-gray-500 flex items-center gap-1 truncate">
                                <Mail className="w-2.5 h-2.5 text-gray-400" />
                                <span className="truncate">{lead.email}</span>
                              </span>
                            )}
                          </div>

                          {/* Tags */}
                          {lead.custom_tags && lead.custom_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {lead.custom_tags.slice(0, 2).map(tag => (
                                <span key={tag} className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${tagColor(tag)}`}>
                                  {tag}
                                </span>
                              ))}
                              {lead.custom_tags.length > 2 && (
                                <span className="px-1 py-0.5 text-[9px] text-gray-400">+{lead.custom_tags.length - 2}</span>
                              )}
                            </div>
                          )}

                          {/* Move actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1 border-t border-gray-100">
                            {col.key !== 'new' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleKanbanStatusChange(lead._id, 'new'); }}
                                className="px-1.5 py-0.5 text-[9px] font-medium text-gray-500 hover:bg-gray-100 rounded transition-colors"
                              >
                                New
                              </button>
                            )}
                            {col.key !== 'contacted' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleKanbanStatusChange(lead._id, 'contacted'); }}
                                className="px-1.5 py-0.5 text-[9px] font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              >
                                In Progress
                              </button>
                            )}
                            {col.key !== 'qualified' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleKanbanStatusChange(lead._id, 'qualified'); }}
                                className="px-1.5 py-0.5 text-[9px] font-medium text-purple-600 hover:bg-purple-50 rounded transition-colors"
                              >
                                Follow Up
                              </button>
                            )}
                            {col.key !== 'archive' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleKanbanStatusChange(lead._id, 'converted'); }}
                                className="px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 hover:bg-emerald-50 rounded transition-colors ml-auto"
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      {viewMode === 'table' && <div className="bg-white rounded-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={el => { if (el) el.indeterminate = someChecked; }}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-[#CE0505] focus:ring-0 cursor-pointer accent-[#CE0505]"
                />
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                Category
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">
                Tags
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 py-2.5 w-20" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Loading...</p>
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <p className="text-xs text-gray-400">No leads found</p>
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const stale = isStale(lead);
                const checked = selectedIds.has(lead._id);

                return (
                  <tr
                    key={lead._id}
                    className={`border-b border-gray-100 transition-colors group ${
                      checked ? 'bg-blue-50/40' :
                      stale ? 'bg-orange-50/40' :
                      'hover:bg-gray-50/60'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(lead._id)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-[#CE0505] focus:ring-0 cursor-pointer accent-[#CE0505]"
                      />
                    </td>

                    {/* Name */}
                    <td className="px-3 py-3">
                      <button
                        onClick={() => navigate(`/leads/${lead._id}`)}
                        className="text-left group/name"
                      >
                        <div className="flex items-center gap-2">
                          {stale && <Flame className="w-3 h-3 text-orange-400 shrink-0" title="Stale — no activity for 48h+" />}
                          <span className="text-sm font-medium text-gray-900 group-hover/name:text-[#CE0505] transition-colors">
                            {lead.business_name}
                          </span>
                        </div>
                        {lead.address && (
                          <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[240px]">{lead.address}</p>
                        )}
                      </button>
                    </td>

                    {/* Contact */}
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="text-[11px] text-gray-600 hover:text-[#CE0505] flex items-center gap-1 font-mono w-fit">
                            <Phone className="w-3 h-3 shrink-0 text-gray-400" />
                            {lead.phone}
                          </a>
                        )}
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="text-[11px] text-gray-600 hover:text-[#CE0505] flex items-center gap-1 font-mono w-fit max-w-[180px]">
                            <Mail className="w-3 h-3 shrink-0 text-gray-400" />
                            <span className="truncate">{lead.email}</span>
                          </a>
                        )}
                        {lead.website && (
                          <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 hover:text-[#CE0505] flex items-center gap-1 w-fit">
                            <Globe className="w-3 h-3 shrink-0 text-gray-400" />
                            Website
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        {!lead.phone && !lead.email && !lead.website && (
                          <span className="text-[11px] text-gray-300">—</span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3 hidden lg:table-cell">
                      {lead.category ? (
                        <span className="text-[11px] text-gray-500">{formatCategory(lead.category)}</span>
                      ) : (
                        <span className="text-[11px] text-gray-300">—</span>
                      )}
                    </td>

                    {/* Tags */}
                    <td className="px-3 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {lead.custom_tags && lead.custom_tags.length > 0 ? (
                          <>
                            {lead.custom_tags.slice(0, 2).map(tag => (
                              <span key={tag} className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${tagColor(tag)}`}>
                                {tag}
                              </span>
                            ))}
                            {lead.custom_tags.length > 2 && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-400">
                                +{lead.custom_tags.length - 2}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-gray-300">—</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3">
                      {lead.status === 'converted' ? (
                        <span className="text-[11px] font-medium text-emerald-600">Converted</span>
                      ) : lead.status === 'qualified' ? (
                        <span className="text-[11px] font-medium text-blue-600">Qualified</span>
                      ) : isContacted(lead) ? (
                        <span className="text-[11px] font-medium text-emerald-600">Contacted</span>
                      ) : lead.status === 'lost' ? (
                        <span className="text-[11px] font-medium text-gray-400">Lost</span>
                      ) : (
                        <span className="text-[11px] font-medium text-amber-600">
                          {stale ? 'Stale' : 'New'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => navigate(`/leads/${lead._id}`)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <div className="relative" ref={openMenuId === lead._id ? menuRef : null}>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === lead._id ? null : lead._id)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                          {openMenuId === lead._id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
                              <button
                                onClick={() => handleContactClick(lead)}
                                className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <PhoneCall className="w-3.5 h-3.5 text-gray-400" />
                                {isContacted(lead) ? 'Reset to New' : 'Mark Contacted'}
                              </button>
                              <button
                                onClick={() => handleTagsClick(lead)}
                                className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Tag className="w-3.5 h-3.5 text-gray-400" />
                                Manage Tags
                              </button>
                              <div className="border-t border-gray-100 my-0.5" />
                              <button
                                onClick={() => handleDeleteClick(lead)}
                                className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 text-xs text-gray-500">
            <span>
              {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, total)} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    disabled={loading}
                    className={`w-7 h-7 text-[11px] font-medium rounded transition-colors ${
                      currentPage === pageNum
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>}

      {/* Modals */}
      <ManageTagsModal
        isOpen={showTagsModal}
        lead={selectedLead}
        onClose={() => { setShowTagsModal(false); setSelectedLead(null); }}
        onSuccess={handleTagsSuccess}
      />

      {selectedLead && (
        <ContactStatusModal
          isOpen={showStatusModal}
          onClose={() => { setShowStatusModal(false); setSelectedLead(null); }}
          lead={selectedLead}
          onSuccess={handleStatusSuccess}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedLead(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete Lead"
        message={`Delete "${selectedLead?.business_name}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={actionLoading}
      />

      <ConfirmModal
        isOpen={showContactModal}
        onClose={() => { setShowContactModal(false); setSelectedLead(null); }}
        onConfirm={handleContactConfirm}
        title={selectedLead && isContacted(selectedLead) ? 'Reset Status' : 'Mark Contacted'}
        message={
          selectedLead && isContacted(selectedLead)
            ? `Reset "${selectedLead?.business_name}" to New?`
            : `Mark "${selectedLead?.business_name}" as Contacted?`
        }
        confirmText="Confirm"
        cancelText="Cancel"
        variant={selectedLead && isContacted(selectedLead) ? 'warning' : 'default'}
        loading={actionLoading}
      />

      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected"
        message={`Delete ${selectedIds.size} lead${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}

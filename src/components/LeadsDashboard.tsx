import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, RefreshCw, Loader2, ChevronLeft, ChevronRight,
  Phone, Mail, Globe, ExternalLink, UserCheck, UserX, Eye,
  PhoneCall, PhoneOff, ChevronDown, MoreVertical, Trash2,
  Users, CheckCircle2, CircleDashed, Plus, Download, Tag,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { leadsAPI } from '../services/api';
import type { Lead, LeadsStats } from '../services/api';
import { formatCategory } from '../utils/formatters';
import ContactStatusModal from './ContactStatusModal';
import ConfirmModal from './ConfirmModal';
import ManageTagsModal from './ManageTagsModal';

type StatusFilter = 'all' | 'not_contacted' | 'contacted';

const isValidStatusFilter = (value: string | null): value is StatusFilter => {
  return value === 'all' || value === 'not_contacted' || value === 'contacted';
};

const TAG_COLORS = [
  'bg-violet-50 text-violet-700',
  'bg-sky-50 text-sky-700',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-700',
  'bg-indigo-50 text-indigo-700',
];

function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

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

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [showTagsModal, setShowTagsModal] = useState(false);

  const EXCLUDED_CATEGORIES = new Set([
    'point_of_interest', 'point of interest', 'establishment',
  ]);

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

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, categoryFilter, searchQuery, itemsPerPage]);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleStatusSuccess = (updatedLead: Lead) => {
    setAllLeadsForCategories(prev => prev.map(l => l._id === updatedLead._id ? updatedLead : l));
  };

  const handleViewDetails = (lead: Lead) => {
    navigate(`/leads/${lead._id}`);
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

  const handleMenuToggle = (leadId: string) => {
    setOpenMenuId(openMenuId === leadId ? null : leadId);
  };

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
      if (response.data.success) {
        setLeads(prev => prev.map(l => l._id === selectedLead._id ? response.data.data : l));
        fetchLeads();
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
    } finally {
      setActionLoading(false);
      setShowContactModal(false);
      setSelectedLead(null);
    }
  };

  const isContacted = (lead: Lead) => {
    return lead.status === 'contacted' || lead.status === 'qualified' || lead.status === 'converted';
  };

  const handleTagsClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowTagsModal(true);
    setOpenMenuId(null);
  };

  const handleTagsSuccess = (updated: Lead) => {
    setAllLeadsForCategories(prev => prev.map(l => l._id === updated._id ? updated : l));
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
      'System Tags': [
        lead.is_small_business ? 'Small Business' : '',
        lead.is_informal_business ? 'Informal' : '',
        lead.has_website === false ? 'No Website' : '',
        lead.social_media_only ? 'Social Only' : '',
        lead.has_website ? 'Has Website' : '',
      ].filter(Boolean).join(', '),
      'Custom Tags': (lead.custom_tags || []).join(', '),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `leads-export-${date}.xlsx`);
  };

  const contactedPct = stats.all > 0 ? Math.round((stats.contacted / stats.all) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? '—' : `${total.toLocaleString()} records`}
          </p>
        </div>
        <button
          onClick={() => navigate('/leads/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#CE0505] rounded-lg hover:bg-[#b00404] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Business
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total */}
        <div
          className={`bg-white rounded-xl shadow-sm p-5 cursor-pointer transition-all border ${
            statusFilter === 'all' ? 'border-[#CE0505]/30 ring-1 ring-[#CE0505]/10' : 'border-gray-100 hover:shadow-md'
          }`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-500" />
            </div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">All</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums leading-none">
            {loading ? <span className="text-gray-200">—</span> : stats.all.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1.5 font-medium">Total Leads</p>
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 h-full rounded-l-full transition-all" style={{ width: `${contactedPct}%` }} />
            <div className="bg-amber-400 h-full flex-1 transition-all" />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-emerald-600 font-medium">{contactedPct}% done</span>
            <span className="text-[10px] text-amber-600 font-medium">{100 - contactedPct}% pending</span>
          </div>
        </div>

        {/* Contacted */}
        <div
          className={`bg-white rounded-xl shadow-sm p-5 cursor-pointer transition-all border ${
            statusFilter === 'contacted' ? 'border-emerald-300 ring-1 ring-emerald-50' : 'border-gray-100 hover:shadow-md'
          }`}
          onClick={() => setStatusFilter('contacted')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Contacted</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums leading-none">
            {loading ? <span className="text-gray-200">—</span> : stats.contacted.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1.5 font-medium">Leads Reached</p>
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${contactedPct}%` }} />
          </div>
          <p className="text-[10px] text-emerald-600 font-medium mt-1.5">
            {!loading && stats.all > 0 ? `${contactedPct}% of total` : '—'}
          </p>
        </div>

        {/* Pending */}
        <div
          className={`bg-white rounded-xl shadow-sm p-5 cursor-pointer transition-all border ${
            statusFilter === 'not_contacted' ? 'border-amber-300 ring-1 ring-amber-50' : 'border-gray-100 hover:shadow-md'
          }`}
          onClick={() => setStatusFilter('not_contacted')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <CircleDashed className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Pending</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums leading-none">
            {loading ? <span className="text-gray-200">—</span> : stats.notContacted.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1.5 font-medium">Awaiting Contact</p>
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${100 - contactedPct}%` }} />
          </div>
          <p className="text-[10px] text-amber-600 font-medium mt-1.5">
            {!loading && stats.all > 0 ? `${100 - contactedPct}% of total` : '—'}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Dropdowns */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:border-gray-400 cursor-pointer"
              >
                <option value="all">All ({stats.all})</option>
                <option value="not_contacted">Not Contacted ({stats.notContacted})</option>
                <option value="contacted">Contacted ({stats.contacted})</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            {/* Category */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:border-gray-400 cursor-pointer min-w-[150px]"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {formatCategory(category)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            {/* Per page */}
            <div className="relative">
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:border-gray-400 cursor-pointer"
              >
                <option value={10}>10 / page</option>
                <option value={15}>15 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by business name..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-gray-400 focus:bg-white transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#CE0505] rounded-lg hover:bg-[#b00404] transition-colors"
            >
              Search
            </button>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={loading || allLeadsForCategories.length === 0}
              className="px-3 py-2 text-sm font-medium text-[#0CA684] bg-gray-50 border border-gray-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 transition-colors flex items-center gap-2 disabled:opacity-50"
              title="Download as Excel"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:block">Excel</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:block">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-[0.12em] bg-gray-50 w-[28%]">
                  Business
                </th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-[0.12em] bg-gray-50 w-[20%]">
                  Contact
                </th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-[0.12em] bg-gray-50 w-[14%]">
                  Category
                </th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-[0.12em] bg-gray-50 w-[14%]">
                  Tags
                </th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-[0.12em] bg-gray-50 w-[10%]">
                  Status
                </th>
                <th className="px-5 py-3.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-[0.12em] bg-gray-50 w-[14%]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#CE0505] mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Loading leads...</p>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <CircleDashed className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">No leads found</p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead._id}
                    className="group transition-colors hover:bg-gray-50/80"
                  >
                    {/* Business */}
                    <td className="px-5 py-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm leading-snug">{lead.business_name}</p>
                        {lead.address && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[260px]">{lead.address}</p>
                        )}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-xs text-[#CE0505] hover:text-[#b00404] flex items-center gap-1.5 font-mono w-fit"
                          >
                            <Phone className="w-3 h-3 shrink-0" />
                            {lead.phone}
                          </a>
                        )}
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-xs text-[#CE0505] hover:text-[#b00404] flex items-center gap-1.5 font-mono w-fit max-w-[180px] truncate"
                          >
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </a>
                        )}
                        {lead.website && (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#CE0505] hover:text-[#b00404] flex items-center gap-1.5 w-fit"
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            <span>Website</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        )}
                        {!lead.phone && !lead.email && !lead.website && (
                          <span className="text-xs text-gray-300 italic">—</span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4">
                      {lead.category ? (
                        <span className="inline-block text-xs text-gray-600 bg-gray-100 rounded-md px-2 py-1 max-w-[160px] truncate">
                          {formatCategory(lead.category)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Tags */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {lead.custom_tags && lead.custom_tags.length > 0 ? (
                          <>
                            {lead.custom_tags.slice(0, 2).map(tag => (
                              <span
                                key={tag}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${tagColor(tag)}`}
                              >
                                <Tag className="w-2.5 h-2.5 shrink-0" />
                                {tag}
                              </span>
                            ))}
                            {lead.custom_tags.length > 2 && (
                              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 text-gray-500">
                                +{lead.custom_tags.length - 2}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {isContacted(lead) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 whitespace-nowrap">
                          <UserCheck className="w-3 h-3" />
                          Done
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 whitespace-nowrap">
                          <UserX className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewDetails(lead)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                        <div className="relative" ref={openMenuId === lead._id ? menuRef : null}>
                          <button
                            onClick={() => handleMenuToggle(lead._id)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuId === lead._id && (
                            <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-10">
                              <button
                                onClick={() => handleContactClick(lead)}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                              >
                                {isContacted(lead) ? (
                                  <>
                                    <PhoneOff className="w-4 h-4 text-orange-500" />
                                    Mark as Not Contacted
                                  </>
                                ) : (
                                  <>
                                    <PhoneCall className="w-4 h-4 text-emerald-600" />
                                    Mark as Contacted
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleTagsClick(lead)}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                              >
                                <Tag className="w-4 h-4 text-[#CE0505]" />
                                Manage Tags
                              </button>
                              <div className="my-1 border-t border-gray-100" />
                              <button
                                onClick={() => handleDeleteClick(lead)}
                                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Record
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">
              {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, total)} of {total.toLocaleString()} leads
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    disabled={loading}
                    className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'bg-[#CE0505] text-white shadow-sm'
                        : 'text-gray-600 hover:bg-white hover:border-gray-200 border border-transparent'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manage Tags Modal */}
      <ManageTagsModal
        isOpen={showTagsModal}
        lead={selectedLead}
        onClose={() => { setShowTagsModal(false); setSelectedLead(null); }}
        onSuccess={handleTagsSuccess}
      />

      {/* Contact Status Modal */}
      {selectedLead && (
        <ContactStatusModal
          isOpen={showStatusModal}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedLead(null);
          }}
          lead={selectedLead}
          onSuccess={handleStatusSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedLead(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Lead"
        message={`Are you sure you want to delete "${selectedLead?.business_name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={actionLoading}
      />

      {/* Mark Contacted Confirmation Modal */}
      <ConfirmModal
        isOpen={showContactModal}
        onClose={() => {
          setShowContactModal(false);
          setSelectedLead(null);
        }}
        onConfirm={handleContactConfirm}
        title={selectedLead && isContacted(selectedLead) ? 'Mark as Not Contacted' : 'Mark as Contacted'}
        message={
          selectedLead && isContacted(selectedLead)
            ? `Are you sure you want to mark "${selectedLead?.business_name}" as not contacted?`
            : `Are you sure you want to mark "${selectedLead?.business_name}" as contacted?`
        }
        confirmText="Confirm"
        cancelText="Cancel"
        variant={selectedLead && isContacted(selectedLead) ? 'warning' : 'default'}
        loading={actionLoading}
      />
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, RefreshCw, Loader2, ChevronLeft, ChevronRight,
  Phone, Mail, Globe, ExternalLink, UserCheck, UserX, Eye,
  PhoneCall, PhoneOff, ChevronDown, Filter, MoreVertical, Trash2,
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

export default function LeadsDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [allLeadsForCategories, setAllLeadsForCategories] = useState<Lead[]>([]);
  const [dataReady, setDataReady] = useState(false); // true once full dataset is loaded
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

  // Fetch ALL leads once for reliable client-side filtering
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
    // Wait until the full dataset is loaded before filtering
    if (!dataReady) return;

    try {
      setLoading(true);

      // Always filter client-side from the full cached dataset
      let filtered = [...allLeadsForCategories];

      // 1. Category filter
      if (categoryFilter !== 'all') {
        filtered = filtered.filter(lead => {
          if (!lead.category) return false;
          return lead.category.split(',')[0].trim().toLowerCase() === categoryFilter.toLowerCase();
        });
      }

      // 2. Status filter
      if (statusFilter === 'contacted') {
        filtered = filtered.filter(lead =>
          lead.status === 'contacted' || lead.status === 'qualified' || lead.status === 'converted'
        );
      } else if (statusFilter === 'not_contacted') {
        filtered = filtered.filter(lead =>
          lead.status === 'new' || !lead.status
        );
      }

      // 3. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(lead =>
          lead.business_name.toLowerCase().includes(q)
        );
      }

      // 4. Stats from full dataset (unaffected by current filter)
      const allData = allLeadsForCategories;
      const contactedTotal = allData.filter(l =>
        l.status === 'contacted' || l.status === 'qualified' || l.status === 'converted'
      ).length;
      setStats({
        all: allData.length,
        contacted: contactedTotal,
        notContacted: allData.length - contactedTotal,
      });

      // 5. Paginate
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

  // Re-fetches the full source dataset then filtering re-runs automatically
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
    // Update the cache too so re-filtering is accurate
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
    // Apply current filters to allLeadsForCategories
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
    <div className="space-y-5">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 tracking-tight">Leads</h1>
          <p className="text-sm text-dynaton-muted mt-0.5 font-mono">
            {loading ? '—' : total.toLocaleString()} records
          </p>
        </div>
        <button
          onClick={() => navigate('/leads/new')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-dynaton-red rounded-lg hover:bg-dynaton-red-dark transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Business
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total */}
        <div
          className={`stat-card bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'all' ? 'border-dynaton-red shadow-sm ring-1 ring-dynaton-red/10' : 'border-dynaton-border hover:border-gray-300'
          }`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-9 h-9 rounded-lg bg-dynaton-gray flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-500" />
            </div>
            <span className="text-[10px] font-semibold text-dynaton-muted uppercase tracking-widest">All</span>
          </div>
          <p className="font-mono text-3xl font-bold text-gray-900 tabular-nums leading-none">
            {loading ? <span className="text-gray-200">—</span> : stats.all.toLocaleString()}
          </p>
          <p className="text-xs font-semibold text-dynaton-muted mt-1.5 mb-3">Total Leads</p>
          {/* Progress split bar */}
          <div className="h-1.5 bg-dynaton-gray rounded-full overflow-hidden flex">
            <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${contactedPct}%` }} />
            <div className="bg-amber-400 h-full flex-1 transition-all" />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-green-600 font-mono">{contactedPct}% done</span>
            <span className="text-[10px] text-amber-600 font-mono">{100 - contactedPct}% pending</span>
          </div>
        </div>

        {/* Contacted */}
        <div
          className={`stat-card bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'contacted' ? 'border-green-400 shadow-sm ring-1 ring-green-100' : 'border-dynaton-border hover:border-green-200'
          }`}
          onClick={() => setStatusFilter('contacted')}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-[10px] font-semibold text-dynaton-muted uppercase tracking-widest">Contacted</span>
          </div>
          <p className="font-mono text-3xl font-bold text-gray-900 tabular-nums leading-none">
            {loading ? <span className="text-gray-200">—</span> : stats.contacted.toLocaleString()}
          </p>
          <p className="text-xs font-semibold text-dynaton-muted mt-1.5 mb-3">Leads Reached</p>
          <div className="h-1.5 bg-dynaton-gray rounded-full overflow-hidden">
            <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${contactedPct}%` }} />
          </div>
          <p className="text-[10px] text-green-600 font-mono mt-1.5">
            {!loading && stats.all > 0 ? `${contactedPct}% of total` : '—'}
          </p>
        </div>

        {/* Not Contacted */}
        <div
          className={`stat-card bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'not_contacted' ? 'border-amber-400 shadow-sm ring-1 ring-amber-50' : 'border-dynaton-border hover:border-amber-200'
          }`}
          onClick={() => setStatusFilter('not_contacted')}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <CircleDashed className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[10px] font-semibold text-dynaton-muted uppercase tracking-widest">Pending</span>
          </div>
          <p className="font-mono text-3xl font-bold text-gray-900 tabular-nums leading-none">
            {loading ? <span className="text-gray-200">—</span> : stats.notContacted.toLocaleString()}
          </p>
          <p className="text-xs font-semibold text-dynaton-muted mt-1.5 mb-3">Awaiting Contact</p>
          <div className="h-1.5 bg-dynaton-gray rounded-full overflow-hidden">
            <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${100 - contactedPct}%` }} />
          </div>
          <p className="text-[10px] text-amber-600 font-mono mt-1.5">
            {!loading && stats.all > 0 ? `${100 - contactedPct}% of total` : '—'}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-dynaton-border p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2.5">
            <Filter className="w-4 h-4 text-dynaton-muted shrink-0" />

            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="appearance-none bg-dynaton-gray border border-dynaton-border rounded-lg px-3 py-2 pr-9 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-dynaton-red/20 focus:border-dynaton-red cursor-pointer"
              >
                <option value="all">All ({stats.all})</option>
                <option value="not_contacted">Not Contacted ({stats.notContacted})</option>
                <option value="contacted">Contacted ({stats.contacted})</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dynaton-muted pointer-events-none" />
            </div>

            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none bg-dynaton-gray border border-dynaton-border rounded-lg px-3 py-2 pr-9 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-dynaton-red/20 focus:border-dynaton-red cursor-pointer min-w-37.5"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {formatCategory(category)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dynaton-muted pointer-events-none" />
            </div>

            {/* Items Per Page */}
            <div className="relative">
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="appearance-none bg-dynaton-gray border border-dynaton-border rounded-lg px-3 py-2 pr-9 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-dynaton-red/20 focus:border-dynaton-red cursor-pointer"
              >
                <option value={10}>10 / page</option>
                <option value={15}>15 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dynaton-muted pointer-events-none" />
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dynaton-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by business name..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-dynaton-border rounded-lg bg-dynaton-gray focus:outline-none focus:ring-2 focus:ring-dynaton-red/20 focus:border-dynaton-red focus:bg-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-dynaton-red rounded-lg hover:bg-dynaton-red-dark transition-colors"
            >
              Search
            </button>
          </form>

          {/* Download Excel */}
          <button
            onClick={handleExportExcel}
            disabled={loading || allLeadsForCategories.length === 0}
            className="px-3 py-2 text-sm font-medium text-dynaton-teal bg-dynaton-gray border border-dynaton-border rounded-lg hover:bg-teal-50 hover:border-teal-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            title="Download as Excel"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:block">Excel</span>
          </button>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-dynaton-gray border border-dynaton-border rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:block">Refresh</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-dynaton-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dynaton-border">
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-dynaton-muted uppercase tracking-[0.12em] bg-dynaton-gray w-[30%]">
                  Business
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-dynaton-muted uppercase tracking-[0.12em] bg-dynaton-gray w-[22%]">
                  Contact
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-dynaton-muted uppercase tracking-[0.12em] bg-dynaton-gray w-[20%]">
                  Category
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-dynaton-muted uppercase tracking-[0.12em] bg-dynaton-gray w-[13%]">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-dynaton-muted uppercase tracking-[0.12em] bg-dynaton-gray w-[15%]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-dynaton-red mx-auto mb-3" />
                    <p className="text-sm text-dynaton-muted font-mono">Loading leads...</p>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <CircleDashed className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-dynaton-muted">No leads found</p>
                  </td>
                </tr>
              ) : (
                leads.map((lead, idx) => (
                  <tr
                    key={lead._id}
                    className={`leads-row group transition-colors hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-dynaton-surface'} border-b border-dynaton-border last:border-b-0`}
                  >
                    {/* Business */}
                    <td className="px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm leading-snug">{lead.business_name}</p>
                        {lead.address && (
                          <p className="text-xs text-dynaton-muted mt-0.5 truncate max-w-65">{lead.address}</p>
                        )}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1">
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-xs text-dynaton-red hover:text-dynaton-red-dark flex items-center gap-1.5 font-mono w-fit"
                          >
                            <Phone className="w-3 h-3 shrink-0" />
                            {lead.phone}
                          </a>
                        )}
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-xs text-dynaton-red hover:text-dynaton-red-dark flex items-center gap-1.5 font-mono w-fit max-w-45 truncate"
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
                            className="text-xs text-dynaton-red hover:text-dynaton-red-dark flex items-center gap-1.5 w-fit"
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
                    <td className="px-5 py-3.5">
                      {lead.category ? (
                        <span className="inline-block text-xs text-gray-600 bg-gray-100 rounded-md px-2 py-0.5 max-w-40 truncate">
                          {formatCategory(lead.category)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      {isContacted(lead) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-100 whitespace-nowrap">
                          <UserCheck className="w-3 h-3" />
                          Done
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-100 whitespace-nowrap">
                          <UserX className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewDetails(lead)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-dynaton-red bg-dynaton-red/5 border border-dynaton-red/20 hover:bg-dynaton-red hover:text-white rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                        <div className="relative" ref={openMenuId === lead._id ? menuRef : null}>
                          <button
                            onClick={() => handleMenuToggle(lead._id)}
                            className="p-1.5 text-dynaton-muted hover:text-gray-700 hover:bg-dynaton-gray rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuId === lead._id && (
                            <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-dynaton-border py-1.5 z-10">
                              <button
                                onClick={() => handleContactClick(lead)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-dynaton-gray flex items-center gap-2.5"
                              >
                                {isContacted(lead) ? (
                                  <>
                                    <PhoneOff className="w-4 h-4 text-orange-500" />
                                    Mark as Not Contacted
                                  </>
                                ) : (
                                  <>
                                    <PhoneCall className="w-4 h-4 text-green-600" />
                                    Mark as Contacted
                                  </>
                                )}
                              </button>
                                  <button
                                onClick={() => handleTagsClick(lead)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-dynaton-gray flex items-center gap-2.5"
                              >
                                <Tag className="w-4 h-4 text-dynaton-red" />
                                Manage Tags
                              </button>
                              <div className="my-1 border-t border-dynaton-border" />
                              <button
                                onClick={() => handleDeleteClick(lead)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5"
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
          <div className="flex items-center justify-between px-5 py-3 border-t border-dynaton-border bg-dynaton-gray">
            <p className="text-xs text-dynaton-muted font-mono">
              {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, total)} of {total.toLocaleString()} leads
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="p-1.5 text-dynaton-muted hover:text-gray-700 hover:bg-white border border-transparent hover:border-dynaton-border rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
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
                    className={`w-8 h-8 text-xs font-mono font-medium rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'bg-dynaton-red text-white shadow-sm'
                        : 'text-gray-600 hover:bg-white hover:border-dynaton-border border border-transparent'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className="p-1.5 text-dynaton-muted hover:text-gray-700 hover:bg-white border border-transparent hover:border-dynaton-border rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
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

      {/* Mark as Contacted Confirmation Modal */}
      <ConfirmModal
        isOpen={showContactModal}
        onClose={() => {
          setShowContactModal(false);
          setSelectedLead(null);
        }}
        onConfirm={handleContactConfirm}
        title={selectedLead && isContacted(selectedLead) ? "Mark as Not Contacted" : "Mark as Contacted"}
        message={selectedLead && isContacted(selectedLead)
          ? `Are you sure you want to mark "${selectedLead?.business_name}" as not contacted?`
          : `Are you sure you want to mark "${selectedLead?.business_name}" as contacted?`
        }
        confirmText="Confirm"
        cancelText="Cancel"
        variant={selectedLead && isContacted(selectedLead) ? "warning" : "default"}
        loading={actionLoading}
      />
    </div>
  );
}

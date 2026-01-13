import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, RefreshCw, Loader2, ChevronLeft, ChevronRight, Phone, Mail, Globe, ExternalLink, UserCheck, UserX, Eye, PhoneCall, PhoneOff, ChevronDown, Filter, MoreVertical, Trash2 } from 'lucide-react';
import { leadsAPI } from '../services/api';
import type { Lead, LeadsStats } from '../services/api';
import ContactStatusModal from './ContactStatusModal';
import ConfirmModal from './ConfirmModal';

type StatusFilter = 'all' | 'not_contacted' | 'contacted';

const isValidStatusFilter = (value: string | null): value is StatusFilter => {
  return value === 'all' || value === 'not_contacted' || value === 'contacted';
};

export default function LeadsDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL params
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allLeadsForCategories, setAllLeadsForCategories] = useState<Lead[]>([]);
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

  // Menu and confirmation states
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Extract unique categories from leads
  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    allLeadsForCategories.forEach(lead => {
      if (lead.category) {
        // Get the first/main category from comma-separated list
        const mainCategory = lead.category.split(',')[0].trim();
        categorySet.add(mainCategory);
      }
    });
    return Array.from(categorySet).sort();
  }, [allLeadsForCategories]);

  // Fetch all leads once to get categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await leadsAPI.getAll({ limit: 1000 });
        if (response.data.success) {
          setAllLeadsForCategories(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Sync state to URL params
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
    try {
      setLoading(true);

      // If category filter is active, filter from allLeadsForCategories
      if (categoryFilter !== 'all' && allLeadsForCategories.length > 0) {
        let filteredLeads = allLeadsForCategories.filter(lead => {
          if (!lead.category) return false;
          const mainCategory = lead.category.split(',')[0].trim().toLowerCase();
          return mainCategory === categoryFilter.toLowerCase();
        });

        // Apply status filter
        if (statusFilter === 'contacted') {
          filteredLeads = filteredLeads.filter(lead =>
            lead.status === 'contacted' || lead.status === 'qualified' || lead.status === 'converted'
          );
        } else if (statusFilter === 'not_contacted') {
          filteredLeads = filteredLeads.filter(lead =>
            lead.status === 'new' || !lead.status
          );
        }

        // Apply search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filteredLeads = filteredLeads.filter(lead =>
            lead.business_name.toLowerCase().includes(query)
          );
        }

        // Client-side pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedLeads = filteredLeads.slice(startIndex, startIndex + itemsPerPage);
        setLeads(paginatedLeads);
        setTotalPages(Math.ceil(filteredLeads.length / itemsPerPage) || 1);
        setTotal(filteredLeads.length);

        // Update stats for filtered results
        const contactedCount = filteredLeads.filter(l =>
          l.status === 'contacted' || l.status === 'qualified' || l.status === 'converted'
        ).length;
        setStats({
          all: filteredLeads.length,
          contacted: contactedCount,
          notContacted: filteredLeads.length - contactedCount,
        });
      } else {
        // Use server-side filtering when no category filter
        const response = await leadsAPI.getAll({
          status: statusFilter,
          search: searchQuery || undefined,
          page: currentPage,
          limit: itemsPerPage,
        });

        if (response.data.success) {
          setLeads(response.data.data);
          setTotalPages(response.data.totalPages);
          setTotal(response.data.total);
          setStats(response.data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, searchQuery, currentPage, itemsPerPage, allLeadsForCategories]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, categoryFilter, searchQuery, itemsPerPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLeads();
  };

  const handleStatusSuccess = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l._id === updatedLead._id ? updatedLead : l));
    fetchLeads();
  };

  const handleViewDetails = (lead: Lead) => {
    navigate(`/leads/${lead._id}`);
  };

  // Close menu when clicking outside
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
      setLeads(prev => prev.filter(l => l._id !== selectedLead._id));
      fetchLeads();
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

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Filter Dropdowns */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-400" />

            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#CE0505]/20 focus:border-[#CE0505] cursor-pointer"
              >
                <option value="all">All Status ({stats.all})</option>
                <option value="not_contacted">Not Contacted ({stats.notContacted})</option>
                <option value="contacted">Contacted ({stats.contacted})</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#CE0505]/20 focus:border-[#CE0505] cursor-pointer min-w-[160px]"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Items Per Page Dropdown */}
            <div className="relative">
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#CE0505]/20 focus:border-[#CE0505] cursor-pointer"
              >
                <option value={10}>10 per page</option>
                <option value={15}>15 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CE0505]/20 focus:border-[#CE0505]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[#CE0505] rounded-lg hover:bg-[#B80404] transition-colors"
            >
              Search
            </button>
          </form>

          {/* Refresh */}
          <button
            onClick={() => fetchLeads()}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-[22%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="w-[22%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="w-[16%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="w-[14%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="w-[26%] px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#CE0505] mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading leads...</p>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <p className="text-sm text-gray-500">No leads found</p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{lead.business_name}</p>
                        {lead.address && (
                          <p className="text-sm text-gray-500 mt-0.5 truncate">{lead.address}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1 min-w-0">
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="text-sm text-[#CE0505] hover:underline flex items-center gap-1 truncate">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{lead.phone}</span>
                          </a>
                        )}
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="text-sm text-[#CE0505] hover:underline flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </a>
                        )}
                        {lead.website && (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[#CE0505] hover:underline flex items-center gap-1">
                            <Globe className="w-3 h-3 flex-shrink-0" />
                            <span>Website</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        )}
                        {!lead.phone && !lead.email && !lead.website && (
                          <span className="text-sm text-gray-400">No contact info</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600 truncate block">{lead.category || '-'}</span>
                    </td>
                    <td className="px-4 py-4">
                      {isContacted(lead) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700 whitespace-nowrap">
                          <UserCheck className="w-3 h-3" />
                          Contacted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-orange-50 text-orange-700 whitespace-nowrap">
                          <UserX className="w-3 h-3" />
                          Not Contacted
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(lead)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Details
                        </button>
                        {/* Ellipsis Menu */}
                        <div className="relative" ref={openMenuId === lead._id ? menuRef : null}>
                          <button
                            onClick={() => handleMenuToggle(lead._id)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuId === lead._id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                              <button
                                onClick={() => handleContactClick(lead)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                {isContacted(lead) ? (
                                  <>
                                    <PhoneOff className="w-4 h-4 text-orange-500" />
                                    Mark as Not Contacted
                                  </>
                                ) : (
                                  <>
                                    <PhoneCall className="w-4 h-4 text-green-500" />
                                    Mark as Contacted
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteClick(lead)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} leads
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1">
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
                      className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'bg-[#CE0505] text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

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

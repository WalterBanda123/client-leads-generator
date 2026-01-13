import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

export interface Lead {
  _id: string;
  business_name: string;
  place_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  category?: string;
  rating?: number;
  total_ratings?: number;
  lat?: number;
  lng?: number;
  tier_reached?: number;
  status?: LeadStatus;
  is_small_business?: boolean;
  small_business_score?: number;
  is_informal_business?: boolean;
  informality_score?: number;
  has_website?: boolean;
  social_media_only?: boolean;
  socialProfiles?: SocialProfile[];
  advertisingAnalysis?: AdvertisingAnalysis;
  notes?: Note[];
  created_at?: string;
  updated_at?: string;
}

export interface SocialProfile {
  _id: string;
  platform: string;
  profile_url: string;
  bio?: string;
  followers_count?: number;
}

export interface AdvertisingAnalysis {
  score: number;
  priority: 'high' | 'medium' | 'low';
  reasons: string[];
  needsAdvertising: boolean;
  hasSocialMedia: boolean;
  hasOnlinePresence: boolean;
  recommendations: string[];
}

export interface Note {
  _id: string;
  lead_id: string;
  content: string;
  contact_method?: string;
  contact_date?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface LeadsStats {
  all: number;
  notContacted: number;
  contacted: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: LeadsStats;
}

export interface LeadsQueryParams {
  status?: 'all' | 'not_contacted' | 'contacted';
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface LeadDetailsResponse {
  lead: Lead;
  contacts: Array<{
    _id: string;
    lead_id: string;
    name?: string;
    role?: string;
    email?: string;
    phone?: string;
  }>;
  socialProfiles: SocialProfile[];
  enrichmentLog: Array<{
    _id: string;
    lead_id: string;
    tier: number;
    success: boolean;
    data_found?: string;
    created_at: string;
  }>;
}

// Leads API
export const leadsAPI = {
  getAll: (params?: LeadsQueryParams) =>
    api.get<PaginatedResponse<Lead>>('/leads', { params }),
  getById: (id: string) =>
    api.get<{ success: boolean; data: LeadDetailsResponse }>(`/leads/${id}`),
  update: (id: string, data: Partial<Lead>) =>
    api.put<{ success: boolean; data: Lead }>(`/leads/${id}`, data),
  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/leads/${id}`),
};

// Agent API
export const agentAPI = {
  chat: (message: string, sessionId?: string) =>
    api.post<{ success: boolean; sessionId?: string; response: string; leads?: Lead[] }>('/agent/chat', { message, sessionId }),
  getTopProspects: (limit: number = 20) =>
    api.get<{ success: boolean; leads?: Lead[] }>(`/agent/top-prospects?limit=${limit}`),
};

// Notes API
export const notesAPI = {
  getForLead: (leadId: string) =>
    api.get<{ success: boolean; data: Note[] }>(`/leads/${leadId}/notes`),
  create: (leadId: string, content: string, createdBy: string, contactMethod?: string, contactDate?: string) =>
    api.post<{ success: boolean; data: Note }>(`/leads/${leadId}/notes`, {
      content,
      created_by: createdBy,
      contact_method: contactMethod,
      contact_date: contactDate,
    }),
  update: (noteId: string, content: string) =>
    api.put<{ success: boolean; data: Note }>(`/notes/${noteId}`, { content }),
  delete: (noteId: string) =>
    api.delete(`/notes/${noteId}`),
};

// Users API
export interface User {
  _id: string;
  google_id: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  created_at: string;
  updated_at: string;
  last_login: string;
}

export interface GoogleAuthPayload {
  google_id: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export const usersAPI = {
  saveGoogleUser: (userData: GoogleAuthPayload) =>
    api.post<{ success: boolean; data: User; isNew: boolean }>('/users/google-auth', userData),
  getByGoogleId: (googleId: string) =>
    api.get<{ success: boolean; data: User }>(`/users/google/${googleId}`),
  getById: (id: string) =>
    api.get<{ success: boolean; data: User }>(`/users/${id}`),
};

export default api;

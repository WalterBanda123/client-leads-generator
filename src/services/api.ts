/**
 * API Service - Now using Firestore instead of backend REST API
 *
 * This file provides the same interface as before but uses Firestore directly.
 * This allows the frontend to work independently without a backend server.
 */

import { leadsService, notesService, tasksService, usersService } from './firestore';
import type {
  Lead as FirestoreLead,
  Note as FirestoreNote,
  Task as FirestoreTask,
  LeadsStats as FirestoreLeadsStats,
  LeadsQueryParams as FirestoreLeadsQueryParams,
} from './firestore';

// Re-export types with _id for backward compatibility
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
  socialProfiles?: SocialProfileAPI[];
  advertisingAnalysis?: AdvertisingAnalysis;
  notes?: NoteAPI[];
  custom_tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface SocialProfileAPI {
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

export interface NoteAPI {
  _id: string;
  lead_id: string;
  content: string;
  contact_method?: string;
  contact_date?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  mentioned_users?: string[];
}

export interface TaskAPI {
  _id: string;
  lead_ids: string[];
  title: string;
  description?: string;
  due_date: string;
  due_time?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  type: 'follow_up' | 'meeting' | 'call' | 'email' | 'other';
  google_calendar_event_id?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

// Alias for backward compatibility
export type Note = NoteAPI;
export type Task = TaskAPI;
export type SocialProfile = SocialProfileAPI;

export type LeadsStats = FirestoreLeadsStats;

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: LeadsStats;
}

export type LeadsQueryParams = FirestoreLeadsQueryParams;

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
  socialProfiles: SocialProfileAPI[];
  enrichmentLog: Array<{
    _id: string;
    lead_id: string;
    tier: number;
    success: boolean;
    data_found?: string;
    created_at: string;
  }>;
}

// Helper to convert Firestore Lead to API Lead (id -> _id)
const toAPILead = (lead: FirestoreLead): Lead => ({
  ...lead,
  _id: lead.id,
});

// Helper to convert API Lead to Firestore Lead (_id -> id)
const toFirestoreLead = (lead: Partial<Lead>): Partial<FirestoreLead> => {
  const { _id, ...rest } = lead;
  return {
    ...rest,
    ...((_id !== undefined) ? { id: _id } : {}),
  };
};

// Helper to convert Firestore Note to API Note
const toAPINote = (note: FirestoreNote): NoteAPI => ({
  ...note,
  _id: note.id,
});

// Helper to convert Firestore Task to API Task
const toAPITask = (task: FirestoreTask): TaskAPI => ({
  ...task,
  _id: task.id,
});

// Leads API - Using Firestore
export const leadsAPI = {
  getAll: async (params?: LeadsQueryParams) => {
    const result = await leadsService.getAll(params || {});
    return {
      data: {
        ...result,
        data: result.data.map(toAPILead),
      },
    };
  },

  getById: async (id: string) => {
    const result = await leadsService.getById(id);
    return {
      data: {
        success: true,
        data: {
          lead: toAPILead(result.data.lead),
          contacts: result.data.contacts.map(c => ({ ...c, _id: c.id })),
          socialProfiles: result.data.socialProfiles.map(s => ({ ...s, _id: s.id })),
          enrichmentLog: result.data.enrichmentLog.map(e => ({ ...e, _id: e.id })),
        },
      },
    };
  },

  update: async (id: string, data: Partial<Lead>) => {
    const firestoreData = toFirestoreLead(data);
    const result = await leadsService.update(id, firestoreData as Partial<FirestoreLead>);
    return {
      data: {
        success: true,
        data: toAPILead(result.data),
      },
    };
  },

  create: async (data: Omit<Lead, '_id'>) => {
    const firestoreData = toFirestoreLead(data) as Parameters<typeof leadsService.create>[0];
    const result = await leadsService.create(firestoreData);
    return {
      data: {
        success: true,
        data: toAPILead(result.data),
      },
    };
  },

  delete: async (id: string) => {
    const result = await leadsService.delete(id);
    return { data: result };
  },
};

// Agent API - Placeholder (can be implemented later if needed)
export const agentAPI = {
  chat: async (_message: string, _sessionId?: string) => {
    // This would need a backend or cloud function
    return {
      data: {
        success: true,
        sessionId: 'demo-session',
        response: 'Agent chat is not available in demo mode. Please use the backend API for AI features.',
        leads: [],
      },
    };
  },

  getTopProspects: async (limit: number = 20) => {
    // Get leads and sort by some criteria
    const result = await leadsService.getAll({ limit });
    return {
      data: {
        success: true,
        leads: result.data.map(toAPILead),
      },
    };
  },
};

// Notes API - Using Firestore
export const notesAPI = {
  getForLead: async (leadId: string) => {
    const result = await notesService.getForLead(leadId);
    return {
      data: {
        success: true,
        data: result.data.map(toAPINote),
      },
    };
  },

  create: async (
    leadId: string,
    content: string,
    createdBy: string,
    contactMethod?: string,
    contactDate?: string,
    mentionedUsers?: string[]
  ) => {
    const result = await notesService.create(leadId, content, createdBy, contactMethod, contactDate, mentionedUsers);
    return {
      data: {
        success: true,
        data: toAPINote(result.data),
      },
    };
  },

  update: async (noteId: string, content: string, mentionedUsers?: string[]) => {
    const result = await notesService.update(noteId, content, mentionedUsers);
    return {
      data: {
        success: true,
        data: toAPINote(result.data),
      },
    };
  },

  delete: async (noteId: string) => {
    const result = await notesService.delete(noteId);
    return { data: result };
  },
};

// Tasks API - Using Firestore
export const tasksAPI = {
  getAll: async () => {
    const result = await tasksService.getAll();
    return {
      data: {
        success: true,
        data: result.data.map(toAPITask),
      },
    };
  },

  getForLead: async (leadId: string) => {
    const result = await tasksService.getForLead(leadId);
    return {
      data: {
        success: true,
        data: result.data.map(toAPITask),
      },
    };
  },

  create: async (data: Omit<TaskAPI, '_id'>) => {
    const { ...rest } = data;
    const firestoreData = rest as Omit<FirestoreTask, 'id'>;
    const result = await tasksService.create(firestoreData);
    return {
      data: {
        success: true,
        data: toAPITask(result.data),
      },
    };
  },

  update: async (taskId: string, data: Partial<TaskAPI>) => {
    const { _id, ...rest } = data;
    const result = await tasksService.update(taskId, rest as Partial<FirestoreTask>);
    return {
      data: {
        success: true,
        data: toAPITask(result.data),
      },
    };
  },

  delete: async (taskId: string) => {
    const result = await tasksService.delete(taskId);
    return { data: result };
  },
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
  getAll: async () => {
    const result = await usersService.getAll();
    return {
      data: {
        success: true,
        data: result.data.map(u => ({ ...u, _id: u.id })) as User[],
      },
    };
  },

  saveGoogleUser: async (userData: GoogleAuthPayload) => {
    const result = await usersService.saveGoogleUser(userData);
    return {
      data: {
        success: true,
        data: { ...result.data, _id: result.data.id } as User,
        isNew: result.isNew,
      },
    };
  },

  getByGoogleId: async (googleId: string) => {
    const result = await usersService.getByGoogleId(googleId);
    return {
      data: {
        success: true,
        data: { ...result.data, _id: result.data.id } as User,
      },
    };
  },

  getById: async (_id: string) => {
    // For now, just use getByGoogleId or implement a proper lookup
    throw new Error('getById not implemented - use getByGoogleId instead');
  },
};

// Default export for backward compatibility
export default {
  leadsAPI,
  agentAPI,
  notesAPI,
  tasksAPI,
  usersAPI,
};

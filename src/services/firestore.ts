import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase';

// Types
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

export interface Lead {
  id: string;
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
  created_at?: string;
  updated_at?: string;
}

export interface SocialProfile {
  id: string;
  lead_id: string;
  platform: string;
  profile_url: string;
  bio?: string;
  followers_count?: number;
  created_at?: string;
}

export interface Contact {
  id: string;
  lead_id: string;
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  contact_type?: 'email' | 'phone' | 'whatsapp' | 'other';
  contact_value?: string;
  source?: string;
  verified?: boolean;
  created_at?: string;
}

export interface EnrichmentLog {
  id: string;
  lead_id: string;
  tier: number;
  success: boolean;
  data_found?: string;
  error_message?: string;
  processed_at?: string;
  created_at?: string;
}

export interface Note {
  id: string;
  lead_id: string;
  content: string;
  contact_method?: string;
  contact_date?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface User {
  id: string;
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

export interface LeadsStats {
  all: number;
  notContacted: number;
  contacted: number;
}

export interface LeadsQueryParams {
  status?: 'all' | 'not_contacted' | 'contacted';
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
}

// Collection references
const leadsCollection = collection(db, 'leads');
const contactsCollection = collection(db, 'contacts');
const socialProfilesCollection = collection(db, 'social_profiles');
const enrichmentLogCollection = collection(db, 'enrichment_log');
const notesCollection = collection(db, 'notes');
const usersCollection = collection(db, 'users');

// Helper to convert Firestore doc to Lead
const docToLead = (doc: QueryDocumentSnapshot<DocumentData>): Lead => {
  const data = doc.data();
  return {
    id: doc.id,
    business_name: data.business_name,
    place_id: data.place_id,
    address: data.address,
    phone: data.phone,
    email: data.email,
    website: data.website,
    category: data.category,
    rating: data.rating,
    total_ratings: data.total_ratings,
    lat: data.lat,
    lng: data.lng,
    tier_reached: data.tier_reached,
    status: data.status || 'new',
    is_small_business: data.is_small_business,
    small_business_score: data.small_business_score,
    is_informal_business: data.is_informal_business,
    informality_score: data.informality_score,
    has_website: data.has_website,
    social_media_only: data.social_media_only,
    created_at: data.created_at instanceof Timestamp ? data.created_at.toDate().toISOString() : data.created_at,
    updated_at: data.updated_at instanceof Timestamp ? data.updated_at.toDate().toISOString() : data.updated_at,
  };
};

// Leads Service
export const leadsService = {
  // Get all leads with pagination and filtering
  async getAll(params: LeadsQueryParams = {}) {
    const { status = 'all', search, page = 1, limit = 15 } = params;

    // Build query constraints
    const constraints: ReturnType<typeof where | typeof orderBy | typeof firestoreLimit>[] = [];

    // Status filter - only filter 'contacted' in Firestore, handle 'not_contacted' client-side
    if (status === 'contacted') {
      constraints.push(where('status', 'in', ['contacted', 'qualified', 'converted']));
    }

    constraints.push(orderBy('created_at', 'desc'));

    // Fetch more than needed if we need to filter client-side
    const fetchLimit = status === 'not_contacted' ? limit * 3 : limit;
    constraints.push(firestoreLimit(fetchLimit));

    const q = query(leadsCollection, ...constraints);
    const snapshot = await getDocs(q);

    let leads = snapshot.docs.map(docToLead);

    // Client-side filter for 'not_contacted' (status is 'new', undefined, or null)
    if (status === 'not_contacted') {
      leads = leads.filter(lead =>
        lead.status === 'new' || !lead.status
      );
    }

    // Client-side search filter (Firestore doesn't support full-text search)
    if (search) {
      const searchLower = search.toLowerCase();
      leads = leads.filter(lead =>
        lead.business_name.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination limit after filtering
    leads = leads.slice(0, limit);

    // Get stats
    const stats = await this.getStats();

    // Calculate pagination (simplified - in production use cursor-based pagination)
    const total = stats.all;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: leads,
      total,
      page,
      limit,
      totalPages,
      stats,
    };
  },

  // Get stats
  async getStats(): Promise<LeadsStats> {
    const allQuery = query(leadsCollection);
    const allSnapshot = await getCountFromServer(allQuery);
    const all = allSnapshot.data().count;

    const contactedQuery = query(
      leadsCollection,
      where('status', 'in', ['contacted', 'qualified', 'converted'])
    );
    const contactedSnapshot = await getCountFromServer(contactedQuery);
    const contacted = contactedSnapshot.data().count;

    return {
      all,
      contacted,
      notContacted: all - contacted,
    };
  },

  // Get lead by ID with related data
  async getById(id: string) {
    const docRef = doc(leadsCollection, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Lead not found');
    }

    const lead = docToLead(docSnap as QueryDocumentSnapshot<DocumentData>);

    // Get contacts
    const contactsQuery = query(contactsCollection, where('lead_id', '==', id));
    const contactsSnap = await getDocs(contactsQuery);
    const contacts = contactsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Contact[];

    // Get social profiles
    const socialQuery = query(socialProfilesCollection, where('lead_id', '==', id));
    const socialSnap = await getDocs(socialQuery);
    const socialProfiles = socialSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as SocialProfile[];

    // Get enrichment log
    const enrichmentQuery = query(
      enrichmentLogCollection,
      where('lead_id', '==', id),
      orderBy('created_at', 'desc')
    );
    const enrichmentSnap = await getDocs(enrichmentQuery);
    const enrichmentLog = enrichmentSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as EnrichmentLog[];

    return {
      success: true,
      data: {
        lead,
        contacts,
        socialProfiles,
        enrichmentLog,
      },
    };
  },

  // Update lead
  async update(id: string, data: Partial<Lead>) {
    const docRef = doc(leadsCollection, id);
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };
    delete (updateData as { id?: string }).id; // Remove id from update data

    await updateDoc(docRef, updateData);

    const updatedDoc = await getDoc(docRef);
    return {
      success: true,
      data: docToLead(updatedDoc as QueryDocumentSnapshot<DocumentData>),
    };
  },

  // Delete lead
  async delete(id: string) {
    const docRef = doc(leadsCollection, id);
    await deleteDoc(docRef);
    return { success: true };
  },
};

// Notes Service
export const notesService = {
  async getForLead(leadId: string) {
    const q = query(
      notesCollection,
      where('lead_id', '==', leadId),
      orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(q);
    const notes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at instanceof Timestamp
        ? doc.data().created_at.toDate().toISOString()
        : doc.data().created_at,
    })) as Note[];

    return { success: true, data: notes };
  },

  async create(
    leadId: string,
    content: string,
    createdBy: string,
    contactMethod?: string,
    contactDate?: string
  ) {
    const noteData = {
      lead_id: leadId,
      content,
      created_by: createdBy,
      contact_method: contactMethod,
      contact_date: contactDate,
      created_at: new Date().toISOString(),
    };

    const docRef = await addDoc(notesCollection, noteData);
    return {
      success: true,
      data: { id: docRef.id, ...noteData } as Note,
    };
  },

  async update(noteId: string, content: string) {
    const docRef = doc(notesCollection, noteId);
    await updateDoc(docRef, {
      content,
      updated_at: new Date().toISOString(),
    });

    const updatedDoc = await getDoc(docRef);
    return {
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() } as Note,
    };
  },

  async delete(noteId: string) {
    const docRef = doc(notesCollection, noteId);
    await deleteDoc(docRef);
    return { success: true };
  },
};

// Users Service
export const usersService = {
  async saveGoogleUser(userData: {
    google_id: string;
    email: string;
    name: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  }) {
    // Check if user exists
    const q = query(usersCollection, where('google_id', '==', userData.google_id));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // Update existing user
      const existingDoc = snapshot.docs[0];
      await updateDoc(doc(usersCollection, existingDoc.id), {
        ...userData,
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      return {
        success: true,
        data: { id: existingDoc.id, ...existingDoc.data(), ...userData } as User,
        isNew: false,
      };
    }

    // Create new user
    const newUserData = {
      ...userData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
    };

    const docRef = await addDoc(usersCollection, newUserData);
    return {
      success: true,
      data: { id: docRef.id, ...newUserData } as User,
      isNew: true,
    };
  },

  async getByGoogleId(googleId: string) {
    const q = query(usersCollection, where('google_id', '==', googleId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('User not found');
    }

    const doc = snapshot.docs[0];
    return {
      success: true,
      data: { id: doc.id, ...doc.data() } as User,
    };
  },
};

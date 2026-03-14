import { supabase } from './supabase';

export interface CaseData {
  code: string;
  ai_response: string;
  level: string;
  visualization: string;
  detail: string;
}

export interface CaseRecord extends CaseData {
  id: string;
  user_id?: string | null;
  created_at: string;
}

export type CaseMessageRole = 'user' | 'model';

export interface CaseMessageData {
  case_id: string;
  role: CaseMessageRole;
  text: string;
  is_initial?: boolean;
}

export interface CaseMessageRecord extends CaseMessageData {
  id: string;
  created_at: string;
}

const SCHEMA_MISSING_MESSAGE =
  'Evidence privacy schema is missing. Run supabase/schema.sql in the Supabase SQL editor.';

const isMissingUserIsolationSchema = (error: { message?: string } | null | undefined): boolean => {
  if (!error?.message) {
    return false;
  }

  const normalized = error.message.toLowerCase();
  return normalized.includes('user_id') || normalized.includes('column') && normalized.includes('does not exist');
};

const throwIfQueryError = (error: { message?: string } | null): void => {
  if (!error) {
    return;
  }

  if (isMissingUserIsolationSchema(error)) {
    throw new Error(SCHEMA_MISSING_MESSAGE);
  }

  throw error;
};

const requireAuthenticatedUser = async (): Promise<{ id: string }> => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.user) {
    throw new Error('Authentication required. Please log in to access evidence records.');
  }

  return { id: session.user.id };
};

const assertCaseOwnership = async (caseId: string, userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('cases')
    .select('id')
    .eq('id', caseId)
    .eq('user_id', userId)
    .maybeSingle();

  throwIfQueryError(error);
  return !!data;
};

export const saveCase = async (caseData: CaseData): Promise<CaseRecord> => {
  const user = await requireAuthenticatedUser();

  const { data, error } = await supabase
    .from('cases')
    .insert({
      ...caseData,
      user_id: user.id,
    })
    .select('*')
    .single();

  throwIfQueryError(error);
  return data as CaseRecord;
};

export const saveCaseMessage = async (messageData: CaseMessageData): Promise<CaseMessageRecord> => {
  const user = await requireAuthenticatedUser();
  const ownsCase = await assertCaseOwnership(messageData.case_id, user.id);

  if (!ownsCase) {
    throw new Error('Unauthorized case access.');
  }

  const { data, error } = await supabase
    .from('case_messages')
    .insert(messageData)
    .select('*')
    .single();

  throwIfQueryError(error);
  return data as CaseMessageRecord;
};

export const loadCases = async (): Promise<CaseRecord[]> => {
  const user = await requireAuthenticatedUser();

  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  throwIfQueryError(error);
  return (data ?? []) as CaseRecord[];
};

export const loadCaseMessages = async (caseId: string): Promise<CaseMessageRecord[]> => {
  const user = await requireAuthenticatedUser();
  const ownsCase = await assertCaseOwnership(caseId, user.id);

  if (!ownsCase) {
    return [];
  }

  const { data, error } = await supabase
    .from('case_messages')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });

  throwIfQueryError(error);
  return (data ?? []) as CaseMessageRecord[];
};

export const clearEvidenceHistory = async (): Promise<void> => {
  const user = await requireAuthenticatedUser();
  const { error } = await supabase
    .from('cases')
    .delete()
    .eq('user_id', user.id);

  throwIfQueryError(error);
};

export const deleteCaseById = async (caseId: string): Promise<void> => {
  const user = await requireAuthenticatedUser();
  const ownsCase = await assertCaseOwnership(caseId, user.id);

  if (!ownsCase) {
    throw new Error('Unauthorized case access.');
  }

  const { error: messageError } = await supabase
    .from('case_messages')
    .delete()
    .eq('case_id', caseId);

  throwIfQueryError(messageError);

  const { error: caseError } = await supabase
    .from('cases')
    .delete()
    .eq('id', caseId)
    .eq('user_id', user.id);

  throwIfQueryError(caseError);
};

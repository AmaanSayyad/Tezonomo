/**
 * Supabase Client Configuration
 * 
 * This module provides a configured Supabase client for interacting with the database.
 * Used by the house balance system to track user balances and audit logs.
 */

import { createClient } from '@supabase/supabase-js';

// Validate required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create and export Supabase client for public (anon) use
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

// Create and export Supabase client for admin (service role) use - Server side only
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  })
  : null;

// Type definitions for database tables
export interface UserBalance {
  user_address: string;
  balance: number;
  updated_at: string;
  created_at: string;
}

export interface BalanceAuditLog {
  id: number;
  user_address: string;
  operation_type: 'deposit' | 'withdrawal' | 'bet_placed' | 'bet_won' | 'bet_lost';
  amount: number;
  balance_before: number;
  balance_after: number;
  transaction_hash?: string;
  bet_id?: string;
  created_at: string;
}

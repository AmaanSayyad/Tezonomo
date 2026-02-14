/**
 * GET /api/balance/[address] endpoint
 * 
 * Task: 4.1 Create GET /api/balance/[address] endpoint
 * Requirements: 2.3
 * 
 * Returns the current house balance for a user address.
 * Handles user not found by returning 0 balance.
 * Includes error handling for database errors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { address } = await params;

    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency') || 'XTZ';

    if (!supabase) {
      return NextResponse.json({ error: 'Database service not initialized' }, { status: 500 });
    }

    // Validate address (Tezos only)
    const { isValidTezosAddress } = await import('@/lib/tezos/client');
    if (!isValidTezosAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid Tezos wallet address format' },
        { status: 400 }
      );
    }

    // Query user_balances table by user_address and currency
    // Note: user_balances has no user_tier column; tier defaults to 'free'
    const { data, error } = await supabase
      .from('user_balances')
      .select('balance, updated_at')
      .eq('user_address', address)
      .eq('currency', currency)
      .single();

    // Handle database errors
    if (error) {
      // If user not found (PGRST116), return 0 balance
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          balance: 0,
          updatedAt: null,
          tier: 'free'
        });
      }

      // Log other database errors
      console.error('Database error fetching balance:', error);
      return NextResponse.json(
        { error: 'Service temporarily unavailable. Please try again.' },
        { status: 503 }
      );
    }

    // Return balance and updated_at timestamp
    return NextResponse.json({
      balance: parseFloat(String(data.balance)),
      updatedAt: data.updated_at,
      tier: 'free'
    });
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in GET /api/balance/[address]:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}

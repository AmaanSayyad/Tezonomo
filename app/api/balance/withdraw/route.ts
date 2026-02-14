/**
 * POST /api/balance/withdraw endpoint
 * 
 * Processes XTZ withdrawal from house balance.
 * Transfers XTZ from treasury to user's Tezos wallet.
 * Updates Supabase balance accordingly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

interface WithdrawRequest {
  userAddress: string;
  amount: number;
  currency: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: WithdrawRequest = await request.json();
    const { userAddress, amount, currency = 'XTZ' } = body;

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database admin access not configured' }, { status: 500 });
    }

    // Validate required fields
    if (!userAddress || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, amount' },
        { status: 400 }
      );
    }

    // Validate address (Tezos only)
    const { isValidTezosAddress } = await import('@/lib/tezos/client');
    if (!isValidTezosAddress(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid Tezos wallet address format' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Withdrawal amount must be greater than zero' },
        { status: 400 }
      );
    }

    // 1. Get house balance and status from Supabase and validate
    const { data: userData, error: userError } = await supabaseAdmin
      .from('user_balances')
      .select('balance, status')
      .eq('user_address', userAddress)
      .eq('currency', currency)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    if (userData.status === 'frozen') {
      return NextResponse.json({ error: 'Account is frozen. Withdrawals are disabled.' }, { status: 403 });
    }

    if (userData.status === 'banned') {
      return NextResponse.json({ error: 'Account is banned.' }, { status: 403 });
    }

    if (userData.balance < amount) {
      return NextResponse.json({ error: `Insufficient house balance in ${currency}` }, { status: 400 });
    }

    // 2. Apply 2% Treasury Fee
    const feePercent = 0.02;
    const feeAmount = amount * feePercent;
    const netWithdrawAmount = amount - feeAmount;

    console.log(`Withdrawal Request: Total=${amount}, Fee=${feeAmount}, Net=${netWithdrawAmount}, Currency=${currency}`);

    // 3. Perform transfer from treasury (Tezos)
    let signature: string;
    try {
      const { transferXTZFromTreasury } = await import('@/lib/tezos/backend-client');
      signature = await transferXTZFromTreasury(userAddress, netWithdrawAmount);
    } catch (e: any) {
      console.error('Tezos transfer failed:', e);
      return NextResponse.json({ error: `Withdrawal failed: ${e.message}` }, { status: 500 });
    }

    // 4. Update Supabase balance using RPC
    const { data, error } = await supabaseAdmin.rpc('update_balance_for_withdrawal', {
      p_user_address: userAddress,
      p_withdrawal_amount: amount,
      p_currency: currency,
      p_transaction_hash: signature,
    });

    if (error) {
      console.error('Database error in withdrawal update:', error);
      return NextResponse.json(
        {
          success: true,
          txHash: signature,
          warning: 'XTZ sent but balance update failed. Please contact support.',
          error: error.message
        },
        { status: 200 }
      );
    }

    const result = data as { success: boolean; error: string | null; new_balance: number };

    return NextResponse.json({
      success: true,
      txHash: signature,
      newBalance: result.new_balance,
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/balance/withdraw:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}

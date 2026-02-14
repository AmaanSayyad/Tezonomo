/**
 * Balance state slice for Zustand store
 * Manages house balance state and operations(deposit, withdraw, bet)
 * 
 * Note: Updated for Tezos / XTZ focus.
 */

import { StateCreator } from "zustand";

export interface BalanceState {
  // State
  houseBalance: number;
  demoBalance: number;
  accountType: 'real' | 'demo';
  userTier: 'free' | 'standard' | 'vip';
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchBalance: (address: string) => Promise<void>;
  setBalance: (balance: number) => void;
  updateBalance: (amount: number, operation: 'add' | 'subtract') => void;
  depositFunds: (address: string, amount: number, txHash: string) => Promise<any>;
  withdrawFunds: (address: string, amount: number) => Promise<any>;
  toggleAccountType: () => void;
  clearError: () => void;
}

/**
 * Create balance slice for Zustand store
 * Handles house balance fetching, updates, deposits, and withdrawals
 */
export const createBalanceSlice: StateCreator<BalanceState> = (set, get) => ({
  // Initial state
  houseBalance: 0,
  demoBalance: 10000, // 10,000 demo XTZ to start
  accountType: 'real', // Default to real mode, demo activated via logo click
  userTier: 'free',
  isLoading: false,
  error: null,

  /**
   * Fetch house balance for a user address
   * Queries the balance API endpoint
   * @param address - Wallet address
   */
  fetchBalance: async (address: string) => {
    const { accountType } = get();
    // Access network from combined store if available, or default to XTZ
    const network = (get() as any).network || 'XTZ';

    // Skip API fetch for demo mode as it uses local state only
    if (!address || accountType === 'demo' || address.startsWith('tz1DEMO')) {
      return;
    }

    try {
      set({ isLoading: true, error: null });

      const response = await fetch(`/api/balance/${address}?currency=${network}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch balance');
      }

      const data = await response.json();

      set({
        houseBalance: data.balance || 0,
        userTier: data.tier || 'free',
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching balance:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch balance'
      });
    }
  },

  /**
   * Set house balance directly
   */
  setBalance: (balance: number) => {
    set({ houseBalance: balance });
  },

  /**
   * Update house balance by adding or subtracting an amount
   */
  updateBalance: (amount: number, operation: 'add' | 'subtract') => {
    const { houseBalance, demoBalance, accountType } = get();

    if (accountType === 'demo') {
      const newDemoBalance = operation === 'add'
        ? demoBalance + amount
        : Math.max(0, demoBalance - amount);
      set({ demoBalance: newDemoBalance });
      return;
    }

    const newBalance = operation === 'add'
      ? houseBalance + amount
      : Math.max(0, houseBalance - amount);

    set({ houseBalance: newBalance });
  },

  /**
   * Toggle between real and demo accounts
   */
  toggleAccountType: () => {
    const { accountType } = get();
    set({ accountType: accountType === 'real' ? 'demo' : 'real' });
  },

  /**
   * Process deposit funds operation
   */
  depositFunds: async (address: string, amount: number, txHash: string) => {
    const network = (get() as any).network || 'XTZ';

    try {
      set({ isLoading: true, error: null });

      const response = await fetch('/api/balance/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: address,
          amount,
          txHash,
          currency: network
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process deposit');
      }

      const data = await response.json();

      set({
        houseBalance: data.newBalance,
        isLoading: false,
        error: null
      });

      // Update wallet balance after on-chain transaction
      const walletState = get() as any;
      if (walletState.refreshWalletBalance) {
        walletState.refreshWalletBalance();
      }

      // Secondary check after a delay to ensure eventual consistency
      setTimeout(() => get().fetchBalance(address), 1500);

      return data;
    } catch (error) {
      console.error('Error processing deposit:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to process deposit'
      });
      throw error;
    }
  },

  /**
   * Process withdraw funds operation
   * Called after withdrawal transaction completes to update database
   * @param address - User wallet address
   * @param amount - Withdrawal amount
   */
  withdrawFunds: async (address: string, amount: number) => {
    const network = (get() as any).network || 'XTZ';

    try {
      set({ isLoading: true, error: null });

      // Prevent UI from staying stuck: abort after 75s (Tezos confirmation can be slow)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 75000);

      const response = await fetch('/api/balance/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: address,
          amount,
          currency: network
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process withdrawal');
      }

      const data = await response.json();

      set({
        houseBalance: data.newBalance,
        isLoading: false,
        error: null
      });

      // Update wallet balance after on-chain transaction
      const walletState = get() as any;
      if (walletState.refreshWalletBalance) {
        walletState.refreshWalletBalance();
      }

      // Secondary check after a delay to ensure eventual consistency
      setTimeout(() => get().fetchBalance(address), 1500);

      return data;
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      const message = error instanceof Error
        ? (error.name === 'AbortError' ? 'Withdrawal timed out. Check your wallet or try again.' : error.message)
        : 'Failed to process withdrawal';
      set({
        isLoading: false,
        error: message
      });
      throw new Error(message);
    }
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null });
  }
});

/**
 * Wallet state slice for Zustand store
 * Manages wallet connection status and address
 * 
 * Note: This slice is now primarily used for storing wallet state.
 * Actual wallet connection is handled by Tezos Wallet integration in lib/tezos/client.ts
 */

import { StateCreator } from "zustand";

export interface WalletState {
  // State
  address: string | null;
  walletBalance: number;
  isConnected: boolean;
  isConnecting: boolean;
  network: 'XTZ' | null;
  preferredNetwork: 'XTZ' | null;
  error: string | null;
  isConnectModalOpen: boolean;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshWalletBalance: () => Promise<void>;
  clearError: () => void;
  setConnectModalOpen: (open: boolean) => void;

  // Setters for wallet integration
  setAddress: (address: string | null) => void;
  setIsConnected: (connected: boolean) => void;
  setNetwork: (network: 'XTZ' | null) => void;
  setPreferredNetwork: (network: 'XTZ' | null) => void;
}

/**
 * Create wallet slice for Zustand store
 * Handles wallet state management for Tezos integration
 */
export const createWalletSlice: StateCreator<WalletState> = (set, get) => ({
  // Initial state
  address: null,
  walletBalance: 0,
  isConnected: false,
  isConnecting: false,
  network: null,
  preferredNetwork: typeof window !== 'undefined' ? localStorage.getItem('tezonomo_preferred_network') as 'XTZ' | null : null,
  error: null,
  isConnectModalOpen: false,

  /**
   * Connect wallet
   */
  connect: async () => {
    set({ isConnectModalOpen: true });
  },

  /**
   * Disconnect wallet
   */
  disconnect: () => {
    // Reset state
    set({
      address: null,
      walletBalance: 0,
      isConnected: false,
      isConnecting: false,
      network: null,
      error: null
    });
  },

  /**
   * Refresh token balance for connected wallet
   */
  refreshWalletBalance: async () => {
    const { address, isConnected, network } = get();

    if (!isConnected || !address || !network) {
      return;
    }

    try {
      if (network === 'XTZ') {
        const { getXTZBalance } = await import('@/lib/tezos/client');
        const bal = await getXTZBalance(address);
        set({ walletBalance: bal });
      }
    } catch (error) {
      console.error("Error refreshing wallet balance:", error);
    }
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Set connect modal visibility
   */
  setConnectModalOpen: (open: boolean) => {
    set({ isConnectModalOpen: open });
  },

  /**
   * Set address (used by wallet integration)
   */
  setAddress: (address: string | null) => {
    set({ address });
  },

  /**
   * Set connected status (used by wallet integration)
   */
  setIsConnected: (connected: boolean) => {
    set({ isConnected: connected });
  },

  /**
   * Set active network (XTZ)
   */
  setNetwork: (network: 'XTZ' | null) => {
    set({ network });
  },

  /**
   * Set preferred network
   */
  setPreferredNetwork: (network: 'XTZ' | null) => {
    set({ preferredNetwork: network });
    if (typeof window !== 'undefined') {
      if (network) {
        localStorage.setItem('tezonomo_preferred_network', network);
      } else {
        localStorage.removeItem('tezonomo_preferred_network');
      }
    }
  }
});

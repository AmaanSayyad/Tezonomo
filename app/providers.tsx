'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useOverflowStore } from '@/lib/store';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Custom Components
import { WalletConnectModal } from '@/components/wallet/WalletConnectModal';

/**
 * Polyfill for Buffer needed by Tezos SDK (Beacon/Taquito)
 */
if (typeof window !== 'undefined' && !window.Buffer) {
  const { Buffer } = require('buffer');
  window.Buffer = Buffer;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initializeApp = async () => {
      try {
        const { updateAllPrices, loadTargetCells, startGlobalPriceFeed } = useOverflowStore.getState();

        await loadTargetCells().catch(console.error);
        const stopPriceFeed = startGlobalPriceFeed(updateAllPrices);

        // Restore Beacon wallet session on page reload
        await restoreWalletSession();

        setIsReady(true);
        return () => { if (stopPriceFeed) stopPriceFeed(); };
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <WalletConnectModal />
      <ToastProvider />
    </QueryClientProvider>
  );
}

/**
 * Restore Beacon wallet session from previous connection
 * This persists the wallet connection across page refreshes
 */
async function restoreWalletSession() {
  try {
    const { BeaconWallet } = await import('@taquito/beacon-wallet');
    const { NetworkType } = await import('@airgap/beacon-sdk');

    const wallet = new BeaconWallet({
      name: 'Tezonomo',
      preferredNetwork: NetworkType.MAINNET,
    });

    // Check if there's an active account from a previous session
    const activeAccount = await wallet.client.getActiveAccount();

    if (activeAccount) {
      const address = activeAccount.address;
      console.log('Restored Beacon wallet session:', address);

      const store = useOverflowStore.getState();
      store.setAddress(address);
      store.setIsConnected(true);
      store.setNetwork('XTZ');
      store.setPreferredNetwork('XTZ');

      // Fetch balances in background
      store.refreshWalletBalance();
      store.fetchBalance(address);
    }
  } catch (error) {
    console.error('Failed to restore wallet session:', error);
  }
}

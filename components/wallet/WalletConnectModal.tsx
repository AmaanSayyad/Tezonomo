'use client';

import React from 'react';
import { useOverflowStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe } from 'lucide-react';

export const WalletConnectModal: React.FC = () => {
    const isOpen = useOverflowStore(state => state.isConnectModalOpen);
    const setOpen = useOverflowStore(state => state.setConnectModalOpen);
    const setPreferredNetwork = useOverflowStore(state => state.setPreferredNetwork);

    const handleTezosConnect = async () => {
        try {
            const { BeaconWallet } = await import('@taquito/beacon-wallet');
            const { NetworkType } = await import('@airgap/beacon-sdk');

            const wallet = new BeaconWallet({
                name: "Tezonomo Protocol",
                preferredNetwork: NetworkType.MAINNET
            });

            await wallet.requestPermissions();
            const address = await wallet.getPKH();

            if (address) {
                setPreferredNetwork('XTZ');
                useOverflowStore.getState().setNetwork('XTZ');
                useOverflowStore.getState().setAddress(address);
                useOverflowStore.getState().setIsConnected(true);
                // Fetch Tezos mainnet XTZ balance
                useOverflowStore.getState().refreshWalletBalance();
                // Fetch house balance for Tezos
                useOverflowStore.getState().fetchBalance(address);
            }
        } catch (error) {
            console.error("Tezos connection error:", error);
        }
        setOpen(false);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setOpen(false)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-transparent">
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Connect Wallet</h2>
                            <p className="text-sm text-gray-400 mt-1">Ready to trade on Tezos?</p>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                        >
                            <X className="w-5 h-5 text-gray-500 group-hover:text-white" />
                        </button>
                    </div>

                    {/* Options */}
                    <div className="p-6 space-y-3">
                        {/* Tezos Option */}
                        <button
                            onClick={handleTezosConnect}
                            className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                                <img src="/logos/tezos-xtz-logo.png" alt="Tezos" className="w-7 h-7" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">Tezos Mainnet</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 font-bold uppercase tracking-wider">XTZ</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">Temple, Kukai, and Beacon Wallets</p>
                            </div>
                            <Globe className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-white/5 text-center">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                            Securely powered by Tezonomo Protocol
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

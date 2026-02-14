import { BeaconWallet } from '@taquito/beacon-wallet';
import { TezosToolkit } from '@taquito/taquito';
import { NetworkType } from '@airgap/beacon-sdk';
import { useOverflowStore } from '@/lib/store';

const RPC_URL = 'https://mainnet.ecadinfra.com';
const tezos = new TezosToolkit(RPC_URL);

let wallet: BeaconWallet | null = null;

/**
 * Get or create wallet instance
 */
export const getWallet = () => {
    if (typeof window === 'undefined') return null;
    if (!wallet) {
        wallet = new BeaconWallet({
            name: 'Tezonomo',
            preferredNetwork: NetworkType.MAINNET,
        });
    }
    return wallet;
};

/**
 * Connect to Tezos wallet
 */
export const connectTezos = async () => {
    const wallet = getWallet();
    if (!wallet) return;

    try {
        await wallet.requestPermissions({
            network: {
                type: NetworkType.MAINNET,
                rpcUrl: RPC_URL,
            },
        });

        const address = await wallet.getPKH();
        const store = useOverflowStore.getState();

        store.setAddress(address);
        store.setIsConnected(true);
        store.setNetwork('XTZ');
        store.setPreferredNetwork('XTZ');

        // Fetch initial balance
        const { getXTZBalance } = await import('./client');
        const balance = await getXTZBalance(address);
        useOverflowStore.setState({ walletBalance: balance });

        return address;
    } catch (error) {
        console.error('Tezos connection error:', error);
        throw error;
    }
};

/**
 * Disconnect Tezos wallet
 */
export const disconnectTezos = async () => {
    const wallet = getWallet();
    if (wallet) {
        await wallet.clearActiveAccount();
    }
    const store = useOverflowStore.getState();
    store.disconnect();
};

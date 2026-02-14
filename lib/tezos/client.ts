/**
 * Tezos Client Utils
 * Handles Tezos balance fetching, wallet interactions, and deposits using Taquito
 */

import { TezosToolkit } from '@taquito/taquito';

// Tezos Mainnet RPC
const RPC_URL = process.env.NEXT_PUBLIC_TEZOS_RPC_URL || 'https://mainnet.ecadinfra.com';
const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TEZOS_TREASURY_ADDRESS || '';

const tezos = new TezosToolkit(RPC_URL);

/**
 * Get XTZ balance for an address
 * @param address Tezos address (tz1...)
 * @returns Balance in XTZ
 */
export const getXTZBalance = async (address: string): Promise<number> => {
    try {
        const balance = await tezos.tz.getBalance(address);
        // Balance is in mutez (1 XTZ = 1,000,000 mutez)
        return balance.toNumber() / 1000000;
    } catch (error) {
        console.error('Error fetching Tezos balance:', error);
        return 0;
    }
};

/**
 * Check if an address is a valid Tezos address
 */
export const isValidTezosAddress = (address: string): boolean => {
    if (!address) return false;
    return /^(tz1|tz2|tz3|KT1)[a-zA-Z0-9]{33}$/.test(address);
};

/**
 * Deposit XTZ to the Tezonomo treasury using the connected Beacon wallet
 * Sends XTZ from the user's wallet to the treasury address
 * @param amount Amount in XTZ to deposit
 * @returns Transaction hash
 */
export const depositXTZ = async (amount: number): Promise<string> => {
    if (typeof window === 'undefined') {
        throw new Error('Deposit can only be performed in the browser');
    }

    if (!TREASURY_ADDRESS) {
        throw new Error('Treasury address is not configured');
    }

    try {
        // Dynamic import to avoid SSR issues
        const { BeaconWallet } = await import('@taquito/beacon-wallet');
        const { NetworkType } = await import('@airgap/beacon-sdk');

        // Get or create the wallet instance
        const wallet = new BeaconWallet({
            name: 'Tezonomo',
            preferredNetwork: NetworkType.MAINNET,
            // Configure the network once here
            network: {
                type: NetworkType.MAINNET,
                rpcUrl: RPC_URL
            }
        });

        // Check if user has an active account (should be connected already)
        const activeAccount = await wallet.client.getActiveAccount();
        if (!activeAccount) {
            throw new Error('No active wallet account. Please connect your wallet first.');
        }

        // Set the wallet provider on Taquito
        const depositTezos = new TezosToolkit(RPC_URL);
        depositTezos.setWalletProvider(wallet);

        // Send XTZ to treasury
        console.log(`Depositing ${amount} XTZ to treasury ${TREASURY_ADDRESS}`);
        const op = await depositTezos.wallet.transfer({
            to: TREASURY_ADDRESS,
            amount: amount, // Taquito handles mutez conversion
        }).send();

        console.log(`Deposit operation hash: ${op.opHash}`);

        // Wait for confirmation
        await op.confirmation(1);
        console.log('Deposit confirmed!');

        return op.opHash;
    } catch (error: any) {
        console.error('Deposit XTZ error:', error);
        // Provide user-friendly error messages
        if (error.message?.includes('aborted')) {
            throw new Error('Transaction was cancelled by user');
        }
        if (error.message?.includes('balance_too_low') || error.message?.includes('subtraction_underflow')) {
            throw new Error('Insufficient XTZ balance for this transaction');
        }
        throw error;
    }
};

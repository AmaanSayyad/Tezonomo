/**
 * Tezos Client Utils
 * Handles Tezos bakiye fetching and wallet interactions using Taquito
 */

import { TezosToolkit } from '@taquito/taquito';

// Tezos Mainnet RPC
const RPC_URL = 'https://mainnet.ecadinfra.com';
const tezos = new TezosToolkit(RPC_URL);

/**
 * Get XTZ bakiye for an address
 * @param address Tezos address (tz1...)
 * @returns Bakiye in XTZ
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
    return /^(tz1|tz2|tz3|KT1)[a-zA-Z0-9]{33}$/.test(address);
};

/**
 * Transfer XTZ from the connected user wallet to the treasury (deposit).
 * Uses the Beacon wallet to sign the transaction.
 * @param amountXTZ Amount in XTZ to deposit
 * @returns Operation hash (transaction hash)
 */
export const depositXTZ = async (amountXTZ: number): Promise<string> => {
    const { getWallet } = await import('./wallet');
    const treasury = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TEZOS_TREASURY_ADDRESS;
    if (!treasury) throw new Error('Treasury address not configured');
    const wallet = getWallet();
    if (!wallet) throw new Error('Wallet not connected');
    const rpcUrl = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TEZOS_RPC_URL || 'https://mainnet.ecadinfra.com';
    const tezos = new TezosToolkit(rpcUrl);
    tezos.setWalletProvider(wallet);
    // Taquito expects { to, amount }; amount is in XTZ by default
    const op = await tezos.wallet.transfer({ to: treasury, amount: amountXTZ }).send();
    await op.confirmation(1);
    return op.opHash;
};

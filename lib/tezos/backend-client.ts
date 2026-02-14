/**
 * Tezos Backend Client
 * Used for administrative operations like withdrawals signing with Treasury Private Key
 */

import { TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';

/**
 * Get the Tezos provider with Treasury signer
 */
export async function getTezosTreasuryClient() {
    const rpcUrl = process.env.NEXT_PUBLIC_TEZOS_RPC_URL || 'https://mainnet.ecadinfra.com';
    const secretKey = process.env.TEZOS_TREASURY_SECRET_KEY;

    if (!secretKey) {
        throw new Error('TEZOS_TREASURY_SECRET_KEY is not configured');
    }

    const tezos = new TezosToolkit(rpcUrl);
    tezos.setSignerProvider(new InMemorySigner(secretKey));

    return tezos;
}

/**
 * Transfer XTZ from treasury to a user.
 * Uses explicit gas limits compatible with Tezos Protocol 024 (PtTALLIN), which
 * reduced block gas limits. RPC estimation can exceed per-operation limits and
 * cause gas_limit_too_high / gas_exhausted.block.
 */
export async function transferXTZFromTreasury(
    toAddress: string,
    amountXTZ: number
): Promise<string> {
    try {
        const tezos = await getTezosTreasuryClient();

        console.log(`Initiating Tezos withdrawal: ${amountXTZ} XTZ to ${toAddress}`);

        // Explicit gas limits for a simple implicit→implicit transfer.
        // 2000 was too low (gas_exhausted.operation); must stay below protocol max (gas_limit_too_high).
        const op = await tezos.contract.transfer({
            to: toAddress,
            amount: amountXTZ,
            gasLimit: 5000,
            storageLimit: 0,
        });

        console.log(`Tezos withdrawal operation sent: ${op.hash}`);
        // Timeout so the API doesn't hang; Tezos block ~6s but network can be slow
        const CONFIRM_TIMEOUT_MS = 60000;
        await Promise.race([
            op.confirmation(1),
            new Promise<void>((_, reject) =>
                setTimeout(() => reject(new Error('Confirmation timed out. Check the explorer for your transaction.')), CONFIRM_TIMEOUT_MS)
            ),
        ]);
        console.log(`Tezos withdrawal confirmed!`);

        return op.hash;
    } catch (error) {
        console.error('Failed to transfer XTZ from treasury:', error);
        throw error;
    }
}

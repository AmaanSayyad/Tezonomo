
/**
 * Validates Tezos wallet addresses (tz1, tz2, tz3, KT1)
 * @param address Tezos address to validate
 * @returns boolean
 */
export const isValidTezosAddress = (address: string): boolean => {
    if (!address) return false;
    return /^(tz1|tz2|tz3|KT1)[a-zA-Z0-9]{33}$/.test(address);
};

/**
 * Validates wallet addresses (Defaulting to Tezos for Tezonomo)
 * @param address Address to validate
 * @returns boolean
 */
export const isValidAddress = async (address: string): Promise<boolean> => {
    return isValidTezosAddress(address);
};


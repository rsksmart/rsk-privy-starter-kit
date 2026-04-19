export const ERC20_ADDRESS = "0x72df7a1734dd6cea1682f2b93634c7f7007ad511";
export const ERC721_ADDRESS = "0x65C955e31f8bd0964127a0A2F4bC84AB298c71BE";
export const ERC1155_ADDRESS = "0xB522148B5587625610AeB9600A1716DAe2bB6DE9";

/**
 * L4 fix: Contract address loaded from environment variable.
 * Set VITE_CONTENT_PAYWALL_ADDRESS in your .env file.
 * Throws at build/runtime if the variable is missing.
 */
const _paywallAddress = import.meta.env.VITE_CONTENT_PAYWALL_ADDRESS as string | undefined;
if (!_paywallAddress) {
  throw new Error(
    "[constants] VITE_CONTENT_PAYWALL_ADDRESS is not set. " +
    "Add it to your .env file. See .env.example for reference.",
  );
}
export const CONTENT_PAYWALL_ADDRESS = _paywallAddress;

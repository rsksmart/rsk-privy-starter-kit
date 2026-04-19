# Contracts

This starter kit interacts with the **ContentPaywall** smart contract deployed on **Rootstock Testnet**.

## Source Code

The full Solidity source is included at [`ContentPaywall.sol`](./ContentPaywall.sol) in this directory.
This allows you to audit all logic, including access control, payment handling, and admin functions.

## Deployed Contract

| Field          | Value                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Network        | Rootstock Testnet (chainId: 31)                                                                                                    |
| Address        | [`0xb5C7ED1CEd1098974FDf2a9060948F13138e9dC6`](https://explorer.testnet.rsk.co/address/0xb5C7ED1CEd1098974FDf2a9060948F13138e9dC6) |
| ABI            | See [`src/assets/abis/ContentPaywall.ts`](../src/assets/abis/ContentPaywall.ts)                                                    |
| Explorer       | https://explorer.testnet.rsk.co/address/0xb5C7ED1CEd1098974FDf2a9060948F13138e9dC6                                                |

## ⚠️ Admin Trust Assumptions

This contract includes administrative functions that require trust in the contract owner.
Understand these before using this pattern in production:

### `revokeAccess(address user, string contentId)`

The owner can revoke a paying user's access **without any refund mechanism**. This is intentional for moderation purposes (e.g., removing pirated content or fraudulent accounts), but it means:

- Users have no on-chain guarantee their access is permanent.
- There is no built-in refund flow — refunds would need to be handled off-chain.
- This is a significant trust assumption for end users.

**Recommendation for production**: Either remove `revokeAccess`, add a proportional refund mechanism, or clearly disclose this risk to users in your UI before they pay.

### `grantFreeAccess(address user, string contentId)`

The owner can grant access to any user for free. This is useful for promotional purposes but means the owner can bypass the paywall entirely.

### `transferOwnership(address newOwner)`

Ownership can be transferred. If the owner account is compromised, all admin functions are at risk.

## Deploy Your Own

To deploy your own version of the ContentPaywall contract:

1. Install [Hardhat](https://hardhat.org/) or [Foundry](https://book.getfoundry.sh/)
2. Review [`ContentPaywall.sol`](./ContentPaywall.sol) — customize pricing, access logic, or refund mechanics
3. Configure Rootstock Testnet RPC: `https://public-node.testnet.rsk.co`
4. Get test RBTC from the [Rootstock Faucet](https://faucet.rootstock.io)
5. Update `VITE_CONTENT_PAYWALL_ADDRESS` in your `.env` file

## Resources

- [Rootstock Developer Docs](https://dev.rootstock.io)
- [Rootstock Testnet Faucet](https://faucet.rootstock.io)
- [Rootstock Block Explorer](https://explorer.testnet.rsk.co)

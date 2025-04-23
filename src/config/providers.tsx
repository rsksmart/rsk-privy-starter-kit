'use client';

import {  QueryClientProvider } from '@tanstack/react-query';
import { http } from 'viem';
import { rootstock, rootstockTestnet } from 'viem/chains';
import type { PrivyClientConfig } from '@privy-io/react-auth';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider, createConfig } from '@privy-io/wagmi';
import { queryClient } from './wagmiProviderConfig';



export const wagmiConfig = createConfig({
  chains: [rootstock, rootstockTestnet],
  transports: {
    [rootstock.id]: http(),
    [rootstockTestnet.id]: http(),
  },
});

const privyConfig: PrivyClientConfig = {
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
  },
  loginMethods: ['wallet', 'email', 'sms', 'google', 'apple'],
  appearance: {
    showWalletLoginFirst: false,
    theme: 'dark',
    loginMessage: 'Please sign this message to confirm your identity',
    walletChainType: 'ethereum-only',
  },
  defaultChain: rootstockTestnet,
  supportedChains: [rootstock, rootstockTestnet],
};

const appId = import.meta.env.VITE_PRIVY_APP_ID ;

export default function Providers({ children }: { children: React.ReactNode }) {
  
  return (
    <PrivyProvider
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      appId={appId}
      config={privyConfig}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig} reconnectOnMount={false} >
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

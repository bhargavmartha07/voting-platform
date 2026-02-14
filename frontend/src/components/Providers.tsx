'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, localhost } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
    chains: [localhost, mainnet],
    connectors: [injected()],
    transports: {
        [localhost.id]: http(),
        [mainnet.id]: http(),
    },
});

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}

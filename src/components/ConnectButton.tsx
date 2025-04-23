'use client';

/**
 * ConnectButton Component
 *
 * A wallet connection button for Web3 applications showing essential account info.
 */

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useState, useRef, useEffect } from 'react';
import { useAccount,  useBalance } from 'wagmi';

interface ConnectButtonProps {
  className?: string;
}

export default function ConnectButton({ className }: ConnectButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { address, chain, chainId } = useAccount();
  console.log(chain);
  console.log(chainId);

  const { data: balanceData } = useBalance({
    address: address,
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!ready) return null;

  const activeWallet = wallets?.[0];
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const toggleDropdown = () => setIsOpen(!isOpen);
  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {!authenticated ? (
        <button
          onClick={login}
          className="rounded-full bg-orange-400 px-4 py-2 font-semibold text-black shadow-md hover:bg-orange-500 transition-colors"
        >
          Connect Wallet
        </button>
      ) : (
        <>
          <button
            onClick={toggleDropdown}
            className="flex items-center gap-2 rounded-full bg-gray-800 px-4 py-2 font-medium text-white shadow-md hover:bg-gray-700 border border-gray-700 transition-colors"
          >
            {activeWallet && (
              <>
                <div className="h-3 w-3 rounded-full bg-green-400"></div>
                <span>{formatAddress(activeWallet.address)}</span>
              </>
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-gray-800 shadow-lg z-10 overflow-hidden border border-gray-700">
              {/* Network display */}
              <div className="p-3 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Network</span>
                  <span className="text-sm font-medium text-white flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-400"></span>
                    {chain?.name}
                  </span>
                </div>
              </div>
              
              {/* Balance display */}
              <div className="p-3 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Balance</span>
                  <span className="text-sm font-medium text-white">
                    {balanceData 
                      ? `${parseFloat(balanceData.formatted).toFixed(4)} ${balanceData.symbol}`
                      : '0'}
                  </span>
                </div>
              </div>
              
              {/* Address display */}
              <div className="p-3 border-b border-gray-700">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-gray-400">Address</span>
                  <span className="text-sm font-medium text-white break-all">
                    {activeWallet?.address}
                  </span>
                </div>
              </div>

              {/* Disconnect button */}
              <button
                onClick={handleLogout}
                className="w-full p-3 text-left text-white hover:bg-gray-700 transition-colors"
              >
                Disconnect
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

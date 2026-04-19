/**
 * Navbar Component
 *
 * L3 fix: Added mobile-responsive hamburger menu.
 *         All nav links are accessible on screens < 768px.
 */

import { useState } from "react";
import Logo from "@/components/ui/logo";
import ConnectButton from "./ConnectButton";
import { Link } from "react-router-dom";
import { JSX } from "react";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "SocialFi Paywall" },
  { to: "/aa", label: "Account Abstraction" },
  { to: "/wagmi", label: "Wagmi Demo" },
] as const;

export default function Navbar(): JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-4 z-[100] w-full max-w-[1200px] mx-auto px-4">
      {/* Main bar */}
      <div className="flex items-center justify-between py-3 px-5 rounded-full mt-4 bg-gray-600/20 backdrop-blur-lg">
        <Link to="/" onClick={() => setMobileOpen(false)}>
          <Logo className="w-[150px] h-[50px]" />
        </Link>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className="text-gray-300 hover:text-white transition-colors">
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ConnectButton />

          {/* L3: Hamburger button — visible on mobile only */}
          <button
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          >
            {mobileOpen ? (
              /* X icon */
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              /* Hamburger icon */
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* L3: Mobile dropdown menu */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          className="md:hidden mt-2 bg-gray-800/95 backdrop-blur-lg rounded-2xl border border-gray-700 overflow-hidden shadow-xl"
        >
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className="block px-6 py-4 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-0 text-sm font-medium"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

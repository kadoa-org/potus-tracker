"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertModal } from "@/components/AlertModal";
import { LiveBadge, NavBar, SiteHeader } from "@/kit";

const navItems = [
  { href: "/whitehouse", label: "White House News" },
  { href: "/truth", label: "Truth Social" },
  { href: "/schedule", label: "Schedule & Location" },
];

// Kit chrome passes both `href` and its `to` alias to LinkComponent; strip
// `to` so it never lands on the DOM.
const NavLink = ({ to: _to, ...props }: { to?: string; [key: string]: unknown }) => (
  <Link {...(props as React.ComponentProps<typeof Link>)} />
);

export function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path || (path === "/whitehouse" && pathname === "/");

  return (
    <>
      <SiteHeader
        brand={
          <>
            <img className="dk-brand-logo" src="/potus/favicon.svg" alt="" width={22} height={22} />
            <span className="dk-brand-name">POTUS Tracker</span>
          </>
        }
        LinkComponent={NavLink}
        brandSuffix={
          <a href="https://www.kadoa.com" target="_blank" rel="noreferrer" className="dk-header-link">
            by Kadoa
          </a>
        }
        right={
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LiveBadge>Live</LiveBadge>
            <AlertModal />
          </span>
        }
      />
      <NavBar
        LinkComponent={NavLink}
        items={navItems.map((it) => ({ href: it.href, label: it.label, active: isActive(it.href) }))}
      />
    </>
  );
}

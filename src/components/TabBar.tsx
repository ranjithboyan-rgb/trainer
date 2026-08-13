"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, Settings as SettingsIcon } from "lucide-react";
import { T } from "@/lib/theme";

const TABS = [
  { href: "/today", label: "Today", Icon: CalendarDays },
  { href: "/clients", label: "Clients", Icon: Users },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
] as const;

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      style={{
        position: "sticky",
        bottom: 0,
        background: "rgba(250,250,250,0.94)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: `1px solid ${T.border}`,
        display: "flex",
        padding: "8px 40px calc(18px + env(safe-area-inset-bottom))",
        zIndex: 30,
      }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              textAlign: "center",
              textDecoration: "none",
              padding: "4px 0",
            }}
          >
            <Icon
              size={22}
              color={active ? T.ink : T.faint}
              strokeWidth={active ? 2.4 : 2}
              style={{ display: "block", margin: "0 auto 3px" }}
            />
            <span
              style={{ fontSize: 10.5, fontWeight: 600, color: active ? T.ink : T.faint }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

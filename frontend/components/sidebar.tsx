"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  UserCircle,
  Rocket,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline/new", label: "New Pipeline", icon: Rocket },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("User");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUserEmail(data.session.user.email || "");
        const meta = data.session.user.user_metadata;
        setUserName(meta?.full_name || meta?.name || "User");
        setAvatarUrl(meta?.avatar_url || meta?.picture || "");
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .filter((n) => n.length > 0)
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <aside
      className={`relative flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out ${isCollapsed ? "w-20" : "w-64"
        }`}
    >
      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-5 z-20 h-8 w-8 rounded-full border border-border bg-background shadow-sm hover:bg-accent"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Logo */}
      <div
        className={`flex h-16 shrink-0 items-center border-b border-sidebar-border ${isCollapsed ? "justify-center px-0" : "justify-start px-6"
          }`}
      >
        <span
          className={`text-lg font-bold tracking-tight gradient-text transition-all ${isCollapsed ? "hidden" : "block"
            }`}
        >
          Career Agent
        </span>
        {isCollapsed && (
          <span className="text-lg font-bold tracking-tight gradient-text">
            CA
          </span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-2 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                  ? "bg-primary/15 text-primary shadow-sm glow-sm"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                } ${isCollapsed ? "justify-center" : "justify-start"}`}
            >
              <Icon
                className={`shrink-0 h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-primary" : ""
                  }`}
              />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Profile / Logout */}
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`flex w-full items-center justify-start gap-3 rounded-xl px-2 py-3 text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${isCollapsed ? "justify-center" : ""
              }`}
          >
            <Avatar className="h-8 w-8 rounded-lg shrink-0 border border-primary/20">
              <AvatarImage src={avatarUrl} alt={userName} />
              <AvatarFallback className="bg-primary/10 text-primary rounded-lg text-xs font-semibold">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>

            {!isCollapsed && (
              <div className="flex flex-1 flex-col items-start overflow-hidden leading-tight">
                <span className="truncate font-semibold">{userName}</span>
                <span className="truncate text-xs text-muted-foreground w-full text-left">
                  {userEmail}
                </span>
              </div>
            )}

            {!isCollapsed && <MoreVertical className="h-4 w-4 shrink-0 text-muted-foreground" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="right"
            className="w-56"
            sideOffset={14}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-1 p-2">
                <span className="font-semibold">{userName}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {userEmail}
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/profile")}
              className="cursor-pointer py-2"
            >
              <UserCircle className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4 shrink-0" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

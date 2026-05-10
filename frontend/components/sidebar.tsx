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
  LayoutGrid,
  UserCircle,
  FolderPlus,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  ChevronsUpDown,
  User,
  Settings,
} from "lucide-react";
import { Logo } from "@/components/logo";

const navItems = [
  { href: "/dashboard", label: "Missions", icon: LayoutGrid },
  { href: "/pipeline/new", label: "New Mission", icon: FolderPlus },
  { href: "/profile", label: "Profile", icon: User },
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
      className={`relative flex h-full flex-col border-r border-[#EBEBEB] bg-white transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${isCollapsed ? "w-[68px]" : "w-[240px]"
        }`}
    >
      {/* Header */}
      <div
        className={`flex h-14 shrink-0 items-center border-b border-[#EBEBEB] px-4 ${isCollapsed ? "justify-center" : "justify-between"
          }`}
      >
        <Logo iconOnly={isCollapsed} className={isCollapsed ? "scale-[0.85]" : "scale-[0.85]"} />

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex items-center justify-center h-7 w-7 rounded-md text-[#999] hover:text-[#1a1a1a] hover:bg-[#F5F5F5] transition-colors ${isCollapsed
            ? "absolute -right-3.5 top-3.5 z-20 rounded-full border border-[#EBEBEB] bg-white shadow-sm"
            : ""
            }`}
        >
          {isCollapsed ? (
            <PanelLeft className="h-3.5 w-3.5" />
          ) : (
            <PanelLeftClose className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${isActive
                ? "bg-[#F5F5F5] text-[#1a1a1a]"
                : "text-[#666] hover:bg-[#F5F5F5] hover:text-[#1a1a1a]"
                } ${isCollapsed ? "justify-center px-0" : ""}`}
            >
              <Icon
                className={`shrink-0 h-[18px] w-[18px] transition-colors ${isActive ? "text-[#1a1a1a]" : "text-[#999] group-hover:text-[#666]"
                  }`}
                strokeWidth={isActive ? 2 : 1.75}
              />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-[#EBEBEB] p-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors hover:bg-[#F5F5F5] outline-hidden focus-visible:ring-1 focus-visible:ring-[#1a1a1a] ${isCollapsed ? "justify-center px-0" : ""
              }`}
          >
            <Avatar className="h-7 w-7 rounded-full shrink-0 border border-[#EBEBEB]">
              <AvatarImage src={avatarUrl} alt={userName} />
              <AvatarFallback className="bg-[#F5F5F5] text-[#1a1a1a] rounded-full text-[10px] font-semibold">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>

            {!isCollapsed && (
              <div className="flex flex-1 flex-col items-start overflow-hidden leading-none">
                <span className="truncate text-[13px] font-medium text-[#1a1a1a]">{userName}</span>
                <span className="truncate text-[11px] text-[#999] w-full text-left mt-0.5">
                  {userEmail}
                </span>
              </div>
            )}

            {!isCollapsed && <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[#ccc]" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="right"
            className="w-52 rounded-xl p-1"
            sideOffset={12}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-1.5">
                <span className="text-[13px] font-semibold">{userName}</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  {userEmail}
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/profile")}
              className="cursor-pointer py-1.5 rounded-lg text-[13px]"
            >
              <Settings className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer rounded-lg text-[13px]"
            >
              <LogOut className="mr-2 h-3.5 w-3.5 shrink-0" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

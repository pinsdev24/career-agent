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
  PanelLeftClose,
  PanelLeft,
  MoreVertical,
} from "lucide-react";
import { Logo } from "@/components/logo";

const navItems = [
  { href: "/dashboard", label: "Missions", icon: LayoutDashboard },
  { href: "/pipeline/new", label: "New Mission", icon: Rocket },
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
      className={`relative flex h-full flex-col border-r border-[#E8E6E1] bg-[#FDFDFC] transition-all duration-300 ease-in-out ${isCollapsed ? "w-20" : "w-64"
        }`}
    >
      {/* Header with Logo & Toggle */}
      <div
        className={`relative flex h-16 shrink-0 items-center border-b border-[#E8E6E1] px-4 ${isCollapsed ? "justify-center" : "justify-between"
          }`}
      >
        <Logo iconOnly={isCollapsed} className={isCollapsed ? "scale-[0.7]" : "scale-90"} />
        
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`h-8 w-8 rounded-lg hover:bg-[#F4F3F0] text-gray-400 ${
            isCollapsed 
              ? "absolute -right-4 top-4 z-20 rounded-full border border-[#E8E6E1] bg-white shadow-sm" 
              : "relative"
          }`}
        >
          {isCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-2 px-3 py-4">
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
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                  ? "bg-[#111111] text-white shadow-md shadow-black/5"
                  : "text-gray-500 hover:bg-[#F4F3F0] hover:text-[#111111]"
                } ${isCollapsed ? "justify-center" : "justify-start"}`}
            >
              <Icon
                className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-white" : ""} ${isCollapsed ? "h-4.5 w-4.5" : "h-5 w-5"}`}
              />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Profile / Logout */}
      <div className="border-t border-[#E8E6E1] p-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`flex w-full items-center justify-start gap-3 rounded-xl px-2 py-3 text-sm font-medium transition-colors text-gray-700 hover:bg-[#F4F3F0] outline-hidden focus-visible:ring-1 focus-visible:ring-[#111111] disabled:pointer-events-none disabled:opacity-50 ${isCollapsed ? "justify-center" : ""
              }`}
          >
            <Avatar className="h-8 w-8 rounded-lg shrink-0 border border-[#E8E6E1]">
              <AvatarImage src={avatarUrl} alt={userName} />
              <AvatarFallback className="bg-gray-100 text-[#111111] rounded-lg text-xs font-semibold">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>

            {!isCollapsed && (
              <div className="flex flex-1 flex-col items-start overflow-hidden leading-tight">
                <span className="truncate font-medium text-[#111111]">{userName}</span>
                <span className="truncate text-xs text-gray-500 w-full text-left">
                  {userEmail}
                </span>
              </div>
            )}

            {!isCollapsed && <MoreVertical className="h-4 w-4 shrink-0 text-gray-400" />}
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

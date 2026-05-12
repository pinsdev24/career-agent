"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutGrid,
  FolderPlus,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  ChevronsUpDown,
  User,
  Settings,
} from "lucide-react";
import { Logo } from "@/components/logo";

const navItemsConfig = [
  { href: "/dashboard", labelKey: "missions", icon: LayoutGrid },
  { href: "/pipeline/new", labelKey: "new_mission", icon: FolderPlus },
];

export function Sidebar() {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("User");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

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
      onClick={() => {
        if (isCollapsed) setIsCollapsed(false);
      }}
      className={`relative flex h-full flex-col border-r border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#111] transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${ isCollapsed ? "w-[68px] cursor-pointer" : "w-[240px]" }`}
    >
      {/* Header */}
      <div
        className={`flex h-14 shrink-0 items-center border-b border-[#EBEBEB] dark:border-[#333] ${ isCollapsed ? "justify-center px-0" : "justify-between px-4" }`}
      >
        {!isCollapsed && <Logo className="scale-[0.85]" />}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
          className="flex items-center justify-center h-8 w-8 rounded-md text-[#999] dark:text-[#888] hover:text-[#1a1a1a] dark:hover:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#222] transition-colors"
        >
          {isCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5">
        {navItemsConfig.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          const Icon = item.icon;
          const label = t(item.labelKey as any);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => e.stopPropagation()}
              title={isCollapsed ? label : undefined}
              className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${ isActive ? "bg-[#F5F5F5] dark:bg-[#222] text-[#1a1a1a] dark:text-white" : "text-[#666] dark:text-[#888] hover:bg-[#F5F5F5] dark:hover:bg-[#222] hover:text-[#1a1a1a] dark:hover:text-white" } ${isCollapsed ? "justify-center px-0" : ""}`}
            >
              <Icon
                className={`shrink-0 h-[18px] w-[18px] transition-colors ${ isActive ? "text-[#1a1a1a] dark:text-white" : "text-[#999] dark:text-[#666] group-hover:text-[#666] dark:group-hover:text-[#888]" }`}
                strokeWidth={isActive ? 2 : 1.75}
              />
              {!isCollapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-[#EBEBEB] dark:border-[#333] p-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors hover:bg-[#F5F5F5] dark:hover:bg-[#222] outline-none focus-visible:ring-1 focus-visible:ring-[#1a1a1a] dark:focus-visible:ring-white ${ isCollapsed ? "justify-center px-0" : "" }`}
          >
            <Avatar className="h-7 w-7 rounded-full shrink-0 border border-[#EBEBEB] dark:border-[#333]">
              <AvatarImage src={avatarUrl} alt={userName} />
              <AvatarFallback className="bg-[#F5F5F5] dark:bg-[#222] text-[#1a1a1a] dark:text-white rounded-full text-[10px] font-semibold">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>

            {!isCollapsed && (
              <div className="flex flex-1 flex-col items-start overflow-hidden leading-none">
                <span className="truncate text-[13px] font-medium text-[#1a1a1a] dark:text-white">
                  {userName}
                </span>
                <span className="truncate text-[11px] text-[#999] dark:text-[#888] w-full text-left mt-0.5">
                  {userEmail}
                </span>
              </div>
            )}

            {!isCollapsed && (
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[#ccc] dark:text-[#666]" />
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            side="right"
            className="w-52 rounded-xl p-1 bg-white dark:bg-[#111] border-[#EBEBEB] dark:border-[#333]"
            sideOffset={12}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-1.5">
                <span className="text-[13px] font-semibold text-[#1a1a1a] dark:text-white">{userName}</span>
                <span className="text-[11px] text-[#999] dark:text-[#888] font-normal">
                  {userEmail}
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-[#EBEBEB] dark:bg-[#333]" />

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push("/profile");
              }}
              className="cursor-pointer py-1.5 rounded-lg text-[13px] text-[#1a1a1a] dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#222]"
            >
              <User className="mr-2 h-3.5 w-3.5 shrink-0 text-[#999] dark:text-[#888]" />
              <span>{t("profile")}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push("/settings");
              }}
              className="cursor-pointer py-1.5 rounded-lg text-[13px] text-[#1a1a1a] dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#222]"
            >
              <Settings className="mr-2 h-3.5 w-3.5 shrink-0 text-[#999] dark:text-[#888]" />
              <span>{t("settings")}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-[#EBEBEB] dark:bg-[#333]" />

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setShowSignOutDialog(true);
              }}
              className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300 focus:bg-red-50 dark:focus:bg-red-900/30 cursor-pointer rounded-lg text-[13px]"
            >
              <LogOut className="mr-2 h-3.5 w-3.5 shrink-0" />
              <span>{t("sign_out")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent className="max-w-sm rounded-xl bg-white dark:bg-[#111] border-[#EBEBEB] dark:border-[#333]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] text-[#1a1a1a] dark:text-white">
              {t("sign_out_confirm_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-[#666] dark:text-[#888]">
              {t("sign_out_confirm_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 text-[13px] rounded-lg border-[#EBEBEB] dark:border-[#333] hover:bg-[#F5F5F5] dark:hover:bg-[#222]">
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="h-9 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-[13px]"
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}

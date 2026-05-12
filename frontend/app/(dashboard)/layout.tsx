import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFA] dark:bg-[#000000] text-[#1a1a1a] dark:text-white font-sans antialiased">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-10 py-8">{children}</div>
      </main>
    </div>
  );
}

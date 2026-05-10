import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFA] text-[#1a1a1a] font-sans antialiased">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-10 py-8">{children}</div>
      </main>
    </div>
  );
}

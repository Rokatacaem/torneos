import { AdminSidebar } from "@/app/components/admin/AdminSidebar";
import { getSession } from '@/app/lib/session';

import { AdminHeader } from "@/app/components/admin/AdminHeader";

export default async function AdminLayout({ children }) {
    const session = await getSession();
    const userRole = session?.role || 'DIRECTOR'; // Default to restricted if unknown
    const userName = session?.role === 'SUPERADMIN' ? 'Admin User' : 'Director'; // Placeholder name logic

    return (
        <div className="min-h-screen flex bg-muted/20">
            {/* Sidebar - Client Component */}
            <AdminSidebar role={userRole} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <AdminHeader userName={userName} role={userRole} />
                <main className="flex-1 p-6 overflow-auto">
                    {children}
                </main>
                <footer className="h-12 border-t flex items-center justify-center text-xs text-muted-foreground bg-background/50">
                    &copy; {new Date().getFullYear()} Sistema Fechillar. Desarrollado por Rodrigo Zúñiga.
                </footer>
            </div>
        </div>
    );
}

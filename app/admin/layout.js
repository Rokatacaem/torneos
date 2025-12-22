import { AdminSidebar } from "@/app/components/admin/AdminSidebar";
import { getSession } from "@/app/lib/auth";

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
                <header className="h-16 border-b bg-card flex items-center justify-between px-6">
                    <div className="md:hidden">
                        <span className="font-bold">Admin</span>
                    </div>
                    <div className="ml-auto flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                            Admin User
                        </div>
                        <div className="h-8 w-8 bg-accent rounded-full"></div>
                    </div>
                </header>
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

import { getClubBySlug } from '@/app/lib/tournament-actions';
import { notFound } from 'next/navigation';

export default async function TenantLayout({ children, params }) {
  const { slug } = await params;
  const tenant = await getClubBySlug(slug);

  if (!tenant) {
    notFound();
  }

  // Branding dynamic variables
  const primaryColor = tenant.primary_color || '#3b82f6'; // Default Blue
  const secondaryColor = tenant.secondary_color || '#1e293b'; // Default Slate

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --tenant-primary: ${primaryColor};
          --tenant-secondary: ${secondaryColor};
          --tenant-logo: url('${tenant.logo_url || '/logo-default.png'}');
        }
      `}} />
      <div className="min-h-screen bg-background text-foreground antialiased font-sans">
          {/* Aquí podrías añadir un Navbar global para el tenant */}
          <main>
            {children}
          </main>
      </div>
    </>
  );
}

import Hero from '@/app/components/landing/Hero';
import QuickAccess from '@/app/components/landing/QuickAccess';
import ClubsSection from '@/app/components/landing/ClubsSection'; // Added
import NewsSection from '@/app/components/landing/NewsSection';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B1120]">
      {/* 
        Navigation Bar Placeholder 
        Can be moved to a Layout later. For now, inline to keep simple.
      */}
      <nav className="border-b border-white/5 bg-[#0B1120]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-white tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-xs">
              F
            </div>
            FECHILLAR
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <Link href="/" className="text-white">Inicio</Link>
            <Link href="/ranking" className="hover:text-white transition-colors">Ranking</Link>
            <Link href="/tournaments" className="hover:text-white transition-colors">Torneos</Link>
            <Link href="/clubs" className="hover:text-white transition-colors">Clubes</Link>
            <Link href="#" className="hover:text-white transition-colors">Contacto</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-white bg-white/10 px-4 py-2 rounded hover:bg-white/20 transition-colors"
            >
              Acceso Socios
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <Hero />
        <QuickAccess />
        <ClubsSection />
        <NewsSection />
      </main>

      <footer className="bg-[#050911] text-slate-500 py-12 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-white font-bold mb-4">Federación Chilena de Billar</h3>
            <p className="text-sm leading-relaxed max-w-sm">
              Promoviendo el desarrollo deportivo del billar en todas sus modalidades.
              Afiliada a la Confederación Panamericana de Billar (CPB).
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase">Enlaces</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-blue-400">Estatutos</Link></li>
              <li><Link href="#" className="hover:text-blue-400">Transparencia</Link></li>
              <li><Link href="#" className="hover:text-blue-400">Directorio</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase">Contacto</h4>
            <ul className="space-y-2 text-sm">
              <li>contacto@fechillar.cl</li>
              <li>Santiago, Chile</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 mt-12 pt-8 border-t border-white/5 text-center text-xs">
          &copy; {new Date().getFullYear()} Sistema Fechillar. Desarrollado por Rodrigo Zúñiga.
        </div>
      </footer>
    </div>
  );
}

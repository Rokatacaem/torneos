import { Settings, Database, Server, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

export default function SettingsPage() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-card p-6 rounded-xl border border-white/5 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Configuración</h1>
                    <p className="text-slate-400">Administra las preferencias globales del sistema.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-card border-white/5 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Database className="h-5 w-5 text-blue-500" />
                            Base de Datos
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Estado y mantenimiento de la base de datos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-[#0B1120] border border-white/5">
                            <span className="text-sm font-medium text-slate-300">Conexión</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                                Conectado
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-[#0B1120] border border-white/5">
                            <span className="text-sm font-medium text-slate-300">Último Respaldo</span>
                            <span className="text-sm text-slate-500">Nunca</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-white/5 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Server className="h-5 w-5 text-blue-500" />
                            Sistema
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Configuración del servidor y rendimiento.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-[#0B1120] border border-white/5">
                            <span className="text-sm font-medium text-slate-300">Versión</span>
                            <span className="text-sm text-slate-400">v0.1.0 (Beta)</span>
                        </div>
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/5 text-sm font-medium">
                            <RefreshCw size={16} />
                            Limpiar Caché
                        </button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

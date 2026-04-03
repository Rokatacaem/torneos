import { query } from '@/app/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log("Iniciando migración SQL para SaaS Multi-tenant...");

    const sql = `
      -- 1. Campos de Identidad Visual y Ruteo para SaaS
      ALTER TABLE clubs ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
      ALTER TABLE clubs ADD COLUMN IF NOT EXISTS primary_color VARCHAR(10) DEFAULT '#3b82f6';
      ALTER TABLE clubs ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(10) DEFAULT '#1e293b';
      ALTER TABLE clubs ADD COLUMN IF NOT EXISTS tenant_type TEXT DEFAULT 'CLUB';

      -- 2. Inicializar slugs para clubes existentes basándose en el nombre corto
      UPDATE clubs SET slug = LOWER(REPLACE(short_name, ' ', '-')) WHERE slug IS NULL;
    `;

    await query(sql);

    return NextResponse.json({ 
      success: true, 
      message: "Base de datos actualizada con éxito para el modelo SaaS Multi-tenant.",
      details: "Se han añadido columnas (slug, primary_color, secondary_color, tenant_type) y se han generado slugs iniciales."
    });

  } catch (error) {
    console.error("Error en la migración:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

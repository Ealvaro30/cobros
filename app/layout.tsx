import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { QueryProvider } from '@/components/shared/QueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'GMG Cobranzas | Sistema de Gestión de Cobranza',
  description:
    'Sistema profesional de gestión de cobranzas para clientes morosos. Dashboard financiero, gestiones, promesas de pago y reportes.',
  keywords: 'cobranzas, gestión, morosos, dashboard financiero, GMG Servicios',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

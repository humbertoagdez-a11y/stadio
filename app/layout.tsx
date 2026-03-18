import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Stadio TV - Transmisiones Deportivas en Vivo',
  description: 'Disfruta de los mejores partidos en vivo y en máxima calidad HD.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-[#050505] text-white`}>
        {children}
        
        {/* PUBLICIDAD POPUNDER DE ADSTERRA */}
        <Script 
          src="https://cardinaltangible.com/2c/d6/75/2cd6751fc31612b0ba021e2af423db05.js" 
          strategy="afterInteractive" 
        />
        
      </body>
    </html>
  );
}
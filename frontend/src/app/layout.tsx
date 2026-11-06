import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartPOS | UMKM Master System",
  description: "Sistem POS dan dashboard operasional untuk UMKM modern.",
};

const themeScript = `(function(){try{var root=document.documentElement;var saved=localStorage.getItem('smartpos-theme');var dark=saved==='dark'||(!saved&&window.matchMedia('(prefers-color-scheme: dark)').matches);root.classList.toggle('dark',dark);root.style.colorScheme=dark?'dark':'light';var font=localStorage.getItem('app_font_family');if(['dn-rounded','inter','system'].indexOf(font)!==-1)root.classList.add('font-'+font);var size=localStorage.getItem('app_font_size');if(['small','medium','large'].indexOf(size)!==-1)root.classList.add('font-size-'+size);}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}

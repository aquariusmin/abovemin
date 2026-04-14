"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ThemeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLab = pathname === '/lab' || pathname?.startsWith('/lab/');

  const bgColor = isLab ? 'bg-[#1a1c1a]' : 'bg-[#FAF9F6]';
  const textColor = isLab ? 'text-white' : 'text-[#222]';

  useEffect(() => {
    function blockContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('img')) {
        e.preventDefault();
      }
    }
    document.addEventListener('contextmenu', blockContextMenu);
    return () => document.removeEventListener('contextmenu', blockContextMenu);
  }, []);

  return (
    <body className={`${bgColor} ${textColor} transition-colors duration-500 antialiased flex flex-col min-h-screen`}>
      {children}
    </body>
  );
}

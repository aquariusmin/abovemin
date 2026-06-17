"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ThemeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLab = pathname === '/lab' || pathname?.startsWith('/lab/');

  const bgColor = isLab ? 'bg-[#141613]' : 'bg-[#F4F2EC]';
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
    <body className={`${bgColor} ${textColor} ${isLab ? 'theme-lab' : ''} transition-colors duration-500 antialiased flex flex-col min-h-screen`}>
      <div className="ambient" aria-hidden />
      {children}
    </body>
  );
}

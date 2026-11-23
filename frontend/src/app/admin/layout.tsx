import type { Metadata } from 'next';

// robots.txt Disallow만으로는 색인을 막지 못한다 — noindex 메타와 두 겹으로 둔다.
export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}

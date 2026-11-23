import Link from 'next/link';

export default function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="link-underline text-sm text-slate">
      <span aria-hidden>&larr;</span> {children}
    </Link>
  );
}

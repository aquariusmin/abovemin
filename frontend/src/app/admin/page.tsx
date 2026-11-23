import { Suspense } from 'react';
import AdminApp from '@/components/admin/AdminApp';

// useSearchParams는 Suspense 경계가 없으면 프로덕션 빌드(프리렌더)가 실패한다.
export default function AdminPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-canvas" aria-hidden />}>
      <AdminApp />
    </Suspense>
  );
}

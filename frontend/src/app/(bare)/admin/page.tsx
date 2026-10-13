import { Suspense } from 'react';
import AdminApp from '@/components/admin/AdminApp';

/**
 * `/admin`은 서버 컴포넌트로 두고, 관리 화면 전체(클라이언트)를 Suspense로
 * 감싼다.
 *
 * 탭 상태를 URL(`?tab=`)에서 읽는데 `useSearchParams`는 프리렌더되는 페이지에서
 * 가장 가까운 Suspense 경계까지를 클라이언트 렌더로 돌린다. 경계가 없으면
 * 프로덕션 빌드가 "Missing Suspense boundary with useSearchParams"로 실패한다
 * (`node_modules/next/dist/docs/.../use-search-params.md`). 폴백은 세션 확인 중
 * 화면과 같은 빈 캔버스라 로드 순간에 모양이 바뀌지 않는다.
 */
export default function AdminPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-canvas" aria-hidden />}>
      <AdminApp />
    </Suspense>
  );
}

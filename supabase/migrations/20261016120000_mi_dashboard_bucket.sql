-- /lab/markets(본인 전용 시장 대시보드)의 데이터 저장소. 적용 순서는 상관없다 —
-- 버킷이 없으면 업로드 API가 503을 돌려주고, 페이지는 "아직 데이터 없음"을 보인다.
-- 적용 방법: Supabase 대시보드 → SQL Editor에 이 파일을 붙여넣고 실행.
--
-- 왜 비공개 버킷인가: 내용이 KRX·토스증권 시세에서 나온 값이다. 두 약관 모두
-- 제3자 배포를 금지하므로 공개 테이블(anon 읽기)에 두지 않는다. 쓰기와 읽기는
-- 모두 서버의 service-role(`lib/supabase-admin.ts`)만 하고, 읽기 쪽 페이지는
-- 관리자 세션(`isAdminRequest`)을 확인한 뒤에만 연다. anon·authenticated 역할에는
-- storage.objects 정책을 주지 않는다 — 정책이 없으면 RLS가 모두 막는다.
--
-- 파일은 덮어쓰기(upsert)만 한다: core.json, news.json, performance.json.
-- 원본과 이력은 사용자의 PC(market-intelligence-dashboard)에 있다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mi-dashboard', 'mi-dashboard', false, 5242880, array['application/json'])
on conflict (id) do nothing;

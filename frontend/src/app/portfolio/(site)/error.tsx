"use client";

// 루트 `error.tsx`의 경계는 이 그룹의 레이아웃 **바깥**에 있다. 여기 두지 않으면
// 페이지 오류가 Nav와 Footer까지 걷어내고 오류 화면만 남는다.
export { default } from '@/app/error';

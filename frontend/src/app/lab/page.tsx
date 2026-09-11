import { FleetDashboard } from "@/components/quant/FleetDashboard";
import { supabase } from "@/lib/supabase";
import { log } from "@/lib/logger";
import type { FleetBot } from "@/lib/quant";

export const revalidate = 60;

/**
 * 첫 화면에 들어갈 플릿 상태를 서버에서 한 번 읽는다.
 *
 * 전에는 이 페이지가 완전히 클라이언트 fetch였다. 그래서 HTML에는 "establishing
 * feed…"만 들어 있었고 — sitemap에 daily로 올라가 있는 라우트인데 크롤러가 보는
 * 것이 로딩 문구뿐이었다 — 사람 눈에도 매번 빈 콘솔이 한 번 스쳤다. 서버에서
 * 같은 테이블을 한 번 읽어 넘기면 첫 페인트부터 숫자가 있고, 폴링은 그대로
 * 이어진다.
 *
 * `select('*')`인 이유는 API 라우트와 같다: 스키마를 소유한 쪽은 동기화
 * 컨테이너이고 컬럼이 뒤늦게 따라오므로, 열 목록을 박아 두면 아직 없는 컬럼
 * 하나에 요청 전체가 42703으로 실패한다.
 *
 * 실패하면 `null`을 돌려 클라이언트가 평소의 "연결 중" 상태로 시작하게 둔다 —
 * 빈 배열은 "봇이 없다"는 뜻이라 의미가 다르다.
 */
async function getFleet(): Promise<FleetBot[] | null> {
  const { data, error } = await supabase
    .from("quant_fleet")
    .select("*")
    .order("equity", { ascending: false });
  if (error) {
    log.warn("lab.fleet_ssr", error);
    return null;
  }
  return (data ?? []) as FleetBot[];
}

export default async function Lab() {
  const initialBots = await getFleet();

  return (
    // Same page frame as every other route: `px-4 sm:px-6 md:px-10` and the
    // site's `py-10 md:py-16` rhythm. It used to sit at `pt-24`, which stacked
    // on top of the layout's own nav offset and left the console floating far
    // below where every other page starts.
    <main className="lab-console min-h-screen bg-[var(--lab-plane)] px-4 py-10 sm:px-6 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1500px] space-y-4">
        {/* Command bar. The console is machinery and its structure says so —
            but the wordmark wears the site's ink: forest for the name, moss
            for the divider, the same two colours the nav and the section
            markers use. Everything below is scoped to `.lab-console`. */}
        <header className="glass-inset flex h-11 items-center gap-3 border border-[var(--lab-border)] px-4">
          {/* 콘솔의 워드마크가 이 페이지의 유일한 제목이다. `span`이던 탓에
              /lab에는 h1이 하나도 없었다 (axe: page-has-heading-one). 태그만
              바뀌고 보이는 것은 그대로다 — Tailwind preflight가 h1의 기본
              크기와 여백을 이미 지운다. */}
          <h1 className="lab-mono text-[14px] font-medium tracking-[0.18em] text-[var(--lab-accent)]">
            QUANT<span className="text-[var(--moss)]">/</span>FLEET
          </h1>
          <span className="hidden h-3.5 w-px bg-[var(--lab-border)] sm:block" />
          <span className="lab-label hidden sm:block">operational console</span>
          <span className="lab-label ml-auto">abovemin.com/lab</span>
        </header>

        <FleetDashboard initialBots={initialBots} />

        {/* The status of the money is stated in words, under the numbers, so
            nobody has to infer it from a badge. This used to read "paper
            trading only · simulated capital" — true then, and false the moment
            a real account started trading. The per-bot VENUE tag is what
            actually distinguishes them, row by row. */}
        <p className="lab-prose rounded-[var(--radius-md)] border border-[var(--lab-border)] bg-[var(--lab-surface-1)] px-4 py-3 text-[var(--lab-ink-2)]">
          Live operational status, synced from the trading host. Each row is
          tagged with the account it trades:{" "}
          <span className="lab-mono text-[var(--lab-serious)]">TOSS·REAL</span> and{" "}
          <span className="lab-mono text-[var(--lab-serious)]">KIS</span> are real money;{" "}
          <span className="lab-mono text-[var(--lab-ink-1)]">KIS-MOCK</span> and{" "}
          <span className="lab-mono text-[var(--lab-ink-1)]">SIM</span> are simulated
          capital. Real and simulated equity are never totalled together.
          Nothing here is advice, a solicitation, or a claim of future
          performance.
        </p>
      </div>
    </main>
  );
}

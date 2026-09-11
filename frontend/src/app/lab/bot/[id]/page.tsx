import { notFound } from "next/navigation";
import { BotDetail } from "@/components/quant/BotDetail";
import { supabase } from "@/lib/supabase";
import { log } from "@/lib/logger";
import type { FleetBot } from "@/lib/quant";

export const revalidate = 60;

/**
 * 이 봇의 현재 상태를 서버에서 한 번 읽는다.
 *
 * `/lab`과 같은 이유다 — 첫 페인트부터 숫자가 있어야 하고, 클라이언트 fetch만
 * 있으면 HTML에는 "loading…"밖에 없다. `select('*')`인 이유도 같다(스키마를
 * 소유한 쪽은 동기화 컨테이너이고 컬럼이 뒤늦게 따라온다).
 *
 * 조회 실패와 "그런 봇 없음"을 구분한다. 예전에는 존재하지 않는 id도 200을
 * 돌려주고 화면에만 "no bot with id …"를 그렸다 — 오타 난 URL이 정상 페이지로
 * 취급되는 soft-404다. 없으면 404를 준다.
 */
async function getBot(id: string): Promise<FleetBot | null | "error"> {
  const { data, error } = await supabase
    .from("quant_fleet")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    log.warn("lab.bot_ssr", error);
    return "error";
  }
  return (data as FleetBot | null) ?? null;
}

export default async function BotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const botId = decodeURIComponent(id);
  const result = await getBot(botId);

  // 조회 자체가 실패한 경우에는 404를 주지 않는다 — 그건 "없다"가 아니라
  // "모른다"이고, 클라이언트가 다시 시도해 살아날 수 있다.
  if (result === null) notFound();

  return (
    <main className="lab-console min-h-screen bg-[var(--lab-plane)] px-4 py-10 sm:px-6 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1500px]">
        <BotDetail botId={botId} initialBot={result === "error" ? null : result} />
      </div>
    </main>
  );
}

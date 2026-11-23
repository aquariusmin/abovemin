import { notFound } from "next/navigation";
import { BotDetail } from "@/components/quant/BotDetail";
import { supabase } from "@/lib/supabase";
import { log } from "@/lib/logger";
import type { FleetBot } from "@/lib/quant";

export const revalidate = 60;

// 조회 실패와 "그런 봇 없음"을 구분한다 — 없으면 404(soft-404 방지). select('*')는 /lab과 같은 이유.
async function getBot(
  id: string,
): Promise<{ bot: FleetBot | null | "error"; readAt: number }> {
  const { data, error } = await supabase
    .from("quant_fleet")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const readAt = Date.now();
  if (error) {
    log.warn("lab.bot_ssr", error);
    return { bot: "error", readAt };
  }
  return { bot: (data as FleetBot | null) ?? null, readAt };
}

export default async function BotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const botId = decodeURIComponent(id);
  const { bot: result, readAt } = await getBot(botId);

  // 조회 실패는 404가 아니다 — "없다"가 아니라 "모른다"이고, 클라이언트가 다시 시도한다.
  if (result === null) notFound();

  return (
    <main className="lab-console min-h-screen bg-[var(--lab-plane)] px-4 py-10 sm:px-6 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1500px]">
        <BotDetail
          botId={botId}
          initialBot={result === "error" ? null : result}
          renderedAt={readAt}
        />
      </div>
    </main>
  );
}

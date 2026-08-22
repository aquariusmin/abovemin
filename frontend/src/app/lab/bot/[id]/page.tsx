import { BotDetail } from "@/components/quant/BotDetail";
import "../../lab-console.css";

export default async function BotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="lab-console min-h-screen bg-[var(--lab-plane)] px-4 pt-24 pb-14 md:px-6">
      <div className="mx-auto max-w-[1500px]">
        <BotDetail botId={decodeURIComponent(id)} />
      </div>
    </main>
  );
}

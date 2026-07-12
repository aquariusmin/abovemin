import { BotDetail } from "@/components/quant/BotDetail";
import Reveal from "@/components/motion/Reveal";

export default async function BotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-surface-dark pt-32 pb-20 px-6 md:px-10">
      <Reveal className="max-w-7xl mx-auto" y={16}>
        <BotDetail botId={decodeURIComponent(id)} />
      </Reveal>
    </main>
  );
}

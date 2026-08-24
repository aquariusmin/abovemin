import { BotDetail } from "@/components/quant/BotDetail";

export default async function BotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="lab-console min-h-screen bg-[var(--lab-plane)] px-4 py-10 sm:px-6 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1500px]">
        <BotDetail botId={decodeURIComponent(id)} />
      </div>
    </main>
  );
}

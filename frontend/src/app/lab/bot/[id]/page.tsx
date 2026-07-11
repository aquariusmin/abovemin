import { BotDetail } from "@/components/quant/BotDetail";

export const dynamic = "force-dynamic";

export default async function BotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-[#1a1c1a] pt-32 pb-20 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        <BotDetail botId={decodeURIComponent(id)} />
      </div>
    </main>
  );
}

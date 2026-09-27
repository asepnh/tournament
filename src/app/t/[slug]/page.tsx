import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicTournamentData } from "@/lib/public-tournament";
import { PublicTournamentView } from "@/components/public/PublicTournamentView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicTournamentData(slug);
  if (!data) return {};
  return {
    title: `${data.tournament.name} — Live Results`,
    description:
      data.tournament.description ?? "Live pickleball tournament results",
  };
}

export default async function PublicTournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPublicTournamentData(slug);
  if (!data) {
    notFound();
  }

  return <PublicTournamentView slug={slug} initial={data} />;
}

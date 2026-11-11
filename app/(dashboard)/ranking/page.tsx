import { redirect } from 'next/navigation';

// A página antiga de ranking foi substituída pelo Ranking de Torneios
export default function RankingAntigo() {
  redirect('/dashboard/ranking');
}

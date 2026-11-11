import { redirect } from 'next/navigation';

// A página antiga de ranking foi substituída pelo novo Ranking
export default function RankingAntigo() {
  redirect('/dashboard/ranking');
}

export function calcularEscalao(dataNascimento: string): string {
  const anoNascimento = new Date(dataNascimento).getFullYear();
  const anoAtual = new Date().getFullYear();
  const idade = anoAtual - anoNascimento;

  if (idade <= 10) return "Benjamins";
  if (idade === 11) return "Infantis";
  if (idade === 12) return "Iniciados";
  if (idade === 13 || idade === 14) return "Juvenis";
  if (idade >= 15 && idade <= 17) return "Cadetes";
  if (idade >= 18 && idade <= 20) return "Juniores";
  if (idade === 21 || idade === 22) return "Sub23";
  if (idade >= 30) return "Veteranos";
  if (idade >= 21) return "Seniores";

  return "Outro";
}
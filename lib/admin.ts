// Contas com funções de administrador na app (ex: cópia de segurança).
// Nota: isto só controla o que aparece no ecrã. O acesso real aos dados é
// definido pelas regras de segurança (RLS) do Supabase.
export const EMAILS_ADMIN = ['silva.andre160802@gmail.com'];

export const eAdmin = (email: string | null | undefined) =>
  !!email && EMAILS_ADMIN.includes(email.trim().toLowerCase());

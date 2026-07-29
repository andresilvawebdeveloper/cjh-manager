import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Obter o utilizador autenticado através dos cookies de sessão
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Se o utilizador NÃO estiver autenticado e tentar aceder a qualquer caminho dentro de /dashboard
  if (path.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login'; // Redireciona obrigatoriamente para o login
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

// Configurar o matcher para intercetar todas as rotas de dashboard
export const config = {
  matcher: ['/dashboard/:path*'],
};
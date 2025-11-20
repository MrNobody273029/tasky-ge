import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['ka', 'en'],
  defaultLocale: 'ka',
  localePrefix: 'always',   // <— KA/EN ყოველთვის URL-ში
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};

import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  defaultLocale: 'es',
  locales: ['es', 'en'],
  pathnames: {
    '/': '/',
    '/login': '/login',
    '/coffees': '/coffees',
    '/coffees/[id]': '/coffees/[id]',
    '/coffees/new': '/coffees/new',
    '/recipes': '/recipes',
    '/recipes/[id]': '/recipes/[id]',
    '/recipes/new': '/recipes/new',
    '/brews': '/brews',
    '/brews/[id]': '/brews/[id]',
    '/brews/new': '/brews/new',
    '/analytics': '/analytics'
  }
});

export type Locale = (typeof routing.locales)[number];

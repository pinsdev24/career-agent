import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const locales = ['en', 'fr', 'nl'];
export const defaultLocale = 'en';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale) {
    const cookieStore = await cookies();
    locale = cookieStore.get('NEXT_LOCALE')?.value;

    if (!locale) {
      const headersList = await headers();
      const acceptLanguage = headersList.get('accept-language');
      if (acceptLanguage) {
        if (acceptLanguage.includes('fr')) locale = 'fr';
        else if (acceptLanguage.includes('nl')) locale = 'nl';
        else locale = 'en';
      }
    }
  }

  if (!locale || !locales.includes(locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});

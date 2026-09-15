"use client";
import React from "react";
import { Loading } from "../kit/base";

type Components<M> = { [K in keyof M]: M[K] extends React.ComponentType<infer P> ? React.ComponentType<P> : never };

/**
 * Modulun ixrac etdiyi səhifələri gecikmiş (React.lazy) komponentlərə çevirir: `Pages.JobsPage` ilk render olunanda
 * modul ayrıca chunk kimi yüklənir. Kabinet bölmələri public saytın JS yükünə düşmür (Core Web Vitals).
 *
 * Suspense sərhədi yalnız bu səhifələrin öz ətrafındadır — public səhifələr serverdə skeleton-suz, tam HTML ilə gəlir.
 */
export function lazyPages<M extends Record<string, unknown>>(load: () => Promise<M>): Components<M> {
  const cache = new Map<string, React.ComponentType<any>>();
  return new Proxy({} as Components<M>, {
    get(_, name: string) {
      let component = cache.get(name);
      if (!component) {
        const Lazy = React.lazy(() => load().then((m) => ({ default: m[name] as React.ComponentType<any> })));
        const Page = (props: Record<string, unknown>) => (
          <React.Suspense fallback={<Loading rows={6} />}>
            <Lazy {...props} />
          </React.Suspense>
        );
        Page.displayName = `Lazy(${name})`;
        component = Page;
        cache.set(name, component);
      }
      return component;
    },
  });
}

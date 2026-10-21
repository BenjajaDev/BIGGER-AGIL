import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createQueryClient } from '../app/query-client';

export interface MockResponse {
  status?: number;
  body: unknown;
}

export type FetchHandler = (method: string, url: URL, body: unknown) => MockResponse;

/** Routes every fetch through `handler` and records the calls for assertions. */
export function mockFetch(handler: FetchHandler) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? 'GET';
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, path: url.pathname, body });
    const { status = 200, body: responseBody } = handler(method, url, body);
    return Promise.resolve(
      new Response(JSON.stringify(responseBody), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

export function renderRoute(
  element: ReactElement,
  { path, route }: { path: string; route: string },
) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="*" element={<p>Otra ruta</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

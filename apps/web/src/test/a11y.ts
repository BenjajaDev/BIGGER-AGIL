import axe from 'axe-core';

/**
 * Structural WCAG checks (roles, names, labels) in jsdom.
 * Color contrast needs a real browser, so it is verified against the design tokens instead.
 */
export async function expectNoA11yViolations(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  });
  const summary = results.violations.map(
    (violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`,
  );
  expect(summary).toEqual([]);
}

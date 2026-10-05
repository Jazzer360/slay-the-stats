import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RunEmptyState } from '../src/components/run/RunEmptyState';
import { RunDetail } from '../src/components/run/RunDetail';
import { FilterBar } from '../src/components/layout/FilterBar';
import { useFilterStore } from '../src/store/filters';
import { useRunsStore } from '../src/store/runs';
import { useProfileRunsStore } from '../src/store/profileRuns';
import { EMPTY_DEFAULT_FILTERS } from '../src/types/user';
import { buildMockRun } from './helpers';

// Keep component checks local; authentication initializes browser-only Firebase services.
vi.mock('../src/store/auth', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({
    userProfile: { defaultFilters: { customRuns: 'exclude' } },
  }),
}));

vi.mock('../src/store/runs', async (importOriginal) => {
  const { useRunsStore } = await importOriginal<typeof import('../src/store/runs')>();
  type State = ReturnType<typeof useRunsStore.getState>;
  // Render current test state rather than Zustand's initial server hydration snapshot.
  return { useRunsStore: Object.assign(
    (selector?: (state: State) => unknown) => selector ? selector(useRunsStore.getState()) : useRunsStore.getState(),
    useRunsStore,
  ) };
});

vi.mock('../src/store/filters', async (importOriginal) => {
  const { useFilterStore } = await importOriginal<typeof import('../src/store/filters')>();
  type State = ReturnType<typeof useFilterStore.getState>;
  // Render current test state rather than Zustand's initial server hydration snapshot.
  return { useFilterStore: Object.assign(
    (selector?: (state: State) => unknown) => selector ? selector(useFilterStore.getState()) : useFilterStore.getState(),
    useFilterStore,
  ) };
});

vi.mock('../src/store/profileRuns', async (importOriginal) => {
  const { useProfileRunsStore } = await importOriginal<typeof import('../src/store/profileRuns')>();
  type State = ReturnType<typeof useProfileRunsStore.getState>;
  // Render current test state rather than Zustand's initial server hydration snapshot.
  return { useProfileRunsStore: Object.assign(
    (selector?: (state: State) => unknown) => selector ? selector(useProfileRunsStore.getState()) : useProfileRunsStore.getState(),
    useProfileRunsStore,
  ) };
});

afterEach(() => {
  useFilterStore.getState().resetFilters();
  useRunsStore.getState().clear();
  useProfileRunsStore.getState().clearProfileRuns();
});

function renderEmptyState() {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(RunEmptyState)));
}

describe('custom run presentation', () => {
  it('explains hidden customs and offers inclusion instead of asking to import again', () => {
    useRunsStore.getState().setRuns([buildMockRun({ game_mode: 'custom' })]);
    const html = renderEmptyState();
    expect(html).toContain('No runs match these filters.');
    expect(html).toContain('Include custom runs');
    expect(html).not.toContain('Import your runs');
  });

  it('does not offer inclusion when other filters still exclude the custom runs', () => {
    useRunsStore.getState().setRuns([buildMockRun({ game_mode: 'custom', win: false })]);
    useFilterStore.getState().setResult('win');
    expect(renderEmptyState()).not.toContain('Include custom runs');
  });

  it('marks custom run details even with no modifiers', () => {
    const custom = renderToStaticMarkup(createElement(RunDetail, {
      run: buildMockRun({ game_mode: 'custom', modifiers: [] }),
    }));
    const standard = renderToStaticMarkup(createElement(RunDetail, { run: buildMockRun() }));
    expect(custom).toContain('>Custom</span>');
    expect(standard).not.toContain('>Custom</span>');
  });

  it('uses the viewed owner defaults when determining whether Reset is available', () => {
    const defaults = { ...EMPTY_DEFAULT_FILTERS, customRuns: 'only' as const };
    useProfileRunsStore.getState().setProfileRuns([], 'custom-player', defaults);
    useFilterStore.getState().applyDefaults(defaults);
    const atDefaults = renderToStaticMarkup(createElement(FilterBar));
    expect(atDefaults).toContain('aria-label="Custom runs"');
    expect(atDefaults).toContain('aria-pressed="true"');
    expect(atDefaults).not.toContain('Reset');
    useFilterStore.getState().setCustomRuns('include');
    expect(renderToStaticMarkup(createElement(FilterBar))).toContain('Reset');
  });
});

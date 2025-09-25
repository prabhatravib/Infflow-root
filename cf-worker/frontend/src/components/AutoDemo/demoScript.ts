import { DemoStep } from './types';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const SELECTORS = {
  landingLogoButton: '[data-demo-home-button]',
  searchInput: '[data-demo-search-input]',
  searchSubmit: '[data-demo-search-submit]',
  tabVisual: '[data-demo-visual-tab]',
  tabText: '[data-demo-text-tab]',
  diagramViewport: '.diagram-viewport',
  hexaWorker: '.hexa-worker-fixed',
};

async function ensureLandingPage() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const isOnLanding = window.location.pathname === '/' || window.location.pathname === '';
  if (isOnLanding) {
    return;
  }

  const homeButton = document.querySelector<HTMLButtonElement>(SELECTORS.landingLogoButton);
  if (homeButton) {
    homeButton.click();
    await wait(350);
  }
}

async function focusAndType(query: string) {
  if (typeof document === 'undefined') {
    return;
  }

  const input = document.querySelector<HTMLInputElement>(SELECTORS.searchInput);
  if (!input) {
    console.warn('[AutoDemo] Search input not found');
    return;
  }

  input.focus();
  const nativeDescriptor = typeof window !== 'undefined'
    ? Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
    : undefined;
  nativeDescriptor?.set?.call(input, query);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function triggerSearch(submitViaEnter = false) {
  if (typeof document === 'undefined') {
    return;
  }

  const input = document.querySelector<HTMLInputElement>(SELECTORS.searchInput);
  if (submitViaEnter && input) {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
  }

  const button = document.querySelector<HTMLButtonElement>(SELECTORS.searchSubmit);
  if (button) {
    button.click();
  }
}

async function clickSelector(selector: string) {
  if (typeof document === 'undefined') {
    return;
  }
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) {
    console.warn(`[AutoDemo] Element not found for selector ${selector}`);
    return;
  }
  element.click();
}

async function clickNode(label: string) {
  if (typeof document === 'undefined') {
    return;
  }

  const candidateSelectors = [
    `[data-node-label="${label}"]`,
    `[aria-label="${label}"]`,
    `[role="button"][aria-label*="${label}"]`,
  ];

  for (const selector of candidateSelectors) {
    const match = document.querySelector<HTMLElement>(selector);
    if (match) {
      match.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return;
    }
  }

  const textNodes = Array.from(document.querySelectorAll<SVGTextElement | HTMLElement>('text, [data-node-title]'));
  const fallback = textNodes.find((node) => node.textContent?.trim().toLowerCase() === label.toLowerCase());
  if (fallback) {
    fallback.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return;
  }

  console.warn(`[AutoDemo] Could not find node with label ${label}`);
}

async function showDeepDivePanel() {
  if (typeof document === 'undefined') {
    return;
  }

  const panel = document.querySelector('[data-demo-deep-dive]');
  if (!panel) {
    console.warn('[AutoDemo] Deep dive panel not available');
    return;
  }

  panel.classList.add('demo-highlight');
  await wait(500);
  panel.classList.remove('demo-highlight');
}

async function highlightHexaWorker() {
  if (typeof document === 'undefined') {
    return;
  }

  const container = document.querySelector<HTMLElement>(SELECTORS.hexaWorker);
  if (!container) {
    console.warn('[AutoDemo] HexaWorker container not found');
    return;
  }
  container.classList.add('demo-highlight');
  await wait(800);
  container.classList.remove('demo-highlight');
}

async function showCTAOverlay() {
  if (typeof document === 'undefined') {
    return;
  }

  const overlay = document.querySelector('[data-demo-cta]');
  if (overlay) {
    overlay.classList.add('demo-highlight');
    await wait(500);
  }
}

export const DEMO_SCRIPT: DemoStep[] = [
  {
    id: 'welcome',
    narration:
      'Welcome to Infflow, where we transform any question into interactive visual knowledge. Let me show you how we are changing the way analysts explore information.',
    duration: 4000,
    action: async () => {
      await ensureLandingPage();
      await wait(800);
    },
  },
  {
    id: 'problem_statement',
    narration:
      'Infflow creates designed information.',
    duration: 4000,
    action: async () => {
      await wait(600);
    },
  },
  {
    id: 'first_search',
    narration: 'Let us start with a question. Watch how Infflow generates a tailored visual.',
    duration: 5000,
    action: async () => {
      await focusAndType('renewable energy market trends 2025');
      await wait(600);
      await triggerSearch();
    },
    waitForElement: '.search-results-root',
  },
  {
    id: 'diagram_generation',
    narration: 'Search paths are created for the query .',
    duration: 6000,
    waitForElement: `${SELECTORS.diagramViewport} svg`,
    highlights: [SELECTORS.diagramViewport],
    action: async () => {
      await wait(300);
    },
  },
  {
    id: 'interactive_nodes',
    narration: 'Every node is interactive. Drill into solar energy to see how the story unfolds.',
    duration: 5000,
    action: async () => {
      await clickNode('Solar Energy');
      await wait(2000);
      await showDeepDivePanel();
    },
  },
  {
    id: 'voice_demo',
    narration: 'Alongside visuals, the Infflow voice agent talks through the insights with full context. It is already running in this session.',
    duration: 5000,
    action: async () => {
      await highlightHexaWorker();
    },
  },
  {
    id: 'foamtree',
    narration: 'Need hierarchical structure? Switch to FoamTree for clustered overviews.',
    duration: 6000,
    action: async () => {
      await focusAndType('Blood types foamtree');
      await wait(400);
      await triggerSearch();
      await wait(1200);
    },
    waitForElement: '.foamtree-canvas',
  },
  {
    id: 'text_mode',
    narration: 'Prefer text? Toggle modes instantly. Same content, a textual response.',
    duration: 5000,
    action: async () => {
      await clickSelector(SELECTORS.tabText);
      await wait(2000);
      await clickSelector(SELECTORS.tabVisual);
    },
  },
  {
    id: 'business_value',
    narration: 'You get a better understanding of the answers.',
    duration: 5000,
    action: async () => {
      await wait(1000);
    },
  },
  {
    id: 'cta',
    narration: 'Ready to see more of Infflow? Take control now and explore more.',
    duration: 4000,
    action: async () => {
      await showCTAOverlay();
    },
  },
];

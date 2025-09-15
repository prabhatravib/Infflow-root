/**
 * Global event handling and state management for SVG search functionality.
 * Handles communication between SVG elements and React components.
 */

// Global event dispatcher for reliable communication between SVG and React
const CENTRAL_SEARCH_EVENT = 'central-search-change';
const CENTRAL_SEARCH_SUBMIT_EVENT = 'central-search-submit';

// Store callbacks globally to ensure they persist
let globalOnChange: ((value: string) => void) | null = null;
let globalOnSubmit: ((value: string) => void) | null = null;

/**
 * Set up global event listeners for central search
 */
export function setupCentralSearchListeners(
  onChange: (value: string) => void,
  onSubmit: (value: string) => void
) {
  globalOnChange = onChange;
  globalOnSubmit = onSubmit;
  
  // Remove any existing listeners
  window.removeEventListener(CENTRAL_SEARCH_EVENT, handleCentralSearchChange as any);
  window.removeEventListener(CENTRAL_SEARCH_SUBMIT_EVENT, handleCentralSearchSubmit as any);
  
  // Add new listeners
  window.addEventListener(CENTRAL_SEARCH_EVENT, handleCentralSearchChange as any);
  window.addEventListener(CENTRAL_SEARCH_SUBMIT_EVENT, handleCentralSearchSubmit as any);
}

function handleCentralSearchChange(event: CustomEvent) {
  const value = event.detail.value;
  console.log('[central-search] Global change event received:', value);
  if (globalOnChange) {
    globalOnChange(value);
  }
}

function handleCentralSearchSubmit(event: CustomEvent) {
  const value = event.detail.value;
  console.log('new search initiated');
  console.log('[central-search] Global submit event received:', value);
  if (globalOnSubmit) {
    globalOnSubmit(value);
  }
}

/**
 * Dispatch a change event for the central search
 */
export function dispatchCentralSearchChange(value: string) {
  console.log('[central-search] Dispatching change event with value:', value);
  window.dispatchEvent(new CustomEvent(CENTRAL_SEARCH_EVENT, {
    detail: { value }
  }));
}

/**
 * Dispatch a submit event for the central search
 */
export function dispatchCentralSearchSubmit(value: string) {
  if (value.trim()) {
    console.log('[central-search] Dispatching submit event with value:', value);
    window.dispatchEvent(new CustomEvent(CENTRAL_SEARCH_SUBMIT_EVENT, {
      detail: { value }
    }));
  }
}

/**
 * Event constants for external use
 */
export const SEARCH_EVENTS = {
  CHANGE: CENTRAL_SEARCH_EVENT,
  SUBMIT: CENTRAL_SEARCH_SUBMIT_EVENT
} as const;

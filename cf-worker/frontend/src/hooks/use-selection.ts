import { useState, useCallback, useRef } from 'react';
import { SelectionHandler } from './selection-handler';

export interface SelectionState {
  selectedElement: Element | null;
  selectedText: string;
  hasSelection: boolean;
}

export interface DeepDiveState {
  isProcessing: boolean;
  response: string | null;
  history: Array<{
    selectedText: string;
    question: string;
    response: string;
    timestamp: number;
  }>;
}

export function useSelection() {
  const [selection, setSelection] = useState<SelectionState>({
    selectedElement: null,
    selectedText: '',
    hasSelection: false,
  });

  const [deepDive, setDeepDive] = useState<DeepDiveState>({
    isProcessing: false,
    response: null,
    history: [],
  });

  const selectionHandlerRef = useRef<SelectionHandler | null>(null);

  const clearSelection = useCallback(() => {
    if (selection.selectedElement) {
      removeSelectionStyling(selection.selectedElement);
    }
    
    setSelection({
      selectedElement: null,
      selectedText: '',
      hasSelection: false,
    });
  }, [selection.selectedElement]);

  const selectElement = useCallback((element: Element, text: string) => {
    // Clear previous selection
    if (selection.selectedElement) {
      removeSelectionStyling(selection.selectedElement);
    }

    // Apply selection styling
    applySelectionStyling(element);

    // Update state
    setSelection({
      selectedElement: element,
      selectedText: text,
      hasSelection: true,
    });
  }, [selection.selectedElement]);

  const setupSelectionHandler = useCallback((container: HTMLElement) => {
    if (selectionHandlerRef.current) {
      selectionHandlerRef.current.cleanup();
    }
    
    selectionHandlerRef.current = new SelectionHandler(
      selectElement,
      clearSelection
    );
    
    selectionHandlerRef.current.setupForContainer(container);
  }, [selectElement, clearSelection]);

  const askDeepDive = useCallback(async (question: string, apiCall: (params: any) => Promise<any>) => {
    if (!selection.hasSelection || !question.trim()) {
      return;
    }

    setDeepDive(prev => ({ ...prev, isProcessing: true }));

    try {
      const response = await apiCall({
        selectedText: selection.selectedText,
        question: question.trim(),
      });

      const newEntry = {
        selectedText: selection.selectedText,
        question: question.trim(),
        response: response.response || response,
        timestamp: Date.now(),
      };

      setDeepDive(prev => ({
        ...prev,
        isProcessing: false,
        response: response.response || response,
        history: [...prev.history, newEntry],
      }));
    } catch (error) {
      console.error('Deep dive error:', error);
      setDeepDive(prev => ({ ...prev, isProcessing: false }));
    }
  }, [selection.hasSelection, selection.selectedText]);

  const clearDeepDive = useCallback(() => {
    setDeepDive(prev => ({ ...prev, response: null }));
  }, []);

  return {
    selection,
    deepDive,
    clearSelection,
    selectElement,
    setupSelectionHandler,
    askDeepDive,
    clearDeepDive,
  };
}

// Helper functions for selection styling
function applySelectionStyling(element: Element) {
  const selectedClass = 'element-selected';
  element.classList.add(selectedClass);
  
  const tagName = element.tagName.toLowerCase();
  
  switch (tagName) {
    case 'text':
    case 'tspan':
      (element as SVGTextElement).style.fontWeight = 'bold';
      (element as SVGTextElement).style.filter = 'drop-shadow(0 0 4px #ffb300)';
      break;
      
    case 'rect':
      element.setAttribute('data-original-stroke', element.getAttribute('stroke') || '');
      element.setAttribute('data-original-stroke-width', element.getAttribute('stroke-width') || '');
      element.setAttribute('stroke', '#ffb300');
      element.setAttribute('stroke-width', '5');
      (element as SVGRectElement).style.filter = 'drop-shadow(0 0 6px #ffb300)';
      break;
      
    case 'g':
      const shape = element.querySelector('rect, circle, ellipse, polygon');
      if (shape) {
        shape.setAttribute('data-original-stroke', shape.getAttribute('stroke') || '');
        shape.setAttribute('data-original-stroke-width', shape.getAttribute('stroke-width') || '');
        shape.setAttribute('stroke', '#ffb300');
        shape.setAttribute('stroke-width', '3');
      }
      const text = element.querySelector('text');
      if (text) {
        (text as SVGTextElement).style.fontWeight = 'bold';
      }
      break;
  }
}

function removeSelectionStyling(element: Element) {
  if (!element) return;
  
  const selectedClass = 'element-selected';
  element.classList.remove(selectedClass);
  
  const tagName = element.tagName.toLowerCase();
  
  switch (tagName) {
    case 'text':
    case 'tspan':
      (element as SVGTextElement).style.fontWeight = '';
      (element as SVGTextElement).style.filter = '';
      break;
      
    case 'rect':
      const originalStroke = element.getAttribute('data-original-stroke');
      const originalWidth = element.getAttribute('data-original-stroke-width');
      if (originalStroke !== null) {
        element.setAttribute('stroke', originalStroke);
      }
      if (originalWidth !== null) {
        element.setAttribute('stroke-width', originalWidth);
      }
      (element as SVGRectElement).style.filter = '';
      break;
      
    case 'g':
      const shape = element.querySelector('rect, circle, ellipse, polygon');
      if (shape) {
        const origStroke = shape.getAttribute('data-original-stroke');
        const origWidth = shape.getAttribute('data-original-stroke-width');
        if (origStroke !== null) {
          shape.setAttribute('stroke', origStroke);
        }
        if (origWidth !== null) {
          shape.setAttribute('stroke-width', origWidth);
        }
      }
      const text = element.querySelector('text');
      if (text) {
        (text as SVGTextElement).style.fontWeight = '';
      }
      break;
  }
}

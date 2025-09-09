import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

type Props = {
  code: string;
  className?: string;
  onSetupSelection?: (container: HTMLElement) => void;
};

export default function Mermaid({ code, className, onSetupSelection }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    
    mermaid.initialize({ 
      startOnLoad: false, 
      securityLevel: 'loose', 
      theme: 'base',
      fontFamily: 'Arial, sans-serif',
      fontSize: 16, // Normalized font size for all diagrams
      flowchart: {
        useMaxWidth: true,
        htmlLabels: false
      },
      sequence: {
        diagramMarginX: 50,
        diagramMarginY: 30,
        actorMargin: 40,
        width: 150,
        height: 50,
        boxMargin: 10,
        boxTextMargin: 8,
        noteMargin: 10,
        messageMargin: 15,
        mirrorActors: false,
        useMaxWidth: true,
        wrap: true,
        wrapPadding: 10,
        noteAlign: 'center'
      },
      themeVariables: {
        primaryColor: '#ffffff',
        primaryTextColor: '#000000',
        primaryBorderColor: '#000000',
        lineColor: '#000000',
        arrowheadColor: '#000000',
        edgeLabelBackground: '#ffffff',
        defaultLinkColor: '#000000'
      }
    });
    (async () => {
      try {
        if (!mounted || !ref.current) return;
        const { svg } = await mermaid.render(`m_${Date.now()}`, code);
        ref.current.innerHTML = svg;
        
        // Setup selection handling after rendering
        if (onSetupSelection && ref.current) {
          onSetupSelection(ref.current);
        }
        
        // Add hover effects to all nodes
        if (ref.current) {
          const nodes = ref.current.querySelectorAll('.node, .flowchart .node, .mindmap .node, .radial .node');
          nodes.forEach(node => {
            const rect = node.querySelector('rect');
            const text = node.querySelector('text');
            
            if (rect) {
              // Store original styles
              const originalStroke = rect.getAttribute('stroke') || '';
              const originalStrokeWidth = rect.getAttribute('stroke-width') || '1';
              const originalFill = rect.getAttribute('fill') || '';
              
              node.addEventListener('mouseenter', () => {
                rect.setAttribute('stroke', '#3b82f6');
                rect.setAttribute('stroke-width', '3');
                rect.setAttribute('fill', 'rgba(59, 130, 246, 0.05)');
                if (text) {
                  (text as SVGTextElement).style.fontWeight = '500';
                  (text as SVGTextElement).style.filter = 'brightness(1.1)';
                }
                (node as HTMLElement).style.filter = 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))';
              });
              
              node.addEventListener('mouseleave', () => {
                rect.setAttribute('stroke', originalStroke);
                rect.setAttribute('stroke-width', originalStrokeWidth);
                rect.setAttribute('fill', originalFill);
                if (text) {
                  (text as SVGTextElement).style.fontWeight = '';
                  (text as SVGTextElement).style.filter = '';
                }
                (node as HTMLElement).style.filter = '';
              });
            }
          });
        }
      } catch (e) {
        if (ref.current) ref.current.innerHTML = `<pre class='text-red-600'>Mermaid render error: ${String(e)}</pre>`;
      }
    })();
    return () => { mounted = false; };
  }, [code, onSetupSelection]);

  return <div className={`${className} flex justify-center items-center w-full`} ref={ref} />;
}

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import mermaid from 'mermaid';

type Props = {
  code: string;
  className?: string;
  onSetupSelection?: (container: HTMLElement) => void;
  onRender?: (svgElement: SVGSVGElement) => void;
};

export interface MermaidRef {
  getSvgElement: () => SVGSVGElement | null;
}

const Mermaid = forwardRef<MermaidRef, Props>(({ 
  code, 
  className, 
  onSetupSelection,
  onRender
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useImperativeHandle(ref, () => ({
    getSvgElement: () => svgRef.current
  }));


  useEffect(() => {
    let mounted = true;
    
    mermaid.initialize({ 
      startOnLoad: false, 
      securityLevel: 'loose', 
      theme: 'base',
      fontFamily: 'Arial, sans-serif',
      fontSize: 13,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: false,
        curve: 'basis',
        diagramPadding: 20
      },
      sequence: {
        diagramMarginX: 40,
        diagramMarginY: 24,
        actorMargin: 32,
        width: 120,
        height: 40,
        boxMargin: 8,
        boxTextMargin: 6,
        noteMargin: 8,
        messageMargin: 12,
        mirrorActors: false,
        useMaxWidth: true,
        wrap: true,
        wrapPadding: 8,
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
        if (!mounted || !containerRef.current) return;

        const { svg } = await mermaid.render(`m_${Date.now()}`, code);
        containerRef.current.innerHTML = svg;

        // Store reference to the SVG element
        const svgElement = containerRef.current.querySelector('svg') as SVGSVGElement;
        svgRef.current = svgElement;
        console.log('🔍 Mermaid: SVG element stored:', svgElement);

        // Call onRender callback with SVG element
        if (onRender && svgElement) {
          onRender(svgElement);
        }

        // Setup selection handling after rendering
        if (onSetupSelection && containerRef.current) {
          onSetupSelection(containerRef.current);
        }
      } catch (e) {
        if (containerRef.current) containerRef.current.innerHTML = `<pre class='text-red-600'>Mermaid render error: ${String(e)}</pre>`;
      }
    })();

    return () => { mounted = false; };
  }, [code, onSetupSelection, onRender]);

  return (
    <div className={`${className} flex justify-center items-center w-full relative`} style={{ zIndex: 1 }} ref={containerRef}>
    </div>
  );
});

Mermaid.displayName = 'Mermaid';

export default Mermaid;

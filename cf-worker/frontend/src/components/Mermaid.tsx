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
        useMaxWidth: false,
        htmlLabels: false,
        curve: 'basis',
        diagramPadding: 20
      },
      sequence: {
        diagramMarginX: 20,
        diagramMarginY: 12,
        actorMargin: 16,
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
      const startTime = performance.now();
      const renderId = `m_${Date.now()}`;
      
      try {
        if (!mounted || !containerRef.current) return;

        console.log(`🎨 [${renderId}] Starting Mermaid render...`);
        console.log(`Code length: ${code.length}`);
        console.log(`Code preview: ${code.substring(0, 100)}...`);

        const renderStartTime = performance.now();
        const { svg } = await mermaid.render(renderId, code);
        const renderTime = performance.now() - renderStartTime;
        
        console.log(`⏱️ [${renderId}] Mermaid render time: ${renderTime.toFixed(2)}ms`);
        console.log(`SVG length: ${svg.length}`);

        const domStartTime = performance.now();
        containerRef.current.innerHTML = svg;
        const domTime = performance.now() - domStartTime;
        
        console.log(`⏱️ [${renderId}] DOM update time: ${domTime.toFixed(2)}ms`);

        // Store reference to the SVG element
        const svgElement = containerRef.current.querySelector('svg') as SVGSVGElement;
        svgRef.current = svgElement;
        console.log(`🔍 [${renderId}] Mermaid: SVG element stored:`, svgElement);

        const callbackStartTime = performance.now();
        // Call onRender callback with SVG element
        if (onRender && svgElement) {
          onRender(svgElement);
        }

        // Setup selection handling after rendering
        if (onSetupSelection && containerRef.current) {
          onSetupSelection(containerRef.current);
        }
        const callbackTime = performance.now() - callbackStartTime;
        
        console.log(`⏱️ [${renderId}] Callback execution time: ${callbackTime.toFixed(2)}ms`);
        
        const totalTime = performance.now() - startTime;
        console.log(`🚀 [${renderId}] PERFORMANCE REPORT:`);
        console.log(`📊 Total Mermaid render time: ${totalTime.toFixed(2)}ms`);
        console.log(`📈 Breakdown:`);
        console.log(`   • Mermaid render: ${renderTime.toFixed(2)}ms (${((renderTime / totalTime) * 100).toFixed(1)}%)`);
        console.log(`   • DOM update: ${domTime.toFixed(2)}ms (${((domTime / totalTime) * 100).toFixed(1)}%)`);
        console.log(`   • Callbacks: ${callbackTime.toFixed(2)}ms (${((callbackTime / totalTime) * 100).toFixed(1)}%)`);
        
      } catch (e) {
        const errorTime = performance.now() - startTime;
        console.error(`❌ [${renderId}] Mermaid render error after ${errorTime.toFixed(2)}ms:`, e);
        if (containerRef.current) containerRef.current.innerHTML = `<pre class='text-red-600'>Mermaid render error: ${String(e)}</pre>`;
      }
    })();

    return () => { mounted = false; };
  }, [code, onSetupSelection, onRender]);

  return (
    <div className={`${className} flex justify-center items-start w-full relative`} style={{ zIndex: 1 }} ref={containerRef}>
    </div>
  );
});

Mermaid.displayName = 'Mermaid';

export default Mermaid;

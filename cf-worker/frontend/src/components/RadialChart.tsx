import { useEffect, useRef } from 'react';
import { initRadialAlignment } from '../utils/radialAlign';
import Mermaid, { MermaidRef } from './Mermaid';

interface RadialChartProps {
  code: string;
  className?: string;
  onRender?: (svgElement: SVGSVGElement) => void;
  onSetupSelection?: (container: HTMLElement) => void;
}

export default function RadialChart({ 
  code, 
  className, 
  onRender,
  onSetupSelection 
}: RadialChartProps) {
  const ctrlRef = useRef<ReturnType<typeof initRadialAlignment> | null>(null);
  const mermaidRef = useRef<MermaidRef>(null);

  useEffect(() => {
    ctrlRef.current = initRadialAlignment();
    return () => ctrlRef.current?.destroy();
  }, []);

  return (
    <div id="radial-align">
      <div id="radial-panzoom">
        <div id="radial-chart">
          <Mermaid 
            ref={mermaidRef}
            code={code}
            className={className}
            onRender={onRender}
            onSetupSelection={onSetupSelection}
          />
        </div>
      </div>
    </div>
  );
}

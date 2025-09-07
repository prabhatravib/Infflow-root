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
    mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'default' });
    (async () => {
      try {
        if (!mounted || !ref.current) return;
        const { svg } = await mermaid.render(`m_${Date.now()}`, code);
        ref.current.innerHTML = svg;
        
        // Setup selection handling after rendering
        if (onSetupSelection && ref.current) {
          onSetupSelection(ref.current);
        }
      } catch (e) {
        if (ref.current) ref.current.innerHTML = `<pre class='text-red-600'>Mermaid render error: ${String(e)}</pre>`;
      }
    })();
    return () => { mounted = false; };
  }, [code, onSetupSelection]);

  return <div className={className} ref={ref} />;
}

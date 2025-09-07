import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

type Props = {
  code: string;
  className?: string;
};

export default function Mermaid({ code, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'default' });
    (async () => {
      try {
        if (!mounted || !ref.current) return;
        const { svg } = await mermaid.render(`m_${Date.now()}`, code);
        ref.current.innerHTML = svg;
      } catch (e) {
        if (ref.current) ref.current.innerHTML = `<pre class='text-red-600'>Mermaid render error: ${String(e)}</pre>`;
      }
    })();
    return () => { mounted = false; };
  }, [code]);

  return <div className={className} ref={ref} />;
}

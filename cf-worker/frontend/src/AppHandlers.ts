import React from 'react';
import { describe, callDeepDiveApi, fetchClusterChildren } from './lib/api';
import { exportDiagramAsText, exportDiagramAsPNG } from './utils/export-utils';

export interface AppHandlersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setDiagram: (diagram: string | null) => void;
  setDiagramData: (data: any) => void;
  setContentData: (data: any) => void;
  setClusters: (clusters: any) => void;
  setCodeFlowStatus: (status: 'sent' | 'not-sent') => void;
  setDiagramViewTab: (tab: 'visual' | 'text') => void;
  clearSelection: () => void;
  navigate: (path: string, options?: any) => void;
  location: any;
  askDeepDive: (question: string, apiCall: any) => Promise<void>;
  lastSearchQuery: React.MutableRefObject<string>;
  currentRequestId: React.MutableRefObject<string>;
  clusters: import('./types/cluster').ClusterNode | null;
  contentData: {content: string; description: string; universal_content: string} | null;
  diagram: string | null;
}

export const createAppHandlers = ({
  searchQuery,
  setSearchQuery,
  setDiagram,
  setDiagramData,
  setContentData,
  setClusters,
  setCodeFlowStatus,
  setDiagramViewTab,
  clearSelection,
  navigate,
  location,
  askDeepDive,
  lastSearchQuery,
  currentRequestId,
  clusters,
  contentData,
  diagram
}: AppHandlersProps) => {
  // Send diagram data to hexagon worker via HTTP API
  const handleDiscussionRequest = async (diagramContext: {mermaidCode: string; diagramImage: string; prompt: string}) => {
    const startTime = performance.now();
    const hexagonId = `hexagon_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    console.log(`📤 [${hexagonId}] Sending diagram data to voice worker via API:`, diagramContext);
    
    try {
      const networkStartTime = performance.now();
      const response = await fetch('https://hexa-worker.prabhatravib.workers.dev/api/external-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mermaidCode: diagramContext.mermaidCode,
          diagramImage: diagramContext.diagramImage,
          prompt: diagramContext.prompt,
          type: 'diagram'
        })
      });
      const networkTime = performance.now() - networkStartTime;
      console.log(`⏱️ [${hexagonId}] Network request time: ${networkTime.toFixed(2)}ms`);

      if (!response.ok) {
        if (response.status === 409) {
          console.error(`❌ [${hexagonId}] 409 Conflict: Hexagon worker rejected the diagram data`);
          const errorText = await response.text();
          throw new Error(`Hexagon worker rejected data: ${errorText}`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const parseStartTime = performance.now();
      const result = await response.json();
      const parseTime = performance.now() - parseStartTime;
      console.log(`⏱️ [${hexagonId}] Response parsing time: ${parseTime.toFixed(2)}ms`);
      
      const totalTime = performance.now() - startTime;
      console.log(`✅ [${hexagonId}] Diagram data sent to hexagon worker:`, result);
      console.log(`⏱️ [${hexagonId}] Total hexagon request time: ${totalTime.toFixed(2)}ms`);
      console.log(`📈 [${hexagonId}] Breakdown:`);
      console.log(`   • Network: ${networkTime.toFixed(2)}ms (${((networkTime / totalTime) * 100).toFixed(1)}%)`);
      console.log(`   • Parsing: ${parseTime.toFixed(2)}ms (${((parseTime / totalTime) * 100).toFixed(1)}%)`);
      
      setCodeFlowStatus('sent');
      console.log(`🔄 [${hexagonId}] Status updated to: Basic Details Sent`);
    } catch (error) {
      const errorTime = performance.now() - startTime;
      console.error(`❌ [${hexagonId}] Error sending data to hexagon worker after ${errorTime.toFixed(2)}ms:`, error);
    }
  };

  const handleSearch = async (query: string, options: { navigate?: boolean } = { navigate: true }) => {
    if (!query.trim()) return;
    
    const startTime = performance.now();
    console.log(`[App] handleSearch called with query: ${query} options:`, options);
    
    // Prevent duplicate searches for the same query
    const cleaned = query.trim();
    if (lastSearchQuery.current === cleaned) {
      console.log(`[App] Skipping duplicate search for: ${cleaned}`);
      return;
    }
    lastSearchQuery.current = cleaned;
    
    // Generate unique request ID to prevent duplicate API calls
    const requestId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    currentRequestId.current = requestId;
    console.log(`[App] Starting search with request ID: ${requestId}`);
    
    setSearchQuery(cleaned);
    const qLower = cleaned.toLowerCase();
    const wantsFoamTree = (
      qLower.includes('foamtree') ||
      qLower.includes('foam tree') ||
      qLower.includes('foam-tree') ||
      qLower.includes('topic map') ||
      qLower.includes('topic maps') ||
      qLower.includes('topic-map') ||
      qLower.includes('topicmap')
    );
    
    if (options.navigate !== false) {
      const params = new URLSearchParams(location.search);
      params.set('q', cleaned);
      navigate(`/search?${params.toString()}`, { replace: false });
    }
    
    clearSelection();
    setCodeFlowStatus('not-sent');
    setDiagramViewTab('visual');
    setDiagram(null);
    setClusters(null);
    
    try {
      if (wantsFoamTree) {
        const foamTreeStartTime = performance.now();
        console.log(`[${requestId}] Starting FoamTree cluster generation...`);
        try {
          const clusterRes = await fetchClusterChildren(cleaned);
          const foamTreeApiTime = performance.now() - foamTreeStartTime;
          console.log(`⏱️ [${requestId}] FoamTree API call time: ${foamTreeApiTime.toFixed(2)}ms`);
          
          if (clusterRes.success && clusterRes.cluster) {
            setClusters(clusterRes.cluster as any);
            console.log(`[${requestId}] Cluster response universal_content:`, clusterRes.universal_content ? 'Present' : 'Missing');
            console.log(`[${requestId}] Universal content length:`, clusterRes.universal_content?.length || 0);
            
            if (clusterRes.universal_content) {
              setContentData({ content: '', description: '', universal_content: clusterRes.universal_content });
            } else {
              console.warn(`[${requestId}] No universal content received from cluster API`);
              setContentData({ content: '', description: '', universal_content: '' });
            }

            // For foam tree, we need to send a special format that the hexagon worker can understand
            const foamTreePayload = {
              mermaidCode: `FOAMTREE_DATA:${JSON.stringify(clusterRes.cluster)}`,
              diagramImage: `FOAMTREE_DATA:${JSON.stringify(clusterRes.cluster)}`,
              prompt: cleaned
            };
            setDiagramData(foamTreePayload);
            
            const discussionStartTime = performance.now();
            await handleDiscussionRequest(foamTreePayload);
            const discussionTime = performance.now() - discussionStartTime;
            console.log(`⏱️ [${requestId}] Hexagon discussion request time: ${discussionTime.toFixed(2)}ms`);
          } else {
            console.warn(`[${requestId}] Cluster API returned no cluster`);
            setContentData({ content: '', description: '', universal_content: '' });
          }
        } catch (e) {
          console.warn(`[${requestId}] Cluster generation failed:`, e);
          setContentData({ content: '', description: '', universal_content: '' });
        }
      } else {
        const diagramStartTime = performance.now();
        console.log(`[${requestId}] Starting diagram generation...`);
        const res = await describe(cleaned);
        const diagramApiTime = performance.now() - diagramStartTime;
        console.log(`⏱️ [${requestId}] Diagram API call time: ${diagramApiTime.toFixed(2)}ms`);
        console.log(`[${requestId}] API Response:`, res);
        
        // Check if this is still the current request (prevent stale responses)
        if (currentRequestId.current !== requestId) {
          console.log(`[${requestId}] Ignoring stale API response for request: ${requestId}`);
          return;
        }
        
        const stateUpdateStartTime = performance.now();
        if (res.render_type === 'html') {
          setDiagram(res.rendered_content);
        } else {
          setDiagram(res.diagram || res.rendered_content || null);
        }

        if (res.content || res.description || res.universal_content) {
          setContentData({
            content: res.content || '',
            description: res.description || '',
            universal_content: res.universal_content || ''
          });
        }

        if (res.diagram) {
          const newDiagramData = {
            mermaidCode: res.diagram,
            diagramImage: res.diagram,
            prompt: cleaned,
            diagramType: res.diagram_type,
            diagram_meta: res.diagram_meta
          };
          setDiagramData(newDiagramData);
          
          const discussionStartTime = performance.now();
          handleDiscussionRequest(newDiagramData);
          const discussionTime = performance.now() - discussionStartTime;
          console.log(`⏱️ [${requestId}] Hexagon discussion request time: ${discussionTime.toFixed(2)}ms`);
        }
        
        const stateUpdateTime = performance.now() - stateUpdateStartTime;
        console.log(`⏱️ [${requestId}] State update time: ${stateUpdateTime.toFixed(2)}ms`);
      }
      
      const totalTime = performance.now() - startTime;
      console.log(`🚀 [${requestId}] SEARCH PERFORMANCE REPORT:`);
      console.log(`📊 Total search time: ${totalTime.toFixed(2)}ms`);
      console.log(`📈 Query: "${cleaned}"`);
      console.log(`📈 Type: ${wantsFoamTree ? 'FoamTree' : 'Diagram'}`);
      
    } catch (e) {
      const errorTime = performance.now() - startTime;
      console.error(`❌ [${requestId}] Search error after ${errorTime.toFixed(2)}ms:`, e);
      setDiagram(null);
      setDiagramData(null);
      setContentData(null);
      setClusters(null);
    }
  };

  const handleBackToHome = () => {
    navigate('/', { replace: false });
    setSearchQuery('');
    setDiagram(null);
    setDiagramData(null);
    setContentData(null);
    setClusters(null);
    setCodeFlowStatus('not-sent');
    setDiagramViewTab('visual');
    clearSelection();
  };

  const handleDeepDiveAsk = async (question: string) => {
    await askDeepDive(question, async (params: any) => {
      const response = await callDeepDiveApi({
        selected_text: params.selectedText,
        question: params.question,
        original_query: searchQuery
      });
      return response;
    });
  };

  const handleSaveText = async () => {
    try {
      if (contentData && contentData.universal_content) {
        const contentLines = [];
        contentLines.push(`Query: "${searchQuery}"`);
        contentLines.push(`Generated: ${new Date().toLocaleString()}`);
        contentLines.push('');
        contentLines.push('--- Content ---');
        contentLines.push('');
        contentLines.push(contentData.universal_content);

        const fileContent = contentLines.join('\n');
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        
        const date = new Date();
        const timestamp = date.toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `infflow-text-${timestamp}.txt`;
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 250);
        return;
      }
      
      if (!diagram) {
        alert('No content to save');
        return;
      }
      
      const diagramContainer = document.querySelector('.mermaid-container');
      const svg = diagramContainer?.querySelector('svg');
      if (!svg) {
        alert('No diagram image found to save');
        return;
      }
      await exportDiagramAsText(svg, searchQuery);
    } catch (error) {
      console.error('Failed to save text:', error);
      alert('Failed to save text content');
    }
  };

  const handleSavePNG = async () => {
    // Check if we have a FoamTree diagram (clusters data)
    if (clusters) {
      try {
        // Debug: Log all elements in diagram-viewport
        const diagramViewport = document.querySelector('.diagram-viewport');
        console.log('Diagram viewport found:', diagramViewport);
        if (diagramViewport) {
          console.log('Diagram viewport children:', diagramViewport.children);
          console.log('Diagram viewport innerHTML:', diagramViewport.innerHTML);
        }
        
        // Try multiple selectors to find FoamTree container
        let foamTreeContainer = document.querySelector('.diagram-viewport .foamtree');
        if (!foamTreeContainer) {
          // Try alternative selectors
          foamTreeContainer = document.querySelector('.foamtree');
          console.log('Trying .foamtree selector:', foamTreeContainer);
        }
        if (!foamTreeContainer) {
          // Look for any canvas element in the diagram viewport
          foamTreeContainer = document.querySelector('.diagram-viewport canvas')?.parentElement;
          console.log('Trying canvas parent selector:', foamTreeContainer);
        }
        if (!foamTreeContainer) {
          // Look for any div with foamtree class anywhere
          foamTreeContainer = document.querySelector('div[class*="foamtree"]');
          console.log('Trying div with foamtree class:', foamTreeContainer);
        }
        
        if (!foamTreeContainer) {
          console.error('No FoamTree container found. Available elements:', {
            diagramViewport: document.querySelector('.diagram-viewport'),
            foamtreeClass: document.querySelector('.foamtree'),
            canvas: document.querySelector('canvas'),
            allDivs: document.querySelectorAll('div')
          });
          alert('No FoamTree visualization found to save');
          return;
        }
        
        // Look for canvas element in the FoamTree container
        let canvas = foamTreeContainer.querySelector('canvas');
        if (!canvas) {
          // Try to find canvas anywhere in the viewport
          canvas = document.querySelector('.diagram-viewport canvas');
          console.log('Canvas found in viewport:', canvas);
        }
        
        if (!canvas) {
          console.error('No canvas element found. Container:', foamTreeContainer);
          alert('No canvas element found in FoamTree visualization');
          return;
        }
        
        // Create a download link for the canvas
        const link = document.createElement('a');
        const filename = `foamtree-${searchQuery.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`FoamTree image saved as: ${filename}`);
      } catch (error) {
        console.error('Failed to save FoamTree PNG:', error);
        alert('Failed to save FoamTree PNG image');
      }
      return;
    }
    
    // Handle regular SVG diagrams (Mermaid, etc.)
    if (!diagram) {
      alert('No diagram to save');
      return;
    }
    try {
      const svg = document.querySelector('.diagram-viewport svg') as SVGSVGElement;
      if (!svg) {
        alert('No SVG element found to save');
        return;
      }
      await exportDiagramAsPNG(svg);
    } catch (error) {
      console.error('Failed to save PNG:', error);
      alert('Failed to save PNG image');
    }
  };

  return {
    handleSearch,
    handleBackToHome,
    handleDeepDiveAsk,
    handleSaveText,
    handleSavePNG
  };
};
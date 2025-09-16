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
  contentData,
  diagram
}: AppHandlersProps) => {
  // Send diagram data to hexagon worker via HTTP API
  const handleDiscussionRequest = async (diagramContext: {mermaidCode: string; diagramImage: string; prompt: string}) => {
    console.log('Hexagon discussion started for diagram:', diagramContext);
    
    try {
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

      if (!response.ok) {
        if (response.status === 409) {
          console.error('❌ 409 Conflict: Hexagon worker rejected the diagram data');
          const errorText = await response.text();
          throw new Error(`Hexagon worker rejected data: ${errorText}`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Diagram data sent to hexagon worker:', result);
      setCodeFlowStatus('sent');
      console.log('🔄 Status updated to: Basic Details Sent');
    } catch (error) {
      console.error('❌ Error sending data to hexagon worker:', error);
    }
  };

  const handleSearch = async (query: string, options: { navigate?: boolean } = { navigate: true }) => {
    if (!query.trim()) return;
    console.log('[App] handleSearch called with query:', query, 'options:', options);
    
    // Prevent duplicate searches for the same query
    const cleaned = query.trim();
    if (lastSearchQuery.current === cleaned) {
      console.log('[App] Skipping duplicate search for:', cleaned);
      return;
    }
    lastSearchQuery.current = cleaned;
    
    // Generate unique request ID to prevent duplicate API calls
    const requestId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    currentRequestId.current = requestId;
    console.log('[App] Starting search with request ID:', requestId);
    
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
        try {
          const clusterRes = await fetchClusterChildren(cleaned);
          if (clusterRes.success && clusterRes.cluster) {
            setClusters(clusterRes.cluster as any);
            if (clusterRes.universal_content) {
              setContentData(processContentData({ content: '', description: '', universal_content: clusterRes.universal_content }));
            } else {
              setContentData({ content: '', description: '', universal_content: '' });
            }

            const foamTreePayload = {
              mermaidCode: `FOAMTREE_JSON:${JSON.stringify(clusterRes.cluster)}`,
              diagramImage: `FOAMTREE_JSON:${JSON.stringify(clusterRes.cluster)}`,
              prompt: cleaned
            };
            setDiagramData(foamTreePayload);
            await handleDiscussionRequest(foamTreePayload);
          } else {
            console.warn('Cluster API returned no cluster');
            setContentData({ content: '', description: '', universal_content: '' });
          }
        } catch (e) {
          console.warn('Cluster generation failed:', e);
          setContentData({ content: '', description: '', universal_content: '' });
        }
      } else {
        const res = await describe(cleaned);
        console.log('API Response:', res);
        
        // Check if this is still the current request (prevent stale responses)
        if (currentRequestId.current !== requestId) {
          console.log('[App] Ignoring stale API response for request:', requestId);
          return;
        }
        
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
          handleDiscussionRequest(newDiagramData);
        }
      }
    } catch (e) {
      console.error('Search error:', e);
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
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
    const startTime = performance.now();
    const requestId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    if (!query.trim()) return;
    console.log(`🔍 [${requestId}] Frontend search started - Query: "${query}", Options:`, options);
    
    // Prevent duplicate searches for the same query
    const cleaned = query.trim();
    if (lastSearchQuery.current === cleaned) {
      console.log(`⏭️ [${requestId}] Skipping duplicate search for: "${cleaned}"`);
      return;
    }
    lastSearchQuery.current = cleaned;
    
    currentRequestId.current = requestId;
    console.log(`🚀 [${requestId}] Starting search with request ID: ${requestId}`);
    
    const uiSetupStart = performance.now();
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
    
    const uiSetupTime = performance.now() - uiSetupStart;
    console.log(`⚡ [${requestId}] UI setup completed in ${uiSetupTime.toFixed(2)}ms - FoamTree: ${wantsFoamTree}`);
    
    try {
      if (wantsFoamTree) {
        const foamTreeStart = performance.now();
        console.log(`🌳 [${requestId}] Starting FoamTree cluster generation`);
        
        try {
          const clusterRes = await fetchClusterChildren(cleaned);
          const clusterApiTime = performance.now() - foamTreeStart;
          console.log(`⏱️ [${requestId}] Cluster API call completed in ${clusterApiTime.toFixed(2)}ms`);
          
          if (clusterRes.success && clusterRes.cluster) {
            const dataProcessingStart = performance.now();
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
            
            const hexagonStart = performance.now();
            await handleDiscussionRequest(foamTreePayload);
            const hexagonTime = performance.now() - hexagonStart;
            console.log(`⏱️ [${requestId}] Hexagon worker call completed in ${hexagonTime.toFixed(2)}ms`);
            
            const dataProcessingTime = performance.now() - dataProcessingStart;
            console.log(`⚡ [${requestId}] Data processing completed in ${dataProcessingTime.toFixed(2)}ms`);
          } else {
            console.warn(`⚠️ [${requestId}] Cluster API returned no cluster`);
            setContentData({ content: '', description: '', universal_content: '' });
          }
        } catch (e) {
          console.warn(`❌ [${requestId}] Cluster generation failed:`, e);
          setContentData({ content: '', description: '', universal_content: '' });
        }
        
        const totalFoamTreeTime = performance.now() - foamTreeStart;
        console.log(`🌳 [${requestId}] Total FoamTree processing time: ${totalFoamTreeTime.toFixed(2)}ms`);
      } else {
        const describeStart = performance.now();
        console.log(`📊 [${requestId}] Starting diagram generation`);
        
        const res = await describe(cleaned);
        const describeApiTime = performance.now() - describeStart;
        console.log(`⏱️ [${requestId}] Describe API call completed in ${describeApiTime.toFixed(2)}ms`);
        console.log(`📋 [${requestId}] API Response:`, res);
        
        // Check if this is still the current request (prevent stale responses)
        if (currentRequestId.current !== requestId) {
          console.log(`⏭️ [${requestId}] Ignoring stale API response for request: ${requestId}`);
          return;
        }
        
        const dataProcessingStart = performance.now();
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
          
          const hexagonStart = performance.now();
          handleDiscussionRequest(newDiagramData);
          const hexagonTime = performance.now() - hexagonStart;
          console.log(`⏱️ [${requestId}] Hexagon worker call completed in ${hexagonTime.toFixed(2)}ms`);
        }
        
        const dataProcessingTime = performance.now() - dataProcessingStart;
        console.log(`⚡ [${requestId}] Data processing completed in ${dataProcessingTime.toFixed(2)}ms`);
        
        const totalDescribeTime = performance.now() - describeStart;
        console.log(`📊 [${requestId}] Total diagram processing time: ${totalDescribeTime.toFixed(2)}ms`);
      }
      
      const totalTime = performance.now() - startTime;
      console.log(`✅ [${requestId}] Search completed successfully in ${totalTime.toFixed(2)}ms`);
      
    } catch (e) {
      const totalTime = performance.now() - startTime;
      console.error(`❌ [${requestId}] Search error after ${totalTime.toFixed(2)}ms:`, e);
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
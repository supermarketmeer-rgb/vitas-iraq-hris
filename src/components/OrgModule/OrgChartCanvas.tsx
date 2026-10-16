import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { OrgNode } from '../../types/hris';
import { Language } from './translations';
import { OrgNodeCard } from './OrgNodeCard';
import { DiagramToolbar } from './DiagramToolbar';
import { NodeDetailsDrawer } from './NodeDetailsDrawer';
import { ExportDiagramModal, ExportFormatType } from './ExportDiagramModal';
import {
  captureDiagramImage,
  downloadAsPdf,
  downloadAsPng,
  downloadAsJson,
  downloadAsVisioVsdx,
  downloadAsVisioVdx,
  downloadAsVisioCsv
} from './exportDiagram';
import { Loader2 } from 'lucide-react';

interface OrgChartCanvasProps {
  rootNode: OrgNode;
  lang: Language;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onRefresh: () => void;
}

interface LayoutChild {
  layout: LayoutNode;
  relX: number;
  relY: number;
  isVerticalChild: boolean;
  isDirectChain: boolean;
}

interface LayoutNode {
  node: OrgNode;
  width: number;
  height: number;
  cardX: number;
  cardY: number;
  children: LayoutChild[];
}

interface FlatNode {
  node: OrgNode;
  absX: number;
  absY: number;
  parentAbsX?: number;
  parentAbsY?: number;
  isVerticalChild?: boolean;
  isDirectChain?: boolean;
  spineAbsX?: number;
}

interface GMConnectorData {
  x1: number;
  x2: number;
  y: number;
  midX: number;
  busY: number;
}

const CARD_WIDTH = 280;
const CARD_HEIGHT = 145;
const HORIZONTAL_GAP = 32;
const VERTICAL_GAP = 70;
const VERTICAL_STACK_GAP = 28;
const SPINE_OFFSET = 24;

export const OrgChartCanvas: React.FC<OrgChartCanvasProps> = ({
  rootNode,
  lang,
  statusFilter,
  onStatusFilterChange,
  onRefresh
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContentRef = useRef<HTMLDivElement>(null);

  // Canvas viewport transform
  const [zoom, setZoom] = useState<number>(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 75 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Collapse state: set of node IDs that are collapsed
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  // Selection & Reporting path
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null);

  // Search
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Export state
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Find all ancestor IDs for reporting path
  const reportingPathNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();

    const pathIds = new Set<string>();
    pathIds.add(selectedNode.id);

    // Helper to find path to selected node
    function findPath(current: OrgNode, targetId: string, currentPath: string[]): boolean {
      if (
        current.id === targetId ||
        (current.type === 'top_management' && (targetId === 'gm-1' || targetId === 'gm-2' || targetId === rootNode.id))
      ) {
        currentPath.forEach(id => pathIds.add(id));
        pathIds.add(targetId);
        pathIds.add('gm-1');
        pathIds.add('gm-2');
        pathIds.add(rootNode.id);
        return true;
      }
      for (const child of current.children) {
        if (findPath(child, targetId, [...currentPath, current.id, 'gm-1', 'gm-2', rootNode.id])) {
          return true;
        }
      }
      return false;
    }

    findPath(rootNode, selectedNode.id, []);

    // Also include direct and indirect children of selected node
    function addDescendants(node: OrgNode) {
      for (const child of node.children) {
        pathIds.add(child.id);
        addDescendants(child);
      }
    }
    addDescendants(selectedNode);

    return pathIds;
  }, [selectedNode, rootNode]);

  // Search match ids
  const searchMatchedNodeIds = useMemo(() => {
    if (!searchTerm.trim()) return new Set<string>();
    const term = searchTerm.toLowerCase().trim();
    const matches = new Set<string>();

    function searchTree(node: OrgNode) {
      const matchTitle = node.title.toLowerCase().includes(term);
      const matchTitleAr = node.title_ar?.toLowerCase().includes(term);
      const matchDept = node.department_name?.toLowerCase().includes(term);
      const matchEmps = node.metadata?.employees?.some(e =>
        e.name.toLowerCase().includes(term) ||
        e.raw_title.toLowerCase().includes(term) ||
        e.employee_number.toLowerCase().includes(term)
      );

      if (matchTitle || matchTitleAr || matchDept || matchEmps) {
        matches.add(node.id);
      }
      for (const child of node.children) {
        searchTree(child);
      }
    }

    searchTree(rootNode);
    return matches;
  }, [searchTerm, rootNode]);

  // Auto-expand ancestors when searching
  useEffect(() => {
    if (searchMatchedNodeIds.size > 0) {
      const ancestorsToExpand = new Set<string>();

      function checkAndExpand(node: OrgNode): boolean {
        let hasMatchedDescendant = searchMatchedNodeIds.has(node.id);
        for (const child of node.children) {
          if (checkAndExpand(child)) {
            hasMatchedDescendant = true;
          }
        }
        if (hasMatchedDescendant) {
          ancestorsToExpand.add(node.id);
        }
        return hasMatchedDescendant;
      }

      checkAndExpand(rootNode);

      setCollapsedNodes(prev => {
        const next = new Set(prev);
        ancestorsToExpand.forEach(id => next.delete(id));
        return next;
      });
    }
  }, [searchMatchedNodeIds, rootNode]);

  // Layout calculation for A4 Landscape columnar hierarchy:
  // - Top Management / General Managers: children (Departments) sit horizontally on the exact same row.
  // - Departments and subordinate nodes: children cascade vertically in compact columns.
  // - Office (مكتب): places Branch Manager (Admin wing) and Credit Coordinator (Field wing) side-by-side as parallel wings.
  const layoutTree = useMemo(() => {
    // Recursive layout computation
    function computeLayout(node: OrgNode): LayoutNode {
      const isCollapsed = collapsedNodes.has(node.id);
      const visibleChildren = isCollapsed ? [] : node.children;

      if (!visibleChildren || visibleChildren.length === 0) {
        return {
          node,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          cardX: 0,
          cardY: 0,
          children: []
        };
      }

      // Root level (General Managers) places departments horizontally on the same line.
      // Office node places its 2 wings (Branch Manager & Credit Coordinator) horizontally side by side.
      const isHorizontal =
        node.type === 'top_management' ||
        (node.type === 'offices' && visibleChildren.length > 1);

      if (isHorizontal) {
        const layoutChildren = visibleChildren.map(computeLayout);
        const childrenTotalWidth =
          layoutChildren.reduce((acc, c) => acc + c.width, 0) +
          (layoutChildren.length - 1) * HORIZONTAL_GAP;

        const isDualRoot = node.type === 'top_management';
        const GM_GAP = 60;
        const rootCardsWidth = isDualRoot ? CARD_WIDTH * 2 + GM_GAP : CARD_WIDTH;

        const myWidth = Math.max(rootCardsWidth, childrenTotalWidth);
        const myCardX = (myWidth - CARD_WIDTH) / 2;
        const myCardY = 0;

        const vertGap = node.type === 'top_management' ? VERTICAL_GAP : VERTICAL_STACK_GAP + 24;
        const childY = CARD_HEIGHT + vertGap;

        const startX = (myWidth - childrenTotalWidth) / 2;
        let currX = startX;
        let maxChildHeight = 0;
        const childrenWithOffsets: LayoutChild[] = [];

        for (const child of layoutChildren) {
          childrenWithOffsets.push({
            layout: child,
            relX: currX,
            relY: childY,
            isVerticalChild: false,
            isDirectChain: false
          });
          if (child.height > maxChildHeight) {
            maxChildHeight = child.height;
          }
          currX += child.width + HORIZONTAL_GAP;
        }

        const myHeight = childY + maxChildHeight;

        return {
          node,
          width: myWidth,
          height: myHeight,
          cardX: myCardX,
          cardY: myCardY,
          children: childrenWithOffsets
        };
      } else {
        // Subordinate hierarchy: place children vertically in a compact column
        const layoutChildren = visibleChildren.map(computeLayout);
        const isSingleChild = layoutChildren.length === 1;
        const spineSpace = isSingleChild ? 0 : SPINE_OFFSET;

        const maxChildWidth = Math.max(...layoutChildren.map(c => c.width));
        const columnWidth = Math.max(CARD_WIDTH, maxChildWidth) + spineSpace;
        const myWidth = Math.max(CARD_WIDTH, columnWidth);
        const myCardX = (myWidth - CARD_WIDTH) / 2;
        const myCardY = 0;

        let currY = CARD_HEIGHT + VERTICAL_STACK_GAP + 15;
        const childrenWithOffsets: LayoutChild[] = [];

        for (let i = 0; i < layoutChildren.length; i++) {
          const child = layoutChildren[i];
          let childRelX: number;
          if (isSingleChild) {
            childRelX = (myWidth - child.width) / 2;
          } else if (lang === 'ar') {
            childRelX = (myWidth - columnWidth) / 2;
          } else {
            childRelX = (myWidth - columnWidth) / 2 + SPINE_OFFSET;
          }

          childrenWithOffsets.push({
            layout: child,
            relX: childRelX,
            relY: currY,
            isVerticalChild: true,
            isDirectChain: isSingleChild
          });

          currY += child.height + VERTICAL_STACK_GAP;
        }

        const myHeight = currY - VERTICAL_STACK_GAP;

        return {
          node,
          width: myWidth,
          height: myHeight,
          cardX: myCardX,
          cardY: myCardY,
          children: childrenWithOffsets
        };
      }
    }

    // Flatten to absolute coordinates
    function flatten(
      layout: LayoutNode,
      boxAbsX: number,
      boxAbsY: number,
      parentCardAbsX?: number,
      parentCardAbsY?: number,
      isVerticalChild: boolean = false,
      isDirectChain: boolean = false,
      parentSpineAbsX?: number
    ): FlatNode[] {
      const myCardAbsX = boxAbsX + layout.cardX;
      const myCardAbsY = boxAbsY + layout.cardY;

      // Handle dual General Managers on top management row
      if (layout.node.type === 'top_management') {
        const GM_GAP = 60;
        const treeCenter = boxAbsX + layout.width / 2;
        const gm1AbsX = treeCenter - CARD_WIDTH - (GM_GAP / 2);
        const gm2AbsX = treeCenter + (GM_GAP / 2);

        const gm1Node: OrgNode = {
          ...layout.node,
          id: 'gm-1',
          title: 'General Manager',
          title_ar: 'المدير العام',
          subtitle: lang === 'ar' ? 'الإدارة التنفيذية (VITAS Iraq)' : 'Executive Leadership (VITAS Iraq)',
          type: 'top_management',
          children: layout.node.children
        };

        const gm2Node: OrgNode = {
          ...layout.node,
          id: 'gm-2',
          title: 'General Manager',
          title_ar: 'المدير العام',
          subtitle: lang === 'ar' ? 'الإدارة التنفيذية (VITAS Iraq)' : 'Executive Leadership (VITAS Iraq)',
          type: 'top_management',
          children: layout.node.children
        };

        const result: FlatNode[] = [
          {
            node: gm1Node,
            absX: gm1AbsX,
            absY: boxAbsY,
            parentAbsX: undefined,
            parentAbsY: undefined
          },
          {
            node: gm2Node,
            absX: gm2AbsX,
            absY: boxAbsY,
            parentAbsX: undefined,
            parentAbsY: undefined
          }
        ];

        // Central connection point for all child departments beneath the dual GMs
        const parentConnectorAbsX = treeCenter - CARD_WIDTH / 2;

        for (const childItem of layout.children) {
          const childBoxAbsX = boxAbsX + childItem.relX;
          const childBoxAbsY = boxAbsY + childItem.relY;

          const childFlat = flatten(
            childItem.layout,
            childBoxAbsX,
            childBoxAbsY,
            parentConnectorAbsX,
            boxAbsY,
            childItem.isVerticalChild,
            childItem.isDirectChain,
            undefined
          );

          result.push(...childFlat);
        }

        return result;
      }

      // Spine absolute X for vertical children of this node
      const myChildrenSpineAbsX = lang === 'ar'
        ? myCardAbsX + CARD_WIDTH + 14
        : myCardAbsX - 14;

      const result: FlatNode[] = [{
        node: layout.node,
        absX: myCardAbsX,
        absY: myCardAbsY,
        parentAbsX: parentCardAbsX,
        parentAbsY: parentCardAbsY,
        isVerticalChild,
        isDirectChain,
        spineAbsX: parentSpineAbsX
      }];

      for (const childItem of layout.children) {
        const childBoxAbsX = boxAbsX + childItem.relX;
        const childBoxAbsY = boxAbsY + childItem.relY;

        const childFlat = flatten(
          childItem.layout,
          childBoxAbsX,
          childBoxAbsY,
          myCardAbsX,
          myCardAbsY,
          childItem.isVerticalChild,
          childItem.isDirectChain,
          myChildrenSpineAbsX
        );

        result.push(...childFlat);
      }

      return result;
    }

    const calculated = computeLayout(rootNode);
    const flatNodes = flatten(calculated, 0, 0);

    // Requirement #5: Credit Coordinator reports directly to Credit Department
    const creditDeptNode = flatNodes.find(
      n => n.node.type === 'department' &&
      (n.node.title.toLowerCase().includes('credit') || n.node.title_ar?.includes('ائتمان'))
    );

    if (creditDeptNode) {
      const coordNode = flatNodes.find(n => n.node.id === 'pos-credit-coordinator');
      if (coordNode) {
        coordNode.parentAbsX = creditDeptNode.absX;
        coordNode.parentAbsY = creditDeptNode.absY;
        coordNode.isVerticalChild = false;
        coordNode.isDirectChain = false;
      }
    }

    // Geometry for dual General Managers horizontal bridge and vertical department connection
    const GM_GAP = 60;
    const treeCenter = calculated.width / 2;
    const gm1AbsX = treeCenter - CARD_WIDTH - (GM_GAP / 2);
    const gm2AbsX = treeCenter + (GM_GAP / 2);
    const gmConnectorData: GMConnectorData = {
      x1: gm1AbsX + CARD_WIDTH,
      x2: gm2AbsX,
      y: CARD_HEIGHT / 2,
      midX: treeCenter,
      busY: CARD_HEIGHT + VERTICAL_GAP / 2
    };

    return {
      treeWidth: calculated.width,
      treeHeight: calculated.height,
      nodes: flatNodes,
      gmConnector: gmConnectorData
    };
  }, [rootNode, collapsedNodes, lang]);

  // Center chart in viewport initially or on fit
  const handleFitScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 60;

    const scaleX = (clientWidth - padding * 2) / Math.max(layoutTree.treeWidth, 600);
    const scaleY = (clientHeight - padding * 2) / Math.max(layoutTree.treeHeight, 400);
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.2);

    const newPanX = (clientWidth - layoutTree.treeWidth * newZoom) / 2;
    const newPanY = 75;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [layoutTree]);

  // Run initial center once
  useEffect(() => {
    handleFitScreen();
  }, [handleFitScreen]);

  // Mouse handlers for dragging/panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom(prev => Math.min(Math.max(prev * zoomFactor, 0.25), 2.2));
  };

  // Collapse toggle
  const handleToggleCollapse = (nodeId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      const targetId = (nodeId === 'gm-1' || nodeId === 'gm-2') ? rootNode.id : nodeId;
      if (next.has(targetId)) {
        next.delete(targetId);
      } else {
        next.add(targetId);
      }
      return next;
    });
  };

  const handleExpandAll = () => setCollapsedNodes(new Set());

  const handleCollapseAll = () => {
    const allParentIds = new Set<string>();
    function collect(n: OrgNode) {
      if (n.children && n.children.length > 0) {
        allParentIds.add(n.id);
        n.children.forEach(collect);
      }
    }
    rootNode.children.forEach(collect);
    setCollapsedNodes(allParentIds);
  };

  // -------------------------------------------------------------
  // High-Fidelity Export Handlers (Preserving Zoom, Layout & Visio)
  // -------------------------------------------------------------
  const executeExport = async (
    format: ExportFormatType,
    scope: 'current_view' | 'full_diagram' = 'current_view',
    pdfPageFormat: 'fit' | 'a4' | 'a4_landscape' = 'a4_landscape'
  ) => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const baseFilename = `vitas_iraq_org_chart_${timestamp}`;

    if (format === 'json') {
      downloadAsJson(rootNode, `${baseFilename}.json`);
      return;
    }

    if (format === 'visio_vsdx') {
      setIsExporting(true);
      setExportNotice('Generating Microsoft Visio Drawing (.vsdx)...');
      try {
        await new Promise(r => setTimeout(r, 60));
        await downloadAsVisioVsdx(
          layoutTree.nodes,
          layoutTree.treeWidth,
          layoutTree.treeHeight,
          CARD_WIDTH,
          CARD_HEIGHT,
          `${baseFilename}.vsdx`
        );
      } catch (err) {
        console.error('Visio VSDX export error:', err);
        alert('Could not generate Visio .vsdx file.');
      } finally {
        setIsExporting(false);
        setExportNotice(null);
      }
      return;
    }

    if (format === 'visio_vdx') {
      downloadAsVisioVdx(
        layoutTree.nodes,
        layoutTree.treeWidth,
        layoutTree.treeHeight,
        CARD_WIDTH,
        CARD_HEIGHT,
        `${baseFilename}.vdx`
      );
      return;
    }

    if (format === 'visio_csv') {
      downloadAsVisioCsv(rootNode, `${baseFilename}_wizard.csv`);
      return;
    }

    if (!containerRef.current || !canvasContentRef.current) return;

    setIsExporting(true);
    setExportNotice(
      format === 'pdf'
        ? `Generating PDF (${Math.round(zoom * 100)}% zoom scale)...`
        : `Generating high-res PNG (${Math.round(zoom * 100)}% zoom scale)...`
    );

    try {
      // Allow DOM state update
      await new Promise(r => setTimeout(r, 60));

      const zoomPct = Math.round(zoom * 100);

      const dataUrl = await captureDiagramImage(
        containerRef.current,
        canvasContentRef.current,
        {
          scope,
          zoom,
          pan,
          treeWidth: layoutTree.treeWidth,
          treeHeight: layoutTree.treeHeight,
          cardWidth: CARD_WIDTH,
          cardHeight: CARD_HEIGHT,
          includeBackground: true
        }
      );

      if (format === 'png') {
        downloadAsPng(dataUrl, `${baseFilename}.png`);
      } else if (format === 'pdf') {
        await downloadAsPdf(dataUrl, `${baseFilename}.pdf`, {
          pageFormat: pdfPageFormat,
          title: 'Organization Diagram - VITAS Iraq',
          subtitle: `Zoom Level: ${zoomPct}% · Generated ${new Date().toLocaleDateString()} · A4 Landscape Edition`
        });
      }
    } catch (err) {
      console.error('Error during diagram export:', err);
      alert('Unable to capture diagram. Please ensure graphics hardware acceleration is enabled.');
    } finally {
      setIsExporting(false);
      setExportNotice(null);
    }
  };

  // Quick 1-click downloads preserving current view zoom and layout
  const handleQuickDownloadPdf = () => executeExport('pdf', 'full_diagram', 'a4_landscape');
  const handleQuickDownloadPng = () => executeExport('png', 'current_view', 'fit');
  const handleQuickDownloadVisio = () => executeExport('visio_vsdx', 'full_diagram', 'fit');
  const handleQuickDownloadVisioVsdx = () => executeExport('visio_vsdx', 'full_diagram', 'fit');
  const handleQuickDownloadVisioVdx = () => executeExport('visio_vdx', 'full_diagram', 'fit');
  const handleQuickDownloadVisioCsv = () => executeExport('visio_csv', 'full_diagram', 'fit');

  return (
    <div
      className="relative w-full h-[calc(100vh-140px)] bg-[#0a0c10] overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
        backgroundSize: '28px 28px'
      }}
    >
      {/* Export processing toast notification */}
      {isExporting && exportNotice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Floating Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 pointer-events-auto export-exclude">
        <DiagramToolbar
          lang={lang}
          zoom={zoom}
          onZoomIn={() => setZoom(prev => Math.min(prev + 0.1, 2.0))}
          onZoomOut={() => setZoom(prev => Math.max(prev - 0.1, 0.3))}
          onResetView={() => {
            const clientW = containerRef.current?.clientWidth || 1000;
            setZoom(1);
            setPan({ x: (clientW - layoutTree.treeWidth * 1) / 2, y: 75 });
          }}
          onFitScreen={handleFitScreen}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onClearSearch={() => setSearchTerm('')}
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
          selectedNodeId={selectedNode ? selectedNode.id : null}
          onClearSelection={() => setSelectedNode(null)}
          onDownloadPdf={handleQuickDownloadPdf}
          onDownloadPng={handleQuickDownloadPng}
          onDownloadVisio={handleQuickDownloadVisio}
          onDownloadVisioVsdx={handleQuickDownloadVisioVsdx}
          onDownloadVisioVdx={handleQuickDownloadVisioVdx}
          onDownloadVisioCsv={handleQuickDownloadVisioCsv}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          isExporting={isExporting}
        />
      </div>

      {/* Interactive Infinite Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-full relative cursor-grab active:cursor-grabbing select-none ${
          isDragging ? 'canvas-dragging' : ''
        }`}
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      >
        <div
          ref={canvasContentRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            width: Math.max(layoutTree.treeWidth, 1200) + 120,
            height: Math.max(layoutTree.treeHeight, 800) + 120,
            position: 'absolute',
            top: 0,
            left: 0
          }}
        >
          {/* SVG Connector Lines */}
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="connectorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
              <linearGradient id="highlightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="100%" stopColor="#0d9488" />
              </linearGradient>
            </defs>

            {/* Dual General Managers horizontal connector & vertical connection down to departments */}
            {rootNode.type === 'top_management' && layoutTree.gmConnector && (
              <g key="gm-dual-connectors">
                {/* 1. Horizontal line connecting GM 1 and GM 2 directly on the same row */}
                <path
                  d={`M ${layoutTree.gmConnector.x1} ${layoutTree.gmConnector.y} L ${layoutTree.gmConnector.x2} ${layoutTree.gmConnector.y}`}
                  fill="none"
                  stroke={
                    reportingPathNodeIds.has('gm-1') || reportingPathNodeIds.has('gm-2') || reportingPathNodeIds.has(rootNode.id)
                      ? 'url(#highlightGradient)'
                      : 'url(#connectorGradient)'
                  }
                  strokeWidth={
                    reportingPathNodeIds.has('gm-1') || reportingPathNodeIds.has('gm-2') || reportingPathNodeIds.has(rootNode.id)
                      ? 2.5
                      : 1.5
                  }
                  strokeLinecap="round"
                />
                {/* Junction indicator circle in the exact middle of the horizontal line */}
                <circle
                  cx={layoutTree.gmConnector.midX}
                  cy={layoutTree.gmConnector.y}
                  r="3.5"
                  fill={
                    reportingPathNodeIds.has('gm-1') || reportingPathNodeIds.has('gm-2') || reportingPathNodeIds.has(rootNode.id)
                      ? '#2dd4bf'
                      : '#64748b'
                  }
                  stroke={
                    reportingPathNodeIds.has('gm-1') || reportingPathNodeIds.has('gm-2') || reportingPathNodeIds.has(rootNode.id)
                      ? '#0d9488'
                      : '#334155'
                  }
                  strokeWidth="1.5"
                />
                {/* 2. Vertical line dropping from the center of the horizontal line down to the departments' bus */}
                {!collapsedNodes.has(rootNode.id) && (
                  <path
                    d={`M ${layoutTree.gmConnector.midX} ${layoutTree.gmConnector.y} L ${layoutTree.gmConnector.midX} ${layoutTree.gmConnector.busY}`}
                    fill="none"
                    stroke={
                      reportingPathNodeIds.has('gm-1') || reportingPathNodeIds.has('gm-2') || reportingPathNodeIds.has(rootNode.id)
                        ? 'url(#highlightGradient)'
                        : 'url(#connectorGradient)'
                    }
                    strokeWidth={
                      reportingPathNodeIds.has('gm-1') || reportingPathNodeIds.has('gm-2') || reportingPathNodeIds.has(rootNode.id)
                        ? 2.5
                        : 1.5
                    }
                    strokeLinecap="round"
                  />
                )}
              </g>
            )}

            {layoutTree.nodes.map((item) => {
              if (item.parentAbsX === undefined || item.parentAbsY === undefined) {
                return null;
              }

              const isHighlighted =
                reportingPathNodeIds.has(item.node.id) &&
                (selectedNode?.id === item.node.id || reportingPathNodeIds.has(item.node.id));

              let pathD = '';

              if (item.isVerticalChild && !item.isDirectChain && item.spineAbsX !== undefined) {
                // Vertical spine connector (multiple siblings stacked vertically under a department)
                // From parent bottom-center, step down 14px, cross to spine, run down spine, step into card side
                const parentBottomX = item.parentAbsX + CARD_WIDTH / 2;
                const parentBottomY = item.parentAbsY + CARD_HEIGHT;
                const spineX = item.spineAbsX;
                const branchY = item.absY + CARD_HEIGHT / 2;
                const childConnectX = lang === 'ar' ? item.absX + CARD_WIDTH : item.absX;
                const stepY = parentBottomY + 14;

                pathD = `M ${parentBottomX} ${parentBottomY} L ${parentBottomX} ${stepY} L ${spineX} ${stepY} L ${spineX} ${branchY} L ${childConnectX} ${branchY}`;
              } else if (item.isDirectChain) {
                // Single child vertical chain: straight vertical line from parent bottom to child top
                const startX = item.parentAbsX + CARD_WIDTH / 2;
                const startY = item.parentAbsY + CARD_HEIGHT;
                const endX = item.absX + CARD_WIDTH / 2;
                const endY = item.absY;
                pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
              } else if (item.node.type === 'department') {
                // Department branching from the central vertical stem at midY
                const startX = item.parentAbsX + CARD_WIDTH / 2;
                const endX = item.absX + CARD_WIDTH / 2;
                const endY = item.absY;
                const midY = item.parentAbsY + CARD_HEIGHT + VERTICAL_GAP / 2;
                pathD = `M ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
              } else {
                // Standard horizontal stepped connector (Office -> Wings)
                const startX = item.parentAbsX + CARD_WIDTH / 2;
                const startY = item.parentAbsY + CARD_HEIGHT;
                const endX = item.absX + CARD_WIDTH / 2;
                const endY = item.absY;
                const midY = startY + (endY - startY) / 2;
                pathD = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
              }

              return (
                <path
                  key={`line-${item.node.id}`}
                  d={pathD}
                  fill="none"
                  stroke={isHighlighted ? 'url(#highlightGradient)' : 'url(#connectorGradient)'}
                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* Org Node Cards */}
          {layoutTree.nodes.map((item) => (
            <div
              key={item.node.id}
              style={{
                position: 'absolute',
                left: `${item.absX}px`,
                top: `${item.absY}px`,
                width: `${CARD_WIDTH}px`
              }}
            >
              <OrgNodeCard
                node={item.node}
                lang={lang}
                isCollapsed={collapsedNodes.has(item.node.id) || (item.node.type === 'top_management' && collapsedNodes.has(rootNode.id))}
                onToggleCollapse={handleToggleCollapse}
                isSelected={selectedNode?.id === item.node.id || (selectedNode?.id === rootNode.id && (item.node.id === 'gm-1' || item.node.id === 'gm-2'))}
                onSelectNode={(node) => {
                  if (node.id === 'gm-1' || node.id === 'gm-2') {
                    setSelectedNode({ ...rootNode, title_ar: 'المدير العام', title: 'General Manager' });
                  } else {
                    setSelectedNode(node);
                  }
                }}
                isInReportingPath={reportingPathNodeIds.has(item.node.id) || (reportingPathNodeIds.has(rootNode.id) && (item.node.id === 'gm-1' || item.node.id === 'gm-2'))}
                isSearchMatched={searchMatchedNodeIds.has(item.node.id) || (searchMatchedNodeIds.has(rootNode.id) && (item.node.id === 'gm-1' || item.node.id === 'gm-2'))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Node Details Inspection Drawer */}
      <div className="export-exclude">
        <NodeDetailsDrawer
          node={selectedNode}
          lang={lang}
          onClose={() => setSelectedNode(null)}
          onNavigateToNode={(nodeId) => {
            function find(n: OrgNode): OrgNode | null {
              if (n.id === nodeId) return n;
              for (const c of n.children) {
                const res = find(c);
                if (res) return res;
              }
              return null;
            }
            const target = find(rootNode);
            if (target) setSelectedNode(target);
          }}
        />
      </div>

      {/* Advanced Export Modal */}
      <ExportDiagramModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        lang={lang}
        currentZoom={zoom}
        onExecuteExport={executeExport}
      />
    </div>
  );
};

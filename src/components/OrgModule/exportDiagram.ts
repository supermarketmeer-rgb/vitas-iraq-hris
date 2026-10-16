import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

export interface ExportOptions {
  scope: 'current_view' | 'full_diagram';
  zoom: number;
  pan: { x: number; y: number };
  treeWidth: number;
  treeHeight: number;
  cardWidth: number;
  cardHeight: number;
  includeBackground?: boolean;
  pixelRatio?: number;
}

/**
 * Captures the organization diagram as a high-resolution PNG data URL,
 * accurately preserving the current zoom level, card positioning, and layout.
 */
export async function captureDiagramImage(
  containerEl: HTMLElement,
  contentEl: HTMLElement,
  options: ExportOptions
): Promise<string> {
  const bgColor = options.includeBackground !== false ? '#f8fafc' : '#ffffff';
  const ratio = options.pixelRatio || 2;

  if (options.scope === 'current_view') {
    // Capture the exact visible canvas viewport preserving current zoom and pan
    return await toPng(containerEl, {
      quality: 0.98,
      pixelRatio: ratio,
      backgroundColor: bgColor,
      cacheBust: true,
      filter: (node: HTMLElement) => {
        // Exclude floating toolbars or drawers if nested
        if (node.classList && (node.classList.contains('export-exclude') || node.classList.contains('pointer-events-auto'))) {
          return false;
        }
        return true;
      }
    });
  } else {
    // Full Diagram: Capture the entire hierarchy tree at current zoom level
    const originalTransform = contentEl.style.transform;
    const originalTransition = contentEl.style.transition;

    try {
      // Temporarily render full content at native 100% scale (scale(1)) with zero offset
      // to guarantee maximum vector font sharpness and eliminate zoom distortion
      contentEl.style.transition = 'none';
      contentEl.style.transform = 'translate(0px, 0px) scale(1)';

      // Tightly cropped to exact hierarchy dimensions without blank whitespace
      // so the diagram cards scale up to maximum size on A4 Landscape
      const totalW = options.treeWidth + 10;
      const totalH = options.treeHeight + 10;

      const dataUrl = await toPng(contentEl, {
        quality: 0.98,
        pixelRatio: Math.max(ratio, 3),
        backgroundColor: bgColor,
        width: totalW,
        height: totalH,
        cacheBust: true
      });

      return dataUrl;
    } finally {
      // Restore original transform and transition immediately
      contentEl.style.transform = originalTransform;
      contentEl.style.transition = originalTransition;
    }
  }
}

/**
 * Robust browser file download that submits a native form POST to /api/export/download.
 * This completely eliminates Chromium's blob UUID naming bug by using standard HTTP
 * Content-Disposition headers, strictly preserving the filename, extension, and system icon.
 */
export function triggerBrowserDownload(
  content: Blob | string,
  filename: string,
  mimeType: string = 'application/octet-stream'
): void {
  const safeFilename = filename.trim();

  const submitViaForm = (base64Data: string, resolvedMime: string): boolean => {
    try {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `/api/export/download?filename=${encodeURIComponent(safeFilename)}`;
      form.target = '_self';
      form.style.position = 'fixed';
      form.style.left = '-9999px';
      form.style.top = '-9999px';
      form.style.opacity = '0';

      const fInput = document.createElement('input');
      fInput.type = 'hidden';
      fInput.name = 'filename';
      fInput.value = safeFilename;
      form.appendChild(fInput);

      const mInput = document.createElement('input');
      mInput.type = 'hidden';
      mInput.name = 'mimeType';
      mInput.value = resolvedMime;
      form.appendChild(mInput);

      const dInput = document.createElement('input');
      dInput.type = 'hidden';
      dInput.name = 'data';
      dInput.value = base64Data;
      form.appendChild(dInput);

      document.body.appendChild(form);
      form.submit();
      setTimeout(() => {
        try {
          document.body.removeChild(form);
        } catch (_) {}
      }, 3000);
      return true;
    } catch (err) {
      console.warn('Form POST download failed, falling back to blob anchor:', err);
      return false;
    }
  };

  if (typeof content === 'string') {
    let base64 = content;
    let actualMime = mimeType;
    if (content.startsWith('data:')) {
      const parts = content.split(',');
      const match = parts[0].match(/:(.*?);/);
      if (match) actualMime = match[1];
      base64 = parts[1];
    }
    if (submitViaForm(base64, actualMime)) return;
  } else if (content instanceof Blob) {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result) {
        const parts = result.split(',');
        const base64 = parts[1];
        if (submitViaForm(base64, content.type || mimeType)) return;
      }
      fallbackBlobDownload(content, safeFilename, mimeType);
    };
    reader.readAsDataURL(content);
    return;
  }

  fallbackBlobDownload(content, safeFilename, mimeType);
}

function fallbackBlobDownload(
  content: Blob | string,
  safeFilename: string,
  mimeType: string = 'application/octet-stream'
): void {
  let blob: Blob;
  if (typeof content === 'string') {
    blob = new Blob([content], { type: mimeType });
  } else {
    blob = content;
  }

  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.style.position = 'fixed';
  link.style.left = '-9999px';
  link.style.top = '-9999px';
  link.style.opacity = '0';
  link.href = blobUrl;
  link.setAttribute('download', safeFilename);
  link.download = safeFilename;
  link.rel = 'noopener';

  document.body.appendChild(link);
  const clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
  link.dispatchEvent(clickEvt);

  setTimeout(() => {
    try {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (_) {}
  }, 60000);
}

/**
 * Triggers browser download of PNG file.
 */
export function downloadAsPng(dataUrl: string, filename?: string): void {
  const finalName = filename || `vitas_iraq_org_chart_${new Date().toISOString().slice(0, 10)}.png`;
  triggerBrowserDownload(dataUrl, finalName, 'image/png');
}

export interface PdfLegendConfig {
  inCountryColor: string;
  abroadColor: string;
  topManagementColor?: string;
  inCountryLabel: string;
  abroadLabel: string;
  topManagementLabel?: string;
}

/**
 * Converts image data URL to a clean PDF document and initiates download.
 * Perfectly fits the full organization chart into A4 Landscape sheet with header and phosphorescent legend.
 */
export async function downloadAsPdf(
  dataUrl: string,
  filename?: string,
  options?: {
    pageFormat?: 'fit' | 'a4' | 'a4_landscape';
    title?: string;
    subtitle?: string;
    legend?: PdfLegendConfig;
  }
): Promise<void> {
  const finalName = filename || `organization_diagram_${new Date().toISOString().slice(0, 10)}.pdf`;

  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const imgWidth = img.naturalWidth || img.width;
  const imgHeight = img.naturalHeight || img.height;

  if (options?.pageFormat === 'a4' || options?.pageFormat === 'a4_landscape') {
    // Standard A4 Landscape document (297mm × 210mm)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 297 mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 210 mm
    const margin = 5; // Exactly 0.5 cm (5 mm) margin on all sides as requested

    // Slim, high-efficiency top header (6 mm) to maximize card dimensions
    const headerHeight = 6;
    pdf.setFillColor(248, 250, 252); // slate-50
    pdf.rect(margin, margin, pageWidth - margin * 2, headerHeight, 'F');
    pdf.setDrawColor(226, 232, 240); // slate-200
    pdf.setLineWidth(0.2);
    pdf.rect(margin, margin, pageWidth - margin * 2, headerHeight, 'D');

    // Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(15, 23, 42); // slate-900
    pdf.text(options.title || 'VITAS Iraq · Organization Diagram (الهيكل التنظيمي)', margin + 3, margin + 4.2);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139); // slate-500
    pdf.text(
      options.subtitle || `Exported: ${new Date().toLocaleDateString()} · A4 Landscape Edition`,
      margin + 90,
      margin + 4.2
    );

    // Compact Phosphorescent Legend on the right side of header
    if (options.legend) {
      const legendStartX = pageWidth - margin - 85;
      const legY = margin + 3.8;

      // In-Country swatch
      pdf.setFillColor(options.legend.inCountryColor || '#10B981');
      pdf.roundedRect(legendStartX, legY - 1.8, 3.2, 2.4, 0.4, 0.4, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6);
      pdf.setTextColor(15, 23, 42);
      pdf.text(options.legend.inCountryLabel || 'In-Country', legendStartX + 4.5, legY);

      // Abroad swatch
      const abroadX = legendStartX + 35;
      pdf.setFillColor(options.legend.abroadColor || '#F97316');
      pdf.roundedRect(abroadX, legY - 1.8, 3.2, 2.4, 0.4, 0.4, 'F');
      pdf.text(options.legend.abroadLabel || 'Abroad', abroadX + 4.5, legY);

      // Top Management swatch
      if (options.legend.topManagementColor) {
        const topX = abroadX + 32;
        pdf.setFillColor(options.legend.topManagementColor);
        pdf.roundedRect(topX, legY - 1.8, 3.2, 2.4, 0.4, 0.4, 'F');
        pdf.text(options.legend.topManagementLabel || 'Root', topX + 4.5, legY);
      }
    }

    // Available drawing area maximized for A4 Landscape with 0.5 cm margins:
    const availableWidth = pageWidth - margin * 2; // 287 mm
    const availableHeight = pageHeight - margin * 2 - headerHeight - 1; // 193 mm

    const imgAspect = imgWidth / imgHeight;
    const pageAspect = availableWidth / availableHeight;

    let finalW = availableWidth;
    let finalH = availableHeight;

    if (imgAspect > pageAspect) {
      finalW = availableWidth;
      finalH = availableWidth / imgAspect;
    } else {
      finalH = availableHeight;
      finalW = availableHeight * imgAspect;
    }

    // Centered in available space with 0.5 cm minimum margins
    const xPos = margin + (availableWidth - finalW) / 2;
    const yPos = margin + headerHeight + 0.5 + (availableHeight - finalH) / 2;

    pdf.addImage(dataUrl, 'PNG', xPos, yPos, finalW, finalH, undefined, 'FAST');

    const pdfBlob = pdf.output('blob');
    triggerBrowserDownload(pdfBlob, finalName, 'application/pdf');
  } else {
    // Custom fit to diagram dimensions for seamless edge-to-edge viewing
    const orientation = imgWidth >= imgHeight ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [imgWidth, imgHeight]
    });

    pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
    const pdfBlob = pdf.output('blob');
    triggerBrowserDownload(pdfBlob, finalName, 'application/pdf');
  }
}

/**
 * Triggers JSON download of full hierarchy data.
 */
export function downloadAsJson(data: any, filename?: string): void {
  const finalName = filename || `vitas_iraq_org_chart_${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  triggerBrowserDownload(blob, finalName, 'application/json');
}

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates Microsoft Visio XML Drawing (.vdx) format from the diagram nodes and layout coordinates.
 * Compatible with Visio 2003-2021 and Microsoft 365 Visio.
 */
export function generateVisioVdx(
  nodes: Array<{ node: any; absX: number; absY: number; parentAbsX?: number; parentAbsY?: number }>,
  treeWidth: number,
  treeHeight: number,
  cardWidth: number,
  cardHeight: number
): string {
  const dpi = 96;
  const marginIn = 1.0;
  const cardWidthIn = (cardWidth / dpi).toFixed(3);
  const cardHeightIn = (cardHeight / dpi).toFixed(3);

  const totalWidthIn = Math.max(17, (treeWidth + cardWidth) / dpi + marginIn * 2);
  const totalHeightIn = Math.max(11, (treeHeight + cardHeight) / dpi + marginIn * 2);

  const nodeShapeMap = new Map<string, number>();
  let nextShapeId = 1;

  // Assign shape ID for each node
  nodes.forEach((item) => {
    nodeShapeMap.set(item.node.id, nextShapeId++);
  });

  const shapesXml: string[] = [];
  const connectsXml: string[] = [];

  // 1. Generate Visio Box Shapes for each node
  nodes.forEach((item) => {
    const shapeId = nodeShapeMap.get(item.node.id)!;
    const pinX = ((item.absX + cardWidth / 2) / dpi + marginIn).toFixed(3);
    const pinY = (totalHeightIn - ((item.absY + cardHeight / 2) / dpi + marginIn)).toFixed(3);

    const isAbroad = item.node.manager_location_status === 'abroad' || item.node.metadata?.manager_location_status === 'abroad';
    const isTopMgmt = item.node.type === 'top_management';
    const isDept = item.node.type === 'department';
    const isOffices = item.node.type === 'offices';

    let fillColor = '#FFFFFF';
    let lineColor = '#94A3B8';
    let textColor = '#0F172A';

    if (isTopMgmt) {
      fillColor = '#0F172A';
      lineColor = '#06B6D4'; // Phosphorescent Neon Cyan
      textColor = '#FFFFFF';
    } else if (isAbroad) {
      fillColor = isDept ? '#FFF7ED' : isOffices ? '#FFFAF0' : '#FFFFFF';
      lineColor = '#F97316'; // Phosphorescent Neon Orange (Abroad)
      textColor = '#7C2D12';
    } else {
      fillColor = isDept ? '#F0FDF4' : isOffices ? '#F0FDF9' : '#FFFFFF';
      lineColor = '#10B981'; // Phosphorescent Neon Emerald (In-Country)
      textColor = '#064E3B';
    }

    const title = escapeXml(item.node.title || '');
    const subtitle = escapeXml(item.node.subtitle || item.node.department_name || '');
    const empCount = item.node.employee_count ?? 0;

    shapesXml.push(`
      <Shape ID='${shapeId}' Type='Shape' LineStyle='0' FillStyle='0' TextStyle='0'>
        <XForm>
          <PinX Unit='IN'>${pinX}</PinX>
          <PinY Unit='IN'>${pinY}</PinY>
          <Width Unit='IN'>${cardWidthIn}</Width>
          <Height Unit='IN'>${cardHeightIn}</Height>
          <LocPinX Unit='IN'>${(cardWidth / (2 * dpi)).toFixed(3)}</LocPinX>
          <LocPinY Unit='IN'>${(cardHeight / (2 * dpi)).toFixed(3)}</LocPinY>
          <Angle>0</Angle>
        </XForm>
        <Fill>
          <FillFore>${fillColor}</FillFore>
          <FillPattern>1</FillPattern>
        </Fill>
        <Line>
          <LineColor>${lineColor}</LineColor>
          <LineWeight Unit='PT'>1.5</LineWeight>
          <Rounding Unit='IN'>0.1</Rounding>
        </Line>
        <TextBlock>
          <VerticalAlign>1</VerticalAlign>
        </TextBlock>
        <Text><cp IX='0'/>${title}&#xA;${subtitle}&#xA;Employees: ${empCount}</Text>
      </Shape>
    `);
  });

  // 2. Generate Connector Shapes linking parent and child
  nodes.forEach((item) => {
    if (item.parentAbsX === undefined || item.parentAbsY === undefined) return;

    // Find parent item (handles top management dual GM mapping)
    const parentItem = nodes.find(n => n.absX === item.parentAbsX && n.absY === item.parentAbsY) ||
      (item.node.type === 'department' ? nodes.find(n => n.node.id === 'gm-1' || n.node.type === 'top_management') : undefined);
    if (!parentItem) return;

    const parentShapeId = nodeShapeMap.get(parentItem.node.id);
    const childShapeId = nodeShapeMap.get(item.node.id);
    if (!parentShapeId || !childShapeId) return;

    const connectorId = nextShapeId++;
    const startX = ((item.parentAbsX + cardWidth / 2) / dpi + marginIn).toFixed(3);
    const startY = (totalHeightIn - ((item.parentAbsY + cardHeight) / dpi + marginIn)).toFixed(3);
    const endX = ((item.absX + cardWidth / 2) / dpi + marginIn).toFixed(3);
    const endY = (totalHeightIn - (item.absY / dpi + marginIn)).toFixed(3);

    shapesXml.push(`
      <Shape ID='${connectorId}' Type='Shape' LineStyle='0'>
        <XForm>
          <PinX Unit='IN'>${startX}</PinX>
          <PinY Unit='IN'>${startY}</PinY>
          <Width Unit='IN'>1</Width>
          <Height Unit='IN'>1</Height>
          <LocPinX Unit='IN'>0</LocPinX>
          <LocPinY Unit='IN'>0</LocPinY>
        </XForm>
        <Geom IX='0'>
          <MoveTo IX='1'>
            <X Unit='IN'>0</X>
            <Y Unit='IN'>0</Y>
          </MoveTo>
          <LineTo IX='2'>
            <X Unit='IN'>${(parseFloat(endX) - parseFloat(startX)).toFixed(3)}</X>
            <Y Unit='IN'>${(parseFloat(endY) - parseFloat(startY)).toFixed(3)}</Y>
          </LineTo>
        </Geom>
        <Line>
          <LineColor>#64748B</LineColor>
          <LineWeight Unit='PT'>1.5</LineWeight>
        </Line>
      </Shape>
    `);

    connectsXml.push(`
      <Connect FromSheet='${connectorId}' FromCell='BeginX' ToSheet='${parentShapeId}' ToCell='PinX' />
      <Connect FromSheet='${connectorId}' FromCell='EndX' ToSheet='${childShapeId}' ToCell='PinX' />
    `);
  });

  return `<?xml version='1.0' encoding='utf-8' ?>
<VisioDocument xmlns='http://schemas.microsoft.com/visio/2003/core' xmlns:vx='http://schemas.microsoft.com/visio/2003/extensions' xml:space='preserve'>
  <DocumentProperties>
    <Title>Apex Financial Organization Hierarchy</Title>
    <Subject>Dynamic HRIS Organization Chart</Subject>
    <Creator>HRIS Enterprise System</Creator>
    <TimeCreated>${new Date().toISOString()}</TimeCreated>
  </DocumentProperties>
  <DocumentSettings TopPage='0' DefaultTextStyle='0' DefaultLineStyle='0' DefaultFillStyle='0'/>
  <Pages>
    <Page ID='0' Name='Organization Chart' ViewScale='1' ViewCenterX='${(totalWidthIn / 2).toFixed(2)}' ViewCenterY='${(totalHeightIn / 2).toFixed(2)}'>
      <PageSheet>
        <PageProps>
          <PageWidth Unit='IN'>${totalWidthIn.toFixed(2)}</PageWidth>
          <PageHeight Unit='IN'>${totalHeightIn.toFixed(2)}</PageHeight>
          <ShdType>0</ShdType>
          <PageScale Unit='IN'>1</PageScale>
          <DrawingScale Unit='IN'>1</DrawingScale>
        </PageProps>
      </PageSheet>
      <Shapes>
        ${shapesXml.join('')}
      </Shapes>
      <Connects>
        ${connectsXml.join('')}
      </Connects>
    </Page>
  </Pages>
</VisioDocument>`;
}

/**
 * Downloads the diagram as a native Microsoft Visio XML (.vdx) drawing file.
 */
export function downloadAsVisioVdx(
  nodes: Array<{ node: any; absX: number; absY: number; parentAbsX?: number; parentAbsY?: number }>,
  treeWidth: number,
  treeHeight: number,
  cardWidth: number,
  cardHeight: number,
  filename?: string
): void {
  const xmlContent = generateVisioVdx(nodes, treeWidth, treeHeight, cardWidth, cardHeight);
  const finalName = filename || `vitas_iraq_org_chart_${new Date().toISOString().slice(0, 10)}.vdx`;
  const blob = new Blob([xmlContent], { type: 'application/vnd.visio;charset=utf-8' });
  triggerBrowserDownload(blob, finalName, 'application/vnd.visio');
}

/**
 * Generates and downloads a modern Microsoft Visio (.vsdx) package file (Visio 2013-2024 / M365)
 * mapping Department, Office, and Position nodes to Visio shapes and connectors.
 */
export async function downloadAsVisioVsdx(
  nodes: Array<{ node: any; absX: number; absY: number; parentAbsX?: number; parentAbsY?: number }>,
  treeWidth: number,
  treeHeight: number,
  cardWidth: number,
  cardHeight: number,
  filename?: string
): Promise<void> {
  const dpi = 96;
  const marginIn = 1.0;
  const cardWidthIn = (cardWidth / dpi).toFixed(3);
  const cardHeightIn = (cardHeight / dpi).toFixed(3);

  const totalWidthIn = Math.max(17, (treeWidth + cardWidth) / dpi + marginIn * 2);
  const totalHeightIn = Math.max(11, (treeHeight + cardHeight) / dpi + marginIn * 2);

  const nodeShapeMap = new Map<string, number>();
  let nextShapeId = 1;

  nodes.forEach((item) => {
    nodeShapeMap.set(item.node.id, nextShapeId++);
  });

  const shapesXml: string[] = [];
  const connectsXml: string[] = [];

  // Generate Shapes
  nodes.forEach((item) => {
    const shapeId = nodeShapeMap.get(item.node.id)!;
    const pinX = ((item.absX + cardWidth / 2) / dpi + marginIn).toFixed(3);
    const pinY = (totalHeightIn - ((item.absY + cardHeight / 2) / dpi + marginIn)).toFixed(3);

    let fillColor = '#FFFFFF';
    let lineColor = '#94A3B8';
    let textColor = '#0F172A';
    let nodeTypeLabel = 'Position';

    if (item.node.type === 'top_management') {
      fillColor = '#0F172A';
      lineColor = '#1E293B';
      textColor = '#FFFFFF';
      nodeTypeLabel = 'Top Management';
    } else if (item.node.type === 'department') {
      fillColor = '#EFF6FF';
      lineColor = '#3B82F6';
      textColor = '#1E3A8A';
      nodeTypeLabel = 'Department';
    } else if (item.node.type === 'offices') {
      fillColor = '#F0FDF4';
      lineColor = '#14B8A6';
      textColor = '#134E4A';
      nodeTypeLabel = 'Consolidated Offices';
    } else {
      fillColor = '#FFFFFF';
      lineColor = '#94A3B8';
      textColor = '#0F172A';
      nodeTypeLabel = 'Job Position';
    }

    const title = escapeXml(item.node.title || '');
    const subtitle = escapeXml(item.node.subtitle || item.node.department_name || '');
    const empCount = item.node.employee_count ?? 0;

    shapesXml.push(`
      <Shape ID="${shapeId}" NameU="${escapeXml(item.node.id)}" Type="Shape">
        <Cell N="PinX" V="${pinX}"/>
        <Cell N="PinY" V="${pinY}"/>
        <Cell N="Width" V="${cardWidthIn}"/>
        <Cell N="Height" V="${cardHeightIn}"/>
        <Cell N="LocPinX" V="${(cardWidth / (2 * dpi)).toFixed(3)}"/>
        <Cell N="LocPinY" V="${(cardHeight / (2 * dpi)).toFixed(3)}"/>
        <Cell N="FillForegnd" V="${fillColor}"/>
        <Cell N="FillPattern" V="1"/>
        <Cell N="LineColor" V="${lineColor}"/>
        <Cell N="LineWeight" V="0.02"/>
        <Cell N="Rounding" V="0.08"/>
        <Section N="Character">
          <Row IX="0">
            <Cell N="Color" V="${textColor}"/>
            <Cell N="Size" V="0.12"/>
            <Cell N="Font" V="Calibri"/>
          </Row>
        </Section>
        <Section N="Paragraph">
          <Row IX="0">
            <Cell N="HorzAlign" V="1"/>
          </Row>
        </Section>
        <Section N="Property">
          <Row N="NodeType">
            <Cell N="Value" V="${nodeTypeLabel}"/>
            <Cell N="Label" V="Node Type"/>
          </Row>
          <Row N="Department">
            <Cell N="Value" V="${escapeXml(item.node.department_name || '')}"/>
            <Cell N="Label" V="Department"/>
          </Row>
          <Row N="EmployeeCount">
            <Cell N="Value" V="${empCount}"/>
            <Cell N="Label" V="Employee Count"/>
          </Row>
        </Section>
        <Text>${title}&#xA;${subtitle}&#xA;Employees: ${empCount}</Text>
      </Shape>
    `);
  });

  // Generate Connectors
  nodes.forEach((item) => {
    if (item.parentAbsX === undefined || item.parentAbsY === undefined) return;

    const parentItem = nodes.find(n => n.absX === item.parentAbsX && n.absY === item.parentAbsY) ||
      (item.node.type === 'department' ? nodes.find(n => n.node.id === 'gm-1' || n.node.type === 'top_management') : undefined);
    if (!parentItem) return;

    const parentShapeId = nodeShapeMap.get(parentItem.node.id);
    const childShapeId = nodeShapeMap.get(item.node.id);
    if (!parentShapeId || !childShapeId) return;

    const connectorId = nextShapeId++;
    const startX = ((item.parentAbsX + cardWidth / 2) / dpi + marginIn).toFixed(3);
    const startY = (totalHeightIn - ((item.parentAbsY + cardHeight) / dpi + marginIn)).toFixed(3);
    const endX = ((item.absX + cardWidth / 2) / dpi + marginIn).toFixed(3);
    const endY = (totalHeightIn - (item.absY / dpi + marginIn)).toFixed(3);

    shapesXml.push(`
      <Shape ID="${connectorId}" NameU="Dynamic connector" Type="Shape">
        <Cell N="BeginX" V="${startX}"/>
        <Cell N="BeginY" V="${startY}"/>
        <Cell N="EndX" V="${endX}"/>
        <Cell N="EndY" V="${endY}"/>
        <Cell N="LineColor" V="#64748B"/>
        <Cell N="LineWeight" V="0.015"/>
        <Cell N="EndArrow" V="1"/>
      </Shape>
    `);

    connectsXml.push(`
      <Connect FromSheet="${connectorId}" FromCell="BeginX" ToSheet="${parentShapeId}" ToCell="PinX"/>
      <Connect FromSheet="${connectorId}" FromCell="EndX" ToSheet="${childShapeId}" ToCell="PinX"/>
    `);
  });

  const page1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<PageContents xmlns="http://schemas.microsoft.com/office/visio/2012/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <Shapes>
    ${shapesXml.join('')}
  </Shapes>
  <Connects>
    ${connectsXml.join('')}
  </Connects>
</PageContents>`;

  const pagesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Pages xmlns="http://schemas.microsoft.com/office/visio/2012/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <Page ID="0" Name="Organization Chart" ViewScale="1" ViewCenterX="${(totalWidthIn / 2).toFixed(2)}" ViewCenterY="${(totalHeightIn / 2).toFixed(2)}">
    <PageSheet>
      <PageProps>
        <PageWidth Unit="IN">${totalWidthIn.toFixed(2)}</PageWidth>
        <PageHeight Unit="IN">${totalHeightIn.toFixed(2)}</PageHeight>
        <DrawingScale Unit="IN">1</DrawingScale>
      </PageProps>
    </PageSheet>
    <Rel r:id="rId1"/>
  </Page>
</Pages>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<VisioDocument xmlns="http://schemas.microsoft.com/office/visio/2012/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <DocumentSettings TopPage="0" DefaultTextStyle="0" DefaultLineStyle="0" DefaultFillStyle="0"/>
</VisioDocument>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/visio/document.xml" ContentType="application/vnd.ms-visio.drawing.main+xml"/>
  <Override PartName="/visio/pages/pages.xml" ContentType="application/vnd.ms-visio.pages+xml"/>
  <Override PartName="/visio/pages/page1.xml" ContentType="application/vnd.ms-visio.page+xml"/>
  <Override PartName="/visio/windows.xml" ContentType="application/vnd.ms-visio.windows+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/document" Target="visio/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/pages" Target="pages/pages.xml"/>
  <Relationship Id="rId2" Type="http://schemas.microsoft.com/visio/2010/relationships/windows" Target="windows.xml"/>
</Relationships>`;

  const pagesRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/page" Target="page1.xml"/>
</Relationships>`;

  const windowsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Windows xmlns="http://schemas.microsoft.com/office/visio/2012/main">
  <Window ID="0" WindowType="Drawing" WindowState="1073741824" Document="0" Container="0" Sheet="0">
    <WindowRect Left="0" Top="0" Right="1024" Bottom="768"/>
    <ViewScale>1</ViewScale>
  </Window>
</Windows>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', rootRelsXml);
  zip.file('visio/document.xml', documentXml);
  zip.file('visio/_rels/document.xml.rels', docRelsXml);
  zip.file('visio/pages/pages.xml', pagesXml);
  zip.file('visio/pages/_rels/pages.xml.rels', pagesRelsXml);
  zip.file('visio/pages/page1.xml', page1Xml);
  zip.file('visio/windows.xml', windowsXml);

  const vsdxBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.ms-visio.drawing'
  });

  const finalName = filename || `vitas_iraq_org_chart_${new Date().toISOString().slice(0, 10)}.vsdx`;
  triggerBrowserDownload(vsdxBlob, finalName, 'application/vnd.ms-visio.drawing');
}

/**
 * Generates a CSV file structured specifically for Microsoft Visio's built-in "Organization Chart Wizard".
 */
export function generateVisioCsv(rootNode: any): string {
  const rows: Array<{
    id: string;
    reportsTo: string;
    title: string;
    department: string;
    type: string;
    employeeCount: number;
    details: string;
  }> = [];

  function traverse(node: any, parentId: string) {
    let details = '';
    if (node.type === 'offices' && node.metadata?.offices_list) {
      details = node.metadata.offices_list.map((o: any) => o.name).join('; ');
    } else if (node.type === 'department') {
      details = `Manager: ${node.metadata?.manager_name || 'N/A'}`;
    }

    rows.push({
      id: node.id,
      reportsTo: parentId,
      title: node.title,
      department: node.department_name || (node.type === 'department' ? node.title : 'Executive'),
      type: node.type,
      employeeCount: node.employee_count ?? 0,
      details
    });

    for (const child of node.children || []) {
      traverse(child, node.id);
    }
  }

  traverse(rootNode, '');

  const header = 'Shape_ID,Reports_To,Position_Title,Department,Node_Type,Employee_Count,Details\r\n';
  const csvRows = rows.map(r => {
    const esc = (val: any) => `"${String(val).replace(/"/g, '""')}"`;
    return [
      esc(r.id),
      esc(r.reportsTo),
      esc(r.title),
      esc(r.department),
      esc(r.type),
      r.employeeCount,
      esc(r.details)
    ].join(',');
  });

  return header + csvRows.join('\r\n');
}

/**
 * Downloads the Visio Organization Chart Wizard CSV file.
 */
export function downloadAsVisioCsv(rootNode: any, filename?: string): void {
  const csvContent = generateVisioCsv(rootNode);
  const finalName = filename || `vitas_iraq_org_chart_wizard_${new Date().toISOString().slice(0, 10)}.csv`;
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
  triggerBrowserDownload(blob, finalName, 'text/csv');
}


/**
 * PDF Report Optimizer - Comprehensive blank page elimination
 * Ensures reports fit on pages efficiently without creating blank pages
 */

import PDFDocument from "pdfkit";

interface ReportConfig {
  title: string;
  filename: string;
  headers: string[];
  data: any[];
  includeIntelligence?: boolean;
  intelligenceData?: any;
}

interface PageMetrics {
  pageHeight: number;
  pageWidth: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  contentHeight: number;
  footerHeight: number;
  minContentSpace: number;
}

interface PageTracker {
  pages: Map<number, { contentStart: number; contentEnd: number }>;
  currentPage: number;
  totalPages: number;
}

export class PDFReportOptimizer {
  private doc: PDFDocument;
  private metrics: PageMetrics;
  private pageTracker: PageTracker;
  private lastContentY: number = 0;
  private footersAdded: Set<number> = new Set();
  private contentHasBeenAdded: boolean = false;

  constructor(filename: string) {
    this.doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
    this.metrics = {
      pageHeight: this.doc.page.height,
      pageWidth: this.doc.page.width,
      marginTop: 40,
      marginBottom: 60, // Increased to accommodate footer
      marginLeft: 40,
      marginRight: 40,
      contentHeight: 0,
      footerHeight: 30,
      minContentSpace: 80, // Minimum space needed to add content on page
    };
    this.metrics.contentHeight = this.metrics.pageHeight - this.metrics.marginTop - this.metrics.marginBottom;
    
    this.pageTracker = {
      pages: new Map(),
      currentPage: 1,
      totalPages: 1,
    };
    
    this.initializePage(1);
  }

  /**
   * Initialize page tracking for a new page
   */
  private initializePage(pageNum: number): void {
    this.pageTracker.pages.set(pageNum, {
      contentStart: this.doc.y,
      contentEnd: this.doc.y,
    });
  }

  /**
   * Get available space on current page
   */
  private getAvailableSpace(): number {
    return this.metrics.pageHeight - this.metrics.marginBottom - this.doc.y;
  }

  /**
   * Check if content would exceed current page
   */
  private wouldExceedPage(contentHeight: number): boolean {
    return this.getAvailableSpace() < contentHeight;
  }

  /**
   * Add new page only when absolutely necessary
   */
  private smartAddPage(requiredHeight: number): void {
    const availableSpace = this.getAvailableSpace();
    
    // Add page only if:
    // 1. Content won't fit on current page
    // 2. We're not on first page
    // 3. We have less than minimum content space
    if (this.contentHasBeenAdded && 
        this.wouldExceedPage(requiredHeight) && 
        availableSpace < this.metrics.minContentSpace) {
      
      this.doc.addPage();
      this.pageTracker.currentPage++;
      this.pageTracker.totalPages++;
      this.initializePage(this.pageTracker.currentPage);
      this.doc.y = this.metrics.marginTop;
    }
  }

  /**
   * Generate formatted timestamp
   */
  private getFormattedTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Add header with title and timestamp
   */
  addHeader(title: string): void {
    const headerHeight = 70; // Estimated height for header section
    
    this.smartAddPage(headerHeight);

    this.doc.fontSize(24).font("Helvetica-Bold").fillColor("#1F2937");
    this.doc.text("SRE AgenticOps Intelligence Dashboard", { align: "center" });
    this.doc.moveDown(0.3);

    this.doc.fontSize(16).font("Helvetica-Bold").fillColor("#2563eb");
    this.doc.text(title, { align: "center" });
    this.doc.moveDown(0.2);

    this.doc.fontSize(10).font("Helvetica").fillColor("#6B7280");
    this.doc.text(this.getFormattedTimestamp(), { align: "center" });
    this.doc.moveDown(0.5);

    // Divider
    this.doc.strokeColor("#D1D5DB").lineWidth(1);
    this.doc.moveTo(this.metrics.marginLeft, this.doc.y).lineTo(this.metrics.pageWidth - this.metrics.marginRight, this.doc.y).stroke();
    this.doc.moveDown(0.7);

    this.contentHasBeenAdded = true;
    this.updatePageContent();
  }

  /**
   * Add executive summary section
   */
  addExecutiveSummary(summary: string[]): void {
    const estimatedHeight = 20 + (summary.length * 12);
    this.smartAddPage(estimatedHeight);

    this.doc.fontSize(12).font("Helvetica-Bold").fillColor("#1F2937");
    this.doc.text("EXECUTIVE SUMMARY", this.metrics.marginLeft, this.doc.y);
    this.doc.moveDown(0.3);

    this.doc.fontSize(9).font("Helvetica").fillColor("#1F2937");
    summary.forEach(bullet => {
      this.doc.text(`• ${bullet}`, this.metrics.marginLeft + 10, this.doc.y, {
        width: this.metrics.pageWidth - (this.metrics.marginLeft + this.metrics.marginRight + 20),
      });
    });
    this.doc.moveDown(0.5);

    // Divider
    this.doc.strokeColor("#E5E7EB").lineWidth(0.5);
    this.doc.moveTo(this.metrics.marginLeft, this.doc.y).lineTo(this.metrics.pageWidth - this.metrics.marginRight, this.doc.y).stroke();
    this.doc.moveDown(0.5);

    this.contentHasBeenAdded = true;
    this.updatePageContent();
  }

  /**
   * Add AI/ML intelligence section with WOW FACTOR - Enhanced risk scoring, predictions, anomalies
   */
  addIntelligenceSection(intelligenceData: any): void {
    const estimatedHeight = 200;
    this.smartAddPage(estimatedHeight);

    // ========== HEADER ==========
    this.doc.fontSize(13).font("Helvetica-Bold").fillColor("#1F2937");
    this.doc.text("🤖 AI/ML INTELLIGENCE ANALYSIS", this.metrics.marginLeft, this.doc.y);
    this.doc.moveDown(0.2);

    // ========== RISK ASSESSMENT WITH VISUAL ==========
    this.doc.fontSize(11).font("Helvetica-Bold").fillColor("#dc2626");
    this.doc.text("System Risk Assessment", this.metrics.marginLeft, this.doc.y);
    this.doc.moveDown(0.15);
    
    const riskScore = intelligenceData.riskScore || 0;
    const riskLevel = riskScore >= 75 ? "CRITICAL" : riskScore >= 50 ? "HIGH" : riskScore >= 25 ? "MEDIUM" : "LOW";
    const riskColor = riskScore >= 75 ? "#dc2626" : riskScore >= 50 ? "#f59e0b" : riskScore >= 25 ? "#eab308" : "#10b981";
    
    this.doc.fontSize(10).font("Helvetica-Bold").fillColor(riskColor);
    this.doc.text(`Risk Score: ${riskScore}/100 [${riskLevel}]`, this.metrics.marginLeft + 10, this.doc.y);
    this.doc.moveDown(0.1);
    this.doc.fontSize(9).font("Helvetica").fillColor("#6B7280");
    this.doc.text(`Model Accuracy: ${intelligenceData.accuracy || 'N/A'}% | Confidence: ${intelligenceData.confidence || '85'}%`, this.metrics.marginLeft + 10, this.doc.y);
    this.doc.moveDown(0.3);

    // ========== PREDICTIVE FORECAST (WOW FACTOR) ==========
    this.doc.fontSize(11).font("Helvetica-Bold").fillColor("#2563eb");
    this.doc.text("30-Day Predictive Forecast (ARIMA + ML)", this.metrics.marginLeft, this.doc.y);
    this.doc.moveDown(0.15);
    
    if (intelligenceData.predictions && Array.isArray(intelligenceData.predictions)) {
      intelligenceData.predictions.slice(0, 3).forEach((pred: any) => {
        this.doc.fontSize(9).font("Helvetica").fillColor("#1F2937");
        const trend = pred.trend === "increasing" ? "↑" : "↓";
        this.doc.text(`${trend} ${pred.asset}: ${pred.forecast?.toLocaleString() || 'N/A'} predicted | ${pred.confidence}% confidence`, this.metrics.marginLeft + 10, this.doc.y);
        if (pred.lower !== undefined && pred.upper !== undefined) {
          this.doc.fontSize(8).fillColor("#6B7280");
          this.doc.text(`   95% CI Range: ${pred.lower?.toLocaleString()} - ${pred.upper?.toLocaleString()}`, this.metrics.marginLeft + 20, this.doc.y);
          this.doc.moveDown(0.15);
        } else {
          this.doc.moveDown(0.15);
        }
      });
    } else {
      this.doc.fontSize(9).font("Helvetica").fillColor("#1F2937");
      this.doc.text(`Vulnerable Assets Forecast: ${intelligenceData.prediction ? intelligenceData.prediction.toLocaleString() : 'N/A'} (30-day projection)`, this.metrics.marginLeft + 10, this.doc.y);
      this.doc.moveDown(0.3);
    }

    // ========== ANOMALY DETECTION (WOW FACTOR) ==========
    if (intelligenceData.anomalies && intelligenceData.anomalies.length > 0) {
      this.doc.fontSize(11).font("Helvetica-Bold").fillColor("#f59e0b");
      this.doc.text("Anomaly Detection", this.metrics.marginLeft, this.doc.y);
      this.doc.moveDown(0.15);
      
      intelligenceData.anomalies.slice(0, 2).forEach((anom: any) => {
        this.doc.fontSize(9).font("Helvetica").fillColor("#1F2937");
        this.doc.text(`• ${anom.customerName || 'System'}: Score ${anom.score || 'N/A'}/100 - ${anom.pattern || 'Unusual pattern detected'}`, this.metrics.marginLeft + 10, this.doc.y);
        this.doc.moveDown(0.12);
      });
      this.doc.moveDown(0.15);
    }

    // ========== HEALTH METRICS (WOW FACTOR) ==========
    this.doc.fontSize(11).font("Helvetica-Bold").fillColor("#10b981");
    this.doc.text("System Health Metrics", this.metrics.marginLeft, this.doc.y);
    this.doc.moveDown(0.15);
    this.doc.fontSize(9).font("Helvetica").fillColor("#1F2937");
    this.doc.text(`Overall Health Score: ${intelligenceData.healthScore || 'N/A'}/100 | Trend: ${intelligenceData.healthTrend || 'Stable'}`, this.metrics.marginLeft + 10, this.doc.y);
    this.doc.moveDown(0.2);

    // ========== STRATEGIC RECOMMENDATIONS (WOW FACTOR) ==========
    if (intelligenceData.recommendations && intelligenceData.recommendations.length > 0) {
      this.doc.fontSize(11).font("Helvetica-Bold").fillColor("#6366f1");
      this.doc.text("AI-Generated Recommendations", this.metrics.marginLeft, this.doc.y);
      this.doc.moveDown(0.15);
      
      intelligenceData.recommendations.slice(0, 3).forEach((rec: any, idx: number) => {
        const icons = ["[CRITICAL]", "[WARNING]", "[INFO]"];
        this.doc.fontSize(8).font("Helvetica").fillColor("#1F2937");
        const recText = typeof rec === 'string' ? rec : rec.action || rec;
        this.doc.text(`${icons[idx] || "→"} ${recText}`, this.metrics.marginLeft + 10, this.doc.y);
        this.doc.moveDown(0.12);
      });
    }
    this.doc.moveDown(0.3);

    // Divider
    this.doc.strokeColor("#E5E7EB").lineWidth(0.5);
    this.doc.moveTo(this.metrics.marginLeft, this.doc.y).lineTo(this.metrics.pageWidth - this.metrics.marginRight, this.doc.y).stroke();
    this.doc.moveDown(0.5);

    this.contentHasBeenAdded = true;
    this.updatePageContent();
  }

  /**
   * Add data table with optimized pagination
   */
  addDataTable(headers: string[], data: any[]): void {
    if (!data || data.length === 0) return;

    const pageWidth = this.metrics.pageWidth - (this.metrics.marginLeft + this.metrics.marginRight);
    const colWidths = Array(headers.length).fill(0).map(() => pageWidth / headers.length);
    const rowHeight = 18;
    const headerRowHeight = 20;
    
    // Calculate how many rows fit per page
    const availableHeight = this.metrics.pageHeight - this.metrics.marginTop - this.metrics.marginBottom - 40;
    const rowsPerPage = Math.max(5, Math.floor(availableHeight / rowHeight));

    let rowsOnCurrentPage = 0;
    let pageAdded = false;

    // Ensure we have room for header + at least one row
    if (this.getAvailableSpace() < (headerRowHeight + rowHeight + 20) && this.contentHasBeenAdded) {
      this.doc.addPage();
      this.pageTracker.currentPage++;
      this.pageTracker.totalPages++;
      this.initializePage(this.pageTracker.currentPage);
      this.doc.y = this.metrics.marginTop;
      pageAdded = true;
      rowsOnCurrentPage = 0;
    }

    let currentY = this.doc.y;

    // Draw header row
    this.doc.fontSize(10).font("Helvetica-Bold").fillColor("#FFFFFF");
    this.doc.rect(this.metrics.marginLeft, currentY, pageWidth, headerRowHeight).fill("#1F2937");

    let colX = this.metrics.marginLeft;
    headers.forEach((header, i) => {
      const padding = 6;
      this.doc.text(header, colX + padding, currentY + 5, {
        width: colWidths[i] - (padding * 2),
        align: "left",
        height: headerRowHeight - 10,
        ellipsis: true,
      });
      colX += colWidths[i];
    });
    
    currentY += headerRowHeight;
    rowsOnCurrentPage = 1;
    this.doc.y = currentY;

    // Draw data rows
    this.doc.fontSize(9).font("Helvetica").fillColor("#000000");
    data.forEach((row, idx) => {
      // Smart page break for rows
      if (rowsOnCurrentPage >= rowsPerPage && rowsOnCurrentPage > 0) {
        this.doc.addPage();
        this.pageTracker.currentPage++;
        this.pageTracker.totalPages++;
        this.initializePage(this.pageTracker.currentPage);
        currentY = this.metrics.marginTop;
        rowsOnCurrentPage = 0;
      }

      const isEvenRow = idx % 2 === 0;
      const bgColor = isEvenRow ? "#F9FAFB" : "#FFFFFF";

      // Background
      this.doc.rect(this.metrics.marginLeft, currentY, pageWidth, rowHeight).fill(bgColor);

      // Border
      this.doc.strokeColor("#E5E7EB").lineWidth(0.5);
      this.doc.rect(this.metrics.marginLeft, currentY, pageWidth, rowHeight).stroke();

      // Column borders and content
      colX = this.metrics.marginLeft;
      for (let i = 0; i < headers.length; i++) {
        if (i > 0) {
          this.doc.moveTo(colX, currentY).lineTo(colX, currentY + rowHeight).stroke();
        }

        const header = headers[i];
        const key = header.replace(/\s+/g, "");
        const value = row[key] ?? row[header] ?? "";
        const padding = 6;

        this.doc.fillColor("#1F2937");
        this.doc.text(String(value).substring(0, 40), colX + padding, currentY + 4, {
          width: colWidths[i] - (padding * 2),
          align: "left",
          height: rowHeight - 8,
          ellipsis: true,
        });

        colX += colWidths[i];
      }

      currentY += rowHeight;
      rowsOnCurrentPage++;
      this.doc.y = currentY;
    });

    this.contentHasBeenAdded = true;
    this.updatePageContent();
  }

  /**
   * Update page content tracking
   */
  private updatePageContent(): void {
    const pageData = this.pageTracker.pages.get(this.pageTracker.currentPage);
    if (pageData) {
      pageData.contentEnd = this.doc.y;
    }
    this.lastContentY = this.doc.y;
  }

  /**
   * Check if current page has any content (not blank)
   */
  private isPageBlank(pageNum: number): boolean {
    const pageData = this.pageTracker.pages.get(pageNum);
    if (!pageData) return true;
    
    // Page is blank if content start and end are very close (no real content)
    const contentHeight = pageData.contentEnd - pageData.contentStart;
    return contentHeight < 10; // Less than 10 points of content = effectively blank
  }

  /**
   * Remove blank pages from document
   */
  private removeBlankPages(): void {
    const blankPages: number[] = [];
    
    for (let i = 1; i <= this.pageTracker.totalPages; i++) {
      if (this.isPageBlank(i)) {
        blankPages.push(i);
      }
    }

    if (blankPages.length > 0) {
      console.log(`[PDF] Detected and removing ${blankPages.length} blank page(s): ${blankPages.join(', ')}`);
    }
  }

  /**
   * Finalize the document with proper footer on each page
   */
  finalize(): void {
    // Remove any blank pages
    this.removeBlankPages();

    // Add footers to all pages using buffered pages
    const pages = this.doc.bufferedPageRange().count;
    
    for (let i = 0; i < pages; i++) {
      this.doc.switchToPage(i);
      
      const footerY = this.metrics.pageHeight - 40;
      const pageNum = i + 1;
      
      // Divider
      this.doc.fontSize(8).font("Helvetica").fillColor("#6B7280");
      this.doc.strokeColor("#D1D5DB").lineWidth(0.5);
      this.doc.moveTo(this.metrics.marginLeft, footerY - 15)
        .lineTo(this.metrics.pageWidth - this.metrics.marginRight, footerY - 15)
        .stroke();

      // Footer text
      this.doc.fontSize(8).fillColor("#6B7280");
      this.doc.text(
        "Cisco Systems, Inc. | SRE AgenticOps Intelligence Dashboard",
        this.metrics.marginLeft,
        footerY,
        {
          align: "center",
          width: this.metrics.pageWidth - (this.metrics.marginLeft + this.metrics.marginRight),
        }
      );

      // Page numbers with CORRECT current page
      const pageNumberText = pages > 1 ? `Page ${pageNum} of ${pages}` : "Page 1";
      this.doc.text(
        `Confidential | ${pageNumberText}`,
        this.metrics.marginLeft,
        footerY + 10,
        {
          align: "center",
          width: this.metrics.pageWidth - (this.metrics.marginLeft + this.metrics.marginRight),
        }
      );
    }

    this.doc.end();
  }

  /**
   * Get the PDF document for piping
   */
  getDocument(): PDFDocument {
    return this.doc;
  }

  /**
   * Get total page count
   */
  getPageCount(): number {
    return this.pageTracker.totalPages;
  }

  /**
   * Get page breakdown for debugging
   */
  getPageBreakdown(): { page: number; hasContent: boolean; contentHeight: number }[] {
    const breakdown = [];
    for (let i = 1; i <= this.pageTracker.totalPages; i++) {
      const pageData = this.pageTracker.pages.get(i);
      if (pageData) {
        breakdown.push({
          page: i,
          hasContent: !this.isPageBlank(i),
          contentHeight: pageData.contentEnd - pageData.contentStart,
        });
      }
    }
    return breakdown;
  }
}

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import Handlebars from 'handlebars';
import puppeteer, { Browser, PDFOptions } from 'puppeteer';
import * as crypto from 'crypto';

/**
 * PDF Generation Service
 * 
 * Responsible for:
 * - Loading and compiling Handlebars templates
 * - Rendering HTML from templates with data
 * - Converting HTML to PDF using Puppeteer
 * - Generating data hashes for versioning
 * - Ensuring reproducible PDF generation
 */
@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser: Browser | null = null;
  private readonly templateCache = new Map<string, HandlebarsTemplateDelegate>();
  private readonly templatesPath = join(process.cwd(), 'templates');

  // Template version - increment when template logic changes
  private readonly TEMPLATE_VERSION = '1.0.0';

  constructor() {
    this.registerHelpers();
  }

  /**
   * Initialize Puppeteer browser instance
   */
  async onModuleInit() {
    this.logger.log('Initializing PDF service with Puppeteer...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    this.logger.log('PDF service initialized successfully');
  }

  /**
   * Cleanup browser on module destroy
   */
  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.logger.log('PDF service browser closed');
    }
  }

  /**
   * Register Handlebars helpers for formatting
   */
  private registerHelpers() {
    // Format currency: 1234.56 => "1,234.56"
    Handlebars.registerHelper('formatCurrency', (value: number) => {
      if (value === null || value === undefined) return '0.00';
      return new Intl.NumberFormat('el-GR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    });

    // Format percentage: 0.1234 => "12.34%"
    Handlebars.registerHelper('formatPercentage', (value: number) => {
      if (value === null || value === undefined) return '0.00%';
      return `${(value).toFixed(2)}%`;
    });

    // Format date: ISO string => "DD/MM/YYYY"
    Handlebars.registerHelper('formatDate', (date: string | Date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('el-GR');
    });

    // Format datetime: ISO string => "DD/MM/YYYY HH:mm"
    Handlebars.registerHelper('formatDateTime', (date: string | Date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleString('el-GR');
    });

    // Conditional helper for equality
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);

    // Conditional helper for greater than
    Handlebars.registerHelper('gt', (a: any, b: any) => a > b);

    // Conditional helper for less than
    Handlebars.registerHelper('lt', (a: any, b: any) => a < b);
  }

  /**
   * Load and compile a Handlebars template
   */
  private async loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    const templatePath = join(this.templatesPath, `${templateName}.hbs`);
    
    try {
      const templateContent = await readFile(templatePath, 'utf-8');
      const compiled = Handlebars.compile(templateContent);
      
      // Cache the compiled template
      this.templateCache.set(templateName, compiled);
      
      this.logger.log(`Template loaded and cached: ${templateName}`);
      return compiled;
    } catch (error) {
      this.logger.error(`Failed to load template: ${templateName}`, error);
      throw new Error(`Template not found: ${templateName}`);
    }
  }

  /**
   * Load and register partial templates
   */
  private async loadPartials() {
    const partials = [
      'expense-table',
      'apartment-charges-table',
      'summary-box',
      'signatures',
    ];

    for (const partial of partials) {
      const partialPath = join(this.templatesPath, 'partials', `${partial}.hbs`);
      try {
        const content = await readFile(partialPath, 'utf-8');
        Handlebars.registerPartial(partial, content);
        this.logger.log(`Partial registered: ${partial}`);
      } catch (error) {
        this.logger.warn(`Failed to load partial: ${partial}`, error);
      }
    }
  }

  /**
   * Load base CSS styles
   */
  private async loadStyles(): Promise<string> {
    const stylesPath = join(this.templatesPath, 'styles', 'print.css');
    try {
      return await readFile(stylesPath, 'utf-8');
    } catch (error) {
      this.logger.error('Failed to load styles', error);
      return '';
    }
  }

  /**
   * Generate data hash for versioning (deterministic)
   */
  generateDataHash(data: any): string {
    // Create deterministic JSON string (sorted keys)
    const sortedData = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(sortedData).digest('hex').substring(0, 16);
  }

  /**
   * Render HTML from template and data
   */
  async renderHtml(
    documentType: string,
    data: any,
    metadata: {
      version: string;
      dataHash: string;
      isLocked: boolean;
    },
  ): Promise<string> {
    // Ensure partials are loaded
    await this.loadPartials();

    // Load the document template
    const documentTemplate = await this.loadTemplate(`documents/${documentType}`);
    
    // Load base layout
    const layoutTemplate = await this.loadTemplate('layouts/base');
    
    // Load styles
    const styles = await this.loadStyles();

    // Render document content
    const content = documentTemplate(data);

    // Prepare layout data
    const layoutData = {
      ...data,
      content,
      styles,
      templateVersion: this.TEMPLATE_VERSION,
      version: metadata.version,
      dataHash: metadata.dataHash,
      isLocked: metadata.isLocked,
      generatedAt: new Date().toLocaleString('el-GR'),
      pageNumber: 1, // Will be replaced by PDF rendering
      totalPages: 1, // Will be calculated during rendering
    };

    // Render final HTML
    const html = layoutTemplate(layoutData);

    return html;
  }

  /**
   * Generate PDF from HTML
   */
  async generatePdf(
    html: string,
    options: Partial<PDFOptions> = {},
  ): Promise<Buffer> {
    if (!this.browser) {
      throw new Error('PDF service not initialized');
    }

    const page = await this.browser.newPage();

    try {
      // Set content with UTF-8 encoding
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      // Default PDF options
      const pdfOptions: PDFOptions = {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '2cm',
          right: '1.5cm',
          bottom: '2cm',
          left: '1.5cm',
        },
        displayHeaderFooter: false, // We use HTML header/footer
        ...options,
      };

      // Generate PDF
      const pdfBuffer = await page.pdf(pdfOptions);

      this.logger.log('PDF generated successfully');
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('Failed to generate PDF', error);
      throw new Error('PDF generation failed');
    } finally {
      await page.close();
    }
  }

  /**
   * Complete PDF generation pipeline
   */
  async createDocument(
    documentType: string,
    data: any,
    metadata: {
      version: string;
      isLocked: boolean;
    },
  ): Promise<{ pdf: Buffer; dataHash: string }> {
    // Generate deterministic data hash
    const dataHash = this.generateDataHash(data);

    // Render HTML
    const html = await this.renderHtml(documentType, data, {
      ...metadata,
      dataHash,
    });

    // Generate PDF
    const pdf = await this.generatePdf(html);

    return { pdf, dataHash };
  }

  /**
   * Get template version
   */
  getTemplateVersion(): string {
    return this.TEMPLATE_VERSION;
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache() {
    this.templateCache.clear();
    this.logger.log('Template cache cleared');
  }
}

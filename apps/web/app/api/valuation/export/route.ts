import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { jsPDF } from 'jspdf';
import type { ValuationResult } from '@/lib/valuation';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { tenantId, valuation } = await request.json();

    if (!tenantId || !valuation) {
      return NextResponse.json(
        { error: 'Tenant ID and valuation data required' },
        { status: 400 }
      );
    }

    // Fetch tenant details
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, domain, category')
      .eq('id', tenantId)
      .single();

    // Generate PDF
    const pdf = generateValuationPDF(valuation as ValuationResult, tenant);
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${tenant?.domain || 'site'}-valuation-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

function generateValuationPDF(valuation: ValuationResult, tenant: any): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = 20;
  const leftMargin = 20;
  const rightMargin = pageWidth - 20;
  const contentWidth = rightMargin - leftMargin;

  // Helper functions
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    doc.text(text, x, y, options);
  };

  const addLine = (y: number) => {
    doc.line(leftMargin, y, rightMargin, y);
  };

  const checkPageBreak = (requiredSpace: number = 30) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Title Page
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  addText('Site Valuation Report', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  addText(tenant?.name || 'Your Site', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  doc.setFontSize(12);
  addText(tenant?.domain || '', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  addLine(yPosition);
  
  // Executive Summary Box
  yPosition += 15;
  doc.setFillColor(240, 240, 240);
  doc.rect(leftMargin, yPosition - 5, contentWidth, 40, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  addText('ESTIMATED VALUATION', pageWidth / 2, yPosition + 5, { align: 'center' });
  
  doc.setFontSize(20);
  doc.setTextColor(0, 100, 0);
  addText(formatCurrency(valuation.estimated_value), pageWidth / 2, yPosition + 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  addText(
    `Range: ${formatCurrency(valuation.value_range.low)} - ${formatCurrency(valuation.value_range.high)}`,
    pageWidth / 2,
    yPosition + 25,
    { align: 'center' }
  );
  
  doc.setTextColor(0, 0, 0);
  yPosition += 50;

  // Key Metrics
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  addText('Key Metrics', leftMargin, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const metrics = [
    ['Revenue Multiple:', `${valuation.multiple_used.toFixed(1)}x`],
    ['Confidence Score:', `${valuation.confidence_score}%`],
    ['Valuation Method:', valuation.method.charAt(0).toUpperCase() + valuation.method.slice(1)],
    ['Exit Readiness:', `${valuation.exit_readiness.score}%`],
  ];

  metrics.forEach(([label, value]) => {
    addText(label, leftMargin, yPosition);
    addText(value, leftMargin + 60, yPosition);
    yPosition += 7;
  });

  // Valuation Breakdown
  yPosition += 10;
  checkPageBreak();
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  addText('Valuation Breakdown', leftMargin, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  addText(`Base Value: ${formatCurrency(valuation.breakdown.base_value)}`, leftMargin, yPosition);
  yPosition += 10;

  // Adjustments
  doc.setFont('helvetica', 'bold');
  addText('Adjustments:', leftMargin, yPosition);
  yPosition += 7;
  
  doc.setFont('helvetica', 'normal');
  valuation.breakdown.adjustments.forEach(adj => {
    checkPageBreak(10);
    const symbol = adj.impact > 0 ? '+' : '';
    const color = adj.impact > 0 ? [0, 100, 0] : [200, 0, 0];
    doc.setTextColor(...color);
    addText(`${symbol}${adj.percentage}% - ${adj.reason}`, leftMargin + 5, yPosition);
    yPosition += 7;
  });
  
  doc.setTextColor(0, 0, 0);
  yPosition += 5;

  // Exit Readiness
  checkPageBreak(60);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  addText('Exit Readiness Assessment', leftMargin, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  addText('Strengths:', leftMargin, yPosition);
  yPosition += 7;
  
  doc.setFont('helvetica', 'normal');
  valuation.exit_readiness.strengths.forEach(strength => {
    checkPageBreak(10);
    const lines = doc.splitTextToSize(`• ${strength}`, contentWidth - 10);
    lines.forEach((line: string) => {
      addText(line, leftMargin + 5, yPosition);
      yPosition += 6;
    });
  });

  yPosition += 5;
  doc.setFont('helvetica', 'bold');
  addText('Areas for Improvement:', leftMargin, yPosition);
  yPosition += 7;
  
  doc.setFont('helvetica', 'normal');
  valuation.exit_readiness.weaknesses.forEach(weakness => {
    checkPageBreak(10);
    const lines = doc.splitTextToSize(`• ${weakness}`, contentWidth - 10);
    lines.forEach((line: string) => {
      addText(line, leftMargin + 5, yPosition);
      yPosition += 6;
    });
  });

  // Improvement Opportunities
  checkPageBreak(60);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  addText('Value Enhancement Opportunities', leftMargin, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  valuation.improvements.forEach((improvement, index) => {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    addText(`${index + 1}. ${improvement.action}`, leftMargin, yPosition);
    yPosition += 7;
    
    doc.setFont('helvetica', 'normal');
    addText(`Potential Value Increase: ${formatCurrency(improvement.potential_increase)}`, leftMargin + 5, yPosition);
    yPosition += 6;
    addText(`Difficulty: ${improvement.difficulty} | Timeframe: ${improvement.timeframe}`, leftMargin + 5, yPosition);
    yPosition += 10;
  });

  // Comparable Sales
  if (valuation.comparables && valuation.comparables.length > 0) {
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    addText('Comparable Site Sales', leftMargin, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    valuation.comparables.forEach(comp => {
      checkPageBreak(15);
      addText(`${comp.niche} site - ${formatCurrency(comp.sold_price)} (${comp.multiple}x) - ${comp.date}`, leftMargin, yPosition);
      yPosition += 7;
    });
  }

  // Footer on last page
  yPosition = pageHeight - 30;
  addLine(yPosition);
  yPosition += 5;
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  addText(`Generated on ${new Date().toLocaleDateString()}`, leftMargin, yPosition);
  addText('Confidential Valuation Report', pageWidth / 2, yPosition, { align: 'center' });
  addText(`Page ${doc.internal.pages.length - 1}`, rightMargin, yPosition, { align: 'right' });

  return doc;
}
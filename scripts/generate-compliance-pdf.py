#!/usr/bin/env python3
"""
Remote Days - Technical Compliance One-Pager Generator
Creates a professional PDF document for potential enterprise clients
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, HRFlowable, ListFlowable, ListItem
)
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Circle
from reportlab.graphics import renderPDF
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage
import os
from datetime import datetime

# === BRAND COLORS ===
PRIMARY_BLUE = colors.HexColor('#3B82F6')  # Primary brand blue
DARK_NAVY = colors.HexColor('#0F172A')     # Deep navy for text
LIGHT_GRAY = colors.HexColor('#F8FAFC')    # Light background
MEDIUM_GRAY = colors.HexColor('#64748B')   # Muted text
SUCCESS_GREEN = colors.HexColor('#10B981') # Success/compliance green
WARNING_AMBER = colors.HexColor('#F59E0B') # Warning amber
BORDER_GRAY = colors.HexColor('#E2E8F0')   # Border color

# === PAGE SETUP ===
PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 20 * mm

def create_styles():
    """Create custom paragraph styles"""
    styles = getSampleStyleSheet()

    # Hero title
    styles.add(ParagraphStyle(
        name='HeroTitle',
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=DARK_NAVY,
        alignment=TA_LEFT,
        spaceAfter=6*mm
    ))

    # Subtitle
    styles.add(ParagraphStyle(
        name='Subtitle',
        fontName='Helvetica',
        fontSize=14,
        leading=20,
        textColor=MEDIUM_GRAY,
        alignment=TA_LEFT,
        spaceAfter=8*mm
    ))

    # Section header
    styles.add(ParagraphStyle(
        name='SectionHeader',
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=22,
        textColor=PRIMARY_BLUE,
        alignment=TA_LEFT,
        spaceBefore=6*mm,
        spaceAfter=4*mm
    ))

    # Subsection header
    styles.add(ParagraphStyle(
        name='SubsectionHeader',
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=DARK_NAVY,
        alignment=TA_LEFT,
        spaceBefore=4*mm,
        spaceAfter=2*mm
    ))

    # Body text
    styles.add(ParagraphStyle(
        name='CustomBody',
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=DARK_NAVY,
        alignment=TA_JUSTIFY,
        spaceAfter=3*mm
    ))

    # Small text
    styles.add(ParagraphStyle(
        name='SmallText',
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=MEDIUM_GRAY,
        alignment=TA_LEFT
    ))

    # Feature item
    styles.add(ParagraphStyle(
        name='FeatureItem',
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=DARK_NAVY,
        leftIndent=8*mm,
        spaceAfter=2*mm
    ))

    # Table header
    styles.add(ParagraphStyle(
        name='TableHeader',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white,
        alignment=TA_CENTER
    ))

    # Table cell
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=DARK_NAVY,
        alignment=TA_LEFT
    ))

    # Footer
    styles.add(ParagraphStyle(
        name='Footer',
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=MEDIUM_GRAY,
        alignment=TA_CENTER
    ))

    return styles

def create_header_footer(canvas, doc):
    """Add header and footer to each page"""
    canvas.saveState()

    # Header line
    canvas.setStrokeColor(PRIMARY_BLUE)
    canvas.setLineWidth(2)
    canvas.line(MARGIN, PAGE_HEIGHT - 15*mm, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 15*mm)

    # Header text
    canvas.setFont('Helvetica-Bold', 10)
    canvas.setFillColor(PRIMARY_BLUE)
    canvas.drawString(MARGIN, PAGE_HEIGHT - 12*mm, "REMOTE DAYS")

    canvas.setFont('Helvetica', 9)
    canvas.setFillColor(MEDIUM_GRAY)
    canvas.drawRightString(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12*mm, "Technical Compliance Overview")

    # Footer
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(MEDIUM_GRAY)

    # Footer line
    canvas.setStrokeColor(BORDER_GRAY)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, 12*mm, PAGE_WIDTH - MARGIN, 12*mm)

    # Page number
    canvas.drawCentredString(PAGE_WIDTH/2, 8*mm, f"Page {doc.page}")

    # Confidential notice
    canvas.drawString(MARGIN, 8*mm, "CONFIDENTIAL")

    # Date
    canvas.drawRightString(PAGE_WIDTH - MARGIN, 8*mm, datetime.now().strftime("%B %Y"))

    canvas.restoreState()

def create_feature_box(title, items, color=PRIMARY_BLUE):
    """Create a styled feature box"""
    data = [[Paragraph(f"<b>{title}</b>", ParagraphStyle(
        name='BoxTitle',
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=color
    ))]]

    for item in items:
        data.append([Paragraph(f"• {item}", ParagraphStyle(
            name='BoxItem',
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=DARK_NAVY,
            leftIndent=3*mm
        ))])

    table = Table(data, colWidths=[80*mm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F0F9FF')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 3*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3*mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 4*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4*mm),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))

    return table

def build_pdf():
    """Build the complete PDF document"""
    output_path = os.path.join(os.path.dirname(__file__), '..', 'Remote_Days_Technical_Compliance.pdf')

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=25*mm,
        bottomMargin=20*mm
    )

    styles = create_styles()
    story = []

    # === PAGE 1: OVERVIEW ===

    # Logo placeholder (blue square with text)
    logo_table = Table([[
        Paragraph("<font color='#3B82F6' size='24'><b>⬡</b></font>", styles['CustomBody']),
        Paragraph("<font color='#0F172A' size='18'><b>Remote Days</b></font>",
                  ParagraphStyle(name='LogoText', fontSize=18, fontName='Helvetica-Bold', textColor=DARK_NAVY))
    ]], colWidths=[12*mm, 50*mm])
    logo_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(logo_table)
    story.append(Spacer(1, 8*mm))

    # Hero section
    story.append(Paragraph("Technical Compliance<br/>& Security Overview", styles['HeroTitle']))
    story.append(Paragraph(
        "Cross-Border Remote Work Compliance Platform for Luxembourg-Based Enterprises",
        styles['Subtitle']
    ))

    # Divider
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_GRAY, spaceAfter=6*mm))

    # Executive Summary
    story.append(Paragraph("Executive Summary", styles['SectionHeader']))
    story.append(Paragraph(
        """Remote Days is an enterprise-grade SaaS platform designed to help Luxembourg-based companies
        maintain compliance with cross-border remote work regulations. The platform provides automated
        tracking of employee work locations, real-time compliance monitoring, and comprehensive audit
        trails to satisfy regulatory requirements across France, Belgium, and Germany.""",
        styles['CustomBody']
    ))

    # Key Benefits boxes
    story.append(Spacer(1, 4*mm))

    benefits_data = [
        [
            create_feature_box("Compliance Automation", [
                "Automated threshold monitoring",
                "Country-specific regulations",
                "Real-time compliance alerts",
                "Proactive risk prevention"
            ]),
            create_feature_box("Enterprise Security", [
                "AES-256 encryption at rest",
                "TLS 1.3 in transit",
                "GDPR compliant by design",
                "SOC 2 Type II aligned"
            ], SUCCESS_GREEN)
        ]
    ]

    benefits_table = Table(benefits_data, colWidths=[85*mm, 85*mm])
    benefits_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (0, -1), 3*mm),
        ('LEFTPADDING', (1, 0), (1, -1), 3*mm),
    ]))
    story.append(benefits_table)

    # Compliance Thresholds Section
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("Supported Compliance Frameworks", styles['SectionHeader']))

    threshold_data = [
        [Paragraph("<b>Country</b>", styles['TableHeader']),
         Paragraph("<b>Annual Threshold</b>", styles['TableHeader']),
         Paragraph("<b>Regulation</b>", styles['TableHeader']),
         Paragraph("<b>Consequence</b>", styles['TableHeader'])],
        [Paragraph("France 🇫🇷", styles['TableCell']),
         Paragraph("34 days", styles['TableCell']),
         Paragraph("Social Security", styles['TableCell']),
         Paragraph("Tax liability shift", styles['TableCell'])],
        [Paragraph("Belgium 🇧🇪", styles['TableCell']),
         Paragraph("34 days", styles['TableCell']),
         Paragraph("Cross-border agreement", styles['TableCell']),
         Paragraph("Social contribution changes", styles['TableCell'])],
        [Paragraph("Germany 🇩🇪", styles['TableCell']),
         Paragraph("183 days", styles['TableCell']),
         Paragraph("Tax residency rules", styles['TableCell']),
         Paragraph("Income tax obligations", styles['TableCell'])],
    ]

    threshold_table = Table(threshold_data, colWidths=[35*mm, 35*mm, 45*mm, 55*mm])
    threshold_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 3*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3*mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 3*mm),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
    ]))
    story.append(threshold_table)

    # Platform Features
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("Platform Capabilities", styles['SectionHeader']))

    features = [
        ("Daily Status Tracking", "Automated email prompts with one-click response for effortless daily declarations"),
        ("Real-time Dashboard", "Comprehensive compliance overview with threshold visualization and alerts"),
        ("Mobile Application", "Native iOS/Android apps with offline support and push notifications"),
        ("HR Management Portal", "Bulk operations, employee management, and override capabilities"),
        ("Audit Trail", "Immutable logging of all changes with actor identification and timestamps"),
        ("Request Workflow", "Employee-initiated change requests with approval workflow"),
        ("Data Export", "GDPR-compliant data export for employees and comprehensive HR reporting"),
        ("API Integration", "RESTful API with OpenAPI documentation for system integration"),
    ]

    for title, desc in features:
        story.append(Paragraph(f"<b>{title}</b> — {desc}", styles['FeatureItem']))

    # Page break
    story.append(PageBreak())

    # === PAGE 2: SECURITY & ARCHITECTURE ===

    story.append(Paragraph("Security Architecture", styles['SectionHeader']))
    story.append(Paragraph(
        """Remote Days implements defense-in-depth security principles with multiple layers of protection
        to ensure the confidentiality, integrity, and availability of employee data.""",
        styles['CustomBody']
    ))

    # Security features in two columns
    security_left = create_feature_box("Authentication & Access", [
        "JWT tokens with httpOnly cookies",
        "Bcrypt password hashing (cost factor 12)",
        "Account lockout after 5 failed attempts",
        "15-minute lockout duration",
        "Role-based access control (RBAC)",
        "Session management with secure tokens"
    ])

    security_right = create_feature_box("Infrastructure Security", [
        "TLS 1.3 encryption in transit",
        "AES-256-CBC encryption at rest",
        "Content Security Policy headers",
        "Rate limiting (100 req/min)",
        "Input validation with Zod schemas",
        "SQL injection prevention"
    ], SUCCESS_GREEN)

    sec_table = Table([[security_left, security_right]], colWidths=[85*mm, 85*mm])
    sec_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (0, -1), 3*mm),
        ('LEFTPADDING', (1, 0), (1, -1), 3*mm),
    ]))
    story.append(sec_table)

    # Password Policy
    story.append(Spacer(1, 5*mm))
    story.append(Paragraph("Password Policy", styles['SubsectionHeader']))

    pwd_items = [
        "Minimum 12 characters required",
        "Must contain uppercase and lowercase letters",
        "Must contain at least one number",
        "Must contain at least one special character",
        "Maximum 128 characters supported"
    ]

    for item in pwd_items:
        story.append(Paragraph(f"✓ {item}", styles['FeatureItem']))

    # Data Privacy & GDPR
    story.append(Spacer(1, 5*mm))
    story.append(Paragraph("Data Privacy & GDPR Compliance", styles['SectionHeader']))

    gdpr_table_data = [
        [Paragraph("<b>GDPR Article</b>", styles['TableHeader']),
         Paragraph("<b>Requirement</b>", styles['TableHeader']),
         Paragraph("<b>Implementation</b>", styles['TableHeader'])],
        [Paragraph("Art. 15", styles['TableCell']),
         Paragraph("Right of Access", styles['TableCell']),
         Paragraph("Self-service data export in JSON format", styles['TableCell'])],
        [Paragraph("Art. 17", styles['TableCell']),
         Paragraph("Right to Erasure", styles['TableCell']),
         Paragraph("Account deletion with cascade data removal", styles['TableCell'])],
        [Paragraph("Art. 20", styles['TableCell']),
         Paragraph("Data Portability", styles['TableCell']),
         Paragraph("Structured data export capability", styles['TableCell'])],
        [Paragraph("Art. 25", styles['TableCell']),
         Paragraph("Privacy by Design", styles['TableCell']),
         Paragraph("Minimal data collection, encrypted storage", styles['TableCell'])],
        [Paragraph("Art. 32", styles['TableCell']),
         Paragraph("Security of Processing", styles['TableCell']),
         Paragraph("Encryption, access controls, audit logs", styles['TableCell'])],
    ]

    gdpr_table = Table(gdpr_table_data, colWidths=[30*mm, 45*mm, 95*mm])
    gdpr_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5*mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 3*mm),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(gdpr_table)

    # Technical Architecture
    story.append(Spacer(1, 5*mm))
    story.append(Paragraph("Technical Architecture", styles['SectionHeader']))

    arch_data = [
        [Paragraph("<b>Layer</b>", styles['TableHeader']),
         Paragraph("<b>Technology</b>", styles['TableHeader']),
         Paragraph("<b>Purpose</b>", styles['TableHeader'])],
        [Paragraph("Frontend", styles['TableCell']),
         Paragraph("React 19, TypeScript, Vite", styles['TableCell']),
         Paragraph("Modern SPA with type safety", styles['TableCell'])],
        [Paragraph("Mobile", styles['TableCell']),
         Paragraph("React Native, Expo 52", styles['TableCell']),
         Paragraph("Cross-platform native apps", styles['TableCell'])],
        [Paragraph("API", styles['TableCell']),
         Paragraph("Fastify, Node.js 20+", styles['TableCell']),
         Paragraph("High-performance REST API", styles['TableCell'])],
        [Paragraph("Database", styles['TableCell']),
         Paragraph("PostgreSQL 15+", styles['TableCell']),
         Paragraph("ACID-compliant relational data", styles['TableCell'])],
        [Paragraph("Hosting", styles['TableCell']),
         Paragraph("AWS/Cloudflare", styles['TableCell']),
         Paragraph("Enterprise-grade infrastructure", styles['TableCell'])],
    ]

    arch_table = Table(arch_data, colWidths=[35*mm, 60*mm, 75*mm])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5*mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 3*mm),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
    ]))
    story.append(arch_table)

    # Page break
    story.append(PageBreak())

    # === PAGE 3: OPERATIONS & SUPPORT ===

    story.append(Paragraph("Operational Excellence", styles['SectionHeader']))

    # Monitoring & Logging
    story.append(Paragraph("Monitoring & Observability", styles['SubsectionHeader']))
    monitoring_items = [
        "Structured JSON logging with Pino",
        "Security event tracking for audit compliance",
        "Login attempt monitoring with IP tracking",
        "Real-time alerting for critical events",
        "Comprehensive API documentation (OpenAPI/Swagger)"
    ]
    for item in monitoring_items:
        story.append(Paragraph(f"• {item}", styles['FeatureItem']))

    # Availability
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("High Availability", styles['SubsectionHeader']))
    ha_items = [
        "Multi-region deployment capability",
        "Automatic failover configuration",
        "Database connection pooling",
        "Graceful degradation patterns",
        "Progressive Web App (PWA) with offline support"
    ]
    for item in ha_items:
        story.append(Paragraph(f"• {item}", styles['FeatureItem']))

    # API & Integration
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("API & Integration", styles['SectionHeader']))
    story.append(Paragraph(
        """Remote Days provides a comprehensive REST API with full OpenAPI 3.0 documentation,
        enabling seamless integration with existing HR systems, payroll platforms, and
        enterprise identity providers.""",
        styles['CustomBody']
    ))

    api_features = [
        ("Authentication", "JWT-based with cookie and Bearer token support"),
        ("Documentation", "Interactive Swagger UI at /documentation"),
        ("Versioning", "Semantic versioning with backward compatibility"),
        ("Rate Limiting", "Configurable limits per endpoint"),
        ("Webhooks", "Event-driven notifications (roadmap)"),
    ]

    for title, desc in api_features:
        story.append(Paragraph(f"<b>{title}:</b> {desc}", styles['FeatureItem']))

    # Compliance Reporting
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Compliance Reporting", styles['SectionHeader']))

    report_items = [
        "Real-time compliance dashboard with threshold visualization",
        "Daily, weekly, and monthly summary reports",
        "Individual employee compliance status tracking",
        "Exportable reports in multiple formats",
        "Audit-ready documentation generation",
        "Historical trend analysis"
    ]
    for item in report_items:
        story.append(Paragraph(f"• {item}", styles['FeatureItem']))

    # Implementation Timeline
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Implementation Timeline", styles['SectionHeader']))

    timeline_data = [
        [Paragraph("<b>Phase</b>", styles['TableHeader']),
         Paragraph("<b>Duration</b>", styles['TableHeader']),
         Paragraph("<b>Activities</b>", styles['TableHeader'])],
        [Paragraph("Discovery", styles['TableCell']),
         Paragraph("1 week", styles['TableCell']),
         Paragraph("Requirements gathering, compliance mapping, technical assessment", styles['TableCell'])],
        [Paragraph("Setup", styles['TableCell']),
         Paragraph("1-2 weeks", styles['TableCell']),
         Paragraph("Environment provisioning, SSO integration, initial configuration", styles['TableCell'])],
        [Paragraph("Migration", styles['TableCell']),
         Paragraph("1 week", styles['TableCell']),
         Paragraph("Historical data import, employee onboarding, training", styles['TableCell'])],
        [Paragraph("Go-Live", styles['TableCell']),
         Paragraph("1 week", styles['TableCell']),
         Paragraph("Production deployment, monitoring, support handover", styles['TableCell'])],
    ]

    timeline_table = Table(timeline_data, colWidths=[35*mm, 30*mm, 105*mm])
    timeline_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5*mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 3*mm),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
    ]))
    story.append(timeline_table)

    # Contact section
    story.append(Spacer(1, 8*mm))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY_BLUE, spaceAfter=4*mm))

    contact_style = ParagraphStyle(
        name='Contact',
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        textColor=DARK_NAVY,
        alignment=TA_CENTER
    )

    story.append(Paragraph("<b>Ready to Ensure Compliance?</b>", contact_style))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        "Contact us at <font color='#3B82F6'><b>contact@remotedays.app</b></font> | www.remotedays.app",
        contact_style
    ))

    # Build the document
    doc.build(story, onFirstPage=create_header_footer, onLaterPages=create_header_footer)

    return output_path

if __name__ == '__main__':
    output = build_pdf()
    print(f"✅ PDF generated successfully: {output}")

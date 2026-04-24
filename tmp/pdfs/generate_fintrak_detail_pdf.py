from __future__ import annotations

from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path("/Users/rajivsoren/Documents/React/demo1/tailwind")
OUTPUT_PDF = ROOT / "output/pdf/fintrak-detailed-document.pdf"
LOGO_PATH = ROOT / "public/fintrak-logo.png"

SCREENSHOTS = [
    {
        "title": "Marketing Homepage",
        "path": Path("/Users/rajivsoren/Desktop/Screenshot 2026-04-19 at 3.32.46\u202fPM.png"),
        "caption": "The landing experience introduces FinTrak's value proposition, trust cues, primary navigation, and a dashboard preview that gives visitors quick context before signup.",
    },
    {
        "title": "Account Access",
        "path": Path("/Users/rajivsoren/Desktop/Screenshot 2026-04-19 at 3.32.56\u202fPM.png"),
        "caption": "The authentication screen supports FinTrak account login, account creation, and Google-based onboarding from a single focused interface.",
    },
    {
        "title": "Passcode Unlock",
        "path": Path("/Users/rajivsoren/Desktop/Screenshot 2026-04-19 at 3.33.19\u202fPM.png"),
        "caption": "A dedicated unlock screen adds a lightweight second layer of protection for returning sessions with a 6 digit passcode flow.",
    },
    {
        "title": "Dashboard Overview",
        "path": Path("/Users/rajivsoren/Desktop/Screenshot 2026-04-19 at 3.35.59\u202fPM.png"),
        "caption": "The main dashboard summarizes expenses, income, and budget position while surfacing bank-level transaction concentration and date-based filtering.",
    },
    {
        "title": "Insights And Transactions",
        "path": Path("/Users/rajivsoren/Desktop/Screenshot 2026-04-19 at 3.36.07\u202fPM.png"),
        "caption": "Analytics charts and the detailed transaction table work together so users can move from high-level trends to line-by-line review without leaving the workspace.",
    },
]


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="CoverEyebrow",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12,
            textColor=colors.HexColor("#345CFF"),
            alignment=TA_LEFT,
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CoverTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=27,
            leading=31,
            textColor=colors.HexColor("#13203B"),
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Lead",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=12.5,
            leading=18,
            textColor=colors.HexColor("#48556A"),
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionTitle",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#13203B"),
            spaceBefore=8,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#48556A"),
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CardTitle",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=colors.HexColor("#13203B"),
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CardBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor("#5E6D83"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="CaptionTitle",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#13203B"),
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CaptionBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor("#5E6D83"),
            alignment=TA_LEFT,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Footer",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=10,
            textColor=colors.HexColor("#77859B"),
            alignment=TA_CENTER,
        )
    )
    return styles


def section_rule():
    return HRFlowable(
        width="100%",
        thickness=0.8,
        color=colors.HexColor("#D7E3F6"),
        spaceBefore=6,
        spaceAfter=14,
        lineCap="round",
    )


def fit_image(path: Path, max_width: float, max_height: float):
    image = Image(str(path))
    width = float(image.imageWidth)
    height = float(image.imageHeight)
    scale = min(max_width / width, max_height / height)
    image.drawWidth = width * scale
    image.drawHeight = height * scale
    return image


def feature_table(styles):
    features = [
        ("Gmail transaction sync", "Reads transaction emails through Gmail read-only access and turns them into structured expense and income records."),
        ("FinTrak account system", "Supports signup, login, password reset, session handling, and optional Google connection inside a unified flow."),
        ("Passcode protection", "Adds a quick unlock screen for privacy when users revisit the product on the same device."),
        ("Finance dashboard", "Shows totals, bank distribution, budget remaining, trend charts, category breakdowns, and transaction lists."),
        ("Editable review tools", "Lets users inspect entries and refine category assignments inside the transaction workspace."),
        ("Admin and feedback", "Includes testimonial collection and admin approval flows for controlled public publishing."),
    ]

    rows = []
    for title, body in features:
        rows.append(
            [
                Paragraph(title, styles["CardTitle"]),
                Paragraph(body, styles["CardBody"]),
            ]
        )

    table = Table(rows, colWidths=[1.8 * inch, 4.8 * inch], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#D7E3F6")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E6EEF9")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    return table


def screenshot_block(item, styles):
    image = fit_image(item["path"], max_width=7.0 * inch, max_height=4.75 * inch)
    caption_table = Table(
        [
            [
                Paragraph(item["title"], styles["CaptionTitle"]),
                Paragraph(item["caption"], styles["CaptionBody"]),
            ]
        ],
        colWidths=[1.8 * inch, 5.0 * inch],
    )
    caption_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F6F9FF")),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#D7E3F6")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )

    return KeepTogether(
        [
            image,
            Spacer(1, 10),
            caption_table,
        ]
    )


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, doc.pagesize[0], doc.pagesize[1], fill=1, stroke=0)
    page_label = f"FinTrak Product Document | Page {doc.page}"
    canvas.setFont("Helvetica", 8.5)
    canvas.setFillColor(colors.HexColor("#77859B"))
    canvas.drawRightString(doc.pagesize[0] - doc.rightMargin, 0.45 * inch, page_label)
    canvas.restoreState()


def build_story():
    styles = build_styles()
    story = []

    if LOGO_PATH.exists():
        logo = fit_image(LOGO_PATH, max_width=0.8 * inch, max_height=0.8 * inch)
        story.extend([logo, Spacer(1, 10)])

    story.append(Paragraph("FINTRAK PRODUCT DOCUMENT", styles["CoverEyebrow"]))
    story.append(Paragraph("Detailed FinTrak Overview With Interface Screenshots", styles["CoverTitle"]))
    story.append(
        Paragraph(
            "This PDF captures FinTrak's product positioning, user flow, security touchpoints, and dashboard experience using the supplied screenshots from April 19, 2026.",
            styles["Lead"],
        )
    )
    story.append(
        Paragraph(
            f"Prepared on {date.today().strftime('%B %d, %Y')} for project sharing, demos, and internal product documentation.",
            styles["SectionBody"],
        )
    )
    story.append(Spacer(1, 14))

    overview_data = [
        [
            Paragraph("Product focus", styles["CardTitle"]),
            Paragraph("Expense tracking and personal finance visibility from Gmail transaction emails.", styles["CardBody"]),
        ],
        [
            Paragraph("Primary outcome", styles["CardTitle"]),
            Paragraph("Help users understand spending, budgets, bank activity, and category trends in one place.", styles["CardBody"]),
        ],
        [
            Paragraph("Core promise", styles["CardTitle"]),
            Paragraph("Track every rupee with a clean, modern workflow that reduces manual bookkeeping.", styles["CardBody"]),
        ],
    ]
    overview_table = Table(overview_data, colWidths=[1.7 * inch, 5.0 * inch])
    overview_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F6F9FF")),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#D7E3F6")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E6EEF9")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(overview_table)
    story.append(Spacer(1, 18))

    story.append(Paragraph("Product Summary", styles["SectionTitle"]))
    story.append(section_rule())
    story.append(
        Paragraph(
            "FinTrak is a web application designed to convert everyday transaction messages into a readable financial dashboard. Instead of manually entering expenses, users connect their account, authorize Gmail access, and review categorized records through a streamlined interface. The product balances clarity, security, and day-to-day practicality.",
            styles["SectionBody"],
        )
    )
    story.append(feature_table(styles))
    story.append(PageBreak())

    story.append(Paragraph("User Journey And Screens", styles["SectionTitle"]))
    story.append(section_rule())
    story.append(
        Paragraph(
            "The first part of the experience focuses on trust and activation: the homepage explains the product quickly, the authentication screen consolidates account actions, and the passcode lock adds privacy for repeat usage.",
            styles["SectionBody"],
        )
    )
    story.append(screenshot_block(SCREENSHOTS[0], styles))
    story.append(Spacer(1, 18))
    story.append(screenshot_block(SCREENSHOTS[1], styles))
    story.append(PageBreak())

    story.append(Paragraph("Security And Access Flow", styles["SectionTitle"]))
    story.append(section_rule())
    story.append(
        Paragraph(
            "FinTrak communicates a privacy-first model throughout the interface. The app emphasizes Gmail read-only access, account-based authentication, and a separate passcode step that helps protect previously authenticated sessions on shared or unattended devices.",
            styles["SectionBody"],
        )
    )
    security_points = [
        "Read-only Gmail access reduces perceived risk during onboarding.",
        "Dedicated account login and password reset flows support recoverability.",
        "Passcode unlock adds a fast secondary gate before exposing financial data.",
        "Support links remain visible at critical steps to improve user confidence.",
    ]
    for point in security_points:
        story.append(Paragraph(f"• {point}", styles["SectionBody"]))
    story.append(Spacer(1, 8))
    story.append(screenshot_block(SCREENSHOTS[2], styles))
    story.append(PageBreak())

    story.append(Paragraph("Dashboard And Financial Insights", styles["SectionTitle"]))
    story.append(section_rule())
    story.append(
        Paragraph(
            "Once inside the product, the dashboard moves from summary to drill-down. Users can inspect total expenses, total income, budget remaining, bank concentration, time-based cash flow, category distribution, and the detailed transaction list in a single continuous workspace.",
            styles["SectionBody"],
        )
    )
    insight_rows = [
        [
            Paragraph("Top summary cards", styles["CardTitle"]),
            Paragraph("Present total expenses, income, and budget remaining at a glance for the active date filter.", styles["CardBody"]),
        ],
        [
            Paragraph("Bank overview", styles["CardTitle"]),
            Paragraph("Shows where transaction flow is concentrated and separates debit versus credit values by bank.", styles["CardBody"]),
        ],
        [
            Paragraph("Cash flow chart", styles["CardTitle"]),
            Paragraph("Visualizes income and expense movement over time to help users spot spikes and irregular periods.", styles["CardBody"]),
        ],
        [
            Paragraph("Category chart", styles["CardTitle"]),
            Paragraph("Highlights which spending categories dominate the current view and supports quick interpretation.", styles["CardBody"]),
        ],
        [
            Paragraph("Transaction review", styles["CardTitle"]),
            Paragraph("Displays individual records for auditability and category correction inside the same screen.", styles["CardBody"]),
        ],
    ]
    insight_table = Table(insight_rows, colWidths=[1.8 * inch, 4.8 * inch], hAlign="LEFT")
    insight_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#D7E3F6")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E6EEF9")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(insight_table)
    story.append(Spacer(1, 14))
    story.append(screenshot_block(SCREENSHOTS[3], styles))
    story.append(PageBreak())

    story.append(Paragraph("Analytics Detail And Transaction Review", styles["SectionTitle"]))
    story.append(section_rule())
    story.append(
        Paragraph(
            "The final screenshot focuses on analytical depth. It shows how FinTrak supports both quick interpretation through charts and exact verification through the transaction table. This combination is especially helpful for budgeting, spending analysis, and bank statement cross-checking.",
            styles["SectionBody"],
        )
    )
    story.append(screenshot_block(SCREENSHOTS[4], styles))
    story.append(Spacer(1, 16))
    story.append(
        Paragraph(
            "In practical use, this makes FinTrak suitable for users who want a clean daily dashboard without sacrificing the ability to inspect individual entries when something looks unusual.",
            styles["SectionBody"],
        )
    )
    story.append(Spacer(1, 20))
    story.append(Paragraph("End Of Document", styles["Footer"]))

    return story


def main():
    OUTPUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT_PDF),
        pagesize=A4,
        rightMargin=0.65 * inch,
        leftMargin=0.65 * inch,
        topMargin=0.7 * inch,
        bottomMargin=0.7 * inch,
        title="FinTrak Detailed Document",
        author="OpenAI Codex",
    )
    doc.build(build_story(), onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"Created {OUTPUT_PDF}")


if __name__ == "__main__":
    main()

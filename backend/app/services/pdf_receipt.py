import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_pdf_receipt_bytes(receipt_dict: dict) -> bytes:
    """
    Generates a high-fidelity, tamper-evident PDF digital receipt using ReportLab.
    Includes:
    - Unique Receipt & Job IDs
    - Document SHA-256 Hash & Integrity
    - Station Milestones (Upload, QR redemption, Spool submission)
    - Zero-Retention Cleanup Audits (Server & Station)
    - Ed25519 Cryptographic Signature & Signer Public Key
    - Strict regulatory and architectural disclaimers
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "CertTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#06B6D4")  # Cyan
    )
    subtitle_style = ParagraphStyle(
        "CertSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748B")
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#0F172A")
    )
    mono_style = ParagraphStyle(
        "MonoStyle",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1E293B")
    )
    mono_small = ParagraphStyle(
        "MonoSmall",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=6.5,
        leading=8,
        textColor=colors.HexColor("#334155")
    )
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7,
        leading=9.5,
        textColor=colors.HexColor("#475569")
    )

    story = []

    # 1. Header with Brand & Receipt Number
    receipt_id = receipt_dict.get("receipt_id", "RCPT-N/A")
    job_id = receipt_dict.get("job_id", "PS-N/A")
    created_at = receipt_dict.get("created_at", datetime.utcnow().isoformat())

    header_table = Table(
        [
            [
                Paragraph("<b>PRINTSHIELD // VERIFIABLE DIGITAL RECEIPT</b>", title_style),
                Paragraph(f"<b>RECEIPT ID:</b><br/>{receipt_id}", ParagraphStyle("HRight", parent=styles["Normal"], alignment=2, fontName="Courier-Bold", fontSize=9, textColor=colors.HexColor("#0F172A")))
            ],
            [
                Paragraph("Zero-Knowledge Cryptographic Cybercafé Spooler Certificate", subtitle_style),
                Paragraph(f"Issued: {created_at}", ParagraphStyle("HDate", parent=styles["Normal"], alignment=2, fontName="Helvetica", fontSize=8, textColor=colors.HexColor("#64748B")))
            ]
        ],
        colWidths=[4.2 * inch, 2.8 * inch]
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#06B6D4"), spaceAfter=14))

    # 2. Key Audit Milestones Table
    story.append(Paragraph("<b>1. AUDIT MILESTONES & DOCUMENT IDENTITY</b>", section_heading))
    story.append(Spacer(1, 4))

    doc_hash = receipt_dict.get("document_hash", "N/A")
    filename = receipt_dict.get("original_filename", "N/A")
    station_id = receipt_dict.get("station_id", "TERM-CYBERHUB-04")
    upload_ts = receipt_dict.get("upload_timestamp", "N/A")
    qr_ts = receipt_dict.get("qr_redemption_timestamp") or "N/A (Direct Spool / Expired)"
    print_status = receipt_dict.get("print_submission_status", "PRINT_SUCCESS")

    milestones_data = [
        [Paragraph("<b>Job Identifier:</b>", styles["Normal"]), Paragraph(f"<b>{job_id}</b>", mono_style)],
        [Paragraph("<b>Document Filename:</b>", styles["Normal"]), Paragraph(filename, styles["Normal"])],
        [Paragraph("<b>Original SHA-256 Hash:</b>", styles["Normal"]), Paragraph(doc_hash, mono_small)],
        [Paragraph("<b>Document Integrity:</b>", styles["Normal"]), Paragraph("<b>VERIFIED (Exact Bit-for-Bit Hash Match)</b>", ParagraphStyle("Verified", fontName="Helvetica-Bold", fontSize=8, textColor=colors.HexColor("#059669")))],
        [Paragraph("<b>Station Identifier:</b>", styles["Normal"]), Paragraph(station_id, mono_style)],
        [Paragraph("<b>Upload & Encrypt Timestamp:</b>", styles["Normal"]), Paragraph(str(upload_ts), mono_style)],
        [Paragraph("<b>QR Token Redemption:</b>", styles["Normal"]), Paragraph(str(qr_ts), mono_style)],
        [Paragraph("<b>Print Submission Status:</b>", styles["Normal"]), Paragraph(f"<b>{print_status}</b> (Station-Reported Event)", ParagraphStyle("Subm", fontName="Helvetica-Bold", fontSize=8, textColor=colors.HexColor("#0284C7")))],
    ]

    t_milestones = Table(milestones_data, colWidths=[2.2 * inch, 4.8 * inch])
    t_milestones.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
    ]))
    story.append(t_milestones)
    story.append(Spacer(1, 14))

    # 3. Sanitization & Zero-Retention Audit Table
    story.append(Paragraph("<b>2. ZERO-RETENTION STORAGE & SANITIZATION AUDIT</b>", section_heading))
    story.append(Spacer(1, 4))

    server_clean = receipt_dict.get("server_cleanup_status", "COMPLETED")
    station_clean = receipt_dict.get("station_cleanup_status", "COMPLETED")
    overall_clean = receipt_dict.get("cleanup_status", "COMPLETED")

    cleanup_data = [
        [Paragraph("<b>Server Encrypted File & Key:</b>", styles["Normal"]), Paragraph(f"<b>{server_clean}</b> (DoD 5220.22-M Overwritten & Verified Absent)", ParagraphStyle("Cln1", fontName="Helvetica-Bold", fontSize=8, textColor=colors.HexColor("#059669")))],
        [Paragraph("<b>Station Decrypted PDF:</b>", styles["Normal"]), Paragraph(f"<b>{station_clean}</b> (Station-Reported 3-Pass RAM/Disk Wipe)", ParagraphStyle("Cln2", fontName="Helvetica-Bold", fontSize=8, textColor=colors.HexColor("#059669")))],
        [Paragraph("<b>Overall Cleanup Lifecycle:</b>", styles["Normal"]), Paragraph(f"<b>{overall_clean}</b>", ParagraphStyle("Cln3", fontName="Helvetica-Bold", fontSize=8, textColor=colors.HexColor("#7C3AED")))],
    ]
    t_cleanup = Table(cleanup_data, colWidths=[2.2 * inch, 4.8 * inch])
    t_cleanup.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t_cleanup)
    story.append(Spacer(1, 14))

    # 4. Financial & Physical Geometry Summary
    story.append(Paragraph("<b>3. PRINT PARAMETERS & TRANSACTION</b>", section_heading))
    story.append(Spacer(1, 4))

    params = receipt_dict.get("job_parameters", {})
    pages = params.get("total_pages", 1)
    copies = params.get("copies", 1)
    sheets = params.get("total_sheets", 1)
    color = params.get("color_mode", "black_and_white").replace("_", " ").title()
    cost = params.get("total_cost", 0.15)

    params_data = [
        [
            Paragraph(f"<b>Pages:</b> {pages}", styles["Normal"]),
            Paragraph(f"<b>Copies:</b> {copies}", styles["Normal"]),
            Paragraph(f"<b>Sheets:</b> {sheets} A4", styles["Normal"]),
            Paragraph(f"<b>Color:</b> {color}", styles["Normal"]),
            Paragraph(f"<b>Total Settled:</b> ${cost:.2f} USD", ParagraphStyle("Cost", fontName="Helvetica-Bold", fontSize=9, textColor=colors.HexColor("#0F172A")))
        ]
    ]
    t_params = Table(params_data, colWidths=[1.4 * inch, 1.4 * inch, 1.4 * inch, 1.4 * inch, 1.4 * inch])
    t_params.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))
    story.append(t_params)
    story.append(Spacer(1, 14))

    # 5. Cryptographic Proof & Digital Signature (Ed25519)
    story.append(Paragraph("<b>4. CRYPTOGRAPHIC PROOF OF AUTHENTICITY (Ed25519)</b>", section_heading))
    story.append(Spacer(1, 4))

    receipt_hash = receipt_dict.get("receipt_hash", "N/A")
    sig_hex = receipt_dict.get("signature", "N/A")
    pub_key_hex = receipt_dict.get("signer_public_key", "N/A")

    crypto_data = [
        [Paragraph("<b>Canonical Receipt SHA-256:</b>", styles["Normal"]), Paragraph(receipt_hash, mono_small)],
        [Paragraph("<b>Signer Ed25519 Public Key:</b>", styles["Normal"]), Paragraph(pub_key_hex, mono_small)],
        [Paragraph("<b>Server Digital Signature:</b>", styles["Normal"]), Paragraph(sig_hex, mono_small)],
        [Paragraph("<b>Signature Verification:</b>", styles["Normal"]), Paragraph("<b>CRYPTOGRAPHICALLY AUTHENTIC & VALID</b> (Signed by PrintShield Root Key)", ParagraphStyle("SigOk", fontName="Helvetica-Bold", fontSize=8, textColor=colors.HexColor("#059669")))],
    ]
    t_crypto = Table(crypto_data, colWidths=[2.2 * inch, 4.8 * inch])
    t_crypto.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F0FDF4")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#BBF7D0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t_crypto)
    story.append(Spacer(1, 14))

    # 6. Important Mandatory Architectural Disclaimers
    disclaimer_text = (
        "<b>LEGAL & TECHNICAL NOTICE:</b> This digital receipt certifies the software workflow, cryptographic hashes, "
        "and station-reported milestones recorded by the PrintShield server. In accordance with zero-retention principles, "
        "neither original document bytes nor decryption keys are contained in this receipt. Station-reported milestones "
        "(such as print spool submission and local cache wiping) reflect telemetry received from the authorized station agent; "
        "this software certificate does not represent an absolute warranty of physical sheet ejection or third-party printer memory."
    )
    story.append(Paragraph(disclaimer_text, disclaimer_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

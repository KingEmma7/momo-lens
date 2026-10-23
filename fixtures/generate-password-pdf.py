"""Regenerate the committed synthetic encrypted fixture; requires reportlab.
No real statement or personal data is used. Password: lens-demo.
"""
from pathlib import Path
from reportlab.lib.pdfencrypt import StandardEncryption
from reportlab.pdfgen import canvas

output = Path(__file__).with_name("mtn-password-synthetic.pdf")
encryption = StandardEncryption(
    userPassword="lens-demo", ownerPassword="synthetic-owner", strength=128
)
pdf = canvas.Canvas(str(output), pagesize=(650, 500), encrypt=encryption, invariant=1)
pdf.setTitle("Synthetic MTN statement for password testing")
pdf.setAuthor("MoMo Lens synthetic fixtures")
pdf.setFont("Helvetica", 10)
pdf.drawString(36, 460, "MTN MoMo statement")
columns = (36, 210, 400, 500)
for text, x in zip(("Date & Time", "Payment Type", "Amount", "Transaction ID"), columns):
    pdf.drawString(x, 420, text)
for y, row in ((380, ("01/09/2026 09:00", "DATA BUNDLE", "-10.00", "SYN-LOCK-001")),
               (350, ("02/09/2026 09:00", "AIRTIME", "-5.00", "SYN-LOCK-002"))):
    for text, x in zip(row, columns):
        pdf.drawString(x, y, text)
pdf.drawString(36, 30, "Page 1 of 1")
pdf.save()

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { to, subject, html, attachmentBase64, attachmentName } = req.body;

  if (!to || !subject) {
    return res.status(400).json({ message: 'Missing required fields: to, subject' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || 'datlioncnergy@gmail.com',
        pass: process.env.GMAIL_PASS, // Configured in Vercel env
      },
    });

    const mailOptions = {
      from: `"Datlion Cnergy" <${process.env.GMAIL_USER || 'datlioncnergy@gmail.com'}>`,
      to,
      subject,
      html,
    };

    if (attachmentBase64) {
      // Split "data:application/pdf;filename=generated.pdf;base64,JVBERi..."
      const base64Data = attachmentBase64.split(',')[1] || attachmentBase64;
      mailOptions.attachments = [
        {
          filename: attachmentName || 'document.pdf',
          content: base64Data,
          encoding: 'base64'
        }
      ];
    }

    const info = await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

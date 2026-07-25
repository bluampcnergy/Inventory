import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { account, to, cc, subject, html, attachmentBase64, attachmentName } = req.body || {};

  if (!to || !subject) {
    return res.status(400).json({ message: 'Missing required fields: to, subject' });
  }

  try {
    const smtpHost = account?.smtpHost || process.env.SMTP_HOST || 'mail.blueamp.cnergy.co.in';
    const smtpPort = Number(account?.smtpPort) || Number(process.env.SMTP_PORT) || 465;
    const authUser = account?.username || account?.email || 'sales@blueamp.cnergy.co.in';
    const authPass = account?.password || '';

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // True for port 465 SSL, False for 587 TLS
      auth: { user: authUser, pass: authPass },
      tls: { rejectUnauthorized: false }
    });

    const senderEmail = account?.email || authUser;
    const senderName = account?.senderName || 'Bluamp Webmail Service';

    const mailOptions: any = {
      from: `"${senderName}" <${senderEmail}>`,
      to,
      cc: cc || undefined,
      subject,
      html,
    };

    if (attachmentBase64) {
      const base64Data = attachmentBase64.split(',')[1] || attachmentBase64;
      mailOptions.attachments = [
        {
          filename: attachmentName || 'attachment',
          content: base64Data,
          encoding: 'base64'
        }
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('SMTP Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'SMTP Connection Failed' 
    });
  }
}

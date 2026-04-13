import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { GhlEmailService } from '../integrations/ghl/ghl-email.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  /**
   * Returns the CSS gradient used as the header background across all email templates.
   * Deep charcoal-to-olive gradient that matches the Keanu Residences dark branding.
   */
  private getBackgroundImageUrl(): string {
    // Returns a CSS gradient value (used directly in 'background' property)
    return 'linear-gradient(160deg, #1C1E17 0%, #2E3225 50%, #1A1A1A 100%)';
  }

  /**
   * Build full URL for email header images hosted in the ecommerce app
   */
  private getHeaderImageUrl(imageName: string): string {
    const baseUrl = (process.env.FRONTEND_URL || 'https://connect.keanuresidences.com').replace(/\/+$/, '');
    const safeImageName = encodeURIComponent(imageName);
    return `${baseUrl}/images/email_header/${safeImageName}`;
  }

  /**
   * Generate OTP email HTML template
   */
  private generateOtpEmailHtml(otpCode: string, userName?: string, isPasswordReset: boolean = false): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Keanu Residences – Verify Your Code</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background-color: #f5f0e8;
      font-family: 'Jost', sans-serif;
      font-weight: 300;
      color: #2c2a26;
    }

    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #faf7f2;
    }

    .header {
      background-color: #1a1814;
      padding: 48px 48px 36px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .header::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background:
        radial-gradient(ellipse at 20% 50%, rgba(180,148,90,0.12) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 50%, rgba(180,148,90,0.08) 0%, transparent 60%);
    }

    .header-inner { position: relative; z-index: 1; }

    .logo-line {
      width: 48px;
      height: 1px;
      background: #b4945a;
      display: inline-block;
      vertical-align: middle;
      margin: 0 14px;
    }

    .logo-emblem {
      display: inline-block;
      vertical-align: middle;
      width: 36px;
      height: 36px;
    }

    .brand-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 28px;
      font-weight: 300;
      letter-spacing: 0.22em;
      color: #f0e8d6;
      text-transform: uppercase;
      margin-top: 16px;
      display: block;
    }

    .brand-sub {
      font-family: 'Jost', sans-serif;
      font-size: 10px;
      font-weight: 400;
      letter-spacing: 0.35em;
      color: #b4945a;
      text-transform: uppercase;
      display: block;
      margin-top: 6px;
    }

    .divider {
      height: 3px;
      background: linear-gradient(90deg, transparent, #b4945a 30%, #d4af72 50%, #b4945a 70%, transparent);
    }

    .body {
      padding: 56px 48px;
      background-color: #faf7f2;
    }

    .greeting {
      font-family: 'Cormorant Garamond', serif;
      font-size: 13px;
      font-weight: 400;
      letter-spacing: 0.25em;
      color: #b4945a;
      text-transform: uppercase;
      margin-bottom: 14px;
    }

    .headline {
      font-family: 'Cormorant Garamond', serif;
      font-size: 36px;
      font-weight: 300;
      line-height: 1.2;
      color: #1a1814;
      margin-bottom: 24px;
    }

    .headline em {
      font-style: italic;
      font-weight: 300;
      color: #8a7355;
    }

    .body-text {
      font-size: 15px;
      line-height: 1.8;
      color: #5a5550;
      margin-bottom: 40px;
    }

    .otp-container {
      text-align: center;
      margin: 40px 0;
    }

    .otp-label {
      font-size: 10px;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: #b4945a;
      margin-bottom: 16px;
    }

    .otp-box {
      display: inline-block;
      border: 1px solid #d4c4a0;
      background: #fff;
      padding: 18px 80px;
      position: relative;
      width: 360px;
      text-align: center;
    }

    .otp-box::before,
    .otp-box::after {
      content: '';
      position: absolute;
      width: 12px;
      height: 12px;
      border-color: #b4945a;
      border-style: solid;
    }

    .otp-box::before {
      top: -1px; left: -1px;
      border-width: 2px 0 0 2px;
    }

    .otp-box::after {
      bottom: -1px; right: -1px;
      border-width: 0 2px 2px 0;
    }

    .otp-code {
      font-family: 'Cormorant Garamond', serif;
      font-size: 48px;
      font-weight: 600;
      letter-spacing: 0.22em;
      color: #1a1814;
      line-height: 1;
      font-variant-numeric: tabular-nums;
      -webkit-font-feature-settings: "tnum", "lnum";
      font-feature-settings: "tnum", "lnum";
    }

    .otp-expiry {
      font-size: 12px;
      letter-spacing: 0.12em;
      color: #9a8f80;
      margin-top: 18px;
    }

    .otp-expiry strong {
      color: #b4945a;
      font-weight: 500;
    }

    .notice {
      border-left: 2px solid #b4945a;
      padding: 16px 20px;
      background: rgba(180,148,90,0.06);
      margin: 36px 0;
    }

    .notice p {
      font-size: 13px;
      line-height: 1.7;
      color: #6a6358;
    }

    .notice strong {
      color: #1a1814;
      font-weight: 500;
    }

    .footer {
      background-color: #1a1814;
      padding: 36px 48px;
      text-align: center;
    }

    .footer-divider {
      width: 40px;
      height: 1px;
      background: #b4945a;
      margin: 0 auto 24px;
    }

    .footer-brand {
      font-family: 'Cormorant Garamond', serif;
      font-size: 16px;
      letter-spacing: 0.2em;
      color: #c8b88a;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .footer-text {
      font-size: 11px;
      letter-spacing: 0.1em;
      color: #6a6358;
      line-height: 1.8;
    }

    .footer-text a {
      color: #b4945a;
      text-decoration: none;
    }

    .footer-links {
      margin-top: 16px;
    }

    .footer-links a {
      font-size: 10px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #6a6358;
      text-decoration: none;
      margin: 0 12px;
    }

    
    /* === MOBILE RESPONSIVE INJECTIONS === */
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; } /* DO NOT override max-width or margin: 0 auto! */
      .header, .body, .footer { padding: 30px 20px !important; }
      .headline { font-size: 28px !important; line-height: 1.3 !important; }
      .headline-small { font-size: 22px !important; }
      .otp-box { width: 100% !important; padding: 20px !important; box-sizing: border-box !important; }
      .otp-code { font-size: 36px !important; letter-spacing: 0.15em !important; }
      .detail-box, .action-box, .status-box { padding: 20px !important; }
      .two-col, .two-col-container { display: block !important; width: 100% !important; }
      .col, .col-left, .col-right { display: block !important; width: 100% !important; padding: 0 !important; margin-bottom: 20px !important; }
      .info-grid { display: block !important; }
      .info-item { display: block !important; width: 100% !important; margin-bottom: 15px !important; }
      .button { display: block !important; width: 100% !important; text-align: center !important; }
      .contact-grid { display: block !important; }
      .contact-item { display: block !important; width: 100% !important; margin-bottom: 20px !important; border: none !important; padding: 0 !important; }
      .property-img { height: auto !important; max-width: 100% !important; }
      table.steps { width: 100% !important; }
    }
  </style>
</head>
<body>

<div class="email-wrapper">

  <!-- Header -->
  <div class="header">
    <div class="header-inner">
      
      
      
      <span class="brand-name">Keanu Residences</span>
      <span class="brand-sub">Luxury Private Retreats</span>
    </div>
  </div>

  <div class="divider"></div>

  <!-- Body -->
  <div class="body">

    <p class="greeting">Security Verification</p>

    <h1 class="headline">Your <em>one-time</em><br>access code</h1>

    <p class="body-text">
      Dear Valued Guest,<br><br>
      We received a request to verify your identity for your Keanu Residences account.
      Please use the code below to complete your verification. This code is
      strictly confidential and intended for your use only.
    </p>

    <!-- OTP -->
    <div class="otp-container">
      <p class="otp-label">Your verification code</p>
      <div class="otp-box">
        <div class="otp-code">${otpCode}</div>
      </div>
      <p class="otp-expiry">This code expires in <strong>2 minutes</strong></p>
    </div>

    <div class="notice">
      <p>
        <strong>Did not request this?</strong> If you did not initiate this request,
        please disregard this email and ensure your account password remains secure.
        Contact our concierge team immediately at
        <a href="mailto:security@keanuresidences.com" style="color:#b4945a;">security@keanuresidences.com</a>.
      </p>
    </div>

    <p class="body-text" style="margin-bottom: 0;">
      For any assistance, our dedicated concierge team is available around the clock
      to ensure your experience with Keanu Residences remains seamless and exceptional.
    </p>

  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-divider"></div>
    <p class="footer-brand">Keanu Residences</p>
    <p class="footer-text">
      123 Beachfront Drive, Seminyak, Bali — Indonesia<br>
      <a href="mailto:hello@keanuresidences.com">hello@keanuresidences.com</a> &nbsp;·&nbsp;
      <a href="tel:+62361000000">+62 361 000 000</a>
    </p>
    <div class="footer-links">
      <a href="#">Privacy Policy</a>
      <a href="#">Terms of Service</a>
      <a href="#">Unsubscribe</a>
    </div>
    <p class="footer-text" style="margin-top: 16px; font-size: 10px; color: #4a4540;">
      © 2026 Keanu Residences. All rights reserved.
    </p>
  </div>

</div>

</body>
</html>`;
  }


  constructor(
    @Optional() @Inject(GhlEmailService) private readonly ghlEmailService?: GhlEmailService,
  ) {
    // In development mode, always use MailHog
    // In production, use real SMTP from environment variables
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Check if running in Docker (check for Docker hostname or container name)
    const isDocker = process.env.DOCKER_ENV === 'true' || process.env.HOSTNAME?.includes('container');
    const smtpHost = isDevelopment
      ? (isDocker ? 'mailhog' : 'localhost')  // Use 'mailhog' hostname in Docker, 'localhost' otherwise
      : (process.env.SMTP_HOST || 'localhost');

    const smtpPort = isDevelopment
      ? 1025  // MailHog port
      : parseInt(process.env.SMTP_PORT || '587', 10);

    const smtpUser = isDevelopment
      ? ''  // MailHog doesn't require auth
      : (process.env.SMTP_USER || '');

    const smtpPass = isDevelopment
      ? ''  // MailHog doesn't require auth
      : (process.env.SMTP_PASS || '');

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // true for 465, false for other ports
      auth: smtpUser && smtpPass ? {
        user: smtpUser,
        pass: smtpPass,
      } : undefined,
      tls: {
        rejectUnauthorized: false, // Skip SSL verification for MailHog
      },
      // Add timeout and connection pool settings to prevent delays
      connectionTimeout: 5000, // 5 seconds connection timeout
      greetingTimeout: 5000, // 5 seconds greeting timeout
      socketTimeout: 10000, // 10 seconds socket timeout
      pool: true, // Use connection pooling
      maxConnections: 5, // Maximum number of connections in pool
      maxMessages: 100, // Maximum messages per connection
      rateDelta: 1000, // Rate limit: 1 second
      rateLimit: 5, // Maximum 5 messages per rateDelta
    });

    // Verify connection (only log, don't block startup) with timeout
    const verifyTimeout = setTimeout(() => {
      // this.logger.warn(`⚠️ SMTP connection verification timeout after 3 seconds`);
    }, 3000);

    this.transporter.verify((error, success) => {
      clearTimeout(verifyTimeout);
      if (error) {
        // this.logger.warn(`⚠️ SMTP connection verification failed: ${smtpHost}:${smtpPort}. Email sending may fail.`);
        // this.logger.warn(`Error details: ${error.message}`);
      } else {
        // this.logger.log(`✅ Email service initialized successfully with SMTP: ${smtpHost}:${smtpPort} (${isDevelopment ? 'MailHog' : 'Production SMTP'})`);
      }
    });
  }

  /**
   * Helper method to send email via GHL first, then fallback to MailHog
   */
  private async sendEmailWithFallback(
    to: string,
    subject: string,
    html: string,
    text: string,
    from?: string,
    otpCode?: string,
    userName?: string,
  ): Promise<void> {
    // Try GHL Conversations API first
    if (this.ghlEmailService) {
      const ghlSuccess = await this.ghlEmailService.sendEmail({
        to,
        subject,
        html,
        text,
        from,
      });

      if (ghlSuccess) {
        // this.logger.log(`✅ Email sent via GHL Conversations API to ${to}`);
        return;
      } else {
        // this.logger.warn(`⚠️ GHL Conversations API failed, falling back to MailHog for ${to}`);
      }
    }

    // Fallback to MailHog/nodemailer
    const mailOptions = {
      from: from || process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      to,
      subject,
      html,
      text,
    };

    try {
      // Add timeout wrapper to prevent hanging
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout after 10 seconds')), 10000);
      });

      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      // this.logger.log(`✅ OTP email sent to ${to}. MessageId: ${info.messageId}`);
    } catch (error) {
      // this.logger.error(`❌ Failed to send OTP email to ${to}:`, error);
      // Throw error with clearer message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Email sending failed: ${errorMessage}`);
    }
  }

  /**
   * Generate Welcome email HTML template
   */
  private generateWelcomeEmailHtml(userName?: string): string {
    const greeting = userName ? `Hello ${userName},` : 'Hello,';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Keanu Residences - Welcome</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #f5f0e8; font-family: 'Jost', sans-serif; font-weight: 300; color: #2c2a26; }
    .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #faf7f2; }
    .header { background-color: #1a1814; padding: 48px 48px 36px; text-align: center; position: relative; overflow: hidden; }
    .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(ellipse at 20% 50%, rgba(180,148,90,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(180,148,90,0.08) 0%, transparent 60%); }
    .header-inner { position: relative; z-index: 1; }
    .logo-line { width: 48px; height: 1px; background: #b4945a; display: inline-block; vertical-align: middle; margin: 0 14px; }
    .logo-emblem { display: inline-block; vertical-align: middle; width: 36px; height: 36px; }
    .brand-name { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; letter-spacing: 0.22em; color: #f0e8d6; text-transform: uppercase; margin-top: 16px; display: block; }
    .brand-sub { font-family: 'Jost', sans-serif; font-size: 10px; font-weight: 400; letter-spacing: 0.35em; color: #b4945a; text-transform: uppercase; display: block; margin-top: 6px; }
    .divider { height: 3px; background: linear-gradient(90deg, transparent, #b4945a 30%, #d4af72 50%, #b4945a 70%, transparent); }
    .body { padding: 56px 48px; background-color: #faf7f2; }
    .greeting { font-family: 'Cormorant Garamond', serif; font-size: 13px; font-weight: 400; letter-spacing: 0.25em; color: #b4945a; text-transform: uppercase; margin-bottom: 14px; }
    .headline { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 300; line-height: 1.2; color: #1a1814; margin-bottom: 24px; }
    .headline em { font-style: italic; font-weight: 300; color: #8a7355; }
    .body-text { font-size: 15px; line-height: 1.8; color: #5a5550; margin-bottom: 28px; }
    .notice { border-left: 2px solid #b4945a; padding: 16px 20px; background: rgba(180,148,90,0.06); margin: 24px 0 36px; }
    .notice p { font-size: 13px; line-height: 1.7; color: #6a6358; }
    .notice strong { color: #1a1814; font-weight: 500; }
    .cta-wrap { text-align: center; margin-bottom: 8px; }
    .btn-primary { display: inline-block; min-width: 280px; padding: 16px 28px; background: #1a1814; color: #f0e8d6 !important; text-decoration: none; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; text-align: center; }
    .footer { background-color: #1a1814; padding: 36px 48px; text-align: center; }
    .footer-divider { width: 40px; height: 1px; background: #b4945a; margin: 0 auto 24px; }
    .footer-brand { font-family: 'Cormorant Garamond', serif; font-size: 16px; letter-spacing: 0.2em; color: #c8b88a; text-transform: uppercase; margin-bottom: 12px; }
    .footer-text { font-size: 11px; letter-spacing: 0.08em; color: #6a6358; line-height: 1.8; }
    .footer-text a { color: #b4945a; text-decoration: none; }
    .footer-links { margin-top: 16px; }
    .footer-links a { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #6a6358; text-decoration: none; margin: 0 12px; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; }
      .header, .body, .footer { padding: 30px 20px !important; }
      .headline { font-size: 28px !important; line-height: 1.3 !important; }
      .btn-primary { display: block !important; width: 100% !important; min-width: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <div class="header-inner">
        <span class="logo-line"></span>
        <svg class="logo-emblem" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="18,4 32,28 4,28" fill="none" stroke="#b4945a" stroke-width="1.2"/>
          <circle cx="18" cy="18" r="5" fill="none" stroke="#b4945a" stroke-width="1"/>
          <line x1="18" y1="4" x2="18" y2="13" stroke="#b4945a" stroke-width="0.8"/>
        </svg>
        <span class="logo-line"></span>
        <span class="brand-name">Keanu Residences</span>
        <span class="brand-sub">Luxury Private Retreats</span>
      </div>
    </div>

    <div class="divider"></div>

    <div class="body">
      <p class="greeting">${greeting}</p>
      <h1 class="headline">Welcome <em>Home</em></h1>
      <p class="body-text">
        Your account has been successfully verified. You now have full access to
        Keanu Residences and can continue your journey toward securing your villa.
      </p>
      <p class="body-text">
        Explore available units, save your favorites, and complete your reservation
        with confidence. Our concierge team is ready to assist you at every step.
      </p>

      <div class="notice">
        <p>
          <strong>Next step:</strong> Visit your account dashboard to review listings and
          continue your reservation flow.
        </p>
      </div>

      <div class="cta-wrap">
        <a href="${frontendUrl}/explore" class="btn-primary">Explore Residences</a>
      </div>
    </div>

    <div class="footer">
      <div class="footer-divider"></div>
      <p class="footer-brand">Keanu Residences</p>
      <p class="footer-text">
        Seminyak, Bali - Indonesia<br>
        <a href="mailto:hello@keanuresidences.com">hello@keanuresidences.com</a>
      </p>
      <div class="footer-links">
        <a href="${frontendUrl}/privacy">Privacy Policy</a>
        <a href="${frontendUrl}/terms">Terms of Service</a>
      </div>
      <p class="footer-text" style="margin-top: 16px; font-size: 10px; color: #4a4540;">
        &copy; 2026 Keanu Residences. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  async sendWelcomeEmail(to: string, userName?: string): Promise<void> {
    const html = this.generateWelcomeEmailHtml(userName);
    const text = `
      Hello${userName ? ` ${userName}` : ''},
      
      Welcome to Keanu Residences! We're thrilled to have you join our community. Your account has been successfully created and verified.
      
      You can now log in to your account and start exploring our beautiful villa collection. We're here to help you find your perfect home in paradise.
      
      Best regards,
      The Keanu Residences Team
    `;

    // Try GHL Conversations API first
    if (this.ghlEmailService) {
      const ghlSuccess = await this.ghlEmailService.sendEmail({
        to,
        subject: 'Welcome to Keanu Residences',
        html,
        text,
        from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      });

      if (ghlSuccess) {
        // this.logger.log(`✅ Welcome email sent via GHL Conversations API to ${to}`);
        return;
      } else {
        // this.logger.warn(`⚠️ GHL Conversations API failed, falling back to MailHog for ${to}`);
      }
    }

    // Fallback to MailHog/nodemailer
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      to,
      subject: 'Welcome to Keanu Residences',
      html,
      text,
    };

    try {
      // Add timeout wrapper to prevent hanging
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout after 10 seconds')), 10000);
      });

      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      // this.logger.log(`✅ Welcome email sent to ${to}. MessageId: ${info.messageId}`);
    } catch (error) {
      // this.logger.error(`❌ Failed to send welcome email to ${to}:`, error);
      // Throw error with clearer message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Email sending failed: ${errorMessage}`);
    }
  }

  async sendOtpEmail(to: string, otpCode: string, userName?: string): Promise<void> {
    const html = this.generateOtpEmailHtml(otpCode, userName, false);
    const text = `
      Hello${userName ? ` ${userName}` : ''},
      
      Thank you for registering with Keanu Residences. To complete your registration, please use the following OTP code:
      
      ${otpCode}
      
      The OTP code is valid for 2 minutes.
      Do not share this code with anyone.
      
      Best regards,
      The Keanu Residences Team
    `;

    // Try GHL Conversations API first
    if (this.ghlEmailService) {
      const ghlSuccess = await this.ghlEmailService.sendEmail({
        to,
        subject: 'Keanu Residences - Account Verification OTP Code',
        html,
        text,
        from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      });

      if (ghlSuccess) {
        // this.logger.log(`✅ Email sent via GHL Conversations API to ${to}`);
        return;
      } else {
        // this.logger.warn(`⚠️ GHL Conversations API failed, falling back to MailHog for ${to}`);
      }
    }

    // Fallback to MailHog/nodemailer
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      to,
      subject: 'Keanu Residences - Account Verification OTP Code',
      html,
      text,
    };

    try {
      // Add timeout wrapper to prevent hanging
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout after 10 seconds')), 10000);
      });

      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      // this.logger.log(`✅ OTP email sent to ${to}. MessageId: ${info.messageId}`);
    } catch (error) {
      // this.logger.error(`❌ Failed to send OTP email to ${to}:`, error);
      // Throw error with clearer message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Email sending failed: ${errorMessage}`);
    }
  }

  async sendResetPasswordOtpEmail(to: string, otpCode: string, userName?: string): Promise<void> {
    const html = this.generateOtpEmailHtml(otpCode, userName, true);
    const text = `
      Hello${userName ? ` ${userName}` : ''},
      
      You have requested to reset your password for your Keanu Residences account. Please use the following OTP code to verify:
      
      ${otpCode}
      
      The OTP code is valid for 2 minutes.
      Do not share this code with anyone.
      
      If you did not request a password reset, please ignore this email.
      
      Best regards,
      The Keanu Residences Team
    `;

    // Try GHL Conversations API first
    if (this.ghlEmailService) {
      const ghlSuccess = await this.ghlEmailService.sendEmail({
        to,
        subject: 'Keanu Residences - Password Reset OTP Code',
        html,
        text,
        from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      });

      if (ghlSuccess) {
        // this.logger.log(`✅ Reset password OTP email sent via GHL Conversations API to ${to}`);
        return;
      } else {
        // this.logger.warn(`⚠️ GHL Conversations API failed, falling back to MailHog for ${to}`);
      }
    }

    // Fallback to MailHog/nodemailer
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      to,
      subject: 'Keanu Residences - Password Reset OTP Code',
      html,
      text,
    };

    try {
      // Add timeout wrapper to prevent hanging
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout after 10 seconds')), 10000);
      });

      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      // this.logger.log(`✅ Reset password OTP email sent to ${to}. MessageId: ${info.messageId}`);
    } catch (error) {
      // this.logger.error(`❌ Failed to send reset password OTP email to ${to}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Email sending failed: ${errorMessage}`);
    }
  }

  /**
   * Send SMS OTP via email in development mode (for testing with MailHog)
   */
  async sendSmsOtpTestEmail(
    to: string,
    phoneNumber: string,
    otpCode: string,
    smsMessage: string,
    purpose: 'register' | 'reset-password' = 'register'
  ): Promise<void> {
    const backgroundImageUrl = this.getBackgroundImageUrl();
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Montserrat:wght@400&display=swap" rel="stylesheet">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            padding: 20px;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #faf8f5;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: ${backgroundImageUrl};
            color: white;
            padding: 50px 30px;
            text-align: center;
            position: relative;
          }
          .header-content {
            position: relative;
            z-index: 2;
          }
          .logo {
            width: 60px;
            height: 60px;
            margin: 0 auto 20px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: bold;
            border: 2px solid rgba(255, 255, 255, 0.3);
          }
          .brand-name {
            font-size: 20px;
            font-weight: 300;
            margin: 0 0 2px 0;
            line-height: 20px;
            letter-spacing: 0px;
            font-family: 'Cinzel', 'Times New Roman', 'Georgia', serif;
            text-transform: uppercase;
          }
          .brand-subtitle {
            font-size: 38px;
            font-weight: 300;
            font-style: normal;
            margin: 0 0 2px 0;
            line-height: 28px;
            letter-spacing: 0px;
            font-family: 'Cinzel', 'Times New Roman', 'Georgia', serif;
          }
          .tagline {
            font-size: 12px;
            font-weight: 400;
            margin: 0;
            line-height: 16px;
            letter-spacing: 0px;
            opacity: 1;
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          }
          .content {
            background: #faf8f5;
            padding: 40px 30px;
            color: #333;
          }
          .dev-notice {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 0 0 25px 0;
            border-radius: 5px;
            font-size: 13px;
          }
          .info-section {
            margin-bottom: 20px;
          }
          .info-section p {
            font-size: 15px;
            margin-bottom: 8px;
            color: #555;
          }
          .otp-container {
            margin: 30px 0;
          }
          .otp-code {
            background: #faf8f5;
            border: 2px dashed #5A5E4E;
            padding: 25px 20px;
            text-align: center;
            font-size: 36px;
            font-weight: bold;
            color: #5A5E4E;
            letter-spacing: 8px;
            border-radius: 8px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
          }
          .sms-preview {
            background: #e0f2fe;
            border-left: 4px solid #0284c7;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
            font-family: monospace;
            font-size: 14px;
          }
          .notes {
            margin-top: 30px;
          }
          .notes-title {
            font-weight: bold;
            font-size: 15px;
            margin-bottom: 12px;
            color: #333;
          }
          .notes ul {
            list-style: none;
            padding-left: 0;
          }
          .notes li {
            font-size: 14px;
            margin-bottom: 8px;
            color: #555;
            padding-left: 20px;
            position: relative;
          }
          .notes li::before {
            content: '•';
            position: absolute;
            left: 0;
            color: #5A5E4E;
            font-weight: bold;
            font-size: 18px;
          }
          .footer {
            text-align: center;
            padding: 20px;
            background: #f5f3f0;
            color: #666;
            font-size: 12px;
          }
          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
            }
            .header {
              padding: 40px 20px;
            }
            .brand-name {
              font-size: 18px;
              line-height: 18px;
            }
            .brand-subtitle {
              font-size: 32px;
              line-height: 24px;
            }
            .tagline {
              font-size: 11px;
              line-height: 14px;
            }
            .content {
              padding: 30px 20px;
            }
            .otp-code {
              font-size: 28px;
              letter-spacing: 4px;
              padding: 20px 15px;
            }
          }

    
    /* === MOBILE RESPONSIVE INJECTIONS === */
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; } /* DO NOT override max-width or margin: 0 auto! */
      .header, .body, .footer { padding: 30px 20px !important; }
      .headline { font-size: 28px !important; line-height: 1.3 !important; }
      .headline-small { font-size: 22px !important; }
      .otp-box { width: 100% !important; padding: 20px !important; box-sizing: border-box !important; }
      .otp-code { font-size: 36px !important; letter-spacing: 0.15em !important; }
      .detail-box, .action-box, .status-box { padding: 20px !important; }
      .two-col, .two-col-container { display: block !important; width: 100% !important; }
      .col, .col-left, .col-right { display: block !important; width: 100% !important; padding: 0 !important; margin-bottom: 20px !important; }
      .info-grid { display: block !important; }
      .info-item { display: block !important; width: 100% !important; margin-bottom: 15px !important; }
      .button { display: block !important; width: 100% !important; text-align: center !important; }
      .contact-grid { display: block !important; }
      .contact-item { display: block !important; width: 100% !important; margin-bottom: 20px !important; border: none !important; padding: 0 !important; }
      .property-img { height: auto !important; max-width: 100% !important; }
      table.steps { width: 100% !important; }
    }
  </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <div class="header-content">
              <h1 class="brand-name">KEANU</h1>
              <p class="brand-subtitle">Residences</p>
              <p class="tagline">Keramas, Bali — Sunrise Coast Living</p>
            </div>
          </div>
          <div class="content">
            <div class="dev-notice">
              <strong>⚠️ Development Mode:</strong> This is a test email for SMS. In production, SMS will be sent directly to the phone number.
            </div>
            
            <div class="info-section">
              <p><strong>Phone number receiving SMS:</strong> ${phoneNumber}</p>
              <p><strong>Purpose:</strong> ${purpose === 'reset-password' ? 'Password reset' : 'Account verification'}</p>
            </div>
            
            <div class="otp-container">
              <div class="otp-code">${otpCode}</div>
            </div>
            
            <div class="sms-preview">
              <strong>SMS content to be sent:</strong><br>
              ${smsMessage}
            </div>
            
            <div class="notes">
              <p class="notes-title">Note:</p>
              <ul>
                <li>The OTP code is valid for 2 minutes</li>
                <li>Do not share this code with anyone</li>
                <li>In production, SMS will be sent directly to the phone number</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>© 2025 Keanu Residences. Development Mode - SMS Test</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      to,
      subject: `[SMS Test] OTP for ${phoneNumber} - Keanu Residences`,
      html,
      text: `
        [SMS Test - Development Mode]
        
        Phone number: ${phoneNumber}
        Purpose: ${purpose === 'reset-password' ? 'Password reset' : 'Account verification'}
        
        OTP Code: ${otpCode}
        
        SMS content to be sent:
        ${smsMessage}
        
        Note: This is a test email for SMS. In production, SMS will be sent directly to the phone number.
      `,
    };

    try {
      // Add timeout wrapper to prevent hanging
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout after 10 seconds')), 10000);
      });

      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      // this.logger.log(`✅ SMS OTP test email sent to ${to} (for phone: ${phoneNumber}). MessageId: ${info.messageId}`);
    } catch (error) {
      // this.logger.error(`❌ Failed to send SMS OTP test email:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`SMS test email sending failed: ${errorMessage}`);
    }
  }

  /**
   * Generate Booking Confirmation email HTML template
   */
  private generateBookingConfirmationEmailHtml(
    bookingId: string,
    customerName: string,
    villaName: string,
    address: string,
    reservationDate: string,
    totalAmount: string,
    viewOrderUrl: string,
  ): string {
    const firstName = customerName?.split(' ')[0] || 'Valued Guest';
    const frontendUrl = process.env.FRONTEND_URL || 'https://keanuresidences.com';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Keanu Residences – Reservation Confirmed</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background-color: #f0ece4;
      font-family: 'Jost', sans-serif;
      font-weight: 300;
      color: #2c2a26;
    }

    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
    }

    /* ── Hero Header ── */
    .hero {
      background-color: #1a1814;
      padding: 64px 48px 52px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse at 50% 0%, rgba(180,148,90,0.18) 0%, transparent 65%);
    }

    .hero-inner { position: relative; z-index: 1; }

    .check-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: 1.5px solid #b4945a;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 28px;
      background: rgba(180,148,90,0.08);
    }

    .brand-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 13px;
      font-weight: 400;
      letter-spacing: 0.35em;
      color: #b4945a;
      text-transform: uppercase;
    }

    .hero-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 42px;
      font-weight: 300;
      color: #f0e8d6;
      letter-spacing: 0.04em;
      line-height: 1.15;
      margin-top: 24px;
    }

    .hero-title em {
      font-style: italic;
      color: #c8a86a;
    }

    .hero-sub {
      font-family: 'Jost', sans-serif;
      font-size: 11px;
      letter-spacing: 0.3em;
      color: rgba(180,148,90,0.7);
      text-transform: uppercase;
      margin-top: 14px;
    }

    /* ── Gold divider ── */
    .divider {
      height: 3px;
      background: linear-gradient(90deg, transparent, #b4945a 30%, #d4af72 50%, #b4945a 70%, transparent);
    }

    /* ── White Info Band ── */
    .info-band {
      background: #ffffff;
      border-bottom: 1px solid #ede8de;
      padding: 0;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .info-table td {
      width: 33.333%;
      text-align: center;
      vertical-align: middle;
      padding: 32px 16px;
    }

    .info-table td + td {
      border-left: 1px solid #e8e0d0;
    }

    .info-item-label {
      font-size: 9px;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: #b4945a;
      margin-bottom: 6px;
    }

    .info-item-value {
      font-family: 'Cormorant Garamond', serif;
      font-size: 18px;
      font-weight: 400;
      color: #1a1814;
      letter-spacing: 0.04em;
    }

    /* ── Body ── */
    .body {
      padding: 48px 48px 40px;
      background-color: #faf7f2;
    }

    .body-greeting {
      font-family: 'Cormorant Garamond', serif;
      font-size: 22px;
      font-weight: 300;
      color: #1a1814;
      margin-bottom: 16px;
    }

    .body-text {
      font-size: 14px;
      line-height: 1.85;
      color: #5a5550;
      margin-bottom: 36px;
    }

    /* ── Booking ID Box ── */
    .id-container {
      text-align: center;
      margin: 8px 0 40px;
    }

    .id-label {
      font-size: 10px;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: #9a8f80;
      margin-bottom: 12px;
    }

    .id-box {
      display: inline-block;
      border: 1px solid #d4c4a0;
      background: #fff;
      padding: 16px 56px;
      position: relative;
    }

    .id-box::before, .id-box::after {
      content: '';
      position: absolute;
      width: 10px; height: 10px;
      border-color: #b4945a;
      border-style: solid;
    }

    .id-box::before { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
    .id-box::after  { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }

    .id-code {
      font-family: 'Jost', sans-serif;
      font-size: 20px;
      font-weight: 500;
      letter-spacing: 0.2em;
      color: #1a1814;
    }

    /* ── Details Table ── */
    .section-label {
      font-size: 10px;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: #b4945a;
      margin-bottom: 16px;
    }

    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
    }

    .details-table tr {
      border-bottom: 1px solid #ede8de;
    }

    .details-table tr:last-child {
      border-bottom: none;
    }

    .details-table td {
      padding: 13px 0;
      font-size: 13px;
    }

    .details-table td.lbl {
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #9a8f80;
      width: 42%;
    }

    .details-table td.val {
      color: #1a1814;
      text-align: right;
      font-weight: 400;
    }

    .details-table tr.total-row td {
      padding-top: 20px;
      padding-bottom: 4px;
    }

    .details-table tr.total-row td.lbl {
      color: #b4945a;
      font-size: 11px;
    }

    .details-table tr.total-row td.val {
      font-family: 'Cormorant Garamond', serif;
      font-size: 28px;
      font-weight: 600;
      color: #1a1814;
      letter-spacing: 0.02em;
    }

    /* ── Notice ── */
    .notice {
      border-left: 2px solid #b4945a;
      padding: 16px 20px;
      background: rgba(180,148,90,0.06);
      margin-bottom: 36px;
    }

    .notice p {
      font-size: 13px;
      line-height: 1.75;
      color: #6a6358;
    }

    .notice strong { color: #1a1814; font-weight: 500; }

    /* ── CTA ── */
    .cta-wrap { margin-bottom: 40px; }

    .btn-primary {
      display: block;
      width: 100%;
      padding: 16px 0;
      background-color: #1a1814;
      color: #f0e8d6 !important;
      font-family: 'Jost', sans-serif;
      font-size: 11px;
      font-weight: 400;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      text-decoration: none;
      text-align: center;
    }

    .btn-secondary {
      display: block;
      width: 100%;
      padding: 15px 0;
      background-color: transparent;
      color: #1a1814 !important;
      font-family: 'Jost', sans-serif;
      font-size: 11px;
      font-weight: 400;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      text-decoration: none;
      text-align: center;
      border: 1px solid #d4c4a0;
    }

    /* ── Footer ── */
    .footer {
      background-color: #1a1814;
      padding: 36px 48px;
      text-align: center;
    }

    .footer-divider {
      width: 40px; height: 1px;
      background: #b4945a;
      margin: 0 auto 24px;
    }

    .footer-brand {
      font-family: 'Cormorant Garamond', serif;
      font-size: 16px;
      letter-spacing: 0.2em;
      color: #c8b88a;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .footer-text {
      font-size: 11px;
      letter-spacing: 0.08em;
      color: #6a6358;
      line-height: 1.8;
    }

    .footer-text a { color: #b4945a; text-decoration: none; }

    .footer-links { margin-top: 16px; }

    .footer-links a {
      font-size: 10px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #6a6358;
      text-decoration: none;
      margin: 0 12px;
    }

    
    /* === MOBILE RESPONSIVE INJECTIONS === */
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; } /* DO NOT override max-width or margin: 0 auto! */
      .header, .body, .footer { padding: 30px 20px !important; }
      .headline { font-size: 28px !important; line-height: 1.3 !important; }
      .headline-small { font-size: 22px !important; }
      .otp-box { width: 100% !important; padding: 20px !important; box-sizing: border-box !important; }
      .otp-code { font-size: 36px !important; letter-spacing: 0.15em !important; }
      .detail-box, .action-box, .status-box { padding: 20px !important; }
      .two-col, .two-col-container { display: block !important; width: 100% !important; }
      .col, .col-left, .col-right { display: block !important; width: 100% !important; padding: 0 !important; margin-bottom: 20px !important; }
      .info-grid { display: block !important; }
      .info-item { display: block !important; width: 100% !important; margin-bottom: 15px !important; }
      .button { display: block !important; width: 100% !important; text-align: center !important; }
      .contact-grid { display: block !important; }
      .contact-item { display: block !important; width: 100% !important; margin-bottom: 20px !important; border: none !important; padding: 0 !important; }
      .property-img { height: auto !important; max-width: 100% !important; }
      table.steps { width: 100% !important; }
    }
  </style>
</head>
<body>

<div class="email-wrapper">

  <!-- Hero Header -->
  <div class="hero">
    <div class="hero-inner">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="text-align:center;">
            <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr>
                <td align="center" style="text-align:center;">
                  <span class="brand-name" style="display:inline-block; margin:0 auto; text-align:center; font-family:'Cormorant Garamond',serif; font-size:13px; font-weight:400; letter-spacing:0.32em; color:#b4945a; text-transform:uppercase;">KEANU RESIDENCES</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="text-align:center; padding-top:24px;">
            <h1 class="hero-title" style="margin:0; text-align:center; font-family:'Cormorant Garamond',serif; font-size:42px; font-weight:300; color:#f0e8d6; letter-spacing:0.04em; line-height:1.15;">Reservation <em style="font-style:italic; color:#c8a86a;">Confirmed</em></h1>
          </td>
        </tr>
        <tr>
          <td align="center" style="text-align:center; padding-top:14px;">
            <p class="hero-sub" style="margin:0; text-align:center; font-family:'Jost',sans-serif; font-size:11px; letter-spacing:0.3em; color:rgba(180,148,90,0.7); text-transform:uppercase;">Luxury Private Retreats · Bali</p>
          </td>
        </tr>
      </table>

    </div>
  </div>

  <div class="divider"></div>

  <!-- Quick Info Band -->
  <div class="info-band">
    <table role="presentation" class="info-table" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td>
          <p class="info-item-label">Property</p>
          <p class="info-item-value">${villaName}</p>
        </td>
        <td>
          <p class="info-item-label">Confirmed</p>
          <p class="info-item-value">${reservationDate}</p>
        </td>
        <td>
          <p class="info-item-label">Total Paid</p>
          <p class="info-item-value">${totalAmount}</p>
        </td>
      </tr>
    </table>
  </div>

  <!-- Body -->
  <div class="body">

    <p class="body-greeting">Dear ${firstName},</p>
    <p class="body-text">
      We are delighted to confirm your reservation at Keanu Residences.
      Your private paradise in Bali has been secured. A member of our
      advisory team will reach out within 48 hours to walk you through
      the next steps toward ownership.
    </p>

    <!-- Booking ID -->
    <div class="id-container">
      <p class="id-label">Reservation ID</p>
      <div class="id-box">
        <div class="id-code">${bookingId}</div>
      </div>
    </div>

    <!-- Details -->
    <p class="section-label">Booking Details</p>
    <table class="details-table">
      <tr>
        <td class="lbl">Property</td>
        <td class="val">${villaName}</td>
      </tr>
      <tr>
        <td class="lbl">Location</td>
        <td class="val">${address}</td>
      </tr>
      <tr>
        <td class="lbl">Confirmed Date</td>
        <td class="val">${reservationDate}</td>
      </tr>
      <tr class="total-row">
        <td class="lbl">Total Amount Paid</td>
        <td class="val">${totalAmount}</td>
      </tr>
    </table>

    <!-- Notice -->
    <div class="notice">
      <p>
        <strong>What's next?</strong> Our private advisory team will contact you
        within 48 hours to schedule your onboarding call — covering contracts,
        payment milestones, and arrival arrangements.
      </p>
    </div>

    <!-- CTA -->
    <div class="cta-wrap">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding-bottom:12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:360px;">
              <tr>
                <td align="center" bgcolor="#1a1814" style="background-color:#1a1814;">
                  <a href="${viewOrderUrl}" class="btn-primary" style="display:block; width:100%; padding:16px 0; background-color:#1a1814; color:#f0e8d6 !important; font-family:'Jost',sans-serif; font-size:11px; font-weight:400; letter-spacing:0.28em; text-transform:uppercase; text-decoration:none; text-align:center;">View Reservation Details</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:360px;">
              <tr>
                <td align="center" style="border:1px solid #d4c4a0; background-color:transparent;">
                  <a href="https://wa.me/62361000000" class="btn-secondary" style="display:block; width:100%; padding:15px 0; background-color:transparent; color:#1a1814 !important; font-family:'Jost',sans-serif; font-size:11px; font-weight:400; letter-spacing:0.28em; text-transform:uppercase; text-decoration:none; text-align:center;">Contact Us on WhatsApp</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <p class="body-text" style="margin-bottom: 0;">
      We look forward to welcoming you to Keanu Residences. Our concierge team
      is available around the clock for any questions or assistance.
    </p>

  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-divider"></div>
    <p class="footer-brand">Keanu Residences</p>
    <p class="footer-text">
      123 Beachfront Drive, Seminyak, Bali — Indonesia<br>
      <a href="mailto:hello@keanuresidences.com">hello@keanuresidences.com</a> &nbsp;·&nbsp;
      <a href="tel:+62361000000">+62 361 000 000</a>
    </p>
    <div class="footer-links">
      <a href="${frontendUrl}/privacy">Privacy Policy</a>
      <a href="${frontendUrl}/terms">Terms of Service</a>
      <a href="#">Unsubscribe</a>
    </div>
    <p class="footer-text" style="margin-top: 16px; font-size: 10px; color: #4a4540;">
      © 2026 Keanu Residences. All rights reserved.
    </p>
  </div>

</div>

</body>
</html>`;
  }


  /**
     * Generate Admin Sale Notification email HTML template
     */
  private generateAdminSaleNotificationHtml(
    customerName: string,
    customerEmail: string,
    customerPhone: string,
    villaName: string,
    orderValue: string,
    paymentMethod: string,
    userId: string,
    paymentTransactionId: string,
    reservationId: string,
  ): string {
    const frontendUrl = process.env.FRONTEND_URL || 'https://connect.keanuresidences.com';
    const now = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Keanu Residences – Sales Alert</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #f0ece4; font-family: 'Jost', sans-serif; font-weight: 300; color: #2c2a26; }
    .email-wrapper { max-width: 600px; margin: 0 auto; }

    /* ── Hero ── */
    .hero { background-color: #1a1814; padding: 56px 48px 44px; text-align: center; position: relative; overflow: hidden; }
    .hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 0%, rgba(180,148,90,0.18) 0%, transparent 65%); }
    .hero-inner { position: relative; z-index: 1; }
    .icon-circle { width: 64px; height: 64px; border-radius: 50%; border: 1.5px solid #b4945a; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 28px; background: rgba(180,148,90,0.08); }
    .brand-name { font-family: 'Cormorant Garamond', serif; font-size: 13px; font-weight: 400; letter-spacing: 0.35em; color: #b4945a; text-transform: uppercase; }
    .hero-title { font-family: 'Cormorant Garamond', serif; font-size: 38px; font-weight: 300; color: #f0e8d6; letter-spacing: 0.04em; line-height: 1.15; margin-top: 20px; }
    .hero-title em { font-style: italic; color: #c8a86a; }
    .alert-badge { display: inline-block; margin-top: 14px; background: rgba(180,148,90,0.15); border: 1px solid rgba(180,148,90,0.4); color: #c8a86a; font-size: 10px; font-weight: 500; letter-spacing: 0.25em; text-transform: uppercase; padding: 5px 16px; border-radius: 20px; }

    /* ── Gold divider ── */
    .divider { height: 3px; background: linear-gradient(90deg, transparent, #b4945a 30%, #d4af72 50%, #b4945a 70%, transparent); }

    /* ── Summary Band ── */
    .summary-band { background: #ffffff; border-bottom: 1px solid #ede8de; padding: 0; }
    .summary-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .summary-cell { width: 33.333%; text-align: center; vertical-align: middle; padding: 32px 16px; }
    .summary-cell + .summary-cell { border-left: 1px solid #e8e0d0; }
    .summary-label { font-size: 9px; letter-spacing: 0.28em; text-transform: uppercase; color: #b4945a; margin-bottom: 6px; }
    .summary-value { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 400; color: #1a1814; letter-spacing: 0.04em; }
    .summary-value.highlight { color: #1a1814; font-size: 22px; font-weight: 600; }

    /* ── Body ── */
    .body { padding: 44px 48px 40px; background-color: #faf7f2; }
    .body-intro { font-size: 14px; line-height: 1.85; color: #5a5550; margin-bottom: 32px; }

    /* ── Section label ── */
    .section-label { font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: #b4945a; margin-bottom: 14px; }

    /* ── Details Table ── */
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    .details-table tr { border-bottom: 1px solid #ede8de; }
    .details-table tr:last-child { border-bottom: none; }
    .details-table td { padding: 12px 0; font-size: 13px; }
    .details-table td.lbl { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #9a8f80; width: 42%; }
    .details-table td.val { color: #1a1814; text-align: right; font-weight: 400; }

    /* ── Divider line ── */
    .section-divider { height: 1px; background: #e8e0d0; margin: 32px 0; }

    /* ── Transaction ID Box ── */
    .id-container { text-align: center; margin: 8px 0 32px; }
    .id-label { font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: #9a8f80; margin-bottom: 12px; }
    .id-box { display: inline-block; border: 1px solid #d4c4a0; background: #fff; padding: 14px 48px; position: relative; }
    .id-box::before, .id-box::after { content: ''; position: absolute; width: 10px; height: 10px; border-color: #b4945a; border-style: solid; }
    .id-box::before { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
    .id-box::after { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }
    .id-code { font-family: 'Jost', sans-serif; font-size: 17px; font-weight: 500; letter-spacing: 0.18em; color: #1a1814; }

    /* ── Notice ── */
    .notice { border-left: 2px solid #b4945a; padding: 16px 20px; background: rgba(180,148,90,0.06); margin-bottom: 0; }
    .notice p { font-size: 13px; line-height: 1.75; color: #6a6358; }
    .notice strong { color: #1a1814; font-weight: 500; }

    /* ── Footer ── */
    .footer { background-color: #1a1814; padding: 32px 48px; text-align: center; }
    .footer-divider { width: 40px; height: 1px; background: #b4945a; margin: 0 auto 20px; }
    .footer-brand { font-family: 'Cormorant Garamond', serif; font-size: 15px; letter-spacing: 0.2em; color: #c8b88a; text-transform: uppercase; margin-bottom: 10px; }
    .footer-text { font-size: 11px; letter-spacing: 0.08em; color: #6a6358; line-height: 1.8; }
    .footer-text a { color: #b4945a; text-decoration: none; }

    
    /* === SALES ALERT RESPONSIVE === */
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; }
      .hero, .body, .footer { padding: 30px 20px !important; }
      .hero-title { font-size: 31px !important; line-height: 1.2 !important; margin-top: 16px !important; }
      .alert-badge { font-size: 9px !important; letter-spacing: 0.18em !important; padding: 5px 12px !important; }

      .summary-cell {
        display: block !important;
        width: 100% !important;
        padding: 16px 20px !important;
        border-left: none !important;
        border-top: 1px solid #e8e0d0 !important;
      }
      .summary-table tr:first-child .summary-cell:first-child { border-top: none !important; }
      .summary-value { font-size: 20px !important; }
      .summary-value.highlight { font-size: 22px !important; }

      .body-intro { font-size: 14px !important; line-height: 1.75 !important; }
      .id-box {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        padding: 12px 20px !important;
        box-sizing: border-box !important;
      }
      .id-code { font-size: 14px !important; letter-spacing: 0.08em !important; word-break: break-all !important; }
      .section-divider { margin: 24px 0 !important; }

      .details-table td { padding: 10px 0 !important; font-size: 12px !important; }
      .details-table td.lbl { width: 46% !important; font-size: 9px !important; letter-spacing: 0.12em !important; }
      .details-table td.val { font-size: 12px !important; }

      .notice { padding: 14px 16px !important; }
      .notice p { font-size: 12px !important; line-height: 1.7 !important; }
      .footer-brand { font-size: 14px !important; letter-spacing: 0.16em !important; }
    }
  </style>
</head>
<body>
<div class="email-wrapper">

  <!-- Hero -->
  <div class="hero">
    <div class="hero-inner">
      
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="text-align:center;">
            <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr>
                <td align="center" style="text-align:center;">
                  <span class="brand-name" style="display:inline-block; margin:0 auto; text-align:center; font-family:'Cormorant Garamond',serif; font-size:13px; font-weight:400; letter-spacing:0.32em; color:#b4945a; text-transform:uppercase;">KEANU RESIDENCES</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <h1 class="hero-title">New <em>Sale</em> Alert</h1>
      <div class="alert-badge">Internal Notification</div>
    </div>
  </div>

  <div class="divider"></div>

  <!-- Summary Band -->
  <div class="summary-band">
    <table role="presentation" class="summary-table" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td class="summary-cell">
          <p class="summary-label">Property</p>
          <p class="summary-value">${villaName}</p>
        </td>
        <td class="summary-cell">
          <p class="summary-label">Transaction Value</p>
          <p class="summary-value highlight">${orderValue}</p>
        </td>
        <td class="summary-cell">
          <p class="summary-label">Payment</p>
          <p class="summary-value">${paymentMethod}</p>
        </td>
      </tr>
    </table>
  </div>

  <!-- Body -->
  <div class="body">

    <p class="body-intro">
      A new villa purchase has been initiated. Please review the transaction details
      below and follow up with the client within 48 hours to schedule their onboarding call.
    </p>

    <!-- Order ID Box -->
    <div class="id-container">
      <p class="id-label">Reservation ID</p>
      <div class="id-box">
        <div class="id-code">${reservationId}</div>
      </div>
    </div>

    <!-- Buyer Details -->
    <p class="section-label">Buyer Information</p>
    <table class="details-table">
      <tr>
        <td class="lbl">Full Name</td>
        <td class="val">${customerName}</td>
      </tr>
      <tr>
        <td class="lbl">Email</td>
        <td class="val">${customerEmail}</td>
      </tr>
      <tr>
        <td class="lbl">Phone</td>
        <td class="val">${customerPhone}</td>
      </tr>
      <tr>
        <td class="lbl">Client ID</td>
        <td class="val" style="font-size:11px; color:#9a8f80;">${userId}</td>
      </tr>
    </table>

    <div class="section-divider"></div>

    <!-- Transaction Details -->
    <p class="section-label">Transaction Details</p>
    <table class="details-table">
      <tr>
        <td class="lbl">Property</td>
        <td class="val">${villaName}</td>
      </tr>
      <tr>
        <td class="lbl">Payment Method</td>
        <td class="val">${paymentMethod}</td>
      </tr>
      <tr>
        <td class="lbl">Transaction Ref</td>
        <td class="val" style="font-size:11px; color:#9a8f80;">${paymentTransactionId}</td>
      </tr>
      <tr>
        <td class="lbl">Date & Time</td>
        <td class="val">${now}</td>
      </tr>
      <tr>
        <td class="lbl" style="color:#b4945a; font-size:11px;">Total Value</td>
        <td class="val" style="font-family:'Cormorant Garamond',serif; font-size:26px; font-weight:600;">${orderValue}</td>
      </tr>
    </table>

    <!-- Notice -->
    <div class="notice">
      <p>
        <strong>Action required:</strong> Contact the buyer within 48 hours to schedule
        their onboarding call. If not completed, the reservation will expire and the
        unit will become available again.
      </p>
    </div>

  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-divider"></div>
    <p class="footer-brand">Keanu Residences — Admin</p>
    <p class="footer-text">
      Automated sales notification · Keanu Residences Sales System<br>
      <a href="mailto:admin@keanuresidences.com">admin@keanuresidences.com</a>
    </p>
    <p class="footer-text" style="margin-top: 14px; font-size: 10px; color: #4a4540;">
      © 2026 Keanu Residences. Confidential — Internal Use Only.
    </p>
  </div>

</div>
</body>
</html>`;
  }

  /**
   * Send Admin Booking Notification email
   */
  async sendAdminSaleNotificationEmail(
    customerName: string,
    customerEmail: string,
    customerPhone: string | null,
    villaName: string,
    orderValue: number,
    paymentMethod: string,
    userId: string,
    paymentTransactionId: string | null,
    reservationId: string,
  ): Promise<void> {
    // Lấy email admin từ biến môi trường
    const adminEmail = process.env.ADMIN_EMAIL || 'congthomas123@gmail.com';

    // Định dạng tiền tệ (USD)
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(orderValue);

    // Tạo nội dung HTML (Đã loại bỏ adminDashboardUrl)
    const html = this.generateAdminSaleNotificationHtml(
      customerName,
      customerEmail,
      customerPhone || 'N/A',
      villaName,
      formattedAmount,
      paymentMethod,
      userId,
      paymentTransactionId || 'N/A',
      reservationId,
    );

    // Nội dung Text dự phòng (Đã loại bỏ adminDashboardUrl)
    const text = `
      NEW VILLA PURCHASE NOTIFICATION
      
      A new property acquisition has been initiated.
      
      Purchaser Details:
- Name: ${customerName}
- Email: ${customerEmail}
- Phone: ${customerPhone || 'N/A'}
      
      Transaction Details:
- Property: ${villaName}
- Value: ${formattedAmount}
- Payment Method: ${paymentMethod}
- Transaction ID: ${paymentTransactionId || 'N/A'}
- Order ID: ${reservationId}
- Client ID: ${userId}
      
      This is an automated system notification from Keanu Residences Sales Department.
    `;

    const subject = `[SALES ALERT] New Villa Purchase - ${villaName} - ${customerName} `;

    // 1. Gửi qua GHL Conversations API (nếu có)
    if (this.ghlEmailService) {
      const ghlSuccess = await this.ghlEmailService.sendEmail({
        to: adminEmail,
        subject,
        html,
        text,
        from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      });

      if (ghlSuccess) {
        // this.logger.log(`✅ Admin sales notification sent via GHL to ${ adminEmail } `);
        return;
      }
      // this.logger.warn(`⚠️ GHL failed, falling back to SMTP for ${ adminEmail }`);
    }

    // 2. Gửi qua SMTP (Nodemailer/MailHog)
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      to: adminEmail,
      subject,
      html,
      text,
    };

    try {
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout after 10 seconds')), 10000);
      });

      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      // this.logger.log(`✅ Admin sales notification sent to ${ adminEmail }.MessageId: ${ info.messageId } `);
    } catch (error) {
      // this.logger.error(`❌ Failed to send admin sales notification to ${ adminEmail }: `, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Admin sales email sending failed: ${errorMessage} `);
    }
  }

  /**
   * Send Booking Confirmation email
   */
  async sendBookingConfirmationEmail(
    reservationId: string,
    customerName: string,
    customerEmail: string,
    villaName: string,
    address: string,
    reservationDate: Date,
    totalAmount: number,
    viewOrderUrl?: string,
  ): Promise<void> {
    // Format reservation date
    const formattedDate = reservationDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Format currency
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(totalAmount);

    // Get frontend URL from environment or use default
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const orderDetailsUrl = viewOrderUrl || `${frontendUrl}/reservations`;

    const html = this.generateBookingConfirmationEmailHtml(
      reservationId,
      customerName,
      villaName,
      address,
      formattedDate,
      formattedAmount,
      orderDetailsUrl,
    );

    const text = `
      Hello${customerName ? ` ${customerName}` : ''},
      
      Congratulations! Your booking has been confirmed.
      
      Booking ID: ${reservationId}
      
      Villa Name: ${villaName}
      Address: ${address}
      Reservation Date: ${formattedDate}
      Total Amount: ${formattedAmount}
      
      View your order details: ${orderDetailsUrl}
      
      Best regards,
      The Keanu Residences Team
      
      Contact Us:
      Email: info@keanuresidences.com
      Phone: +62 819-5960-0007
      
      Cancellation Policy: Cancellations made within 48 hours of booking are eligible for a full refund. After this period, cancellation fees may apply. Please contact us for assistance.
      
      © 2025 Keanu Residences. All rights reserved.
    `;

    // Try GHL Conversations API first
    if (this.ghlEmailService) {
      const ghlSuccess = await this.ghlEmailService.sendEmail({
        to: customerEmail,
        subject: 'Your Villa Booking Confirmation - Keanu Residences',
        html,
        text,
        from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      });

      if (ghlSuccess) {
        // this.logger.log(`✅ Booking confirmation email sent via GHL Conversations API to ${customerEmail}`);
        return;
      } else {
        // this.logger.warn(`⚠️ GHL Conversations API failed, falling back to MailHog for ${customerEmail}`);
      }
    }

    // Fallback to MailHog/nodemailer
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      to: customerEmail,
      subject: 'Your Villa Booking Confirmation - Keanu Residences',
      html,
      text,
    };

    try {
      // Add timeout wrapper to prevent hanging
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout after 10 seconds')), 10000);
      });

      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      // this.logger.log(`✅ Booking confirmation email sent to ${customerEmail}. MessageId: ${info.messageId}`);
    } catch (error) {
      // this.logger.error(`❌ Failed to send booking confirmation email to ${customerEmail}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Email sending failed: ${errorMessage}`);
    }
  }

  /**
     * Generate Unit Reserved Alert email HTML template
     */
  private generateUnitReservedAlertEmailHtml(
    userName: string,
    unitNumber: string,
    unitType: string,
    projectName: string,
    projectLocation: string,
    viewUnitsUrl: string,
  ): string {
    const frontendUrl = process.env.FRONTEND_URL || 'https://connect.keanuresidences.com';
    const whatsappUrl = 'https://api.whatsapp.com/send/?phone=%2B6281959600007&text&type=phone_number&app_absent=0';
    const greeting = userName ? `Dear ${userName},` : 'Dear Guest,';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Keanu Residences – Unit Reserved</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #f0ece4; font-family: 'Jost', sans-serif; font-weight: 300; color: #2c2a26; }
    .email-wrapper { max-width: 600px; margin: 0 auto; }

    /* ── Hero ── */
    .hero { background-color: #1a1814; padding: 64px 48px 52px; text-align: center; position: relative; overflow: hidden; }
    .hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 0%, rgba(180,148,90,0.14) 0%, transparent 65%); }
    .hero-inner { position: relative; z-index: 1; }
    .icon-circle { width: 64px; height: 64px; border-radius: 50%; border: 1.5px solid #b4945a; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 28px; background: rgba(180,148,90,0.08); }
    .logo-row { width: 100%; text-align: center; margin: 0 auto 10px; }
    .brand-name { display: inline-block; font-family: 'Cormorant Garamond', serif; font-size: 13px; font-weight: 400; letter-spacing: 0.35em; color: #b4945a; text-transform: uppercase; text-align: center; margin: 0 auto; }
    .hero-title { font-family: 'Cormorant Garamond', serif; font-size: 42px; font-weight: 300; color: #f0e8d6; letter-spacing: 0.04em; line-height: 1.15; margin-top: 24px; text-align: center; }
    .hero-title em { font-style: italic; color: #c8a86a; }
    .hero-sub { font-size: 11px; letter-spacing: 0.3em; color: rgba(180,148,90,0.7); text-transform: uppercase; margin-top: 14px; text-align: center; }

    /* ── Gold divider ── */
    .divider { height: 3px; background: linear-gradient(90deg, transparent, #b4945a 30%, #d4af72 50%, #b4945a 70%, transparent); }

    /* ── Info Band ── */
    .info-band { background: #ffffff; padding: 36px 48px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ede8de; }
    .info-item { text-align: center; flex: 1; }
    .info-item + .info-item { border-left: 1px solid #e8e0d0; }
    .info-item-label { font-size: 9px; letter-spacing: 0.28em; text-transform: uppercase; color: #b4945a; margin-bottom: 6px; }
    .info-item-value { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 400; color: #1a1814; letter-spacing: 0.04em; }

    /* ── Body ── */
    .body { padding: 48px 48px 40px; background-color: #faf7f2; }
    .body-greeting { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 300; color: #1a1814; margin-bottom: 16px; }
    .body-text { font-size: 14px; line-height: 1.85; color: #5a5550; margin-bottom: 36px; }

    /* ── Unit Box ── */
    .unit-container { text-align: center; margin: 8px 0 40px; }
    .unit-label { font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: #9a8f80; margin-bottom: 12px; }
    .unit-box { display: inline-block; border: 1px solid #d4c4a0; background: #fff; padding: 22px 56px; position: relative; width: 360px; text-align: center; }
    .unit-box::before, .unit-box::after { content: ''; position: absolute; width: 10px; height: 10px; border-color: #b4945a; border-style: solid; }
    .unit-box::before { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
    .unit-box::after { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }
    .unit-number { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 400; letter-spacing: 0.08em; color: #1a1814; line-height: 1; }
    .unit-type { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #9a8f80; margin-top: 8px; }

    /* ── Details Table ── */
    .section-label { font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: #b4945a; margin-bottom: 16px; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
    .details-table tr { border-bottom: 1px solid #ede8de; }
    .details-table tr:last-child { border-bottom: none; }
    .details-table td { padding: 13px 0; font-size: 13px; }
    .details-table td.lbl { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #9a8f80; width: 42%; }
    .details-table td.val { color: #1a1814; text-align: right; font-weight: 400; }

    /* ── Notice ── */
    .notice { border-left: 2px solid #b4945a; padding: 16px 20px; background: rgba(180,148,90,0.06); margin-bottom: 36px; }
    .notice p { font-size: 13px; line-height: 1.75; color: #6a6358; }
    .notice strong { color: #1a1814; font-weight: 500; }

    /* ── CTA ── */
    .cta-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 40px; }
    .btn-primary { display: block; width: 100%; max-width: 360px; padding: 16px 0; background-color: #1a1814; color: #f0e8d6; font-family: 'Jost', sans-serif; font-size: 11px; font-weight: 400; letter-spacing: 0.28em; text-transform: uppercase; text-decoration: none; text-align: center; }
    .btn-secondary { display: block; width: 100%; max-width: 360px; padding: 15px 0; background-color: transparent; color: #1a1814; font-family: 'Jost', sans-serif; font-size: 11px; font-weight: 400; letter-spacing: 0.28em; text-transform: uppercase; text-decoration: none; text-align: center; border: 1px solid #d4c4a0; }

    /* ── Footer ── */
    .footer { background-color: #1a1814; padding: 36px 48px; text-align: center; }
    .footer-divider { width: 40px; height: 1px; background: #b4945a; margin: 0 auto 24px; }
    .footer-brand { font-family: 'Cormorant Garamond', serif; font-size: 16px; letter-spacing: 0.2em; color: #c8b88a; text-transform: uppercase; margin-bottom: 12px; }
    .footer-text { font-size: 11px; letter-spacing: 0.08em; color: #6a6358; line-height: 1.8; }
    .footer-text a { color: #b4945a; text-decoration: none; }
    .footer-links { margin-top: 16px; }
    .footer-links a { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #6a6358; text-decoration: none; margin: 0 12px; }

    
    /* === MOBILE RESPONSIVE INJECTIONS === */
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; } /* DO NOT override max-width or margin: 0 auto! */
      .header, .body, .footer { padding: 30px 20px !important; }
      .headline { font-size: 28px !important; line-height: 1.3 !important; }
      .headline-small { font-size: 22px !important; }
      .otp-box { width: 100% !important; padding: 20px !important; box-sizing: border-box !important; }
      .otp-code { font-size: 36px !important; letter-spacing: 0.15em !important; }
      .detail-box, .action-box, .status-box { padding: 20px !important; }
      .two-col, .two-col-container { display: block !important; width: 100% !important; }
      .col, .col-left, .col-right { display: block !important; width: 100% !important; padding: 0 !important; margin-bottom: 20px !important; }
      .info-grid { display: block !important; }
      .info-item { display: block !important; width: 100% !important; margin-bottom: 15px !important; }
      .button { display: block !important; width: 100% !important; text-align: center !important; }
      .contact-grid { display: block !important; }
      .contact-item { display: block !important; width: 100% !important; margin-bottom: 20px !important; border: none !important; padding: 0 !important; }
      .property-img { height: auto !important; max-width: 100% !important; }
      table.steps { width: 100% !important; }
    }
  </style>
</head>
<body>
<div class="email-wrapper">

  <!-- Hero -->
  <div class="hero">
    <div class="hero-inner">
      
      <div class="logo-row" style="width:100%; text-align:center; margin:0 auto 10px;">
        <center style="width:100%; text-align:center;">
          <span class="brand-name" style="display:inline-block; margin:0 auto; text-align:center;">Keanu Residences</span>
        </center>
      </div>
      <h1 class="hero-title">Unit <em>Reserved</em></h1>
      <p class="hero-sub">Luxury Private Retreats · Bali</p>
    </div>
  </div>

  <div class="divider"></div>

  <!-- Info Band -->
  <div class="info-band">
    <div class="info-item">
      <p class="info-item-label">Unit</p>
      <p class="info-item-value">Unit ${unitNumber}</p>
    </div>
    <div class="info-item">
      <p class="info-item-label">Type</p>
      <p class="info-item-value">${unitType}</p>
    </div>
    <div class="info-item">
      <p class="info-item-label">Status</p>
      <p class="info-item-value" style="font-family:'Jost',sans-serif; font-size:13px; letter-spacing:0.12em; color:#a05050;">Reserved</p>
    </div>
  </div>

  <!-- Body -->
  <div class="body">

    <p class="body-greeting">${greeting}</p>
    <p class="body-text">
      We wanted to let you know that <strong>Unit ${unitNumber}</strong> from your shortlist
      has been reserved by another buyer. The unit is no longer available for purchase.
    </p>

    <!-- Unit Box -->
    <div class="unit-container">
      <p class="unit-label">Reserved Unit</p>
      <div class="unit-box">
        <div class="unit-number">Unit ${unitNumber}</div>
        <div class="unit-type">${unitType}</div>
      </div>
    </div>

    <!-- Details -->
    <p class="section-label">Unit Details</p>
    <table class="details-table">
      <tr>
        <td class="lbl">Unit</td>
        <td class="val">Unit ${unitNumber}</td>
      </tr>
      <tr>
        <td class="lbl">Type</td>
        <td class="val">${unitType}</td>
      </tr>
      <tr>
        <td class="lbl">Project</td>
        <td class="val">${projectName}</td>
      </tr>
      <tr>
        <td class="lbl">Location</td>
        <td class="val">${projectLocation}</td>
      </tr>
    </table>

    <!-- Notice -->
    <div class="notice">
      <p>
        <strong>Don't miss out.</strong> Premium units at Keanu Residences move quickly.
        We have other exceptional properties available that may be a perfect match for you —
        explore our current collection and secure your villa today.
      </p>
    </div>

    <!-- CTA -->
    <div class="cta-wrap">
      <a href="${viewUnitsUrl}" class="btn-primary">Explore Available Units</a>
      <a href="${whatsappUrl}" class="btn-secondary">Contact Us on WhatsApp</a>
    </div>

    <p class="body-text" style="margin-bottom: 0;">
      Our concierge team is available around the clock to help you find
      the right villa. We look forward to welcoming you to Keanu Residences.
    </p>

  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-divider"></div>
    <p class="footer-brand">Keanu Residences</p>
    <p class="footer-text">
      Seminyak, Bali — Indonesia<br>
      <a href="mailto:hello@keanuresidences.com">hello@keanuresidences.com</a>
    </p>
    <div class="footer-links">
      <a href="${frontendUrl}/privacy">Privacy Policy</a>
      <a href="${frontendUrl}/terms">Terms of Service</a>
    </div>
    <p class="footer-text" style="margin-top: 16px; font-size: 10px; color: #4a4540;">
      © 2026 Keanu Residences. All rights reserved.
    </p>
  </div>

</div>
</body>
</html>`;
  }

  private generatePaymentReminderEmailHtml(
    customerName: string,
    villaName: string,
    reservationId: string,
    amountDue: string,
    dueDate: string,
    paymentUrl: string,
  ): string {

    const firstName = customerName?.split(' ')[0] || 'Valued Guest';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Keanu Residences – Payment Reminder</title>

<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Jost:wght@300;400;500&display=swap');

*{margin:0;padding:0;box-sizing:border-box;}

body{
  background:#f0ece4;
  font-family:'Jost',sans-serif;
  color:#2c2a26;
}

.email-wrapper{
  max-width:600px;
  margin:0 auto;
}

/* HERO */

.hero{
  background:#1a1814;
  padding:64px 48px 52px;
  text-align:center;
  position:relative;
}

.hero::before{
  content:'';
  position:absolute;
  inset:0;
  background:radial-gradient(ellipse at 50% 0%, rgba(180,148,90,0.18) 0%, transparent 65%);
}

.hero-inner{position:relative;z-index:1;}

.logo-row{
  display:flex;
  align-items:center;
  justify-content:center;
}

.logo-line{
  width:40px;
  height:1px;
  background:#b4945a;
  margin:0 12px;
}

.brand-name{
  font-family:'Cormorant Garamond',serif;
  font-size:13px;
  letter-spacing:.35em;
  color:#b4945a;
  text-transform:uppercase;
}

.hero-title{
  font-family:'Cormorant Garamond',serif;
  font-size:42px;
  font-weight:300;
  color:#f0e8d6;
  margin-top:24px;
}

.hero-title em{
  color:#c8a86a;
  font-style:italic;
}

.hero-sub{
  font-size:11px;
  letter-spacing:.3em;
  color:rgba(180,148,90,0.7);
  margin-top:12px;
  text-transform:uppercase;
}

/* DIVIDER */

.divider{
  height:3px;
  background:linear-gradient(90deg,transparent,#b4945a 30%,#d4af72 50%,#b4945a 70%,transparent);
}

/* BODY */

.body{
  padding:48px;
  background:#faf7f2;
}

.body-greeting{
  font-family:'Cormorant Garamond',serif;
  font-size:22px;
  margin-bottom:16px;
}

.body-text{
  font-size:14px;
  line-height:1.85;
  color:#5a5550;
  margin-bottom:36px;
}

/* PAYMENT BOX */

.payment-box{
  border:1px solid #d4c4a0;
  background:#fff;
  padding:20px;
  margin-bottom:36px;
}

.payment-label{
  font-size:10px;
  letter-spacing:.25em;
  color:#9a8f80;
  text-transform:uppercase;
  margin-bottom:6px;
}

.payment-value{
  font-family:'Cormorant Garamond',serif;
  font-size:30px;
  font-weight:600;
  color:#1a1814;
}

/* TABLE */

.details-table{
  width:100%;
  border-collapse:collapse;
  margin-bottom:36px;
}

.details-table tr{
  border-bottom:1px solid #ede8de;
}

.details-table td{
  padding:12px 0;
  font-size:13px;
}

.details-table td.lbl{
  font-size:10px;
  letter-spacing:.18em;
  text-transform:uppercase;
  color:#9a8f80;
}

.details-table td.val{
  text-align:right;
  color:#1a1814;
}

/* NOTICE */

.notice{
  border-left:2px solid #b4945a;
  padding:16px 20px;
  background:rgba(180,148,90,0.06);
  margin-bottom:36px;
}

.notice p{
  font-size:13px;
  line-height:1.75;
}

/* CTA */

.cta-wrap{
  text-align:center;
}

.btn-primary{
  display:inline-block;
  padding:16px 48px;
  background:#1a1814;
  color:#f0e8d6;
  text-decoration:none;
  font-size:11px;
  letter-spacing:.28em;
  text-transform:uppercase;
}

/* FOOTER */

.footer{
  background:#1a1814;
  padding:36px;
  text-align:center;
}

.footer-divider{
  width:40px;
  height:1px;
  background:#b4945a;
  margin:0 auto 24px;
}

.footer-brand{
  font-family:'Cormorant Garamond',serif;
  font-size:16px;
  letter-spacing:.2em;
  color:#c8b88a;
  text-transform:uppercase;
}

.footer-text{
  font-size:11px;
  color:#6a6358;
  margin-top:8px;
}

    
    /* === MOBILE RESPONSIVE INJECTIONS === */
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; } /* DO NOT override max-width or margin: 0 auto! */
      .header, .body, .footer { padding: 30px 20px !important; }
      .headline { font-size: 28px !important; line-height: 1.3 !important; }
      .headline-small { font-size: 22px !important; }
      .otp-box { width: 100% !important; padding: 20px !important; box-sizing: border-box !important; }
      .otp-code { font-size: 36px !important; letter-spacing: 0.15em !important; }
      .detail-box, .action-box, .status-box { padding: 20px !important; }
      .two-col, .two-col-container { display: block !important; width: 100% !important; }
      .col, .col-left, .col-right { display: block !important; width: 100% !important; padding: 0 !important; margin-bottom: 20px !important; }
      .info-grid { display: block !important; }
      .info-item { display: block !important; width: 100% !important; margin-bottom: 15px !important; }
      .button { display: block !important; width: 100% !important; text-align: center !important; }
      .contact-grid { display: block !important; }
      .contact-item { display: block !important; width: 100% !important; margin-bottom: 20px !important; border: none !important; padding: 0 !important; }
      .property-img { height: auto !important; max-width: 100% !important; }
      table.steps { width: 100% !important; }
    }
  </style>
</head>

<body>

<div class="email-wrapper">

<div class="hero">
<div class="hero-inner">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="center" style="text-align:center;">
<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
<tr>
<td align="center" style="text-align:center;">
<span class="brand-name" style="display:inline-block; margin:0 auto; text-align:center; font-family:'Cormorant Garamond',serif; font-size:13px; letter-spacing:.32em; color:#b4945a; text-transform:uppercase;">KEANU RESIDENCES</span>
</td>
</tr>
</table>
</td>
</tr>
</table>

<h1 class="hero-title">Payment <em>Reminder</em></h1>
<p class="hero-sub">Luxury Private Retreats · Bali</p>

</div>
</div>

<div class="divider"></div>

<div class="body">

<p class="body-greeting">Dear ${firstName},</p>

<p class="body-text">
This is a friendly reminder that a payment related to your reservation
at Keanu Residences is currently due. Please review the details below and
complete your payment before the due date to secure your reservation.
</p>

<div class="payment-box">
<div class="payment-label">Amount Due</div>
<div class="payment-value">${amountDue}</div>
</div>

<table class="details-table">

<tr>
<td class="lbl">Reservation ID</td>
<td class="val">${reservationId}</td>
</tr>

<tr>
<td class="lbl">Property</td>
<td class="val">${villaName}</td>
</tr>

<tr>
<td class="lbl">Due Date</td>
<td class="val">${dueDate}</td>
</tr>

</table>

<div class="notice">
<p>
<strong>Important:</strong> If the payment is not received before the
due date, the reservation may be automatically released and the
property may become available again.
</p>
</div>

<div class="cta-wrap">
<a href="${paymentUrl}" class="btn-primary">
Complete Payment
</a>
</div>

</div>

<div class="footer">

<div class="footer-divider"></div>

<p class="footer-brand">Keanu Residences</p>

<p class="footer-text">
123 Beachfront Drive, Seminyak, Bali — Indonesia
</p>

<p class="footer-text">
hello@keanuresidences.com · +62 361 000 000
</p>

<p class="footer-text" style="margin-top:12px;font-size:10px;">
© 2026 Keanu Residences. All rights reserved.
</p>

</div>

</div>

</body>
</html>`;
  }

  /**
   * Send Unit Reserved Alert email to shortlisted users
   */
  async sendUnitReservedAlertEmail(
    userName: string,
    userEmail: string,
    unitNumber: string,
    unitType: string,
    projectName: string,
    projectLocation: string,
    viewUnitsUrl?: string,
  ): Promise<void> {
    // Get frontend URL from environment or use default
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const unitsUrl = viewUnitsUrl || `${frontendUrl}/explore`;

    const html = this.generateUnitReservedAlertEmailHtml(
      userName,
      unitNumber,
      unitType,
      projectName,
      projectLocation,
      unitsUrl,
    );

    const text = `
      Hello${userName ? ` ${userName}` : ''},
      
      We wanted to inform you that Unit ${unitNumber} from your shortlist has been reserved by another guest.
      
      Unit Details:
      - Unit Number: ${unitNumber}
      - Type: ${unitType}
      - Project: ${projectName}
      - Location: ${projectLocation}
      
      Don't worry! We have many other exceptional units available that might be perfect for you.
      
      View available units: ${unitsUrl}
      
      If you have any questions or would like to schedule a viewing, please don't hesitate to contact us.
      
      Best regards,
      The Keanu Residences Team
      
      Contact Us:
      Email: info@keanuresidences.com
      Phone: +62 819-5960-0007
      
      © 2025 Keanu Residences. All rights reserved.
    `;

    // Try GHL Conversations API first
    if (this.ghlEmailService) {
      const ghlSuccess = await this.ghlEmailService.sendEmail({
        to: userEmail,
        subject: `Unit ${unitNumber} Has Been Reserved - Keanu Residences`,
        html,
        text,
        from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      });

      if (ghlSuccess) {
        // this.logger.log(`✅ Unit reserved alert email sent via GHL Conversations API to ${userEmail}`);
        return;
      } else {
        this.logger.warn(`⚠️ GHL Conversations API failed, falling back to MailHog for ${userEmail}`);
      }
    }

    // Fallback to MailHog/nodemailer
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      to: userEmail,
      subject: `Unit ${unitNumber} Has Been Reserved - Keanu Residences`,
      html,
      text,
    };

    try {
      // Add timeout wrapper to prevent hanging
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout after 10 seconds')), 10000);
      });

      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      // this.logger.log(`✅ Unit reserved alert email sent to ${userEmail}. MessageId: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send unit reserved alert email to ${userEmail}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Email sending failed: ${errorMessage}`);
    }
  }

  /**
   * Send Payment Reminder email
   */
  async sendPaymentReminderEmail(
    customerEmail: string,
    customerName: string,
    unitNumber: string,
    depositAmount: number,
    remainingMinutes: number,
    reservationId: string,
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(depositAmount);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const paymentUrl = `${frontendUrl}/payment/${reservationId}`;

    const expiredTime = new Date(Date.now() + remainingMinutes * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dueDateStr = `In ${remainingMinutes} Minutes (by ${expiredTime})`;

    const html = this.generatePaymentReminderEmailHtml(
      customerName,
      unitNumber,
      reservationId,
      formattedAmount,
      dueDateStr,
      paymentUrl,
    );

    const text = `
      PAYMENT REMINDER - TIME IS RUNNING OUT
      
      Dear ${customerName},
      
      Your reservation for Unit ${unitNumber} is almost secured, but we need you to complete your payment soon!
      
      TIME REMAINING: ${remainingMinutes} MINUTES
      
      Unit Number: ${unitNumber}
      Deposit Amount: ${formattedAmount}
      
      ⚠️ ACTION REQUIRED:
      If payment is not completed within ${remainingMinutes} minutes, your reservation will expire 
      and the unit will become available to other buyers.
      
      Complete your payment now: ${paymentUrl}
      
      Need assistance? Contact our team via WhatsApp
      
      Best regards,
      The Keanu Residences Team
      
      © 2025 Keanu Residences. All rights reserved.
    `;

    const subject = `⏰ Payment Reminder: ${remainingMinutes} Minutes Left - Unit ${unitNumber}`;

    await this.sendEmailWithFallback(
      customerEmail,
      subject,
      html,
      text,
      process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
    );

    // this.logger.log(`✅ Payment reminder email sent to ${customerEmail} for Unit ${unitNumber}`);
  }

  /**
   * Generate Shortlist Deposit Notification email HTML template
   */
  private generateShortlistDepositNotificationEmailHtml(
    userName: string,
    unitNumber: string,
    unitType: string,
    projectName: string,
  ): string {
    this.logger.log(`generateShortlistDepositNotificationEmailHtml triggered for unit ${unitNumber} (${unitType}) in ${projectName} - User: ${userName}`);

    const backgroundImageUrl = this.getBackgroundImageUrl();
    const greeting = userName ? `Dear ${userName},` : 'Dear Valued Client,';
    const primaryColor = '#5A5E4E';
    const darkColor = '#1A1A1A';

    return `
     <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Montserrat:wght@300;400;600&display=swap" rel="stylesheet">
  <style type="text/css">
    /* Reset styles */
    body, table, td, a { text-decoration: none !important; }
    table { border-collapse: collapse; }
    .content-table { width: 100%; max-width: 600px !important; }
    
    @media screen and (max-width: 600px) {
      .mobile-padding { padding: 20px !important; }
      .header-text { font-size: 28px !important; }
    }

    
    /* === MOBILE RESPONSIVE INJECTIONS === */
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; } /* DO NOT override max-width or margin: 0 auto! */
      .header, .body, .footer { padding: 30px 20px !important; }
      .headline { font-size: 28px !important; line-height: 1.3 !important; }
      .headline-small { font-size: 22px !important; }
      .otp-box { width: 100% !important; padding: 20px !important; box-sizing: border-box !important; }
      .otp-code { font-size: 36px !important; letter-spacing: 0.15em !important; }
      .detail-box, .action-box, .status-box { padding: 20px !important; }
      .two-col, .two-col-container { display: block !important; width: 100% !important; }
      .col, .col-left, .col-right { display: block !important; width: 100% !important; padding: 0 !important; margin-bottom: 20px !important; }
      .info-grid { display: block !important; }
      .info-item { display: block !important; width: 100% !important; margin-bottom: 15px !important; }
      .button { display: block !important; width: 100% !important; text-align: center !important; }
      .contact-grid { display: block !important; }
      .contact-item { display: block !important; width: 100% !important; margin-bottom: 20px !important; border: none !important; padding: 0 !important; }
      .property-img { height: auto !important; max-width: 100% !important; }
      table.steps { width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f7f5; font-family: 'Montserrat', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8f7f5;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        <table class="content-table" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 4px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
          
          <tr>
            <td style="background: ${backgroundImageUrl}; height: 280px; text-align: center; position: relative;">
              <div style="background: rgba(90, 94, 78, 0.35); height: 100%; width: 100%;">
                <table role="presentation" width="100%" height="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" vertical-align="middle" style="padding-top: 70px;">
                      <h1 style="color: #ffffff; font-family: 'Cinzel', serif; font-size: 14px; letter-spacing: 5px; margin: 0; text-transform: uppercase;">KEANU</h1>
                      <div style="width: 40px; height: 1px; background: #ffffff; margin: 15px auto;"></div>
                      <p class="header-text" style="color: #ffffff; font-family: 'Cinzel', serif; font-size: 36px; margin: 0 0 10px 0; font-weight: 400;">Unit Alert</p>
                      <p style="color: #ffffff; font-size: 15px; margin: 0; font-weight: 300; letter-spacing: 1px;">A shortlisted unit has been reserved</p>
                    </td>
                  </tr>
                </table>
              </div>
              </td>
          </tr>

          <tr>
            <td class="mobile-padding" style="padding: 50px 40px; background-color: #ffffff;">
              <p style="font-size: 16px; line-height: 24px; color: ${darkColor}; margin: 0 0 20px 0;">${greeting}</p>
              
              <p style="font-size: 15px; line-height: 26px; color: #666; margin: 0 0 25px 0;">
                We wanted to inform you that a unit in your shortlist has just been reserved by another buyer.
              </p>

              <!-- Unit Info Box -->
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
                <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #92400e; margin: 0 0 12px 0; font-weight: 600;">📍 RESERVED UNIT</p>
                <p style="font-size: 22px; font-weight: 700; color: ${darkColor}; margin: 0 0 5px 0;">Unit ${unitNumber}</p>
                <p style="font-size: 14px; color: #666; margin: 0 0 3px 0;">${unitType}</p>
                <p style="font-size: 13px; color: #999; margin: 0;">${projectName}</p>
              </div>

              <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px; padding: 20px; margin-bottom: 30px;">
                <p style="font-size: 14px; color: #7f1d1d; margin: 0; line-height: 22px;">
                  <strong>⚡ Act Fast:</strong> Premium units are selling quickly! 
                  Other units in your shortlist may also be reserved soon. 
                  Review your options and secure your dream villa today.
                </p>
              </div>

              <p style="font-size: 15px; line-height: 26px; color: #666; margin: 0 0 30px 0;">
                Don't miss out on the remaining available units. Visit our platform to explore 
                other exceptional properties that match your preferences.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/explore" style="display: inline-block; background: linear-gradient(135deg, ${primaryColor} 0%, #4A4E3E 100%); color: #ffffff; padding: 18px 45px; text-decoration: none; border-radius: 50px; font-size: 15px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 4px 15px rgba(90, 94, 78, 0.4);">
                      View Available Units →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #999; margin: 0; text-align: center; line-height: 20px;">
                🏡 Secure your piece of paradise before it's too late
              </p>
              
            </td>
          </tr>

          <tr>
            <td style="background-color: #fcfaf8; padding: 30px 40px; text-align: center;">
              <p style="font-family: 'Cinzel', serif; font-size: 17px; color: ${primaryColor}; margin: 0 0 12px 0;">Questions? We're Here to Help</p>
              <p style="font-size: 13px; color: #666; margin: 0 0 20px 0;">Our team is available 24/7 to assist you with your villa selection.</p>
              
              <p style="font-size: 11px; color: #999; margin: 0 0 15px 0;">
                <a href="https://api.whatsapp.com/send/?phone=%2B6281959600007&text&type=phone_number&app_absent=0" style="color: ${primaryColor}; text-decoration: none; font-weight: 600;">WhatsApp: +62 819-5960-0007</a> | 
                <a href="mailto:info@keanuresidences.com" style="color: ${primaryColor}; text-decoration: none; font-weight: 600;">info@keanuresidences.com</a>
              </p>
              
              <div style="border-top: 1px solid #eee; margin-top: 20px; padding-top: 20px;">
                <p style="font-size: 10px; color: #bbb; letter-spacing: 1px; margin: 0;">© 2025 KEANU RESIDENCES. ALL RIGHTS RESERVED.</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Generate Reservation Form Started email HTML template
   */
private generateReservationFormStartedEmailHtml(
    firstName: string,
    unitName: string,
    reservationLink: string,
  ): string {
    const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
    const whatsappUrl = 'https://api.whatsapp.com/send/?phone=%2B6281959600007&text&type=phone_number&app_absent=0';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Keanu Residences – Reservation Started</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #f0ece4; font-family: 'Jost', sans-serif; }
    .body-text { font-size: 14px; line-height: 1.85; color: #5a5550; margin-bottom: 36px; }
    .section-label { font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: #b4945a; margin-bottom: 20px; }
  </style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0ece4">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

  <!-- HERO -->
  <tr>
    <td bgcolor="#1a1814" align="center" style="padding:56px 48px 48px; background-color:#1a1814; background-image:radial-gradient(ellipse at 50% 0%, rgba(180,148,90,0.16) 0%, transparent 65%);">
      <p style="font-family:'Cormorant Garamond',serif; font-size:13px; letter-spacing:0.35em; color:#b4945a; text-transform:uppercase; margin-bottom:8px;">Keanu Residences</p>
      <h1 style="font-family:'Cormorant Garamond',serif; font-size:42px; font-weight:300; color:#f0e8d6; line-height:1.15; margin-top:16px;">
        Reservation <em style="font-style:italic; color:#c8a86a;">In Progress</em>
      </h1>
      <p style="font-family:'Jost',sans-serif; font-size:11px; letter-spacing:0.3em; color:rgba(180,148,90,0.7); text-transform:uppercase; margin-top:14px;">Luxury Private Retreats &middot; Bali</p>
    </td>
  </tr>

  <!-- GOLD DIVIDER -->
  <tr><td height="3" style="height:3px; font-size:0; line-height:0; background:linear-gradient(90deg, transparent, #b4945a 30%, #d4af72 50%, #b4945a 70%, transparent);">&nbsp;</td></tr>

  <!-- INFO BAND -->
  <tr>
    <td bgcolor="#ffffff" style="background-color:#ffffff; border-bottom:1px solid #ede8de;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="33%" align="center" style="padding:32px 16px; border-right:1px solid #e8e0d0;">
            <p style="font-family:'Jost',sans-serif; font-size:9px; letter-spacing:0.28em; text-transform:uppercase; color:#b4945a; margin-bottom:6px;">Property</p>
            <p style="font-family:'Cormorant Garamond',serif; font-size:18px; color:#1a1814;">${unitName}</p>
          </td>
          <td width="33%" align="center" style="padding:32px 16px; border-right:1px solid #e8e0d0;">
            <p style="font-family:'Jost',sans-serif; font-size:9px; letter-spacing:0.28em; text-transform:uppercase; color:#b4945a; margin-bottom:6px;">Hold Expires In</p>
            <p style="font-family:'Jost',sans-serif; font-size:15px; color:#b4945a; letter-spacing:0.06em;">10 Minutes</p>
          </td>
          <td width="33%" align="center" style="padding:32px 16px;">
            <p style="font-family:'Jost',sans-serif; font-size:9px; letter-spacing:0.28em; text-transform:uppercase; color:#b4945a; margin-bottom:6px;">Status</p>
            <p style="font-family:'Jost',sans-serif; font-size:13px; color:#b4945a; letter-spacing:0.12em;">Pending</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- COUNTDOWN -->
  <tr>
    <td bgcolor="#21201c" align="center" style="padding:16px 48px; background-color:#21201c;">
      <p style="font-family:'Jost',sans-serif; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:#7a7060;">
        Unit held for <strong style="color:#d4af72;">10 minutes</strong> &mdash; complete payment before it expires
      </p>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td bgcolor="#faf7f2" style="padding:48px 48px 40px; background-color:#faf7f2;">
      <p style="font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:300; color:#1a1814; margin-bottom:16px;">${greeting}</p>
      <p class="body-text">
        You've started the reservation process for <strong style="color:#1a1814; font-weight:500;">${unitName}</strong>.
        The unit is temporarily held exclusively for you. Please complete your deposit payment within the time window to secure your residence.
      </p>

      <p class="section-label">Your Reservation Steps</p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px; border-top:1px solid #ede8de;">
        <tr>
          <td valign="top" width="44" style="padding:16px 12px 16px 0; border-bottom:1px solid #ede8de;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td align="center" valign="middle" width="28" height="28" bgcolor="#b4945a" style="width:28px; height:28px; border-radius:50%; background-color:#b4945a; text-align:center;">
                <span style="font-family:Arial,sans-serif; font-size:13px; color:#1a1814; font-weight:bold; line-height:28px;">&#10003;</span>
              </td>
            </tr></table>
          </td>
          <td valign="top" style="padding:16px 0; border-bottom:1px solid #ede8de;">
            <p style="font-family:'Jost',sans-serif; font-size:13px; font-weight:500; color:#1a1814; margin-bottom:3px;">Reservation Started</p>
            <p style="font-family:'Jost',sans-serif; font-size:12px; color:#9a8f80; line-height:1.65;">Your unit is on hold. This step is complete.</p>
          </td>
        </tr>
        <tr>
          <td valign="top" width="44" style="padding:16px 12px 16px 0; border-bottom:1px solid #ede8de;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td align="center" valign="middle" width="28" height="28" style="width:28px; height:28px; border-radius:50%; border:1px solid #d4c4a0; text-align:center;">
                <span style="font-family:'Jost',sans-serif; font-size:11px; color:#9a8f80; line-height:28px;">2</span>
              </td>
            </tr></table>
          </td>
          <td valign="top" style="padding:16px 0; border-bottom:1px solid #ede8de;">
            <p style="font-family:'Jost',sans-serif; font-size:13px; font-weight:500; color:#1a1814; margin-bottom:3px;">Complete Payment</p>
            <p style="font-family:'Jost',sans-serif; font-size:12px; color:#9a8f80; line-height:1.65;">Submit your deposit to confirm the reservation before the timer expires.</p>
          </td>
        </tr>
        <tr>
          <td valign="top" width="44" style="padding:16px 12px 16px 0;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td align="center" valign="middle" width="28" height="28" style="width:28px; height:28px; border-radius:50%; border:1px solid #d4c4a0; text-align:center;">
                <span style="font-family:'Jost',sans-serif; font-size:11px; color:#9a8f80; line-height:28px;">3</span>
              </td>
            </tr></table>
          </td>
          <td valign="top" style="padding:16px 0;">
            <p style="font-family:'Jost',sans-serif; font-size:13px; font-weight:300; color:#9a8f80; margin-bottom:3px;">Onboarding Call</p>
            <p style="font-family:'Jost',sans-serif; font-size:12px; color:#9a8f80; line-height:1.65;">Our advisory team will walk you through contracts and next steps.</p>
          </td>
        </tr>
      </table>

      <!-- Notice -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
        <tr>
          <td style="border-left:2px solid #b4945a; padding:16px 20px; background-color:#f7f3ec;">
            <p style="font-family:'Jost',sans-serif; font-size:13px; line-height:1.75; color:#6a6358;">
              <strong style="color:#1a1814; font-weight:500;">Time sensitive:</strong> If payment is not completed within 10 minutes, your hold will be released and the unit will become available to other buyers. Reach out on WhatsApp if you need any assistance.
            </p>
          </td>
        </tr>
      </table>

      <!-- Buttons -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px;">
        <tr>
          <td align="center" style="padding-bottom:12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:360px;">
              <tr>
                <td align="center" bgcolor="#1a1814" style="background-color:#1a1814;">
                  <a href="${reservationLink}" style="display:block; width:100%; padding:16px 0; background-color:#1a1814; color:#f0e8d6 !important; font-family:'Jost',sans-serif; font-size:11px; font-weight:400; letter-spacing:0.28em; text-transform:uppercase; text-decoration:none; text-align:center;">Continue Reservation</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:360px;">
              <tr>
                <td align="center" style="border:1px solid #d4c4a0; background-color:transparent;">
                  <a href="${whatsappUrl}" style="display:block; width:100%; padding:15px 0; background-color:transparent; color:#1a1814 !important; font-family:'Jost',sans-serif; font-size:11px; font-weight:400; letter-spacing:0.28em; text-transform:uppercase; text-decoration:none; text-align:center;">Contact Us on WhatsApp</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p class="body-text" style="margin-bottom:0;">We look forward to welcoming you to Keanu Residences. Our concierge team is available around the clock for any questions or assistance.</p>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td bgcolor="#1a1814" align="center" style="padding:36px 48px; background-color:#1a1814;">
      <table width="40" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:24px;">
        <tr><td height="1" bgcolor="#b4945a" style="height:1px; background-color:#b4945a; font-size:0; line-height:0;">&nbsp;</td></tr>
      </table>
      <p style="font-family:'Cormorant Garamond',serif; font-size:16px; letter-spacing:0.2em; color:#c8b88a; text-transform:uppercase; margin-bottom:12px;">Keanu Residences</p>
      <p style="font-family:'Jost',sans-serif; font-size:11px; color:#6a6358; line-height:1.8;">
        Seminyak, Bali — Indonesia<br>
        <a href="mailto:hello@keanuresidences.com" style="color:#b4945a; text-decoration:none;">hello@keanuresidences.com</a>
      </p>
      <p style="margin-top:16px; font-family:'Jost',sans-serif; font-size:10px; color:#4a4540;">© 2026 Keanu Residences. All rights reserved.</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
  }

  /**
   * Send Shortlist Deposit Notification email
   */
  async sendShortlistDepositNotificationEmail(
    userEmail: string,
    userName: string,
    unitNumber: string,
    unitType: string,
    projectName: string,
  ): Promise<void> {
    const html = this.generateShortlistDepositNotificationEmailHtml(
      userName,
      unitNumber,
      unitType,
      projectName,
    );

    const text = `
      SHORTLIST ALERT - UNIT RESERVED
      
      Dear ${userName},
      
      We wanted to inform you that a unit in your shortlist has just been reserved by another buyer.
      
      RESERVED UNIT DETAILS:
      - Unit Number: ${unitNumber}
      - Type: ${unitType}
      - Project: ${projectName}
      
      ⚡ ACT FAST:
      Premium units are selling quickly! Other units in your shortlist may also be reserved soon.
      Review your options and secure your dream villa today.
      
      Don't miss out on the remaining available units. Visit our platform to explore 
      other exceptional properties that match your preferences.
      
      View Available Units: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/explore
      
      Questions? We're here to help 24/7:
      - WhatsApp: +62 819-5960-0007
      - Email: info@keanuresidences.com
      
      Best regards,
      The Keanu Residences Team
      
      © 2025 Keanu Residences. All rights reserved.
    `;

    const subject = `🏡 Shortlist Alert: Unit ${unitNumber} Has Been Reserved`;

    await this.sendEmailWithFallback(
      userEmail,
      subject,
      html,
      text,
      process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
    );

    // this.logger.log(`✅ Shortlist deposit notification sent to ${userEmail} for Unit ${unitNumber}`);
  }

  /**
   * Send Reservation Form Started email
   */
  async sendReservationFormStartedEmail(
    email: string,
    firstName: string,
    unitName: string,
    reservationLink: string,
  ): Promise<void> {
    const html = this.generateReservationFormStartedEmailHtml(
      firstName,
      unitName,
      reservationLink,
    );

    const text = `
      Your reservation for ${unitName}
      
      Hi ${firstName},
      
      You've started the reservation process for ${unitName}.
      The system now holds the villa temporarily.
      
      There's a limited window - if not completed, the unit automatically becomes visible to all buyers again in around 10 minutes.
      
      You can continue where you left off here:
      ${reservationLink}
      
      If you'd like a consultant to quickly confirm details before completing it, please reach out to us on WhatsApp.
      
      Warm regards,
      Keanu Team
      
      © 2025 Keanu Residences. All rights reserved.
    `;

    const subject = `Your reservation for ${unitName}`;

    // Try GHL Conversations API first
    if (this.ghlEmailService) {
      const ghlSuccess = await this.ghlEmailService.sendEmail({
        to: email,
        subject,
        html,
        text,
        from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      });

      if (ghlSuccess) {
        // this.logger.log(`✅ Reservation form started email sent via GHL Conversations API to ${email}`);
        return;
      } else {
        // this.logger.warn(`⚠️ GHL Conversations API failed, falling back to MailHog for ${email}`);
      }
    }

    // Fallback to MailHog/nodemailer
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      to: email,
      subject,
      html,
      text,
    };

    try {
      // Add timeout wrapper to prevent hanging
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout after 10 seconds')), 10000);
      });

      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      // this.logger.log(`✅ Reservation form started email sent to ${email}. MessageId: ${info.messageId}`);
    } catch (error) {
      // this.logger.error(`❌ Failed to send reservation form started email to ${email}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Email sending failed: ${errorMessage}`);
    }
  }

  /**
   * Generate Deposit Received email HTML template
   */
  private generateDepositReceivedEmailHtml(
    firstName: string,
    unitName: string,
    consultantName: string,
    consultantCalendarLink: string,
  ): string {
    const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
    const consultant = consultantName || 'Keanu Team';
    const frontendUrl = process.env.FRONTEND_URL || 'https://connect.keanuresidences.com';
    const whatsappLink = 'https://api.whatsapp.com/send/?phone=%2B6281959600007&text&type=phone_number&app_absent=0';
    const currentYear = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Keanu Residences – Reservation Confirmed</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #f0ece4; font-family: 'Jost', sans-serif; font-weight: 300; color: #2c2a26; }
    .email-wrapper { max-width: 600px; margin: 0 auto; }

    .hero { background-color: #1a1814; padding: 56px 48px 44px; text-align: center; position: relative; overflow: hidden; }
    .hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 0%, rgba(180,148,90,0.18) 0%, transparent 65%); }
    .hero-inner { position: relative; z-index: 1; }
    .brand-name { font-family: 'Cormorant Garamond', serif; font-size: 13px; font-weight: 400; letter-spacing: 0.35em; color: #b4945a; text-transform: uppercase; }
    .hero-title { font-family: 'Cormorant Garamond', serif; font-size: 44px; font-weight: 300; color: #f0e8d6; letter-spacing: 0.04em; line-height: 1.15; margin-top: 22px; }
    .hero-title em { font-style: italic; color: #c8a86a; }
    .hero-sub { font-size: 11px; letter-spacing: 0.3em; color: rgba(180,148,90,0.7); text-transform: uppercase; margin-top: 14px; }

    .divider { height: 3px; background: linear-gradient(90deg, transparent, #b4945a 30%, #d4af72 50%, #b4945a 70%, transparent); }

    .info-band { background: #ffffff; border-bottom: 1px solid #ede8de; }
    .info-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .info-cell { width: 33.333%; text-align: center; vertical-align: middle; padding: 28px 14px; }
    .info-cell + .info-cell { border-left: 1px solid #e8e0d0; }
    .info-label { font-size: 9px; letter-spacing: 0.28em; text-transform: uppercase; color: #b4945a; margin-bottom: 6px; }
    .info-value { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 500; color: #1a1814; letter-spacing: 0.03em; }

    .body { padding: 44px 48px 40px; background-color: #faf7f2; }
    .body-greeting { font-family: 'Cormorant Garamond', serif; font-size: 34px; line-height: 1.2; color: #1a1814; margin-bottom: 18px; }
    .body-text { font-size: 15px; line-height: 1.85; color: #5a5550; margin-bottom: 30px; }

    .onboarding-box { border-left: 3px solid #b4945a; background: #f2eee7; padding: 24px 24px 16px; margin-bottom: 30px; }
    .onboarding-title { font-size: 15px; font-weight: 500; color: #1a1814; margin-bottom: 12px; line-height: 1.7; }
    .onboarding-list { margin: 0; padding: 0 0 0 20px; color: #66605a; font-size: 14px; line-height: 1.8; }
    .onboarding-list li { margin-bottom: 8px; }

    .cta-wrap { margin: 8px 0 30px; }
    .btn-primary { display: block; width: 100%; padding: 16px 20px; background-color: #1a1814; color: #f0e8d6 !important; text-decoration: none; text-transform: uppercase; letter-spacing: 0.22em; font-size: 11px; font-weight: 500; text-align: center; }

    .deadline { font-size: 14px; line-height: 1.75; color: #6a6358; background: rgba(180,148,90,0.08); border-left: 2px solid #b4945a; padding: 14px 16px; margin-bottom: 30px; }
    .deadline strong { color: #1a1814; font-weight: 500; }

    .support-card { background: #f2eee7; border: 1px solid #e8e0d0; padding: 20px; margin-bottom: 10px; }
    .support-title { font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: #b4945a; margin-bottom: 10px; }
    .support-text { font-size: 14px; line-height: 1.75; color: #5a5550; margin-bottom: 10px; }
    .support-text a { color: #1a1814; text-decoration: none; border-bottom: 1px solid #b4945a; }

    .footer { background-color: #1a1814; padding: 32px 36px; text-align: center; }
    .footer-divider { width: 40px; height: 1px; background: #b4945a; margin: 0 auto 20px; }
    .footer-brand { font-family: 'Cormorant Garamond', serif; font-size: 15px; letter-spacing: 0.2em; color: #c8b88a; text-transform: uppercase; margin-bottom: 10px; }
    .footer-text { font-size: 11px; letter-spacing: 0.08em; color: #6a6358; line-height: 1.8; }
    .footer-text a { color: #b4945a; text-decoration: none; }

    @media only screen and (max-width: 600px) {
      .hero { padding: 42px 22px 34px !important; }
      .hero-title { font-size: 36px !important; line-height: 1.18 !important; margin-top: 16px !important; }
      .hero-sub { letter-spacing: 0.2em !important; font-size: 10px !important; }
      .body { padding: 30px 22px !important; }
      .body-greeting { font-size: 30px !important; }
      .body-text { font-size: 16px !important; line-height: 1.8 !important; }
      .onboarding-box { padding: 20px 18px 14px !important; }
      .onboarding-title { font-size: 16px !important; line-height: 1.7 !important; }
      .onboarding-list { font-size: 15px !important; line-height: 1.8 !important; }
      .info-table, .info-cell { display: block !important; width: 100% !important; }
      .info-cell { padding: 16px 20px !important; border-left: 0 !important; border-bottom: 1px solid #e8e0d0 !important; }
      .info-cell:last-child { border-bottom: 0 !important; }
      .btn-primary { font-size: 12px !important; letter-spacing: 0.18em !important; padding: 18px 16px !important; }
      .footer { padding: 28px 20px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f0ece4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0ece4;">
    <tr>
      <td align="center" style="padding:24px 8px;">
        <table class="email-wrapper" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:600px;">
          <tr>
            <td class="hero" align="center" style="background-color:#1a1814; padding:56px 48px 44px; text-align:center;">
              <div class="hero-inner">
                <p class="brand-name" style="margin:0; text-align:center; font-family:'Cormorant Garamond',serif; font-size:13px; font-weight:400; letter-spacing:0.35em; color:#b4945a; text-transform:uppercase;">Keanu Residences</p>
                <h1 class="hero-title" style="margin:22px 0 0; text-align:center; font-family:'Cormorant Garamond',serif; font-size:44px; font-weight:300; color:#f0e8d6; letter-spacing:0.04em; line-height:1.15;">Reservation <em style="font-style:italic; color:#c8a86a;">Confirmed</em></h1>
                <p class="hero-sub" style="margin:14px 0 0; text-align:center; font-size:11px; letter-spacing:0.3em; color:rgba(180,148,90,0.7); text-transform:uppercase;">Luxury Private Retreats · Bali</p>
              </div>
            </td>
          </tr>

          <tr>
            <td class="divider"></td>
          </tr>

          <tr>
            <td class="info-band" style="background:#ffffff; border-bottom:1px solid #ede8de;">
              <table role="presentation" class="info-table" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="info-cell" style="width:33.333%; text-align:center; vertical-align:middle; padding:28px 14px;">
                    <p class="info-label" style="margin:0 0 6px; font-size:9px; letter-spacing:0.28em; text-transform:uppercase; color:#b4945a;">Residence</p>
                    <p class="info-value" style="margin:0; font-family:'Cormorant Garamond',serif; font-size:20px; font-weight:500; color:#1a1814; letter-spacing:0.03em;">${unitName}</p>
                  </td>
                  <td class="info-cell" style="width:33.333%; text-align:center; vertical-align:middle; padding:28px 14px; border-left:1px solid #e8e0d0;">
                    <p class="info-label" style="margin:0 0 6px; font-size:9px; letter-spacing:0.28em; text-transform:uppercase; color:#b4945a;">Status</p>
                    <p class="info-value" style="margin:0; font-family:'Cormorant Garamond',serif; font-size:20px; font-weight:500; color:#1a1814; letter-spacing:0.03em;">Confirmed</p>
                  </td>
                  <td class="info-cell" style="width:33.333%; text-align:center; vertical-align:middle; padding:28px 14px; border-left:1px solid #e8e0d0;">
                    <p class="info-label" style="margin:0 0 6px; font-size:9px; letter-spacing:0.28em; text-transform:uppercase; color:#b4945a;">Onboarding</p>
                    <p class="info-value" style="margin:0; font-family:'Cormorant Garamond',serif; font-size:20px; font-weight:500; color:#1a1814; letter-spacing:0.03em;">48 Hours</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="body" style="padding:44px 48px 40px; background-color:#faf7f2;">
              <p class="body-greeting" style="margin:0 0 18px; font-family:'Cormorant Garamond',serif; font-size:34px; line-height:1.2; color:#1a1814;">${greeting}</p>
              <p class="body-text" style="margin:0 0 20px; font-size:15px; line-height:1.85; color:#5a5550;">
                Congratulations on your successful reservation. Your selected residence has now been secured and removed from availability.
              </p>
              <p class="body-text" style="margin:0 0 30px; font-size:15px; line-height:1.85; color:#5a5550;">
                The next step is a private onboarding call with our team so we can finalize contracts, timelines, and your transition into ownership.
              </p>

              <div class="onboarding-box" style="border-left:3px solid #b4945a; background:#f2eee7; padding:24px 24px 16px; margin-bottom:30px;">
                <p class="onboarding-title" style="margin:0 0 12px; font-size:15px; font-weight:500; color:#1a1814; line-height:1.7;">During this onboarding call, we will:</p>
                <ul class="onboarding-list" style="margin:0; padding:0 0 0 20px; color:#66605a; font-size:14px; line-height:1.8;">
                  <li style="margin-bottom:8px;">Review your reserved residence details</li>
                  <li style="margin-bottom:8px;">Walk through contracts and payment milestones</li>
                  <li style="margin-bottom:8px;">Confirm timelines and next steps</li>
                  <li style="margin-bottom:8px;">Answer any final practical questions</li>
                </ul>
              </div>

              <div class="cta-wrap" style="margin:8px 0 30px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:360px;">
                        <tr>
                          <td align="center" style="background-color:#1a1814;">
                            <a href="${consultantCalendarLink}" class="btn-primary" style="display:block; width:100%; padding:16px 20px; background-color:#1a1814; color:#f0e8d6 !important; text-decoration:none; text-transform:uppercase; letter-spacing:0.22em; font-size:11px; font-weight:500; text-align:center;">Schedule Onboarding Call</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>

              <p class="deadline" style="margin:0 0 30px; font-size:14px; line-height:1.75; color:#6a6358; background:rgba(180,148,90,0.08); border-left:2px solid #b4945a; padding:14px 16px;">
                <strong style="color:#1a1814; font-weight:500;">Time-sensitive:</strong> Please schedule this call within 48 hours. If it is not arranged in time, your reservation may be released.
              </p>

              <div class="support-card" style="background:#f2eee7; border:1px solid #e8e0d0; padding:20px; margin-bottom:10px;">
                <p class="support-title" style="margin:0 0 10px; font-size:10px; letter-spacing:0.28em; text-transform:uppercase; color:#b4945a;">Support Contact</p>
                <p class="support-text" style="margin:0 0 10px; font-size:14px; line-height:1.75; color:#5a5550;">
                  Your advisor: <strong style="color:#1a1814; font-weight:500;">${consultant}</strong><br/>
                  WhatsApp: <a href="${whatsappLink}" style="color:#1a1814; text-decoration:none; border-bottom:1px solid #b4945a;">Contact Concierge Team</a>
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td class="footer" style="background-color:#1a1814; padding:32px 36px; text-align:center;">
              <div class="footer-divider" style="width:40px; height:1px; background:#b4945a; margin:0 auto 20px;"></div>
              <p class="footer-brand" style="margin:0 0 10px; font-family:'Cormorant Garamond',serif; font-size:15px; letter-spacing:0.2em; color:#c8b88a; text-transform:uppercase;">Keanu Residences</p>
              <p class="footer-text" style="margin:0; font-size:11px; letter-spacing:0.08em; color:#6a6358; line-height:1.8;">
                Seminyak, Bali — Indonesia<br/>
                <a href="mailto:hello@keanuresidences.com" style="color:#b4945a; text-decoration:none;">hello@keanuresidences.com</a><br/>
                <a href="${frontendUrl}/privacy" style="color:#b4945a; text-decoration:none;">Privacy Policy</a> ·
                <a href="${frontendUrl}/terms" style="color:#b4945a; text-decoration:none;">Terms of Service</a>
              </p>
              <p class="footer-text" style="margin:12px 0 0; font-size:10px; color:#4a4540;">© ${currentYear} Keanu Residences. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Send Deposit Received email
   */
  async sendDepositReceivedEmail(
    email: string,
    firstName: string,
    unitName: string,
    consultantName?: string,
    consultantCalendarLink?: string,
  ): Promise<void> {
    const consultant = consultantName || process.env.CONSULTANT_NAME || 'Keanu Team';
    const calendarLink = consultantCalendarLink || process.env.CONSULTANT_CALENDAR_LINK || 'https://connect.keanuresidences.com/onboarding';
    const currentYear = new Date().getFullYear();

    const html = this.generateDepositReceivedEmailHtml(
      firstName,
      unitName,
      consultant,
      calendarLink,
    );

    const text = `
      Your Reservation Is Confirmed
      
      Hi ${firstName},
      
      Congratulations on your successful reservation for ${unitName}.
      Your selected residence has been secured and removed from availability.
      No further action is required to hold your unit.
      
      This reservation guarantees your allocation, subject to the standard onboarding and documentation process.
      
      The next step is a private onboarding call with our team. During this session, we will:
      - Review your reserved residence details
      - Walk through contracts and payment milestones
      - Confirm timelines and next steps
      - Answer any final practical questions
      
      This call ensures a smooth and transparent transition from reservation to ownership.
      
      Please book your onboarding call within the next 48 hours.
      Your reservation will expire after 48 hours, and the unit becomes available again.
      
      Schedule your onboarding call here:
      ${calendarLink}
      
      Warm regards,
      Keanu Residences Team
      
      © ${currentYear} Keanu Residences. All rights reserved.
    `;

    const subject = 'Your Reservation Is Confirmed';

    // Try GHL Conversations API first
    if (this.ghlEmailService) {
      const ghlSuccess = await this.ghlEmailService.sendEmail({
        to: email,
        subject,
        html,
        text,
        from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      });

      if (ghlSuccess) {
        // this.logger.log(`✅ Deposit received email sent via GHL Conversations API to ${email}`);
        return;
      } else {
        // this.logger.warn(`⚠️ GHL Conversations API failed, falling back to MailHog for ${email}`);
      }
    }

    // Fallback to MailHog/nodemailer
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      to: email,
      subject,
      html,
      text,
    };

    try {
      // Add timeout wrapper to prevent hanging
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout after 10 seconds')), 10000);
      });

      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      // this.logger.log(`✅ Deposit received email sent to ${email}. MessageId: ${info.messageId}`);
    } catch (error) {
      // this.logger.error(`❌ Failed to send deposit received email to ${email}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Email sending failed: ${errorMessage}`);
    }
  }

  // ============================================================
  // ENQUIRY EMAILS
  // ============================================================

  /**
   * Generate Enquiry Admin Notification email HTML template
   */
generateEnquiryAdminNotificationHtml(
    fullName: string,
    email: string,
    phone: string,
    property: string,
    inquiryType: string,
    message: string,
    contactViaWhatsApp: boolean,
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Keanu Residences – New Enquiry</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #f0ece4; font-family: 'Jost', sans-serif; font-weight: 300; color: #2c2a26; }
    .email-wrapper { max-width: 600px; margin: 0 auto; }

    /* ── Hero ── */
    .hero {
      background-color: #1a1814;
      padding: 52px 48px 44px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 50% 0%, rgba(180,148,90,0.15) 0%, transparent 65%);
    }
    .hero-inner { position: relative; z-index: 1; }
    .badge {
      display: inline-block;
      border: 1px solid rgba(180,148,90,0.4);
      padding: 5px 16px;
      font-size: 9px;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: rgba(180,148,90,0.7);
      margin-bottom: 24px;
      font-family: 'Jost', sans-serif;
    }
    .icon-circle {
      width: 64px; height: 64px;
      border-radius: 50%;
      border: 1.5px solid #b4945a;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px;
      background: rgba(180,148,90,0.08);
    }
    .logo-row { display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
    .logo-line { width: 40px; height: 1px; background: #b4945a; flex-shrink: 0; margin: 0 12px; }
    .brand-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 13px; font-weight: 400;
      letter-spacing: 0.35em;
      color: #b4945a;
      text-transform: uppercase;
    }
    .hero-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 38px; font-weight: 300;
      color: #f0e8d6;
      letter-spacing: 0.04em;
      line-height: 1.15;
      margin-top: 20px;
    }
    .hero-title em { font-style: italic; color: #c8a86a; }
    .hero-sub {
      font-size: 11px; letter-spacing: 0.3em;
      color: rgba(180,148,90,0.7);
      text-transform: uppercase;
      margin-top: 12px;
      font-family: 'Jost', sans-serif;
    }

    /* ── Gold Divider ── */
    .divider {
      height: 3px;
      background: linear-gradient(90deg, transparent, #b4945a 30%, #d4af72 50%, #b4945a 70%, transparent);
    }

    /* ── Info Band ── */
    .info-band {
      background: #ffffff;
      padding: 32px 48px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #ede8de;
    }
    .info-item { text-align: center; flex: 1; }
    .info-item + .info-item { border-left: 1px solid #e8e0d0; }
    .info-item-label {
      font-size: 9px; letter-spacing: 0.28em;
      text-transform: uppercase; color: #b4945a; margin-bottom: 6px;
      font-family: 'Jost', sans-serif;
    }
    .info-item-value {
      font-family: 'Cormorant Garamond', serif;
      font-size: 17px; font-weight: 400;
      color: #1a1814; letter-spacing: 0.04em;
    }
    .status-new { color: #7a9e7e; }

    /* ── Body ── */
    .body { padding: 44px 48px 40px; background-color: #faf7f2; }
    .section-title {
      font-size: 9px; letter-spacing: 0.3em;
      text-transform: uppercase; color: #b4945a;
      margin-bottom: 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ede8de;
      font-family: 'Jost', sans-serif;
    }

    /* ── Details Table ── */
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    .details-table tr { border-bottom: 1px solid #ede8de; }
    .details-table tr:last-child { border-bottom: none; }
    .details-table td { padding: 13px 0; vertical-align: middle; }
    .details-table td:first-child {
      font-size: 9px; letter-spacing: 0.22em;
      text-transform: uppercase; color: #9a8f80;
      width: 38%; padding-top: 15px;
      font-family: 'Jost', sans-serif;
    }
    .details-table td:last-child {
      font-family: 'Cormorant Garamond', serif;
      font-size: 16px; color: #1a1814;
      text-align: right;
    }

    /* ── WhatsApp Badge ── */
    .wa-badge {
      display: inline-block;
      background: #25D366;
      color: #fff;
      font-family: 'Jost', sans-serif;
      font-size: 9px; font-weight: 500;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 2px;
    }
    .wa-no {
      font-family: 'Jost', sans-serif;
      font-size: 13px;
      color: #9a8f80;
    }

    /* ── Message Box ── */
    .message-box {
      background: #fff;
      border: 1px solid #ede8de;
      border-left: 3px solid #b4945a;
      padding: 20px 24px;
      margin-bottom: 32px;
    }
    .message-label {
      font-size: 9px; letter-spacing: 0.28em;
      text-transform: uppercase; color: #b4945a;
      margin-bottom: 10px;
      font-family: 'Jost', sans-serif;
    }
    .message-text { font-size: 14px; line-height: 1.8; color: #5a5550; font-style: italic; }

    /* ── Notice ── */
    .notice-box {
      background: rgba(180,148,90,0.06);
      border: 1px solid rgba(180,148,90,0.25);
      padding: 18px 24px;
      margin-bottom: 32px;
    }
    .notice-text { font-size: 12px; line-height: 1.8; color: #7a7060; text-align: center; font-family: 'Jost', sans-serif; }

    /* ── CTA Buttons ── */
    .btn-row { display: flex; gap: 12px; margin-bottom: 16px; }
    .cta-btn {
      flex: 1; display: block; text-align: center;
      font-family: 'Jost', sans-serif;
      font-size: 10px; letter-spacing: 0.22em;
      text-transform: uppercase; text-decoration: none;
      padding: 16px 24px;
    }
    .btn-primary { background: #1a1814; color: #f0e8d6; }
    .btn-secondary { background: transparent; border: 1px solid #1a1814; color: #1a1814; }

    /* ── Footer ── */
    .footer { background: #1a1814; padding: 36px 48px; text-align: center; }
    .footer-brand {
      font-family: 'Cormorant Garamond', serif;
      font-size: 15px; letter-spacing: 0.3em;
      color: #b4945a; text-transform: uppercase; margin-bottom: 16px;
    }
    .footer-copy { font-size: 11px; color: rgba(240,232,214,0.3); letter-spacing: 0.05em; line-height: 1.7; font-family: 'Jost', sans-serif; }

    
    /* === MOBILE RESPONSIVE INJECTIONS === */
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; } /* DO NOT override max-width or margin: 0 auto! */
      .header, .body, .footer { padding: 30px 20px !important; }
      .headline { font-size: 28px !important; line-height: 1.3 !important; }
      .headline-small { font-size: 22px !important; }
      .otp-box { width: 100% !important; padding: 20px !important; box-sizing: border-box !important; }
      .otp-code { font-size: 36px !important; letter-spacing: 0.15em !important; }
      .detail-box, .action-box, .status-box { padding: 20px !important; }
      .two-col, .two-col-container { display: block !important; width: 100% !important; }
      .col, .col-left, .col-right { display: block !important; width: 100% !important; padding: 0 !important; margin-bottom: 20px !important; }
      .info-grid { display: block !important; }
      .info-item { display: block !important; width: 100% !important; margin-bottom: 15px !important; }
      .button { display: block !important; width: 100% !important; text-align: center !important; }
      .contact-grid { display: block !important; }
      .contact-item { display: block !important; width: 100% !important; margin-bottom: 20px !important; border: none !important; padding: 0 !important; }
      .property-img { height: auto !important; max-width: 100% !important; }
      table.steps { width: 100% !important; }
    }
  </style>
</head>
<body>
<div class="email-wrapper">

  <!-- Hero -->
  <div class="hero">
    <div class="hero-inner">
      <div class="badge">Internal Notification</div>
      
      <div class="logo-row">
        <div class="logo-line"></div>
        <span class="brand-name">Keanu Residences</span>
        <div class="logo-line"></div>
      </div>
      <div class="hero-title">New <em>Enquiry</em></div>
      <div class="hero-sub">Action Required · Respond within 24h</div>
    </div>
  </div>

  <div class="divider"></div>

  <!-- Info Band -->
  <div class="info-band">
    <div class="info-item">
      <div class="info-item-label">Property</div>
      <div class="info-item-value">${property}</div>
    </div>
    <div class="info-item">
      <div class="info-item-label">Inquiry Type</div>
      <div class="info-item-value">${inquiryType}</div>
    </div>
    <div class="info-item">
      <div class="info-item-label">Status</div>
      <div class="info-item-value status-new">New</div>
    </div>
  </div>

  <!-- Body -->
  <div class="body">

    <div class="section-title">Enquiry Details</div>
    <table class="details-table">
      <tr>
        <td>Full Name</td>
        <td>${fullName}</td>
      </tr>
      <tr>
        <td>Email</td>
        <td>${email}</td>
      </tr>
      <tr>
        <td>Phone</td>
        <td>${phone}</td>
      </tr>
      <tr>
        <td>Property</td>
        <td>${property}</td>
      </tr>
      <tr>
        <td>Inquiry Type</td>
        <td>${inquiryType}</td>
      </tr>
      <tr>
        <td>WhatsApp</td>
        <td>
          ${contactViaWhatsApp
            ? '<span class="wa-badge">✓ Preferred</span>'
            : '<span class="wa-no">Not requested</span>'
          }
        </td>
      </tr>
    </table>

    ${message ? `
    <div class="message-box">
      <div class="message-label">Customer Message</div>
      <div class="message-text">"${message}"</div>
    </div>
    ` : ''}

    <div class="notice-box">
      <div class="notice-text">
        <strong style="color:#b4945a; font-weight:400;">Action required:</strong>
        Please follow up with this customer within
        <strong style="color:#b4945a; font-weight:400;">24 hours.</strong>
      </div>
    </div>

    <div class="btn-row">
      <a href="mailto:${email}" class="cta-btn btn-primary">Reply by Email</a>
      ${contactViaWhatsApp
        ? `<a href="https://wa.me/${phone.replace(/\D/g, '')}" class="cta-btn btn-secondary">Message on WhatsApp</a>`
        : `<a href="tel:${phone}" class="cta-btn btn-secondary">Call Customer</a>`
      }
    </div>

  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">Keanu Residences — Internal</div>
    <div class="footer-copy">
      This is an automated internal notification.<br/>
      © 2025 Keanu Residences. All rights reserved.
    </div>
  </div>

</div>
</body>
</html>
    `;
  }

generateEnquiryConfirmationHtml(
    firstName: string,
    inquiryType: string,
    property?: string,
    message?: string,
  ): string {
    const showProperty = property && property !== 'General Inquiry';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Keanu Residences – Enquiry Received</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #f0ece4; font-family: 'Jost', sans-serif; font-weight: 300; color: #2c2a26; }
    .email-wrapper { max-width: 600px; margin: 0 auto; }

    /* ── Hero ── */
    .hero {
      background-color: #1a1814;
      padding: 64px 48px 52px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 50% 0%, rgba(180,148,90,0.18) 0%, transparent 65%);
    }
    .hero-inner { position: relative; z-index: 1; }
    .icon-circle {
      width: 64px; height: 64px;
      border-radius: 50%;
      border: 1.5px solid #b4945a;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 28px;
      background: rgba(180,148,90,0.08);
    }
    .logo-row { display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
    .logo-line { width: 40px; height: 1px; background: #b4945a; flex-shrink: 0; margin: 0 12px; }
    .brand-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 13px; font-weight: 400;
      letter-spacing: 0.35em; color: #b4945a; text-transform: uppercase;
    }
    .hero-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 42px; font-weight: 300;
      color: #f0e8d6; letter-spacing: 0.04em; line-height: 1.15;
      margin-top: 24px;
    }
    .hero-title em { font-style: italic; color: #c8a86a; }
    .hero-sub {
      font-size: 11px; letter-spacing: 0.3em;
      color: rgba(180,148,90,0.7); text-transform: uppercase;
      margin-top: 14px; font-family: 'Jost', sans-serif;
    }

    /* ── Gold Divider ── */
    .divider {
      height: 3px;
      background: linear-gradient(90deg, transparent, #b4945a 30%, #d4af72 50%, #b4945a 70%, transparent);
    }

    /* ── Info Band ── */
    .info-band {
      background: #ffffff;
      padding: 36px 48px;
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid #ede8de;
    }
    .info-item { text-align: center; flex: 1; }
    .info-item + .info-item { border-left: 1px solid #e8e0d0; }
    .info-item-label {
      font-size: 9px; letter-spacing: 0.28em;
      text-transform: uppercase; color: #b4945a; margin-bottom: 6px;
      font-family: 'Jost', sans-serif;
    }
    .info-item-value {
      font-family: 'Cormorant Garamond', serif;
      font-size: 18px; font-weight: 400; color: #1a1814; letter-spacing: 0.04em;
    }
    .status-received { color: #b4945a; }

    /* ── Body ── */
    .body { padding: 48px 48px 40px; background-color: #faf7f2; }
    .body-greeting {
      font-family: 'Cormorant Garamond', serif;
      font-size: 22px; font-weight: 300; color: #1a1814; margin-bottom: 16px;
    }
    .body-text { font-size: 14px; line-height: 1.85; color: #5a5550; margin-bottom: 36px; }

    /* ── Summary Table ── */
    .section-title {
      font-size: 9px; letter-spacing: 0.3em;
      text-transform: uppercase; color: #b4945a;
      margin-bottom: 16px; padding-bottom: 10px;
      border-bottom: 1px solid #ede8de;
      font-family: 'Jost', sans-serif;
    }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    .details-table tr { border-bottom: 1px solid #ede8de; }
    .details-table tr:last-child { border-bottom: none; }
    .details-table td { padding: 13px 0; vertical-align: middle; }
    .details-table td:first-child {
      font-size: 9px; letter-spacing: 0.22em;
      text-transform: uppercase; color: #9a8f80;
      width: 38%; padding-top: 15px;
      font-family: 'Jost', sans-serif;
    }
    .details-table td:last-child {
      font-family: 'Cormorant Garamond', serif;
      font-size: 16px; color: #1a1814; text-align: right;
    }

    /* ── Message Box ── */
    .message-box {
      background: #fff;
      border: 1px solid #ede8de;
      border-left: 3px solid #b4945a;
      padding: 20px 24px; margin-bottom: 32px;
    }
    .message-label {
      font-size: 9px; letter-spacing: 0.28em;
      text-transform: uppercase; color: #b4945a; margin-bottom: 10px;
      font-family: 'Jost', sans-serif;
    }
    .message-text { font-size: 14px; line-height: 1.8; color: #5a5550; font-style: italic; }

    /* ── What's Next Steps ── */
    .steps { margin-bottom: 36px; }
    .step-row { display: flex; align-items: flex-start; gap: 16px; padding: 14px 0; border-bottom: 1px solid #ede8de; }
    .step-row:last-child { border-bottom: none; }
    .step-num {
      width: 28px; height: 28px; flex-shrink: 0;
      border: 1px solid #b4945a;
      border-radius: 50%;
      display: inline-block; text-align: center; line-height: 28px;
      font-family: 'Cormorant Garamond', serif;
      font-size: 13px; color: #b4945a;
    }
    .step-text { font-size: 13px; line-height: 1.7; color: #5a5550; padding-top: 4px; }
    .step-text strong { color: #1a1814; font-weight: 400; font-family: 'Cormorant Garamond', serif; font-size: 15px; display: block; margin-bottom: 2px; }

    /* ── Notice ── */
    .notice-box {
      background: rgba(180,148,90,0.06);
      border: 1px solid rgba(180,148,90,0.25);
      padding: 20px 24px; margin-bottom: 36px;
    }
    .notice-text { font-size: 12px; line-height: 1.8; color: #7a7060; text-align: center; font-family: 'Jost', sans-serif; }

    /* ── CTA ── */
    .cta-wrap { text-align: center; margin-bottom: 16px; }
    .cta-btn {
      display: inline-block; background: #1a1814; color: #f0e8d6;
      font-family: 'Jost', sans-serif; font-size: 10px;
      letter-spacing: 0.25em; text-transform: uppercase;
      text-decoration: none; padding: 18px 48px;
    }

    /* ── Footer ── */
    .footer { background: #1a1814; padding: 40px 48px; text-align: center; }
    .footer-brand {
      font-family: 'Cormorant Garamond', serif;
      font-size: 15px; letter-spacing: 0.3em;
      color: #b4945a; text-transform: uppercase; margin-bottom: 16px;
    }
    .footer-links { margin-bottom: 20px; }
    .footer-links a {
      font-size: 10px; letter-spacing: 0.18em;
      text-transform: uppercase; color: rgba(180,148,90,0.6);
      text-decoration: none; margin: 0 12px;
      font-family: 'Jost', sans-serif;
    }
    .footer-copy { font-size: 11px; color: rgba(240,232,214,0.3); letter-spacing: 0.05em; line-height: 1.7; font-family: 'Jost', sans-serif; }

    
    /* === MOBILE RESPONSIVE INJECTIONS === */
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; } /* DO NOT override max-width or margin: 0 auto! */
      .header, .body, .footer { padding: 30px 20px !important; }
      .headline { font-size: 28px !important; line-height: 1.3 !important; }
      .headline-small { font-size: 22px !important; }
      .otp-box { width: 100% !important; padding: 20px !important; box-sizing: border-box !important; }
      .otp-code { font-size: 36px !important; letter-spacing: 0.15em !important; }
      .detail-box, .action-box, .status-box { padding: 20px !important; }
      .two-col, .two-col-container { display: block !important; width: 100% !important; }
      .col, .col-left, .col-right { display: block !important; width: 100% !important; padding: 0 !important; margin-bottom: 20px !important; }
      .info-grid { display: block !important; }
      .info-item { display: block !important; width: 100% !important; margin-bottom: 15px !important; }
      .button { display: block !important; width: 100% !important; text-align: center !important; }
      .contact-grid { display: block !important; }
      .contact-item { display: block !important; width: 100% !important; margin-bottom: 20px !important; border: none !important; padding: 0 !important; }
      .property-img { height: auto !important; max-width: 100% !important; }
      table.steps { width: 100% !important; }
    }
  </style>
</head>
<body>
<div class="email-wrapper">

  <!-- Hero -->
  <div class="hero">
    <div class="hero-inner">
      
      <div class="logo-row">
        <div class="logo-line"></div>
        <span class="brand-name">Keanu Residences</span>
        <div class="logo-line"></div>
      </div>
      <div class="hero-title">Enquiry<br/><em>Received</em></div>
      <div class="hero-sub">We'll be in touch shortly</div>
    </div>
  </div>

  <div class="divider"></div>

  <!-- Info Band -->
  <div class="info-band">
    <div class="info-item">
      <div class="info-item-label">Inquiry Type</div>
      <div class="info-item-value">${inquiryType}</div>
    </div>
    ${showProperty ? `
    <div class="info-item">
      <div class="info-item-label">Property</div>
      <div class="info-item-value">${property}</div>
    </div>
    ` : ''}
    <div class="info-item">
      <div class="info-item-label">Status</div>
      <div class="info-item-value status-received">Received</div>
    </div>
  </div>

  <!-- Body -->
  <div class="body">

    <div class="body-greeting">Dear ${firstName},</div>
    <div class="body-text">
      Thank you for reaching out to Keanu Residences. We have received your enquiry and one of our dedicated advisors will personally get in touch with you within 24 hours.
    </div>

    <!-- Enquiry Summary -->
    <div class="section-title">Your Enquiry Summary</div>
    <table class="details-table">
      <tr>
        <td>Inquiry Type</td>
        <td>${inquiryType}</td>
      </tr>
      ${showProperty ? `
      <tr>
        <td>Property</td>
        <td>${property}</td>
      </tr>
      ` : ''}
    </table>

    ${message ? `
    <div class="message-box">
      <div class="message-label">Your Message</div>
      <div class="message-text">"${message}"</div>
    </div>
    ` : ''}

    <!-- What's Next -->
    <div class="section-title">What Happens Next</div>
    <table class="steps" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px; border-top: 1px solid #e8e0d0; padding-top: 24px;">
      <tr>
        <td class="step-row" style="padding-bottom: 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="top" style="width: 44px;">
                <div class="step-num">1</div>
              </td>
              <td valign="top">
                <div class="step-text">
                  <strong>Enquiry Reviewed</strong>
                  Our team has received your submission and is reviewing your request.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td class="step-row" style="padding-bottom: 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="top" style="width: 44px;">
                <div class="step-num">2</div>
              </td>
              <td valign="top">
                <div class="step-text">
                  <strong>Advisor Assigned</strong>
                  A dedicated advisor will be assigned to your enquiry within the hour.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td class="step-row">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="top" style="width: 44px;">
                <div class="step-num">3</div>
              </td>
              <td valign="top">
                <div class="step-text">
                  <strong>Personal Follow-Up</strong>
                  You will receive a personal call or message within 24 hours.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Notice -->
    <div class="notice-box">
      <div class="notice-text">
        In the meantime, feel free to explore our available properties<br/>
        or reach us directly at
        <strong style="color:#b4945a; font-weight:400;">hello@keanuresidences.com</strong>
      </div>
    </div>

    <!-- CTA -->
    <div class="cta-wrap">
      <a href="https://keanuresidences.com" class="cta-btn">Explore Our Properties</a>
    </div>

  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">Keanu Residences</div>
    <div class="footer-links">
      <a href="#">Website</a>
      <a href="#">Privacy Policy</a>
      <a href="#">Contact Us</a>
    </div>
    <div class="footer-copy">
      © 2025 Keanu Residences. All rights reserved.<br/>
      Bali, Indonesia
    </div>
  </div>

</div>
</body>
</html>
    `;
  }
  /**
   * Send Enquiry Admin Notification email
   */
  async sendEnquiryAdminNotification(enquiry: {
    fullName: string;
    email: string;
    phone: string;
    property?: string;
    inquiryType: string;
    message?: string;
    contactViaWhatsApp?: boolean;
  }): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'congthomas123@gmail.com';

    const html = this.generateEnquiryAdminNotificationHtml(
      enquiry.fullName,
      enquiry.email,
      enquiry.phone,
      enquiry.property || 'General Inquiry',
      enquiry.inquiryType,
      enquiry.message || '',
      enquiry.contactViaWhatsApp ?? false,
    );

    const text = `
      NEW ENQUIRY RECEIVED
      
      From: ${enquiry.fullName}
      Email: ${enquiry.email}
      Phone: ${enquiry.phone}
      Property: ${enquiry.property || 'General Inquiry'}
      Inquiry Type: ${enquiry.inquiryType}
      WhatsApp: ${enquiry.contactViaWhatsApp ? 'Yes' : 'No'}
      ${enquiry.message ? `Message: ${enquiry.message}` : ''}
      
      Please respond within 24 hours.
      
      This is an automated system notification from Keanu Residences.
    `;

    const subject = `[ENQUIRY] ${enquiry.inquiryType} — ${enquiry.fullName}`;

    // 1. Gửi qua GHL Conversations API (nếu có)
    if (this.ghlEmailService) {
      const ghlSuccess = await this.ghlEmailService.sendEmail({
        to: adminEmail,
        subject,
        html,
        text,
        from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      });

      if (ghlSuccess) {
        // this.logger.log(`✅ Admin enquiry notification sent via GHL to ${adminEmail}`);
        return;
      }
      // this.logger.warn(`⚠️ GHL failed, falling back to SMTP for ${adminEmail}`);
    }

    // 2. Gửi qua SMTP (Nodemailer/MailHog)
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      to: adminEmail,
      subject,
      html,
      text,
    };

    try {
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout after 10 seconds')), 10000);
      });

      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      // this.logger.log(`✅ Admin enquiry notification sent to ${adminEmail}. MessageId: ${info.messageId}`);
    } catch (error) {
      // this.logger.error(`❌ Failed to send admin enquiry notification to ${adminEmail}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Admin enquiry email sending failed: ${errorMessage}`);
    }
  }

  /**
   * Send Enquiry Confirmation email
   */
  async sendEnquiryConfirmation(enquiry: {
    fullName: string;
    email: string;
    phone: string;
    property?: string;
    inquiryType: string;
    message?: string;
    contactViaWhatsApp?: boolean;
  }): Promise<void> {
    const firstName = enquiry.fullName.split(/\s+/)[0] || 'there';

    const html = this.generateEnquiryConfirmationHtml(
      firstName,
      enquiry.inquiryType,
      enquiry.property,
      enquiry.message,
    );

    const text = `
      Hi ${firstName},

      Thank you for your enquiry${enquiry.property && enquiry.property !== 'General Inquiry' ? ` regarding ${enquiry.property}` : ''}.

      Your Enquiry Summary:
      - Type: ${enquiry.inquiryType}
      ${enquiry.property ? `- Property: ${enquiry.property}` : ''}
      ${enquiry.message ? `- Message: ${enquiry.message}` : ''}

      What's Next?
      A dedicated advisor will reach out to you within 24 hours.

      Warm regards,
      Keanu Residences Team

      © 2025 Keanu Residences. All rights reserved.
    `;

    const subject = `Thank You for Your Enquiry — Keanu Residences`;

    // 1. Gửi qua GHL Conversations API (nếu có)
    if (this.ghlEmailService) {
      const ghlSuccess = await this.ghlEmailService.sendEmail({
        to: enquiry.email,
        subject,
        html,
        text,
        from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      });

      if (ghlSuccess) {
        // this.logger.log(`✅ Enquiry confirmation email sent via GHL to ${enquiry.email}`);
        return;
      }
      // this.logger.warn(`⚠️ GHL failed, falling back to SMTP for ${enquiry.email}`);
    }

    // 2. Gửi qua SMTP (Nodemailer/MailHog)
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      to: enquiry.email,
      subject,
      html,
      text,
    };

    try {
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout after 10 seconds')), 10000);
      });

      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      // this.logger.log(`✅ Enquiry confirmation email sent to ${enquiry.email}. MessageId: ${info.messageId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Email sending failed: ${errorMessage}`);
    }
  }

  /**
   * Generate Reservation Expired email HTML template
   */
  private generateReservationExpiredEmailHtml(
    firstName: string,
    villaName: string,
    reservationId: string,
    reservedOn: string,
    expiredOn: string,
  ): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const whatsappUrl = 'https://api.whatsapp.com/send/?phone=%2B6281959600007&text&type=phone_number&app_absent=0';
    const greeting = firstName ? `Dear ${firstName},` : 'Dear Guest,';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Keanu Residences – Reservation Expired</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #f0ece4; font-family: 'Jost', sans-serif; font-weight: 300; color: #2c2a26; }
    .email-wrapper { max-width: 600px; margin: 0 auto; }
    .hero { background-color: #1a1814; padding: 64px 48px 52px; text-align: center; position: relative; overflow: hidden; }
    .hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 0%, rgba(160,60,60,0.14) 0%, transparent 65%); }
    .hero-inner { position: relative; z-index: 1; }
    .icon-circle { width: 64px; height: 64px; border-radius: 50%; border: 1.5px solid #9a6a6a; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 28px; background: rgba(160,60,60,0.08); }
    .logo-row { display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
    .logo-line { width: 40px; height: 1px; background: #b4945a; flex-shrink: 0; margin: 0 12px; }
    .brand-name { font-family: 'Cormorant Garamond', serif; font-size: 13px; font-weight: 400; letter-spacing: 0.35em; color: #b4945a; text-transform: uppercase; }
    .hero-title { font-family: 'Cormorant Garamond', serif; font-size: 42px; font-weight: 300; color: #f0e8d6; letter-spacing: 0.04em; line-height: 1.15; margin-top: 24px; }
    .hero-title em { font-style: italic; color: #c08080; }
    .hero-sub { font-size: 11px; letter-spacing: 0.3em; color: rgba(180,148,90,0.7); text-transform: uppercase; margin-top: 14px; }
    .divider { height: 3px; background: linear-gradient(90deg, transparent, #b4945a 30%, #d4af72 50%, #b4945a 70%, transparent); }
    .info-band { background: #ffffff; padding: 36px 48px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ede8de; }
    .info-item { text-align: center; flex: 1; }
    .info-item + .info-item { border-left: 1px solid #e8e0d0; }
    .info-item-label { font-size: 9px; letter-spacing: 0.28em; text-transform: uppercase; color: #b4945a; margin-bottom: 6px; }
    .info-item-value { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 400; color: #1a1814; letter-spacing: 0.04em; }
    .info-item-value.expired { color: #a05050; text-decoration: line-through; opacity: 0.7; }
    .body { padding: 48px 48px 40px; background-color: #faf7f2; }
    .body-greeting { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 300; color: #1a1814; margin-bottom: 16px; }
    .body-text { font-size: 14px; line-height: 1.85; color: #5a5550; margin-bottom: 36px; }
    .id-container { text-align: center; margin: 8px 0 40px; }
    .id-label { font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: #9a8f80; margin-bottom: 12px; }
    .id-box { display: inline-block; border: 1px solid #ddd0c8; background: #fdf8f6; padding: 16px 56px; position: relative; }
    .id-code { font-family: 'Jost', sans-serif; font-size: 20px; font-weight: 400; letter-spacing: 0.2em; color: #9a8f80; text-decoration: line-through; opacity: 0.75; }
    .expired-badge { display: inline-block; margin-top: 12px; background-color: #fce8e8; color: #a05050; font-size: 10px; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; padding: 4px 14px; border-radius: 20px; }
    .section-label { font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: #b4945a; margin-bottom: 16px; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
    .details-table tr { border-bottom: 1px solid #ede8de; }
    .details-table tr:last-child { border-bottom: none; }
    .details-table td { padding: 13px 0; font-size: 13px; }
    .details-table td.lbl { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #9a8f80; width: 42%; }
    .details-table td.val { color: #6a6060; text-align: right; font-weight: 400; text-decoration: line-through; opacity: 0.65; }
    .notice { border-left: 2px solid #b4945a; padding: 16px 20px; background: rgba(180,148,90,0.06); margin-bottom: 36px; }
    .notice p { font-size: 13px; line-height: 1.75; color: #6a6358; }
    .notice strong { color: #1a1814; font-weight: 500; }
    .cta-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 40px; }
    .btn-primary { display: block; width: 100%; max-width: 360px; padding: 16px 0; background-color: #1a1814; color: #f0e8d6; font-family: 'Jost', sans-serif; font-size: 11px; font-weight: 400; letter-spacing: 0.28em; text-transform: uppercase; text-decoration: none; text-align: center; }
    .btn-secondary { display: block; width: 100%; max-width: 360px; padding: 15px 0; background-color: transparent; color: #1a1814; font-family: 'Jost', sans-serif; font-size: 11px; font-weight: 400; letter-spacing: 0.28em; text-transform: uppercase; text-decoration: none; text-align: center; border: 1px solid #d4c4a0; }
    .footer { background-color: #1a1814; padding: 36px 48px; text-align: center; }
    .footer-divider { width: 40px; height: 1px; background: #b4945a; margin: 0 auto 24px; }
    .footer-brand { font-family: 'Cormorant Garamond', serif; font-size: 16px; letter-spacing: 0.2em; color: #c8b88a; text-transform: uppercase; margin-bottom: 12px; }
    .footer-text { font-size: 11px; letter-spacing: 0.08em; color: #6a6358; line-height: 1.8; }
    .footer-text a { color: #b4945a; text-decoration: none; }
    .footer-links { margin-top: 16px; }
    .footer-links a { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #6a6358; text-decoration: none; margin: 0 12px; }

    
    /* === MOBILE RESPONSIVE INJECTIONS === */
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; } /* DO NOT override max-width or margin: 0 auto! */
      .header, .body, .footer { padding: 30px 20px !important; }
      .headline { font-size: 28px !important; line-height: 1.3 !important; }
      .headline-small { font-size: 22px !important; }
      .otp-box { width: 100% !important; padding: 20px !important; box-sizing: border-box !important; }
      .otp-code { font-size: 36px !important; letter-spacing: 0.15em !important; }
      .detail-box, .action-box, .status-box { padding: 20px !important; }
      .two-col, .two-col-container { display: block !important; width: 100% !important; }
      .col, .col-left, .col-right { display: block !important; width: 100% !important; padding: 0 !important; margin-bottom: 20px !important; }
      .info-grid { display: block !important; }
      .info-item { display: block !important; width: 100% !important; margin-bottom: 15px !important; }
      .button { display: block !important; width: 100% !important; text-align: center !important; }
      .contact-grid { display: block !important; }
      .contact-item { display: block !important; width: 100% !important; margin-bottom: 20px !important; border: none !important; padding: 0 !important; }
      .property-img { height: auto !important; max-width: 100% !important; }
      table.steps { width: 100% !important; }
    }
  </style>
</head>
<body>
<div class="email-wrapper">
  <div class="hero">
    <div class="hero-inner">
      
      <div class="logo-row">
        
        <span class="brand-name">Keanu Residences</span>
        
      </div>
      <h1 class="hero-title">Reservation <em>Expired</em></h1>
      <p class="hero-sub">Luxury Private Retreats · Bali</p>
    </div>
  </div>
  <div class="divider"></div>
  <div class="info-band">
    <div class="info-item">
      <p class="info-item-label">Property</p>
      <p class="info-item-value">${villaName}</p>
    </div>
    <div class="info-item">
      <p class="info-item-label">Reservation ID</p>
      <p class="info-item-value expired">${reservationId}</p>
    </div>
    <div class="info-item">
      <p class="info-item-label">Status</p>
      <p class="info-item-value" style="color:#a05050; font-family:'Jost',sans-serif; font-size:15px;">Expired</p>
    </div>
  </div>
  <div class="body">
    <p class="body-greeting">${greeting}</p>
    <p class="body-text">
      Unfortunately, your reservation for <strong>${villaName}</strong> has
      expired as the deposit payment was not completed within the required time window.
      The unit is now available again to other buyers.
    </p>
    <div class="id-container">
      <p class="id-label">Reservation Reference</p>
      <div class="id-box">
        <div class="id-code">${reservationId}</div>
        <div class="expired-badge">Expired</div>
      </div>
    </div>
    <p class="section-label">Reservation Summary</p>
    <table class="details-table">
      <tr>
        <td class="lbl">Property</td>
        <td class="val">${villaName}</td>
      </tr>
      <tr>
        <td class="lbl">Reserved On</td>
        <td class="val">${reservedOn}</td>
      </tr>
      <tr>
        <td class="lbl">Expired On</td>
        <td class="val" style="text-decoration:none; opacity:1; color:#a05050;">${expiredOn}</td>
      </tr>
    </table>
    <div class="notice">
      <p>
        <strong>Still interested?</strong> If you'd like to re-secure this unit or
        explore other available villas, our concierge team is ready to assist you.
        Units move quickly — reach out and we'll do our best to help.
      </p>
    </div>
    <div class="cta-wrap">
      <a href="${frontendUrl}/explore" class="btn-primary">Explore Available Units</a>
      <a href="${whatsappUrl}" class="btn-secondary">Contact Us on WhatsApp</a>
    </div>
    <p class="body-text" style="margin-bottom: 0;">
      We hope to have the opportunity to welcome you to Keanu Residences.
      Our team remains at your disposal for any questions or assistance.
    </p>
  </div>
  <div class="footer">
    <div class="footer-divider"></div>
    <p class="footer-brand">Keanu Residences</p>
    <p class="footer-text">
      Seminyak, Bali — Indonesia<br>
      <a href="mailto:hello@keanuresidences.com">hello@keanuresidences.com</a>
    </p>
    <div class="footer-links">
      <a href="${frontendUrl}/privacy">Privacy Policy</a>
      <a href="${frontendUrl}/terms">Terms of Service</a>
    </div>
    <p class="footer-text" style="margin-top: 16px; font-size: 10px; color: #4a4540;">
      © 2026 Keanu Residences. All rights reserved.
    </p>
  </div>
</div>
</body>
</html>`;
  }

  /**
   * Send Reservation Expired email
   */
  async sendReservationExpiredEmail(
    email: string,
    firstName: string,
    villaName: string,
    reservationId: string,
    reservedOn: string,
    expiredOn: string,
  ): Promise<void> {
    const html = this.generateReservationExpiredEmailHtml(
      firstName,
      villaName,
      reservationId,
      reservedOn,
      expiredOn,
    );

    const text = `Dear ${firstName},

Your reservation (${reservationId}) for ${villaName} has expired as the deposit payment was not completed within the required time window.

If you'd like to re-secure this unit or explore other available villas, please contact us on WhatsApp or visit our website.

Warm regards,
Keanu Residences Team

© 2026 Keanu Residences. All rights reserved.
    `;

    const subject = `Your Reservation Has Expired — Keanu Residences`;

    if (this.ghlEmailService) {
      const ghlSuccess = await this.ghlEmailService.sendEmail({
        to: email,
        subject,
        html,
        text,
        from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      });
      if (ghlSuccess) return;
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@mail.keanuresidences.com',
      to: email,
      subject,
      html,
      text,
    };

    try {
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout after 10 seconds')), 10000);
      });
      await Promise.race([sendPromise, timeoutPromise]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Email sending failed: ${errorMessage}`);
    }
  }
}

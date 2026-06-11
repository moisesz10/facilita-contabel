// backend/services/notification.js

import nodemailer from 'nodemailer';

// Load configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

let transporter = null;

function initTransporter() {
  if (transporter) return transporter;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[Notification] SMTP configuration incomplete – notifications will be disabled');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  return transporter;
}

/**
 * Send an email notification.
 * @param {Object} opts - Options
 * @param {string} opts.to - Recipient email address
 * @param {string} opts.subject - Email subject
 * @param {string} opts.text - Plain‑text body
 * @param {string} [opts.html] - Optional HTML body
 */
export async function sendNotification({ to, subject, text, html }) {
  const transport = initTransporter();
  if (!transport) {
    console.warn('[Notification] Transporter not initialized – skipping email');
    return false;
  }
  try {
    await transport.sendMail({
      from: SMTP_USER,
      to,
      subject,
      text,
      ...(html && { html }),
    });
    console.log(`[Notification] Email sent to ${to}`);
    return true;
  } catch (err) {
    console.error('[Notification] Failed to send email:', err);
    return false;
  }
}

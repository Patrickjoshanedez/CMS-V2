import nodemailer from 'nodemailer';
import env from '../../config/env.js';

/**
 * Abstracted email service.
 * Uses Nodemailer with a pluggable transport:
 *   - Mailtrap / Ethereal for development
 *   - SMTP / SES for production
 *
 * All email dispatch goes through this service so transports
 * can be swapped without touching business logic.
 */

let transporter = null;

/**
 * Get or create the Nodemailer transporter (lazy singleton).
 * @returns {import('nodemailer').Transporter}
 */
const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: Number(env.SMTP_PORT) === 465, // true for port 465, false for others
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  return transporter;
};

/**
 * Send an email.
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} [options.html] - HTML body (optional)
 * @returns {Promise<Object>} Nodemailer send result
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  // Skip actual email dispatch in test environment
  if (process.env.NODE_ENV === 'test') {
    return { messageId: 'test-message-id', accepted: [to] };
  }

  const transport = getTransporter();

  const mailOptions = {
    from: `"${env.APP_NAME || 'CMS'}" <${env.SMTP_FROM || env.SMTP_USER}>`,
    to,
    subject,
    text,
    ...(html && { html }),
  };

  const info = await transport.sendMail(mailOptions);

  if (env.isDevelopment) {
    console.log('Email sent: %s', info.messageId);
    // If using Ethereal, log the preview URL
    if (info.messageId && nodemailer.getTestMessageUrl(info)) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  }

  return info;
};

/**
 * Send OTP verification email.
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP code (plaintext — before hashing)
 * @param {'verification' | 'password_reset'} type - OTP purpose
 */
export const sendOtpEmail = async (email, otp, type) => {
  const isVerification = type === 'verification';

  const subject = isVerification
    ? 'Verify Your Email — CMS'
    : 'Password Reset Code — CMS';

  const text = isVerification
    ? `Your email verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`
    : `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request a password reset, please ignore this email.`;

  const html = isVerification
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Verify Your Email</h2>
        <p>Your verification code is:</p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 16px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #18181b;">${otp}</span>
        </div>
        <p style="color: #71717a; font-size: 14px;">This code expires in 10 minutes.</p>
        <p style="color: #71717a; font-size: 14px;">If you did not create an account, please ignore this email.</p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Password Reset</h2>
        <p>Your password reset code is:</p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 16px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #18181b;">${otp}</span>
        </div>
        <p style="color: #71717a; font-size: 14px;">This code expires in 10 minutes.</p>
        <p style="color: #71717a; font-size: 14px;">If you did not request a password reset, please ignore this email.</p>
      </div>
    `;

  return sendEmail({ to: email, subject, text, html });
};

/**
 * Send team invite email.
 * @param {string} email - Invitee email
 * @param {string} teamName - Name of the team
 * @param {string} inviterName - Name of the person who sent the invite
 * @param {string} inviteToken - UUID invite token for the accept/decline link
 */
export const sendTeamInviteEmail = async (email, teamName, inviterName, inviteToken) => {
  const clientUrl = env.CLIENT_URL || 'http://localhost:5173';
  const acceptUrl = `${clientUrl}/teams/invites/${inviteToken}/accept`;
  const declineUrl = `${clientUrl}/teams/invites/${inviteToken}/decline`;

  const subject = `You've been invited to join "${teamName}" — CMS`;

  const text = `${inviterName} has invited you to join the team "${teamName}".\n\nAccept: ${acceptUrl}\nDecline: ${declineUrl}\n\nThis invite expires in 48 hours.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Team Invitation</h2>
      <p><strong>${inviterName}</strong> has invited you to join the team <strong>"${teamName}"</strong>.</p>
      <div style="margin: 24px 0;">
        <a href="${acceptUrl}" style="background: #16a34a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-right: 12px;">Accept Invite</a>
        <a href="${declineUrl}" style="background: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Decline</a>
      </div>
      <p style="color: #71717a; font-size: 14px;">This invitation expires in 48 hours.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
};

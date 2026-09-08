import nodemailer from 'nodemailer';
import { config } from '../../shared/config/index.js';

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function sendInvitationEmail(
    email: string,
    orgName: string,
    inviterName: string,
    token?: string,
    orgId?: string,
) {
    const copyrightYear = new Date().getFullYear();
    const appUrl = token
        ? `${config.appUrl}/welcome?token=${encodeURIComponent(token)}${orgId ? `&org=${encodeURIComponent(orgId)}` : ''}`
        : `${config.appUrl}/login?email=${encodeURIComponent(email)}`;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <title></title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700;900&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; background-color: #FFF; font-family: 'Roboto', Arial, sans-serif; font-style: normal; color: #333; }
    .pageLayout { width: 100%; height: 100vh; }
    .contentContainer { margin: 0 auto; padding: 48px; min-width: 320px; max-width: 504px; height: 100%; }
    .logo { display: block; height: auto; border: 0; max-width: 100%; }
    .contentTitle { margin: 48px 0 12px 0; font-weight: 700; font-size: 28px; line-height: 34px; text-transform: capitalize; }
    .contentText { margin: 6px 0; font-weight: 400; font-size: 14px; line-height: 21px; color: #333333; }
    a.ctaButton { margin: 32px 0 48px 0; padding: 10px 10px; background: #156DF2; border-radius: 8px; border: none; font-weight: 500; font-size: 14px; letter-spacing: 0.02em; text-transform: uppercase; text-decoration: none; color: #FFFFFF; display: inline-block; text-align: center; }
    .captionText { font-weight: 400; font-size: 14px; line-height: 20px; color: #828282; }
    .captionText > a { color: #156DF2; text-decoration: underline; }
    .footer { border-top: 1px; border-left: 0; border-right: 0; border-bottom: 0; border-style: solid; border-color: #E0E0E0; width: 100%; font-weight: 700; font-size: 12px; line-height: 16px; color: #BDBDBD; }
  </style>
</head>
<body>
<main class="pageLayout">
  <section class="contentContainer">
    <img src="https://imbrace-uat.s3.ap-east-1.amazonaws.com/static/iMBrace_Logo.png" class="logo" alt="iMBrace Logo">
    <h1 class="contentTitle">Welcome To The Team!</h1>
    <p class="contentText">You've been invited to join the organization ${orgName} by ${inviterName}. Please click the button below to accept and set up your account.</p>
    <a href="${appUrl}" class="ctaButton" target="_blank">JOIN NOW</a>
    <div class="captionText">
      <p>If you were not expecting this invitation, you can safely ignore it.</p>
      <p>If you have any questions, please contact <a href="mailto:office@imbrace.co">office@imbrace.co</a>. Thank you.</p>
    </div>
    <footer class="footer">
      <p>Powered by iMBrace Limited©${copyrightYear}.</p>
    </footer>
  </section>
</main>
</body>
</html>`;
    await sendEmail(email, `You are invited to ${orgName}`, html);
}

export async function sendTeamInvitationEmail(
    email: string,
    orgName: string,
    teamName: string,
    inviterName: string,
    ctaUrl: string,
) {
    const copyrightYear = new Date().getFullYear();
    const appUrl = `${config.appApiUrl}/${ctaUrl}`;
    const safeTeamName = escapeHtml(teamName);
    const safeOrgName = escapeHtml(orgName);
    const safeInviterName = escapeHtml(inviterName);
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <title></title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700;900&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; background-color: #FFF; font-family: 'Roboto', Arial, sans-serif; font-style: normal; color: #333; }
    .pageLayout { width: 100%; height: 100vh; }
    .contentContainer { margin: 0 auto; padding: 48px; min-width: 320px; max-width: 504px; height: 100%; }
    .logo { display: block; height: auto; border: 0; max-width: 100%; }
    .contentTitle { margin: 48px 0 12px 0; font-weight: 700; font-size: 28px; line-height: 34px; text-transform: capitalize; }
    .contentText { margin: 6px 0; font-weight: 400; font-size: 14px; line-height: 21px; color: #333333; }
    a.ctaButton { margin: 32px 0 48px 0; padding: 10px 10px; background: #156DF2; border-radius: 8px; border: none; font-weight: 500; font-size: 14px; letter-spacing: 0.02em; text-transform: uppercase; text-decoration: none; color: #FFFFFF; display: inline-block; text-align: center; }
    .captionText { font-weight: 400; font-size: 14px; line-height: 20px; color: #828282; }
    .captionText > a { color: #156DF2; text-decoration: underline; }
    .footer { border-top: 1px; border-left: 0; border-right: 0; border-bottom: 0; border-style: solid; border-color: #E0E0E0; width: 100%; font-weight: 700; font-size: 12px; line-height: 16px; color: #BDBDBD; }
  </style>
</head>
<body>
<main class="pageLayout">
  <section class="contentContainer">
    <img src="https://imbrace-uat.s3.ap-east-1.amazonaws.com/static/iMBrace_Logo.png" class="logo" alt="iMBrace Logo">
    <h1 class="contentTitle">Join the team to collaborate!</h1>
    <p class="contentText">You've been invited to join the team ${safeTeamName} in ${safeOrgName} by ${safeInviterName}. Please click the button below to accept and start to collaborate with others.</p>
    <a href="${appUrl}" class="ctaButton" target="_blank">Accept to join</a>
    <div class="captionText">
      <p>If you were not expecting this invitation, you can safely ignore it.</p>
      <p>If you have any questions, please contact <a href="mailto:office@imbrace.co">office@imbrace.co</a>. Thank you.</p>
    </div>
    <footer class="footer">
      <p>Powered by iMBrace Limited©${copyrightYear}.</p>
    </footer>
  </section>
</main>
</body>
</html>`;
    await sendEmail(email, `You've been invited to ${teamName}`, html);
}

async function sendEmail(to: string, subject: string, html: string) {
    try {
        const transporter = nodemailer.createTransport({
            host: config.mail.smtpAddress,
            port: config.mail.smtpPort,
            auth: { user: config.mail.smtpUsername, pass: config.mail.smtpPassword },
        });
        await transporter.sendMail({ from: config.mail.sender, to, subject, html });
    } catch (err) {
        console.error('[EmailService] Failed to send email:', err);
    }
}

export async function sendVerifyEmail(email: string, verifyUrl: string) {
    const copyrightYear = new Date().getFullYear();
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <title></title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
      <o:AllowPNG/>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <!--[if !mso]><!-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FFF;
      font-family: 'Roboto', Arial, sans-serif;
      font-style: normal;
    }
    .pageLayout { width: 100%; height: 100vh; }
    .contentContainer { margin: 0 auto; padding: 48px; min-width: 320px; max-width: 504px; height: 100%; }
    .logo { display: block; height: auto; border: 0; max-width: 100%; }
    .contentTitle { margin: 48px 0 12px 0; font-weight: 700; font-size: 28px; line-height: 34px; text-transform: capitalize; }
    .contentText { margin: 6px 0; font-weight: 400; font-size: 14px; line-height: 21px; color: #333333; }
    a.ctaButton {
      margin: 32px 0 48px 0;
      padding: 10px 10px;
      background: #156DF2;
      border-radius: 8px;
      border: none;
      font-weight: 500;
      font-size: 14px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      text-decoration: none;
      text-wrap: none;
      color: #FFFFFF;
      display: inline-block;
      text-align: center;
    }
    .captionText { font-weight: 400; font-size: 14px; line-height: 20px; color: #828282; }
    .captionText > a { color: #156DF2; text-decoration: underline; }
    .footer { border-top: 1px; border-left: 0; border-right: 0; border-bottom: 0; border-style: solid; border-color: #E0E0E0; width: 100%; font-weight: 700; font-size: 12px; line-height: 16px; color: #BDBDBD; }
  </style>
  <!--<![endif]-->
</head>
<body>
<main class="pageLayout">
  <section class="contentContainer">
    <img src="https://imbrace-uat.s3.ap-east-1.amazonaws.com/static/iMBrace_Logo.png" class="logo" alt="iMBrace Logo">
    <h1 class="contentTitle">
      Verify Your Email</h1>
    <p class="contentText">
      We are glad you
      are here. Please click the button below to verify your email and start your journey with iMBrace.</p>
    <a href="${verifyUrl}" class="ctaButton" target="_blank">
      VERIFY EMAIL
    </a>
    <div class="captionText">
      <p>If you didn't request this email, there's nothing to worry about. You can safely ignore it.</p>
      <p>If you have any questions, please contact <a href="mailto:office@imbrace.co">office@imbrace.co</a>.
        Thank you.</p>
    </div>
    <footer class="footer">
      <p style="color: #BDBDBD; font-weight: 800; font-size: 12px;">Powered by iMBrace Limited\u00A9${copyrightYear}.</p>
    </footer>
  </section>
</main>
</body>
</html>`;
    await sendEmail(email, 'iMBRACE Verify Email ', html);
}

export async function sendResetPasswordEmail(email: string, verifyUrl: string) {
    const copyrightYear = new Date().getFullYear();
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <title></title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700;900&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FFF;
      font-family: 'Roboto', Arial, sans-serif;
      font-style: normal;
      color: #333;
    }
    .pageLayout { width: 100%; height: 100vh; }
    .contentContainer { margin: 0 auto; padding: 48px; min-width: 320px; max-width: 504px; height: 100%; }
    .logo { display: block; height: auto; border: 0; max-width: 100%; }
    .contentTitle { margin: 48px 0 12px 0; font-weight: 700; font-size: 28px; line-height: 34px; text-transform: capitalize; }
    .contentText { margin: 6px 0; font-weight: 400; font-size: 14px; line-height: 21px; color: #333333; }
    a.ctaButton {
      margin: 32px 0 48px 0;
      padding: 10px 10px;
      background: #156DF2;
      border-radius: 8px;
      border: none;
      font-weight: 500;
      font-size: 14px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      text-decoration: none;
      color: #FFFFFF;
      display: inline-block;
      text-align: center;
    }
    .captionText { font-weight: 400; font-size: 14px; line-height: 20px; color: #828282; }
    .captionText > a { color: #156DF2; text-decoration: underline; }
    .footer { border-top: 1px; border-left: 0; border-right: 0; border-bottom: 0; border-style: solid; border-color: #E0E0E0; width: 100%; font-weight: 700; font-size: 12px; line-height: 16px; color: #BDBDBD; }
  </style>
</head>
<body>
<main class="pageLayout">
  <section class="contentContainer">
    <img src="https://imbrace-uat.s3.ap-east-1.amazonaws.com/static/iMBrace_Logo.png" class="logo" alt="iMBrace Logo">
    <h1 class="contentTitle">Reset Your Password</h1>
    <p class="contentText">We have received your request to reset your password. Please click the button below and follow the instructions to start the process.</p>
    <a href="${verifyUrl}" class="ctaButton" target="_blank">RESET PASSWORD</a>
    <div class="captionText">
      <p>If you didn't request this email, there's nothing to worry about. You can safely ignore it.</p>
      <p>If you have any questions, please contact <a href="mailto:office@imbrace.co">office@imbrace.co</a>. Thank you.</p>
    </div>
    <footer class="footer">
      <p>Powered by iMBrace Limited&copy;${copyrightYear}.</p>
    </footer>
  </section>
</main>
</body>
</html>`;
    await sendEmail(email, 'iMBRACE Reset Password Email', html);
}

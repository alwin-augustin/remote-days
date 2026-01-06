interface EmailAction {
  label: string;
  url: string;
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'danger';
}

// Brand colors matching the landing page
const BRAND_COLORS = {
  primary: '#3B82F6', // Blue 500
  primaryDark: '#2563EB', // Blue 600
  primaryLight: '#EFF6FF', // Blue 50
  success: '#10B981', // Emerald 500
  successLight: '#D1FAE5', // Emerald 100
  info: '#3B82F6', // Blue 500
  secondary: '#64748B', // Slate 500
  danger: '#EF4444', // Red 500
  text: '#0F172A', // Slate 900
  textMuted: '#64748B', // Slate 500
  border: '#E2E8F0', // Slate 200
  background: '#F8FAFC', // Slate 50
};

/**
 * Generates the daily check-in email with prominent Home/Office buttons
 */
export const generateDailyCheckInEmail = (
  userName: string,
  dateFormatted: string,
  homeLink: string,
  officeLink: string
): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Where are you working today?</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    body { margin: 0; padding: 0; background-color: #F8FAFC; }
    .button { text-decoration: none !important; }

    @media screen and (max-width: 600px) {
      .container { width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
      .content { padding: 32px 24px !important; }
      .button-table { width: 100% !important; }
      .button-cell { padding: 0 8px !important; }
      .button { padding: 20px 16px !important; font-size: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">

  <!-- Wrapper Table -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <!-- Main Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 40px 48px; text-align: center;">
              <!-- Logo -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px;">
                          <img src="https://remotedays.app/assets/logo-white.png" alt="Remote Days" width="32" height="32" style="display: block;" onerror="this.style.display='none'">
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 16px;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">Remote Days</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="content" style="padding: 48px;">

              <!-- Greeting -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p style="margin: 0; color: #64748B; font-size: 16px; font-weight: 500;">Good morning, ${userName}! 👋</p>
                  </td>
                </tr>
              </table>

              <!-- Main Question Card -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); border-radius: 16px; border: 1px solid #BFDBFE;">
                <tr>
                  <td style="padding: 32px; text-align: center;">
                    <h2 style="margin: 0 0 8px 0; color: #1E40AF; font-size: 28px; font-weight: 700; letter-spacing: -0.02em;">Where are you working today?</h2>
                    <p style="margin: 0; color: #3B82F6; font-size: 16px; font-weight: 500;">${dateFormatted}</p>
                  </td>
                </tr>
              </table>

              <!-- Buttons Section -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top: 32px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" class="button-table">
                      <tr>
                        <!-- Home Button -->
                        <td align="center" class="button-cell" style="padding: 0 8px;">
                          <a href="${homeLink}" class="button" style="display: inline-block; min-width: 180px; padding: 20px 32px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 18px; font-weight: 600; text-align: center; box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.4);">
                            🏠 Home
                          </a>
                        </td>

                        <!-- Office Button -->
                        <td align="center" class="button-cell" style="padding: 0 8px;">
                          <a href="${officeLink}" class="button" style="display: inline-block; min-width: 180px; padding: 20px 32px; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 18px; font-weight: 600; text-align: center; box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.4);">
                            🏢 Office
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Helper Text -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top: 32px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: #94A3B8; font-size: 14px; line-height: 1.6;">
                      Just click one button — it takes 2 seconds!<br>
                      Your response helps us stay compliant with tax regulations.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 48px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="border-top: 1px solid #E2E8F0;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 48px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; color: #94A3B8; font-size: 12px;">
                      This is an automated reminder from Remote Days.
                    </p>
                    <p style="margin: 0; color: #CBD5E1; font-size: 12px;">
                      © ${new Date().getFullYear()} Remote Days •
                      <a href="https://remotedays.app/privacy" style="color: #94A3B8; text-decoration: underline;">Privacy Policy</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Unsubscribe Note -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px;">
          <tr>
            <td align="center" style="padding: 24px 20px;">
              <p style="margin: 0; color: #94A3B8; font-size: 12px;">
                You're receiving this because you're registered as an employee.<br>
                Contact your HR team if you believe this is an error.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
};

/**
 * Generic email template for other notifications
 */
export const generateEmailHtml = (
  title: string,
  userName: string,
  content: string,
  actions: EmailAction[] = []
): string => {
  const colorMap: Record<string, string> = {
    primary: BRAND_COLORS.primary,
    secondary: BRAND_COLORS.secondary,
    success: BRAND_COLORS.success,
    info: BRAND_COLORS.info,
    danger: BRAND_COLORS.danger,
  };

  const actionButtons = actions
    .map(
      (action) => `
    <a href="${action.url}" style="display: inline-block; padding: 16px 32px; margin: 0 8px 8px 0; background: linear-gradient(135deg, ${colorMap[action.color || 'primary']} 0%, ${action.color === 'success' ? '#059669' : action.color === 'primary' ? '#2563EB' : colorMap[action.color || 'primary']} 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; text-align: center; box-shadow: 0 4px 14px 0 rgba(0, 0, 0, 0.15);">
      ${action.label}
    </a>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { margin: 0; padding: 0; background-color: #F8FAFC; }
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
      .content { padding: 32px 24px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 32px 48px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">Remote Days</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content" style="padding: 48px;">
              <h2 style="margin: 0 0 24px 0; color: #0F172A; font-size: 24px; font-weight: 700; line-height: 1.3;">${title}</h2>

              <p style="margin: 0 0 16px 0; color: #64748B; font-size: 16px; line-height: 1.6;">
                Hi ${userName},
              </p>

              <div style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                ${content}
              </div>

              ${
                actions.length > 0
                  ? `
              <div style="margin-top: 32px; text-align: left;">
                ${actionButtons}
              </div>
              `
                  : ''
              }

              <p style="color: #94A3B8; font-size: 14px; line-height: 1.5; margin-top: 32px; border-top: 1px solid #E2E8F0; padding-top: 24px;">
                If you have any questions, feel free to contact our support team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 24px 48px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="color: #94A3B8; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Remote Days. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
};

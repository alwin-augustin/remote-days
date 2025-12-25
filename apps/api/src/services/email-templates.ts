interface EmailAction {
  label: string;
  url: string;
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'danger';
}

export const generateEmailHtml = (title: string, userName: string, content: string, actions: EmailAction[] = []) => {
  const colorMap: Record<string, string> = {
    primary: '#175CD3', // Vibrant Blue (New Brand Primary)
    secondary: '#64748B', // Slate 500
    success: '#10B981', // Emerald 500
    info: '#3B82F6', // Blue 500
    danger: '#EF4444', // Red 500
  };

  const actionButtons = actions
    .map(
      (action) => `
    <a href="${action.url}" style="display: inline-block; padding: 14px 32px; margin: 0 10px 10px 0; background-color: ${colorMap[action.color || 'primary']}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); transition: background-color 0.2s;">
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
  <title>${title}</title>
  <!-- Import Inter Font -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* Reset styles */
    body { margin: 0; padding: 0; min-width: 100%; width: 100% !important; height: 100% !important; background-color: #F8FAFC; }
    body, table, td, div, p, a { -webkit-font-smoothing: antialiased; text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    
    /* Responsive */
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
      .content { padding: 24px !important; }
    }
  </style>
</head>
<body style="background-color: #F8FAFC; color: #334155;">
  <div class="container" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border: 1px solid #E2E8F0;">
    
    <!-- Branding Header -->
    <div style="background-color: #ffffff; padding: 32px 40px; text-align: center; border-bottom: 1px solid #F1F5F9;">
      <!-- Placeholder for Logo -->
      <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background-color: #EEF2FF; border-radius: 10px; margin-bottom: 12px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#175CD3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
      </div>
      <h1 style="color: #0F172A; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">Remote Days</h1>
    </div>

    <!-- Main Content -->
    <div class="content" style="padding: 40px 48px;">
      <h2 style="color: #0F172A; margin-top: 0; margin-bottom: 24px; font-size: 24px; font-weight: 700; line-height: 1.3;">${title}</h2>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        Hi ${userName},
      </p>
      
      <div style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
        ${content}
      </div>
      
      ${
        actions.length > 0
          ? `
      <div style="margin-top: 32px; margin-bottom: 32px; text-align: left;">
        ${actionButtons}
      </div>
      `
          : ''
      }

       <p style="color: #64748B; font-size: 14px; line-height: 1.5; margin-top: 32px; border-top: 1px solid #F1F5F9; padding-top: 24px;">
        If you have any questions, feel free to contact our support team.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #F8FAFC; padding: 32px 40px; text-align: center; border-top: 1px solid #E2E8F0;">
      <p style="color: #94A3B8; font-size: 12px; margin: 0; margin-bottom: 8px;">
        &copy; ${new Date().getFullYear()} Remote Days. All rights reserved.
      </p>
      <div style="margin-top: 12px;">
        <a href="#" style="color: #64748B; font-size: 12px; text-decoration: none; margin: 0 8px;">Privacy Policy</a>
        <span style="color: #CBD5E1;">&bull;</span>
        <a href="#" style="color: #64748B; font-size: 12px; text-decoration: none; margin: 0 8px;">Terms of Service</a>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

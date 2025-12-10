
interface EmailAction {
  label: string;
  url: string;
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'danger';
}

export const generateEmailHtml = (title: string, userName: string, content: string, actions: EmailAction[] = []) => {
  const colorMap: Record<string, string> = {
    primary: '#4F46E5', // indigo-600
    secondary: '#6B7280', // gray-500
    success: '#10B981', // green-500
    info: '#3B82F6', // blue-500
    danger: '#EF4444', // red-500
  };

  const actionButtons = actions.map(action => `
    <a href="${action.url}" style="display: inline-block; padding: 12px 24px; margin: 0 10px 10px 0; background-color: ${colorMap[action.color || 'primary']}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      ${action.label}
    </a>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    /* Reset styles */
    body { margin: 0; padding: 0; min-width: 100%; width: 100% !important; height: 100% !important; }
    body, table, td, div, p, a { -webkit-font-smoothing: antialiased; text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  </style>
</head>
<body style="background-color: #F3F4F6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #374151;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); margin-top: 40px; margin-bottom: 40px;">
    
    <!-- Header -->
    <div style="background-color: #4F46E5; padding: 30px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Teletravail Tracker</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 40px 20px 40px;">
      <h2 style="color: #111827; margin-top: 0; font-size: 20px; font-weight: 700;">Hello ${userName},</h2>
      <div style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-top: 16px;">
        ${content}
      </div>
      
      ${actions.length > 0 ? `
      <div style="margin-top: 32px; text-align: center;">
        ${actionButtons}
      </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div style="background-color: #F9FAFB; padding: 20px 40px; text-align: center; border-top: 1px solid #E5E7EB;">
      <p style="color: #9CA3AF; font-size: 14px; margin: 0;">
        &copy; ${new Date().getFullYear()} Teletravail Tracker. All rights reserved.
      </p>
      <p style="color: #D1D5DB; font-size: 12px; margin-top: 8px;">
        You received this email because you are a registered user.
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

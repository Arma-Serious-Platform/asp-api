export class EmailTemplateService {
  // Theme colors converted from CSS variables to hex values
  // --color-lime-700 is approximately #4d7c0f
  private static readonly THEME = {
    card: '#1f1f1f',
    primary: '#4d7c0f', // lime-700
    textPrimary: '#799a63',
    foreground: '#ffffff',
    muted: '#eeeeee',
    destructive: '#ff0000',
  };

  /**
   * Creates a styled email HTML template
   */
  static createEmailTemplate(content: string, title?: string): string {
    return `
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Лист'}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${this.THEME.card}; color: ${this.THEME.foreground};">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px; background-color: ${this.THEME.card};">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: ${this.THEME.card}; border-radius: 8px; border: 1px solid ${this.THEME.muted};">
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Creates a styled button/link
   */
  static createButton(href: string, text: string): string {
    return `
<a href="${href}" style="display: inline-block; padding: 12px 24px; background-color: ${this.THEME.primary}; color: ${this.THEME.foreground}; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">
  ${text}
</a>
    `.trim();
  }

  /**
   * Creates styled paragraph text
   */
  static createParagraph(text: string, style?: string): string {
    return `<p style="color: ${this.THEME.textPrimary}; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; ${style || ''}">${text}</p>`;
  }

  /**
   * Creates styled heading
   */
  static createHeading(text: string, level: 1 | 2 | 3 = 2): string {
    const sizes = { 1: '32px', 2: '24px', 3: '20px' };
    const tag = `h${level}`;
    return `<${tag} style="color: ${this.THEME.foreground}; font-size: ${sizes[level]}; font-weight: 700; margin: 0 0 20px 0; line-height: 1.2;">${text}</${tag}>`;
  }

  /**
   * Creates a divider/spacer
   */
  static createDivider(): string {
    return `<div style="height: 1px; background-color: ${this.THEME.muted}; margin: 24px 0;"></div>`;
  }

  /**
   * Creates activation email template
   */
  static createActivationEmail(activationLink: string): string {
    const content = `
      ${this.createHeading('Активуйте ваш обліковий запис')}
      ${this.createParagraph('Дякуємо за реєстрацію! Будь ласка, натисніть кнопку нижче, щоб активувати ваш обліковий запис.')}
      ${this.createParagraph('Це посилання дійсне протягом 10 хвилин.', 'color: ' + this.THEME.muted + '; font-size: 14px;')}
      <div style="text-align: center; margin: 30px 0;">
        ${this.createButton(activationLink, 'Активувати обліковий запис')}
      </div>
      ${this.createParagraph('Якщо кнопка не працює, ви можете скопіювати та вставити це посилання у ваш браузер:', 'color: ' + this.THEME.muted + '; font-size: 14px; margin-top: 30px;')}
      <p style="word-break: break-all; color: ${this.THEME.textPrimary}; font-size: 14px; background-color: ${this.THEME.card}; padding: 12px; border-radius: 4px; border: 1px solid ${this.THEME.muted};">
        ${activationLink}
      </p>
    `;
    return this.createEmailTemplate(content, 'Активуйте ваш обліковий запис');
  }

  /**
   * Creates reset password email template
   */
  static createResetPasswordEmail(resetLink: string): string {
    const content = `
      ${this.createHeading('Скинути пароль')}
      ${this.createParagraph('Ми отримали запит на скидання вашого пароля. Натисніть кнопку нижче, щоб створити новий пароль.')}
      ${this.createParagraph('Це посилання дійсне протягом 10 хвилин.', 'color: ' + this.THEME.muted + '; font-size: 14px;')}
      ${this.createParagraph('Якщо ви не запитували це, ви можете безпечно проігнорувати цей лист.', 'color: ' + this.THEME.muted + '; font-size: 14px;')}
      <div style="text-align: center; margin: 30px 0;">
        ${this.createButton(resetLink, 'Скинути пароль')}
      </div>
      ${this.createParagraph('Якщо кнопка не працює, ви можете скопіювати та вставити це посилання у ваш браузер:', 'color: ' + this.THEME.muted + '; font-size: 14px; margin-top: 30px;')}
      <p style="word-break: break-all; color: ${this.THEME.textPrimary}; font-size: 14px; background-color: ${this.THEME.card}; padding: 12px; border-radius: 4px; border: 1px solid ${this.THEME.muted};">
        ${resetLink}
      </p>
    `;
    return this.createEmailTemplate(content, 'Скинути пароль');
  }
}

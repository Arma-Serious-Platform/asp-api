import { renderErrorPage, renderLogoutPage } from './oidc-views';

describe('OIDC pages', () => {
  it('escapes values that reach the error page', () => {
    const html = renderErrorPage({
      frontendUrl: 'https://example.com',
      code: '<script>alert(1)</script>',
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('offers to leave one app or VTG and every app', () => {
    const html = renderLogoutPage({
      frontendUrl: 'https://example.com',
      action: 'https://api.example.com/api/oidc/session/end/confirm',
      xsrf: 'token"><b>',
      clientName: 'Squad <Stats>',
      account: { nickname: 'Sokil', email: 'sokil@example.com' },
    });

    expect(html).toContain('Вийти лише з Squad &lt;Stats&gt;');
    expect(html).toContain('name="logout" value="yes"');
    expect(html).toContain('value="token&quot;&gt;&lt;b&gt;"');
    expect(html).toContain('>SO<');
  });

  it('only offers a full logout when no app is named', () => {
    const html = renderLogoutPage({
      frontendUrl: 'https://example.com',
      action: '/confirm',
      xsrf: 'x',
    });

    expect(html).not.toContain('Вийти лише з');
    expect(html).toContain('Вийти з VTG і всіх додатків');
  });
});

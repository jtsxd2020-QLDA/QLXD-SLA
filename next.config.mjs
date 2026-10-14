const config = (phase) => ({
  distDir: phase === 'phase-development-server' ? '.next-dev' : '.next',
  poweredByHeader: false,
  // PDFKit uses createRequire(import.meta.url) for standard font modules. Keep it
  // external so Vercel resolves runtime package paths instead of build-machine URLs.
  serverExternalPackages: ['node:sqlite', 'pdfkit'],
  outputFileTracingIncludes: {
    '/api/analytics/export': [
      './assets/fonts/LiberationSans-Regular.ttf',
      './assets/fonts/LiberationSans-OFL.txt',
      './node_modules/pdfkit/package.json',
      './node_modules/pdfkit/js/**/*',
      './node_modules/pdfkit/lib/**/*'
    ]
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
      { key: 'Content-Security-Policy', value: `default-src 'self'; script-src 'self' 'unsafe-inline' ${phase === 'phase-development-server' ? "'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://tile.openstreetmap.org https://server.arcgisonline.com https://tile.googleapis.com https://mt0.google.com; connect-src 'self' https://tile.openstreetmap.org https://server.arcgisonline.com https://tile.googleapis.com https://mt0.google.com; worker-src 'self' blob:; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` }
    ] }];
  }
});
export default config;

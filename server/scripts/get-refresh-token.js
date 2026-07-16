// One-time helper to obtain a Google Ads API refresh token.
//
// Usage:
//   GOOGLE_ADS_CLIENT_ID=... GOOGLE_ADS_CLIENT_SECRET=... node scripts/get-refresh-token.js
//
// It starts a temporary local server on port 8089, prints a Google consent
// URL for you to open, and after you approve access it prints the refresh
// token to your terminal. Nothing is written to disk.
//
// IMPORTANT: sign in with the Google account that owns your TEST manager
// account, and add http://localhost:8089/oauth2callback as an authorized
// redirect URI on your OAuth client (type: Web application) — or use a
// Desktop-app OAuth client, which allows localhost redirects automatically.

const http = require('http');

const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    'Set GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET in the environment first.\n' +
      'Example:\n' +
      '  GOOGLE_ADS_CLIENT_ID=xxx GOOGLE_ADS_CLIENT_SECRET=yyy node scripts/get-refresh-token.js'
  );
  process.exit(1);
}

const PORT = 8089;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPE = 'https://www.googleapis.com/auth/adwords';

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent', // force a refresh token even if previously granted
  }).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/oauth2callback') {
    res.writeHead(404).end();
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    res.end(`Authorization failed: ${error || 'no code returned'}. You can close this tab.`);
    console.error('Authorization failed:', error || 'no code returned');
    server.close();
    process.exit(1);
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenResponse.json();

    if (!tokens.refresh_token) {
      res.end('No refresh token returned — check the terminal for details. You can close this tab.');
      console.error('Token exchange response did not include a refresh_token:', tokens);
      server.close();
      process.exit(1);
    }

    res.end('Success! Your refresh token is in the terminal. You can close this tab.');
    console.log('\n================ YOUR REFRESH TOKEN ================\n');
    console.log(tokens.refresh_token);
    console.log('\n====================================================');
    console.log(
      '\nStore it in your keychain (recommended):\n' +
        '  security add-generic-password -a "$USER" -s google-ads-refresh-token -w\n' +
        '(paste the token when prompted)\n'
    );
    server.close();
    process.exit(0);
  } catch (err) {
    res.end('Token exchange failed — check the terminal. You can close this tab.');
    console.error('Token exchange failed:', err);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log('1. Open this URL in your browser:\n');
  console.log(authUrl);
  console.log(
    '\n2. Sign in with the Google account that owns your TEST manager account and approve access.'
  );
  console.log('3. The refresh token will be printed here.\n');
});

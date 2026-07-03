const https = require('https');
const data = JSON.stringify({ user: 'admin', pass: '1234' });
const options = {
  hostname: 'zavala-express.onrender.com',
  path: '/api/zavala/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};
const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', async () => {
    console.log('LOGIN STATUS', res.statusCode);
    console.log('LOGIN BODY', body);
    try {
      const json = JSON.parse(body);
      const token = json.token;
      if (!token) {
        console.error('NO TOKEN');
        return;
      }
      const outcomes = [];
      const test = (opts) => new Promise((resolve) => {
        const req2 = https.request(opts, (res2) => {
          let b = '';
          res2.on('data', (chunk) => (b += chunk));
          res2.on('end', () => resolve({ status: res2.statusCode, body: b, opts }));
        });
        req2.on('error', (err) => resolve({ error: err.message, opts }));
        req2.end();
      });
      outcomes.push(await test({ hostname: 'zavala-express.onrender.com', path: '/api/zavala/state?token=' + encodeURIComponent(token), method: 'GET' }));
      outcomes.push(await test({ hostname: 'zavala-express.onrender.com', path: '/api/zavala/state', method: 'GET', headers: { Authorization: 'Bearer ' + token } }));
      console.log('OUTCOMES', JSON.stringify(outcomes, null, 2));
    } catch (e) {
      console.error('PARSE ERROR', e.message);
    }
  });
});
req.on('error', (err) => console.error('LOGIN ERR', err.message));
req.write(data);
req.end();

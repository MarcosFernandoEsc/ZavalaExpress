const https = require('https');
const data = JSON.stringify({user: 'admin', pass: '1234'});
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
  res.on('end', () => {
    console.log('LOGIN', body);
    try {
      const json = JSON.parse(body);
      const token = json.token;
      if (!token) {
        console.error('NO_TOKEN');
        return;
      }
      console.log('TOKEN', token.slice(0, 12));
      const options2 = {
        hostname: 'zavala-express.onrender.com',
        path: '/api/zavala/state',
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token },
      };
      const req2 = https.request(options2, (res2) => {
        let body2 = '';
        res2.on('data', (chunk2) => (body2 += chunk2));
        res2.on('end', () => {
          console.log('STATE_STATUS', res2.statusCode);
          console.log('STATE_BODY', body2.slice(0, 2000));
        });
      });
      req2.on('error', (err) => console.error('STATE_ERR', err.message));
      req2.end();
    } catch (e) {
      console.error('LOGIN_PARSE_ERR', e.message, body);
    }
  });
});
req.on('error', (err) => console.error('LOGIN_ERR', err.message));
req.write(data);
req.end();

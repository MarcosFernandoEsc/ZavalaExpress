const https = require('https');
const options = {
  hostname: 'zavala-express.onrender.com',
  path: '/api/zavala/users',
  method: 'GET',
};
https.get(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log('BODY', body);
  });
}).on('error', (err) => console.error('ERR', err.message));

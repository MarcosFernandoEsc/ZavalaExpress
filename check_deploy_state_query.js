const https = require('https');
const token = '65da28e1-95a0-4647-b08d-b1011126d3b1';
const options = {
  hostname: 'zavala-express.onrender.com',
  path: '/api/zavala/state?token=' + encodeURIComponent(token),
  method: 'GET',
};
const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log('BODY', body);
  });
});
req.on('error', (err) => console.error('ERR', err.message));
req.end();

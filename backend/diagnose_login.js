#!/usr/bin/env node
const https = require('https');
const http = require('http');
const url = require('url');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node diagnose_login.js <user> <pass> [host]');
  console.log('Example: node diagnose_login.js admin 1234 http://localhost:3000');
  process.exit(1);
}

const [user, pass, hostArg='http://localhost:3000'] = args;
const target = new url.URL(hostArg.replace(/\/$/, '') + '/api/zavala/login');

const data = JSON.stringify({ user, pass });

const options = {
  protocol: target.protocol,
  hostname: target.hostname,
  port: target.port || (target.protocol === 'https:' ? 443 : 80),
  path: target.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const lib = target.protocol === 'https:' ? https : http;
const req = lib.request(options, (res) => {
  let body = '';
  res.on('data', (c) => body += c);
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log('HEADERS', res.headers);
    try{
      console.log('BODY', JSON.stringify(JSON.parse(body), null, 2));
    }catch(e){
      console.log('BODY', body);
    }
  });
});

req.on('error', (err) => {
  console.error('REQUEST ERR', err.message);
});
req.write(data);
req.end();

const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 8000,
  path: '/api/analytics/vulnerability-reduction',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log('BODY:', chunk.substring(0, 2000));
  });
});

req.on('error', (e) => {
  console.error('problem with request: ' + e.message);
});

req.end();

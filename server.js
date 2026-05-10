const path = require('path');
const express = require('express');

const PLATFORM_API_URL = process.env.PLATFORM_API_URL || 'http://43.203.215.179:4000';
const PORT = process.env.PORT || 3002;

const app = express();

// 클라이언트에 플랫폼 API 주소 노출
app.get('/config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`window.__ALP_PLATFORM_API__ = ${JSON.stringify(PLATFORM_API_URL)};`);
});

// 정적 파일 서빙
app.use(express.static(__dirname, { index: 'index.html' }));

app.listen(PORT, () => {
  console.log(`Rock-Clicker server running on port ${PORT}`);
});

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const LEADERBOARD_FILE = path.join(ROOT, 'leaderboard.json');

function readLeaderboard() {
  try {
    const data = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function writeLeaderboard(entries) {
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(entries, null, 2) + '\n');
}

function sortLeaderboard(entries) {
  return entries.sort((a, b) => b.score - a.score || a.time - b.time || a.createdAt.localeCompare(b.createdAt));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

const server = http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/api/leaderboard') {
    return sendJson(response, 200, sortLeaderboard(readLeaderboard()).slice(0, 10));
  }

  if (request.method === 'POST' && request.url === '/api/leaderboard') {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 4096) request.destroy();
    });
    request.on('end', () => {
      try {
        const input = JSON.parse(body);
        const name = String(input.name || '').trim().slice(0, 24);
        const score = Number(input.score);
        const time = Number(input.time);
        if (!name || !Number.isFinite(score) || !Number.isFinite(time)) {
          return sendJson(response, 400, { error: 'Nombre y puntaje válidos son obligatorios.' });
        }
        const entry = {
          name,
          score: Math.max(0, Math.round(score)),
          time: Math.max(0, Math.round(time)),
          successes: Math.max(0, Math.round(Number(input.successes) || 0)),
          errors: Math.max(0, Math.round(Number(input.errors) || 0)),
          mode: input.mode === 'reto' ? 'reto' : 'guia',
          createdAt: new Date().toISOString()
        };
        const leaderboard = sortLeaderboard(readLeaderboard().concat(entry)).slice(0, 10);
        writeLeaderboard(leaderboard);
        return sendJson(response, 201, leaderboard);
      } catch (error) {
        return sendJson(response, 400, { error: 'JSON inválido.' });
      }
    });
    return;
  }

  if (request.method === 'GET' && (request.url === '/' || request.url === '/CpuProj.html')) {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(path.join(ROOT, 'CpuProj.html')).pipe(response);
  }

  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('No encontrado');
});

server.listen(PORT, () => {
  console.log(`CPU leaderboard disponible en http://localhost:${PORT}`);
});

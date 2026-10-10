import express from 'express';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Global CORS headers for PWABuilder and external mobile clients
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Serve public directory static assets FIRST (manifest, icons, service worker, screenshots)
  const publicDir = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir, {
      maxAge: '1d',
      setHeaders: (res, filePath) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        if (filePath.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (filePath.endsWith('.svg')) {
          res.setHeader('Content-Type', 'image/svg+xml');
        } else if (filePath.endsWith('manifest.json')) {
          res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        } else if (filePath.endsWith('sw.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.setHeader('Service-Worker-Allowed', '/');
        }
      }
    }));
  }

  // Explicit route handlers for all PWA assets to avoid Vite SPA fallback returning HTML (text/html)
  const pwaAssets: Record<string, string> = {
    '/manifest.json': 'application/manifest+json; charset=utf-8',
    '/sw.js': 'application/javascript; charset=utf-8',
    '/icon-192.png': 'image/png',
    '/icon-512.png': 'image/png',
    '/icon-maskable-512.png': 'image/png',
    '/icon.svg': 'image/svg+xml',
    '/screenshot-desktop.png': 'image/png',
    '/screenshot-mobile.png': 'image/png',
  };

  Object.entries(pwaAssets).forEach(([routePath, mimeType]) => {
    app.get(routePath, (req, res) => {
      const fileName = routePath.replace('/', '');
      const pubPath = path.join(process.cwd(), 'public', fileName);
      const distAssetPath = path.join(process.cwd(), 'dist', fileName);
      
      const targetFile = fs.existsSync(pubPath) ? pubPath : fs.existsSync(distAssetPath) ? distAssetPath : null;

      if (targetFile) {
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        if (routePath === '/sw.js') {
          res.setHeader('Service-Worker-Allowed', '/');
        }
        return res.sendFile(targetFile);
      }
      res.status(404).type(mimeType.split(';')[0]).send('Not found');
    });
  });

  // API endpoint: Proxy to Labelary API for realistic Zebra image preview
  app.post('/api/zebra/labelary-preview', async (req, res) => {
    try {
      const { zpl, width = 4, height = 3, dpmm = 8 } = req.body;
      if (!zpl) {
        return res.status(400).json({ error: 'Código ZPL faltante' });
      }

      // Labelary URL format: http://api.labelary.com/v1/printers/{dpmm}dpmm/labels/{width}x{height}/0/
      const labelaryUrl = `http://api.labelary.com/v1/printers/${dpmm}dpmm/labels/${width}x${height}/0/`;

      const response = await fetch(labelaryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'image/png',
        },
        body: zpl,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          error: `Labelary API error (${response.status}): ${errorText}`,
        });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;

      return res.json({ success: true, imageUrl: base64Image });
    } catch (err: any) {
      return res.status(500).json({ error: `Fallo en vista previa: ${err.message}` });
    }
  });

  // API endpoint: Direct TCP Socket Print to Zebra Printer (Port 9100 standard)
  app.post('/api/zebra/print', async (req, res) => {
    try {
      const { ip, port = 9100, zpl, copies = 1 } = req.body;
      if (!ip) {
        return res.status(400).json({ success: false, error: 'Dirección IP de impresora Zebra faltante' });
      }
      if (!zpl) {
        return res.status(400).json({ success: false, error: 'Código ZPL faltante' });
      }

      const parsedPort = parseInt(port, 10) || 9100;

      // Handle copies if > 1
      let fullZpl = zpl;
      if (copies > 1) {
        fullZpl = `^XA^PQ${copies}^XZ\n` + zpl;
      }

      const client = new net.Socket();
      client.setTimeout(4000); // 4 second timeout

      let hasResponded = false;

      const finish = (statusCode: number, data: any) => {
        if (!hasResponded) {
          hasResponded = true;
          try {
            client.destroy();
          } catch (e) {}
          res.status(statusCode).json(data);
        }
      };

      client.connect(parsedPort, ip, () => {
        client.write(fullZpl, () => {
          client.end();
          finish(200, { success: true, message: `Etiqueta enviada con éxito a ${ip}:${parsedPort}` });
        });
      });

      client.on('timeout', () => {
        finish(504, { success: false, error: `Tiempo de espera agotado conectando con ${ip}:${parsedPort}` });
      });

      client.on('error', (err) => {
        finish(502, { success: false, error: `Error conectando con impresora en ${ip}:${parsedPort}: ${err.message}` });
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: `Error en servidor de impresión: ${err.message}` });
    }
  });

  // API health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor de backend Zebra activo' });
  });

  // Catch-all for /api/* routes to guarantee JSON response instead of HTML fallback
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `Ruta de API no encontrada: ${req.method} ${req.originalUrl}`,
    });
  });

  // Serve public static assets (manifest.json, sw.js, icons)
  const publicPath = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath, {
      setHeaders: (res, filepath) => {
        if (filepath.endsWith('manifest.json')) {
          res.setHeader('Content-Type', 'application/manifest+json');
        } else if (filepath.endsWith('sw.js')) {
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Service-Worker-Allowed', '/');
        }
      }
    }));
  }

  // Vite middleware or production static build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

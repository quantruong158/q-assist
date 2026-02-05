import 'dotenv/config';

import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { put } from '@vercel/blob';
import { expressHandler } from '@genkit-ai/express';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { chatFlow } from './genkit/chat-flow';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env['FIREBASE_PROJECT_ID'],
      clientEmail: process.env['FIREBASE_CLIENT_EMAIL'],
      privateKey: process.env['FIREBASE_PRIVATE_KEY'],
    }),
  });

  const db = admin.firestore();

  db.settings({
    preferRest: true,
    ignoreUndefinedProperties: true,
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(
  cors({
    origin: [
      'http://localhost:4200',
      'https://q-assist.vercel.app',
      'capacitor://localhost',
      'http://localhost',
      'https://localhost',
    ],
    credentials: true,
  }),
);

app.use(express.json());

const authenticate: express.RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

app.post(
  '/api/chat',
  authenticate,
  expressHandler(chatFlow, {
    contextProvider: async (req) => {
      const authHeader = req.headers['authorization'];
      if (!authHeader?.startsWith('Bearer ')) {
        return {};
      }

      const idToken = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return { auth: decodedToken };
      } catch (error) {
        console.error('Error verifying token in provider:', error);
        return {};
      }
    },
  }),
);

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

app.post('/api/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' });
      return;
    }

    const blob = await put(`uploads/${randomUUID()}-${file.originalname}`, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
    });

    res.json({
      url: blob.url,
      mimeType: file.mimetype,
      filename: file.originalname,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);

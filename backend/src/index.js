import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requireAuth } from './lib.js';
import auth from './routes/auth.js';
import users from './routes/users.js';
import classes from './routes/classes.js';
import work from './routes/work.js';
import analytics from './routes/analytics.js';

const app = express();
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api/auth', auth);
app.use('/api/users', requireAuth, users);
app.use('/api/classes', requireAuth, classes);
app.use('/api/analytics', requireAuth, analytics);
app.use('/api', requireAuth, work);

app.use((req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan' }));
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Terjadi kesalahan pada server' : err.message });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`EduSmart API berjalan di http://localhost:${port}`));

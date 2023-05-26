import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import routes from './routes';

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use('/', routes);

const httpsOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/promptchain.duckdns.org/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/promptchain.duckdns.org/fullchain.pem')
};

https.createServer(httpsOptions, app).listen(port, () => {
  console.log(`Listening at https://localhost:${port}`);
});

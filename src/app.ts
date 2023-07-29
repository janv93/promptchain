import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import routes from './routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(multer().any());
app.use('/', routes);

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});

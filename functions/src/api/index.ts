import express, {Router} from 'express';
import applicationRoute from './application';
import experienceRoute from './experience';
import analyticsRoute from './analytics';
import userRoute from './user';
import universityRoute from './university';
import cors from 'cors';
import firebaseAuth from './middleware/firebaseAuth';

import * as functions from 'firebase-functions';

const app = express();
const apiRoute = Router();

app.use(cors());
app.use((req, res, next) => {
  console.log('url', req.originalUrl);
  console.log('method', req.method);
  return next();
});

const authRoutes = [
  '/api/application',
  '/api/experience',
  '/api/analytics',
  '/api/user',
];


app.use(authRoutes, firebaseAuth);

app.use('/api', apiRoute);

apiRoute.use('/application', applicationRoute);
apiRoute.use('/experience', experienceRoute);
apiRoute.use('/analytics', analyticsRoute);
apiRoute.use('/user', userRoute);
apiRoute.use('/university', universityRoute);

export const api = functions.runWith({timeoutSeconds: 500}).https.onRequest(app);

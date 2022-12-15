import express, {NextFunction, Request, Response} from 'express';
import cors from 'cors';
import {auth, firestore} from '../admin';
import axios from 'axios';

import * as functions from 'firebase-functions';

const app = express();

app.use(cors());
app.use((req, res, next) => {
  console.log('url', req.originalUrl);
  console.log('method', req.method);
  return next();
});

enum RequestMethods {
  GET = 'GET', PUT = 'PUT', POST = 'POST', PATCH ='PATCH'
}

app.use(validateFirebaseAuth, validateEndpoint, proxy);

async function validateFirebaseAuth(req: Request, res: Response, next: NextFunction) {
  console.info('in the firebase auth check');
  const originalUrl = req.originalUrl;
  if ((originalUrl.endsWith('/register') && req.method == RequestMethods.POST) ||
  (originalUrl.includes('/university') && req.method == RequestMethods.GET)) {
    return next();
  }
  // checking the authorization header
  const authorization = req.headers['authorization'];
  if (!authorization) {
    return res.status(401).send({
      code: 'unauthorized',
      message: 'You are not authorized to make this request',
    });
  }

  const [type, idToken] = authorization.split(' ');

  if (type !== 'idToken' || !idToken) {
    return res.status(401).send({
      code: 'unauthorized',
      message: 'You are not authorized to make this request',
    });
  }

  try {
    // verifying the idToken
    const decodedToken = await auth().verifyIdToken(idToken, true);
    const userRecord = await auth().getUser(decodedToken.uid);
    res.locals['uid'] = userRecord.uid;
    res.locals['univId'] = userRecord.customClaims?.univId as string;
    return next();
  } catch (error) {
    console.warn(error);
    return res.status(401).send({
      code: 'unauthorized',
      message: 'You are not authorized to make this request',
    });
  }
}

async function validateEndpoint(req: Request, res: Response, next: NextFunction) {
  console.info('validating the endpoint');
  // getting the serviceName secrets
  const [, pathUrl]= req.originalUrl.split('/api');
  const pathKeys = pathUrl.split('/');
  if (pathKeys.length == 1) {
    return res.status(400).send({
      code: 'invalid-url',
      message: 'Invalid URL',
    });
  }
  const endpoint = pathKeys[1];
  const servicesDoc = await firestore().collection('secrets').doc('services').get();

  if (!servicesDoc.exists) {
    return res.status(400).send({
      code: 'invalid-url',
      message: 'Invalid URL',
    });
  }
  const servicesData = servicesDoc.data() as Services;
  // eslint-disable-next-line guard-for-in
  for (const service in servicesData) {
    const {endpoints, domain, apiKey, apiSecret} = servicesData[service];
    if (endpoints.includes(endpoint)) {
      res.locals['url'] = domain + pathUrl;
      res.locals['apiKey'] = apiKey;
      res.locals['apiSecret'] = apiSecret;
      return next();
    }
  }
  return res.status(400).send({
    code: 'invalid-url',
    message: 'Invalid URL',
  });
}

async function proxy(req: Request, res: Response) {
  try {
    console.info('in the proxy', res.locals['url']);
    const receivedRes = await axios({
      url: res.locals['url'],
      method: req.method,
      headers: {
        'x-uid': res.locals['uid'],
        'x-univ-id': res.locals['univId'],
        'Authorization': `${res.locals['apiKey']} ${res.locals['apiSecret']}`,
        'Content-Type': 'application/json',
      },
      params: req.query,
      data: req.body,
    });
    return res.status(receivedRes.status).send(receivedRes.data);
  } catch (err: any) {
    return res.status(err.response.status).send(err.response.data);
  }
}

export const api = functions.runWith({timeoutSeconds: 500}).https.onRequest(app);

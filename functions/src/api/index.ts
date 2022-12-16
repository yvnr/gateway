import express, {NextFunction, Request, Response} from 'express';
import cors from 'cors';
import {auth, firestore} from '../admin';
import axios from 'axios';
import * as functions from 'firebase-functions';

const app = express(); // initialising the express app and route
app.use(cors()); // adding cors to avoid cors issue in the browser

// middleware to log - request url and method
app.use((req, res, next) => {
  console.log('url', req.originalUrl);
  console.log('method', req.method);
  return next();
});


enum CharacterKeys {
  ForwardSlash = '/',
  QuestionMark = '?'
}

enum Endpoints {
  Register= '/register',
  University = '/university'
}

enum RequestMethods {
  GET = 'GET',
  PUT = 'PUT',
  POST = 'POST',
   PATCH ='PATCH'
}

export enum ErrorCodes {
  InvalidURL = 'invalid-url',
  Unauthorized = 'unauthorized'
}

const expemtionEndpoints = [[RequestMethods.GET, Endpoints.University], [RequestMethods.POST, Endpoints.Register]];

/**
 * passing all requests through these three middleware
 * first one (validateFirebaseAuth)-> checks whether the user is authenticated or not
 * second one (validateEndpoint) -> checks whether the endpoint is registered for the proxy or not
 * third one --> proxying the request to other micro services
 */
app.use(validateFirebaseAuth, validateEndpoint, proxy);

/**
 * Its an express middleware function.
 * All the requests need user to be logged in apart from GET request of university endpoint and POST request of register endpoint
 * checking process we follow:
 * 1. Checking whether endpoint is in the exemption list or not
 * 2. Checking whether authorization header is available or not
 * 3. Checking whether idToken is valid or expired.
 * If all the above passes, we add the univId and uid to the res.locals and will be used in next middleware
 * @param {Request} req - http request recieved
 * @param {Response} res - http response used to send data to client
 * @param {NextFunction} next - used to pass the request handleer to next express middleware function
 * @return {Promise<void | Response<Error>>}  returns error response if the request headers are not authorized. Otherwise, it is passed to
 *  next middleware function by calling next()
 */
export async function validateFirebaseAuth(req: Request, res: Response, next: NextFunction) {
  console.info('validating the authorization');

  // checking whether request endpoint is in expection list or not
  const originalUrl = req.originalUrl;

  const isEndpointExpemted = expemtionEndpoints.reduce(((acc: boolean, curr) =>
    acc || (originalUrl.endsWith(curr[1]) && req.method == curr[0])), false);

  if (isEndpointExpemted) {
    return next();
  }

  // 2. checking whether req header has proper authorization or not
  const authorization = req.headers['authorization'];
  if (!authorization) {
    return res.status(401).send({
      code: ErrorCodes.Unauthorized,
      message: 'You are not authorized to make this request',
    });
  }

  const [type, idToken] = authorization.split(' ');

  if (type !== 'idToken' || !idToken) { // both idToken and type should be needed
    return res.status(401).send({
      code: ErrorCodes.Unauthorized,
      message: 'You are not authorized to make this request',
    });
  }

  try {
    // verifying the idToken
    const decodedToken = await auth().verifyIdToken(idToken, true);
    const userRecord = await auth().getUser(decodedToken.uid);

    // appending to the res.locals and will be used to next middleware function
    res.locals['uid'] = userRecord.uid;
    res.locals['univId'] = userRecord.customClaims?.univId as string;
    return next();
  } catch (error) {
    console.warn('error while validating the idToken', error);
    return res.status(401).send({
      code: ErrorCodes.Unauthorized,
      message: 'You are not authorized to make this request',
    });
  }
}


/**
 * Its an express middleware function.
 * Checks whether the endpoint is provided by any linked micro services system or not. We have a document[services] in secret collection which has
 * map<key, data> where key represents the microservice name and data contains domain, apiKey, apiSecrets and endPoints to connect with it
 * We will check whether the incoming request is in the part of those services or not.
 * If fails, send a error response
 * else, saving the url and apiKey, apiSecret in the res.locals and sending to next middlware request handler proxy
 * @param {Request} req - http request recieved
 * @param {Response} res - http response used to send data to client
 * @param {NextFunction} next - used to pass the request handleer to next express middleware function
 * @return {Promise<void | Response<Error>>}  returns error response if no microservices has this endpoint, else passes to the next middleware
 * proxy.
 */
export async function validateEndpoint(req: Request, res: Response, next: NextFunction) {
  console.info('validating the endpoint');

  // removing the query params from the url
  const url = req.originalUrl.split(CharacterKeys.QuestionMark)[0];

  // splitting url
  const [, pathUrl]= url.split('/api');
  const pathKeys = pathUrl.split(CharacterKeys.ForwardSlash);
  if (pathKeys.length == 1) {
    return res.status(400).send({
      code: ErrorCodes.InvalidURL,
      message: 'Invalid URL',
    });
  }

  const endpoint = CharacterKeys.ForwardSlash + pathKeys[1]; // endpoint
  console.info('requesting endpoint:', endpoint);

  // getting the service doc from the secrets collection and checking whether current request endpoint is available in any one
  // of the services or not
  const servicesDoc = await firestore().collection('secrets').doc('services').get();
  if (!servicesDoc.exists) {
    console.info('no services doc in secret collection');
    return res.status(400).send({
      code: ErrorCodes.InvalidURL,
      message: 'Invalid URL',
    });
  }

  const servicesData = servicesDoc.data() as Services;
  for (const service in servicesData) {
    const {endpoints, domain, apiKey, apiSecret} = servicesData[service];
    if (endpoints.find((key) => endpoint.startsWith(key))) { // if endpoint exists, saving  the res.locals
      res.locals['url'] = domain + pathUrl;
      res.locals['apiKey'] = apiKey;
      res.locals['apiSecret'] = apiSecret;
      return next();
    }
  }

  console.log(`No such endpoint ${endpoint} defined`);
  return res.status(400).send({
    code: ErrorCodes.InvalidURL,
    message: 'Invalid URL',
  });
}

/**
 * With the apiKey, apiSecret and necessay headers available in the res.locals populated in validateEndpoint, validateFirebaseAuth middleware.
 * Proxying the corresponding response and sending the recieved response back to client
 * @param {Request} req - http request recieved
 * @param {Response} res - http response used to send data to client
 * @return {Promise<Response<any>>}  returns response recieved from the proxied request
 * proxy.
 */
export async function proxy(req: Request, res: Response) {
  try {
    console.info('proxing the request to:', res.locals['url']);
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
    console.log('error response recieved from the proxy request:', err.response?.data);
    return res.status(err.response?.status ?? 400).send(err.response?.data ?? 'Unable to process');
  }
}

export const api = functions.runWith({timeoutSeconds: 500}).https.onRequest(app);

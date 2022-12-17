import {describe, jest} from '@jest/globals';
import {ErrorCodes, validateEndpoint, proxy, validateFirebaseAuth} from '../../src/api/index';

// jest.mock('express', () =>({
//   default: jest.fn(),
//   use: jest.fn(),
// }));


const successData = jest.fn(() =>({
  id: 'univId',
  data: jest.fn().mockReturnValue({
    'record': {domain: 'domain', apiKey: 'apiKey1', apiSecret: 'apiSecret1', endpoints: ['/user', '/univeristy']},
  }),
  ref: {
    set: jest.fn(),
    delete: jest.fn(),
  },
  exists: true,
}));

// const failData = jest.fn(()=>({exists: false}));

const docQuery = jest.fn(()=>({
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  get: successData,
}));


jest.mock('firebase-admin', () => {
  return {
    initializeApp: jest.fn(),
    credential: {
      applicationDefault: jest.fn(),
    },
    firestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        add: jest.fn(() =>({
          id: 'id',
        })),
        doc: docQuery,
      })),
    })),
    auth: jest.fn(() =>({
      createUser: jest.fn(()=>({uid: 'uid'})),
      updateUser: jest.fn(),
      setCustomUserClaims: jest.fn(),
      createCustomToken: jest.fn(()=>('sessionToken')),
      verifyIdToken: jest.fn(() =>({
        uid: 'uid',
      })),
      getUser: jest.fn(()=>({
        uid: 'uid',
        customClaims: {
          univId: 'univId',
        },
      })),
    })),
  };
});

describe('Validating auth Headers', () =>{
  it('exemption request', async () => {
    const req = {
      'headers': {
        'authorization': 'idToken validToken',
      },
      'originalUrl': '/api/user/register',
      'method': 'POST',
    };
    const nextFn = () => 'success';
    const res = {
      status: jest.fn(() =>({
        send: (value: any) => {
          expect(value.code).toBe(ErrorCodes.Unauthorized);
        },
      })),
    };
    const result = await validateFirebaseAuth(req as any, res as any, nextFn);
    expect(result).toBe('success');
  });

  it('no headers', () => {
    const req = {'headers': {},
      'originalUrl': '/api/user/register',
    };
    const nextFn = jest.fn();
    const res = {
      status: jest.fn(() =>({
        send: (value: any) => {
          expect(value.code).toBe(ErrorCodes.Unauthorized);
        },
      })),
    };
    validateFirebaseAuth(req as any, res as any, nextFn);
  });

  it('empty authorization header', () => {
    const req = {
      'headers': {
        'authorization': '',
      },
      'originalUrl': '/api/application',
    };
    const nextFn = jest.fn();
    const res = {
      status: jest.fn(() =>({
        send: (value: any) => {
          expect(value.code).toBe(ErrorCodes.Unauthorized);
        },
      })),
    };
    validateFirebaseAuth(req as any, res as any, nextFn);
  });

  it('only idToken key in authorization header', () => {
    const req = {
      'headers': {
        'authorization': 'idToken',
      },
      'originalUrl': '/api/application',
    };
    const nextFn = jest.fn();
    const res = {
      status: jest.fn(() =>({
        send: (value: any) => {
          expect(value.code).toBe(ErrorCodes.Unauthorized);
        },
      })),
    };
    validateFirebaseAuth(req as any, res as any, nextFn);
  });

  it('apiKey and secret does not match', () => {
    const req = {
      'headers': {
        'authorization': 'apiKey1 apiSecret1',
      },
      'originalUrl': '/api/register',
    };
    const nextFn = jest.fn();
    const res = {
      status: jest.fn(() =>({
        send: (value: any) => {
          expect(value.code).toBe(ErrorCodes.Unauthorized);
        },
      })),
    };
    validateFirebaseAuth(req as any, res as any, nextFn);
  });

  it('valid authorization', () => {
    const req = {
      'headers': {
        'authorization': 'idToken tokenValue',
      },
      'originalUrl': '/api/user',
    };
    const nextFn = () => 'success';
    const res = {
      status: jest.fn(() =>({
        send: (value: any) => {
          expect(value.code).toBe(ErrorCodes.Unauthorized);
        },
      })),
    };
    validateFirebaseAuth(req as any, res as any, nextFn);
  });
});

describe('Validate endpoint function testing', ()=>{
  it('invalid path', ()=>{
    const req = {
      originalUrl: '/api',
    };
    const res = {
      status: jest.fn(() =>({
        send: (value: any) => {
          expect(value.code).toBe(ErrorCodes.InvalidURL);
        },
      })),
    };
    const nextFn = jest.fn();
    validateEndpoint(req as any, res as any, nextFn);
  });

  it('enPoint does not exist', ()=>{
    const req = {
      originalUrl: '/api/hello',
    };
    const res = {
      status: jest.fn(() =>({
        send: (value: any) => {
          expect(value.code).toBe(ErrorCodes.InvalidURL);
        },
      })),
    };
    const nextFn = jest.fn();
    validateEndpoint(req as any, res as any, nextFn);
  });

  it('endPoint exist', ()=>{
    const req = {
      originalUrl: '/api/university',
    };
    const nextFn = () => 'success';
    const res = {
      status: jest.fn(() =>({
        send: (value: any) => {
          expect(value.code).toBe(ErrorCodes.InvalidURL);
        },
      })),
    };
    validateEndpoint(req as any, res as any, nextFn);
  });
});

describe('Proxy function testing', ()=>{
  it('failed res', ()=> {
    jest.mock('axios', ()=>({
      response: {
        status: 400,
        data: 'Unable to process',
      },
    }));

    const req = {
      originalUrl: '/api',
    };
    const res = {
      status: jest.fn(() =>({
        send: (value: any) => {
          expect(value).toBe('Unable to process');
        },
      })),
    };
    proxy(req as any, res as any);
  });
});


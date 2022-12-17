import * as fadmin from 'firebase-admin';

// initialising the firebase app
export const app = fadmin.initializeApp({
  credential: fadmin.credential.applicationDefault(),
});

// exporting services - auth and firestore
export {auth, firestore} from 'firebase-admin';

/**
 * Listing down firestore documents used by the gateService
 */

// Services document data in the secrets collection
type Services = Record<string, {domain:string, apiKey:string, apiSecret: string, endpoints: string[]}>

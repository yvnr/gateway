## Description

Name: "Gateway Microservice"

This microserivce will be used by the dashboard microservice of the Campus Job Board. All the requests coming to it will be redirected to corresponding microservices based on the request path.

All the requests need user idToken(session) in the authorization header(`idToken {idToken_value}`) expect for two endpoints(POST /api/user/register GET /api/university). This microservice has access to firebase authetication(user account registery) and it validates the session. If session is valid, we will be redirecting to corresponding microservices with ApiKey and ApiSecert which has been shared to communicate with them.

Redirecting endpoints based on path are:

User(/user/*), Experience(/experience/*), University(/university/*) endpoints:

These endpoints are handled by record microservice. So these requests are redirected
to /api/record/{endpoint}

Analytic(/analytic/*) endpoints:

These endpoints are handled by aggregator microservice. So these requests are redirected to /api/aggregator/{endpoint}

Application(/application/*) endpoints:

These endpoints are handled by tracker microservice. So these requests are redirected to /api/tracker/{endpoint}

Before redirecting to corresponding microservices, the request header are append with the authorization as `{ApiKey} {ApiSecret}`

Using jest for unit testing and eslint for strict code practices.

## Exposed endpoints are:

USER:

``` '/api/user' ``` - to register user

University:

``` '/api/university' ``` - get all universities available in the database


Experience:

``` '/api/experience' ``` - create experience document

Analytics:

``` '/api/analytics' ``` - create experience document

Applications:

``` '/api/application' ``` - create experience document

## Setting up project:

Mandate packages: nodejs, npm, typescript, firebase-tools
`brew install node` (need atleast 16.0.0)
`brew install npm` (need atleast > 8.0.0)
`npm install -g firebase-tools`
`npm install -g typescript`

1. clone the project, switch to ```functions``` directory
2. Run npm install  - to install all dependencies
3. Once you have installed the packages, have a walk through around the project.
4. Before running locally, you need to set up an environment variable 
`export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json;`
To run the service locally by ```npm run serve``` and it will hosted in 8000

## Note: 

## Commands
## Project setup
```
npm install
```

### Compiles and emulate the function locally
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### To run test cases and for coverage
```
npm run test
```
import http from 'k6/http';
import { check, fail } from 'k6';
import { Counter } from 'k6/metrics';

import {
  makeId,
  createAccount,
  createPiggyBankPayload,
} from '../helpers/dataCreators.js';

import {
  url,
  bearerToken
} from '../helpers/dataVariable.js';

export const getCounter = new Counter('get_count');
export const postCounter = new Counter('post_count');
export const putCounter = new Counter('put_count');
export const getErrorCounter = new Counter('get_error_count');
export const postErrorCounter = new Counter('post_error_count');
export const putErrorCounter = new Counter('put_error_count');

const headers = {
  'Authorization': `Bearer ${bearerToken}`,
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

export const options = {
  scenarios: {
    account_basic_flow: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      exec: 'scenario1BasicAccountFlow'
    },
    user_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5 },
        { duration: '20s', target: 5 },
        { duration: '10s', target: 0 }
      ],
      exec: 'scenario2UserCreationLoadTest'
    },
    transaction_spike: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '10s',
      preAllocatedVUs: 10,
      maxVUs: 30,
      exec: 'scenario5SpikeTransactionsTest'
    }
  },
  thresholds: {
    http_req_duration: ['p(90)<2500', 'p(95)<3500'],
    http_req_failed: ['rate<0.01'],
    get_count: ['count > 10'],
    post_count: ['count > 10'],
    put_count: ['count > 5'],
    get_error_count: ['count < 3'],
    post_error_count: ['count < 3'],
    put_error_count: ['count < 3'],
  }
};



export function scenario1BasicAccountFlow() {
  let res = http.get(`${url}/v1/accounts`, { headers });
  handleCheck(res, 200, getCounter, getErrorCounter, 'GET accounts');

  res = http.post(`${url}/v1/accounts`, JSON.stringify(createAccount()), { headers });
  handleCheck(res, [200, 201], postCounter, postErrorCounter, 'POST account');

  const accountId = res.json().data?.id;
  const newName = makeId(8);

  res = http.put(`${url}/v1/accounts/${accountId}`, JSON.stringify({ name: newName }), { headers });
  handleCheck(res, [200, 201], putCounter, putErrorCounter, 'PUT update account');
}


export function scenario2UserCreationLoadTest() {
  const account = createAccount();

  let res = http.post(`${url}/v1/accounts`, JSON.stringify(account), { headers });
  handleCheck(res, [200, 201], postCounter, postErrorCounter, 'POST account');

  const id = res.json().data?.id;

  res = http.get(`${url}/v1/accounts/${id}`, { headers });
  handleCheck(res, 200, getCounter, getErrorCounter, 'GET account detail');
}


export function scenario5SpikeTransactionsTest() {
  let res = http.get(`${url}/v1/transactions`, { headers });
  handleCheck(res, 200, getCounter, getErrorCounter, 'GET transactions');
}



function handleCheck(res, expected, okCounter, errCounter, name) {
  const success = check(res, {
    [`${name} status ok`]: r =>
      Array.isArray(expected) ? expected.includes(r.status) : r.status === expected
  });

  success ? okCounter.add(1) : errCounter.add(1);

  if (!success) {
    fail(`${name} failed → status: ${res.status} | body: ${res.body}`);
  }
}

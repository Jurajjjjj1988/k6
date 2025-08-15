
import http from 'k6/http';
import {check, fail} from 'k6';
import {Counter} from 'k6/metrics'
import {

    makeId,
    createAccount,
    createPiggyBankPayload,

} from "./helpers/dataCreators.js";


import {
    url,
    bearerToken
} from "./helpers/dataVariable.js";

export const postCounter = new Counter('post_count');
export const getCounter = new Counter('get_count');
export const putCounter = new Counter('put_count');
export const postErrorCounter = new Counter('post_error_count');
export const getErrorCounter = new Counter('get_error_count');
export const putErrorCounter = new Counter('put_error_count');
const headers = {
    'Authorization': `Bearer ${bearerToken}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
}

export const options = {

    scenarios: {
        smokeTest: {
            executor: 'constant-vus',
            vus: 1,
            duration: '30s',
            exec: 'scenario1AccountsBasicFlow'
        },
        smokeTest2: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                {
                duration: '13s',
                target: 5,
                },
                {
                    duration: '30s',
                    target: 5,
                },
                {
                    duration: '5s',
                    target: 10,
                },
                {
                    duration: '20s',
                    target: 10,
                },
                {
                    duration: '15s',
                    target: 0,
                }
            ],
            exec: 'scenario2UserCreationLoadTest'
        },
        smokeTest3: {
            executor: 'constant-arrival-rate',
            rate: 10,
            timeUnit: '2s',
            duration: '10s',
            preAllocatedVUs: 5,
            maxVUs: 15,
            exec: 'scenario3TransactionsAndPiggyBankTest'
        },
        smokeTest4: {
            executor: 'per-vu-iterations',
            vus: 5,
            maxDuration: '30s',
            iterations: 100,
            exec: 'scenario4FullFlowEndToEndTest'
        }
    },
    thresholds: {
        http_req_duration: ['p(90)<2800', 'p(95)<3900'],
        http_req_failed: ['rate<0.01'],
        get_count: ['count > 20'],
        post_count: ['count > 20'],
        put_count: ['count > 20'],
        get_error_count: ['count < 5'],
        post_error_count: ['count < 5'],
        put_error_count: ['count < 5'],
    }
};

let currencyCode = '6W§';
let updatePigyBank = {
    target_amount: "123.45",
    current_amount: "133.45"
}

export function scenario1AccountsBasicFlow() {

    let res = http.get(`${url}/v1/accounts`, {headers});

    let success = check(res, {
        'List of accounts (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        getCounter.add(1)
    } else {
        getErrorCounter.add(1);
    }

    res = http.get(`${url}/v1/currencies`, {headers});
    success = check(res, {
        'List of currencies (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        getCounter.add(1)
    } else {
        getErrorCounter.add(1);
    }

    res = http.get(`${url}/v1/categories`, {headers});
    success = check(res, {
        'List of categories (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        getCounter.add(1)
    } else {
        getErrorCounter.add(1);
    }

    res = http.get(`${url}/v1/transactions`, {headers});
    success = check(res, {
        'List of transactions (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        getCounter.add(1)
    } else {
        getErrorCounter.add(1);
    }

    res = http.get(`${url}/v1/currencies`, {headers});
    success = check(res, {
        'List of currencies (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        getCounter.add(1)
    } else {
        getErrorCounter.add(1);
    }

    res = http.get(`${url}/v1/currencies/${currencyCode}`, {headers});
    success = check(res, {
        'Currencie info (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        getCounter.add(1)
    } else {
        getErrorCounter.add(1);
    }

    res = http.post(`${url}/v1/accounts`, JSON.stringify(createAccount()), {headers});
    success = check(res, {
        'Vytvorenie účtu prešlo (POST)': (r) => r.status === 200 || r.status === 201,
    })
    if (success) {
        postCounter.add(1)
    } else {
        postErrorCounter.add(1);
    }

    let accountId = res.json().data.id

    res = http.put(`${url}/v1/currencies/${currencyCode}`, JSON.stringify({name: 'test'}), {headers});
    success = check(res, {
        'Vytvorenie usera prešlo': (r) => r.status === 200 || r.status === 201,
        'Zmena nazvu currency presla': (r) => r.json().data.attributes.name === "test"
    })
    if (success) {
        putCounter.add(1)
    } else {
        putErrorCounter.add(1);
    }

    let updateAccountName = makeId(5)
    res = http.put(`${url}/v1/accounts/${accountId}`, JSON.stringify({name: updateAccountName}), {headers});

    success = check(res, {
        'Update uctu prešlo (PUT)': (r) => r.status === 200 || r.status === 201,
        'update account - zmena TEST presla': (r) => {
            const json = r.json();
            return json && json.data && json.data.attributes && json.data.attributes.name === updateAccountName;
        }
    })
    if (success) {
        putCounter.add(1)
    } else {
        putErrorCounter.add(1);
    }

    const payload = createPiggyBankPayload(accountId)
    res = http.post(`${url}/v1/piggy_banks`, JSON.stringify(payload), {headers});

    success = check(res, {
        'Add pigy bank prešlo (POST)': (r) => r.status === 200 || r.status === 201,
    })
    if (success) {
        postCounter.add(1)
    } else {
        postErrorCounter.add(1);
    }

    let piggyBankId = res.json().data.id;

    res = http.put(`${url}/v1/piggy_banks/${piggyBankId}`, JSON.stringify(updatePigyBank), {headers});

    success = check(res, {
        'Change pigy bank prešlo (POST) prešlo': (r) => r.status === 200 || r.status === 201,
    })
    if (success) {
        putCounter.add(1)
    } else {
        putErrorCounter.add(1);
    }
}

export function scenario2UserCreationLoadTest() {
    // // ✅ 1. List of categories (GET)
    let res = http.get(`${url}/v1/categories`, {headers});
    let success = check(res, {
        'List of categories (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        putCounter.add(1)
    } else {
        putErrorCounter.add(1);
    }

    res = http.get(`${url}/v1/transactions`, {headers});
    success = check(res, {
        'List of transactions (GET) prešlo': (r) => r.status === 200,
    })
if (success) {
    putCounter.add(1)
} else {
    putErrorCounter.add(1);
}

    res = http.get(`${url}/v1/currencies`, {headers});
    success = check(res, {
        'List of currencies (GET) prešlo': (r) => r.status === 200,
    }) || fail(`List of currencies (GET) zlyhalo so statusom ${res.status}`);

    res = http.get(`${url}/v1/currencies/${currencyCode}`, {headers});
    success = check(res, {
        'Currencie info (GET) prešlo': (r) => r.status === 200,
    })
if (success) {
    putCounter.add(1)
} else {
    putErrorCounter.add(1);
}

    res = http.post(`${url}/v1/accounts`, JSON.stringify(createAccount()), {headers});
    success = check(res, {
        'Vytvorenie účtu prešlo (POST)': (r) => r.status === 200 || r.status === 201,
    })
if (success) {
    postCounter.add(1)
} else {
    postErrorCounter.add(1);
}
    let accountId = res.json().data.id

    res = http.get(`${url}/v1/accounts`, {headers});
    success = check(res, {
        'List of accounts (GET) prešlo': (r) => r.status === 200,
    })
if (success) {
    putCounter.add(1)
} else {
    putErrorCounter.add(1);
}

    res = http.put(`${url}/v1/currencies/${currencyCode}`, JSON.stringify({name: 'test'}), {headers});
    success = check(res, {
        'Vytvorenie usera prešlo': (r) => r.status === 200 || r.status === 201,
        'Zmena nazvu currency presla': (r) => r.json().data.attributes.name === "test"
    })
if (success) {
    putCounter.add(1)
} else {
    putErrorCounter.add(1);
}

    res = http.get(`${url}/v1/currencies`, {headers});
    success = check(res, {
        'List of currencies (GET) prešlo': (r) => r.status === 200,
    })
if (success) {
    getCounter.add(1)
} else {
    getErrorCounter.add(1);
}

    let piggyBankId = 1537
    res = http.put(`${url}/v1/piggy_banks/${piggyBankId}`, JSON.stringify(updatePigyBank), {headers});

    success = check(res, {
        'Change pigy bank prešlo (POST) prešlo': (r) => r.status === 200 || r.status === 201,
    }) || fail(`PUT na Update Pigy bank neprešlo ${res.body}`);

    // // ✅ 11. List of pigy bank (GET)
    res = http.get(`${url}/v1/piggy_banks`, {headers});
    success = check(res, {
        'List of pigy bank (GET) prešlo': (r) => r.status === 200,
    })
if (success) {
    putCounter.add(1)
} else {
    putErrorCounter.add(1);
}}

export function scenario3TransactionsAndPiggyBankTest() {

    let res = http.get(`${url}/v1/transactions`, {headers});
    let success = check(res, {
        'List of transactions (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        getCounter.add(1)
    } else {
        getErrorCounter.add(1);
    }

    res = http.get(`${url}/v1/currencies`, {headers});
    success = check(res, {
        'List of currencies (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        getCounter.add(1)
    } else {
        getErrorCounter.add(1);
    }

    res = http.get(`${url}/v1/currencies/${currencyCode}`, {headers});
    success = check(res, {
        'Currencie info (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        getCounter.add(1)
    } else {
        getErrorCounter.add(1);
    }

    res = http.get(`${url}/v1/currencies`, {headers});
    success = check(res, {
        'List of currencies (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        getCounter.add(1)
    } else {
        getErrorCounter.add(1);
    }

    let piggyBankId = 1537
    res = http.put(`${url}/v1/piggy_banks/${piggyBankId}`, JSON.stringify(updatePigyBank), {headers});

    success = check(res, {
        'Change pigy bank prešlo (POST) prešlo': (r) => r.status === 200 || r.status === 201,
    })
    if (success) {
        putCounter.add(1)
    } else {
        putErrorCounter.add(1);
    }

    let updateAccountName = makeId(11)
    let accountId = 19990
    res = http.put(`${url}/v1/accounts/${accountId}`, JSON.stringify({name: updateAccountName}), {headers});

    success = check(res, {
        'Update account prešlo (POST)': (r) => r.status === 200 || r.status === 201,
    })
    if (success) {
        putCounter.add(1)
    } else {
        putErrorCounter.add(1);
    }

    res = http.get(`${url}/v1/categories`, {headers});
    success = check(res, {
        'List of categories (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        getCounter.add(1)
    } else {
        getErrorCounter.add(1);
    }
}

export function scenario4FullFlowEndToEndTest() {

    let updateAccountName = makeId(11)
    let accountId = 19990

    let res = http.get(`${url}/v1/transactions`, {headers});
    let success = check(res, {
        'List of transactions (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        getCounter.add(1)
    } else {
        getErrorCounter.add(1);
    }

    res = http.get(`${url}/v1/currencies`, {headers});
    success = check(res, {
        'List of currencies (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        getCounter.add(1)
    } else {
        getErrorCounter.add(1);
    }

    res = http.get(`${url}/v1/categories`, {headers});
    success = check(res, {
        'List of categories (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        getCounter.add(1)
    } else {
        getErrorCounter.add(1);
    }

    res = http.get(`${url}/v1/accounts`, {headers});
    success = check(res, {
        'List of accounts (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        getCounter.add(1)
    } else {
        getErrorCounter.add(1);
    }

    res = http.get(`${url}/v1/currencies`, {headers});
    success = check(res, {
        'List of currencies (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        getCounter.add(1)
    } else {
        getErrorCounter.add(1);
    }

    res = http.get(`${url}/v1/currencies/${currencyCode}`, {headers});
    success = check(res, {
        'Currencie info (GET) prešlo': (r) => r.status === 200,
    })
    if (success) {
        getCounter.add(1)
    } else {
        getErrorCounter.add(1);
    }

    res = http.put(`${url}/v1/accounts/${accountId}`, JSON.stringify({name: updateAccountName}), {headers});

    success = check(res, {
        'Update account prešlo (POST)': (r) => r.status === 200 || r.status === 201,
    })
    if (success) {
        putCounter.add(1)
    } else {
        putErrorCounter.add(1);
    }
}

export default function () {
}

//premenovat file
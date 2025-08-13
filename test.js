import http from 'k6/http';
import {check, fail} from 'k6';
import {
    createAccount,
    createNewTransactionPayload,
    createPiggyBankPayload,
} from "./helpers/dataCreators.js";

import {
    url,
    bearerToken
} from "./helpers/dataVariable";

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
            duration: '5m30s',
            exec: 'scenario1'
        },
        smokeTest2: {
            executor: 'constant-vus',
            vus: 3,
            duration: '5m30s',
            exec: 'scenario2'
        },
        smokeTest3: {
            executor: 'constant-vus',
            vus: 2,
            duration: '5m30s',
            exec: 'scenario3'
        },
        smokeTest4: {
            executor: 'constant-vus',
            vus: 3,
            duration: '5m30s',
            exec: 'scenario4'
        }
    }
};

export function scenario1() {

    let currencyCode = '6W§';
    let updatePigyBank = {
        target_amount: "123.45",
        current_amount: "123.45"
    }

    // // // ✅ 1. List of accounts (GET)
    let res = http.get(`${url}/v1/accounts`, {headers});
    check(res, {
        'List of accounts (GET) prešlo': (r) => r.status === 200,
    }) || fail(`List of accounts (GET) zlyhalo so statusom ${res.status}`);
    //
    // // // ✅ 2. List of currencies (GET)
    // res = http.get(`${url}/v1/currencies`, {headers});
    // check(res, {
    //     'List of currencies (GET) prešlo': (r) => r.status === 200,
    // }) || fail(`List of currencies (GET) zlyhalo so statusom ${res.status}`);
    //
    // // // ✅ 3. List of categories (GET)
    // res = http.get(`${url}/v1/categories`, {headers});
    // check(res, {
    //     'List of categories (GET) prešlo': (r) => r.status === 200,
    // }) || fail(`List of categories (GET) zlyhalo so statusom ${res.status}`);
    //
    // // // ✅ 4. List of transactions (GET)
    // res = http.get(`${url}/v1/transactions`, {headers});
    // check(res, {
    //     'List of transactions (GET) prešlo': (r) => r.status === 200,
    // }) || fail(`List of transactions (GET) zlyhalo so statusom ${res.status}`);
    //
    // // // ✅ 5. List of currencies (GET)
    // res = http.get(`${url}/v1/currencies`, {headers});
    // check(res, {
    //     'List of currencies (GET) prešlo': (r) => r.status === 200,
    // }) || fail(`List of currencies (GET) zlyhalo so statusom ${res.status}`);
    //
    // // // ✅ 5. Currencie information (GET)
    // res = http.get(`${url}/v1/currencies/${currencyCode}`, {headers});
    // check(res, {
    //     'Currencie info (GET) prešlo': (r) => r.status === 200,
    // }) || fail(`Currencie info (GET) prešlo zlyhalo so statusom ${res.status}`);


    // ✅ 9. Add new account
    res = http.post(`${url}/v1/accounts`, JSON.stringify(createAccount()), {headers});
    check(res, {
        'Vytvorenie účtu prešlo (POST)': (r) => r.status === 200 || r.status === 201,
    }) || fail(`POST na Vytvorenie account neprešlo ${res.body}`);
    ;
    let accountId = res.json().data.id

    // ✅ 8. CHANGE CURRENCY = dokoncit
    res = http.put(`${url}/v1/currencies/${currencyCode}`, JSON.stringify({name: 'test'}), {headers});
    check(res, {
        'Vytvorenie usera prešlo': (r) => r.status === 200 || r.status === 201,
        'Zmena mena presla': (r) => r.json().data.attributes.name === "test"
    }) || fail(`POST na /Vytvorenie usera neprešlo ${res.body}`);

    // // ✅ 10. UPDATE ACCOUNT

    res = http.put(`${url}/v1/accounts/${accountId}`, JSON.stringify({name: 'test'}), {headers});

    check(res, {
        'Update uctu prešlo (PUT)': (r) => r.status === 200 || r.status === 201,
        'update account - zmena mena presla': (r) => r.json().data.attributes.name === "test"
    }) || fail(`PUT na update account neprešlo ${res.body}`);

    // ✅ 11. Add new piggy bank
    const payload = createPiggyBankPayload(accountId)
    res = http.post(`${url}/v1/piggy_banks`, JSON.stringify(payload), {headers});

    check(res, {
        'Add pigy bank prešlo (POST)': (r) => r.status === 200 || r.status === 201,
    }) || fail(`POST na New piggy bank neprešlo ${res.body}`);
    let piggyBankId = res.json().data.id;

// ✅ 13. Update piggy_bank
    res = http.put(`${url}/v1/piggy_banks/${piggyBankId}`, JSON.stringify(updatePigyBank), {headers});

    check(res, {
        'Change pigy bank prešlo (POST) prešlo': (r) => r.status === 200 || r.status === 201,
    }) || fail(`PUT na Update Pigy bank neprešlo ${res.body}`);

    res = http.post(`${url}/v1/transactions`, JSON.stringify(createNewTransactionPayload()), {headers});
    check(res, {
        'Make new transaction prešlo (POST)': (r) => r.status === 200 || r.status === 201,
    }) || fail(`POST na Add new transaction neprešlo ${res.body}`);
    let transactionId = res.json().data.id;
}


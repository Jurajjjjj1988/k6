import http from 'k6/http';
import {check, fail} from 'k6';

const url = 'https://fintech-testlab.coderslab.pl/api';
const bearerToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI1NSIsImp0aSI6ImE5YzNmYTc4NDRiNjE5YWFiYzBhOWFhOWYwY2JkY2Y0NGQwOTVjY2FlZjg5NGI2YzkyN2Q2NGNkMmIwNWU3NDVkYjNjMjdhMDE2ZWZkOGE3IiwiaWF0IjoxNzI5NTMzODQ0LjkxMTYyNywibmJmIjoxNzI5NTMzODQ0LjkxMTYzMSwiZXhwIjoxNzYxMDY5ODQ0Ljg4NzM4Nywic3ViIjoiMTk4MyIsInNjb3BlcyI6W119.GkGq5I5RHUqvF1s6ynVE4bq0ro4H_ifm-_itEbS_tOeUQ4g2FV8ev3RRN2XC2sH0IckYfmexgNuNSrPVuUAId2bumfzWPkRFH4kpcTP_kLYokOMDVp7AieVMsFTVzVFyqLdeATv3tfYhLen1rQow3QBvFdCF0708Tzklsw3fE41aLwdVF2BURcIen8eit6StfNbyHPuE4XDCN6vDit4vjGhYj0AOgV9mlbLepH_ck5V8cWWBEm0GnjsMnaFipGIPsa8zNVtgUMaKRYwX9R0-ue91xoJkmueUPnmr_eul8SH60Gl1c9IhHf1QsRsHCFOHA3QhrgWjcb1S_MMuaP7eXd6WhyrprX_qY-9Zudtz8vY52XJxCvnLOldpNwDVOOaUPdrJANHh2aWBVcIiHz2xYgcXmU3WaHXvpw8rtoI8Cl8DSWOJgPpqWsUh8DmTociNWGBhHKW8jnMZU7ReiFCjhQ3eAj-8sltK6sqW0nVVRLs-wli-QC5_kjVvBBD454LK5LC4wFDJrzE6rKDCv89iKou_S2vAhf6jVVhNL428OPMF9zpaVaUymuG2exlYw4FJgU5WK3QFzAGzutRvghWJm4dUxgWIbQl8pO-EIy7vFBuudC8HV5t2xCt28AogPEa-Ha_Ooj8e4AGYGRwy64t3BPNAyuxIDfKGuCmvi-0ULCg'
const accountId = 19990;
const currencyCode = 'BRL';

const headers = {
    'Authorization': `Bearer ${bearerToken}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
};

export const options = {
    vus: 10,
    duration: '10s',
};

export default function () {
    const endpoints = [
        // ✅ 1. Check existing account
        {path: '/v1/about', label: 'about'},
        // ✅ 2. Check existing account
        {path: '/v1/budgets', label: 'budgets'},
        // ✅ 3. Check existing account
        {path: '/v1/currencies', label: 'currencies'},
        // ✅ 4. Check existing account
        {path: '/v1/categories', label: 'categories'},
        // ✅ 5. Check existing account
        {path: '/v1/transactions', label: 'transactions'},
        // ✅ 6. Check existing account
        {path: '/v1/users', label: 'users'},

        // ✅ 8. Check existing account
        // {path: `/v1/accounts/${accountId}`, label: 'accounts'},
        // ✅ 9. Get currencies information
        //daco plano {path: `/v1/currencies/BRL`, label: 'currencies'},

    ];

    for (const endpoint of endpoints) {
        const res = http.get(`${url}${endpoint.path}`, {headers});
        const passed = check(res, {
            [`GET ${endpoint.path} status is 200`]: (r) => r.status === 200,
        });

        if (!passed) {
            fail(`GET ${endpoint.path} failed with status ${res.status}`);
        }
    }



}
export function generateSimplePiggyName() {
    const random = Math.floor(Math.random() * 10000);
    return `MyPiggy_${random}`;
}

export function makeId(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({length}, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
}

export function makeAccNum(length) {
    const digits = '0123456789';
    return Array.from({length}, () => digits.charAt(Math.floor(Math.random() * digits.length))).join('');
}

export function mod97(ibanNumeric) {
    let remainder = ibanNumeric;
    while (remainder.length > 2) {

        const block = remainder.slice(0, 9);
        remainder = (BigInt(block) % 97n).toString() + remainder.slice(block.length);
    }
    return Number(remainder) % 97;
}

export function generateIBAN() {
    const countryCode = "SK";
    const bankCode = "0200";
    const accountNumber = Math.floor(Math.random() * 1e16).toString().padStart(16, '0');
    const bban = bankCode + accountNumber; // Basic Bank Account Number


    function charToNumber(char) {
        return char.charCodeAt(0) - 55;
    }

    const countryNumber = `${charToNumber('S')}${charToNumber('K')}`;
    const rearranged = bban + countryNumber + "00";


    let checksum = 98 - mod97(rearranged);
    if (checksum < 10) checksum = "0" + checksum;

    return countryCode + checksum + bban;
}

export function createAccount() {
    return {
        "name": makeId(15),
        "type": "asset",
        "iban": generateIBAN(),
        "bic": "BOFAUS3N",
        "account_number": makeAccNum(12),
        "opening_balance": "-1012.12",
        "opening_balance_date": "2018-09-17T12:46:47+01:00",
        "virtual_balance": "123.45",
        "currency_id": "11996",
        "currency_code": "6Ze",
        "active": false,
        "order": 1,
        "include_net_worth": true,
        "account_role": "defaultAsset",
        "credit_card_type": "monthlyFull",
        "monthly_payment_date": "2018-09-17T12:46:47+01:00",
        "liability_type": "loan",
        "liability_direction": "credit",
        "interest": "5.3",
        "interest_period": "monthly",
        "notes": "Some example notes",
        "latitude": 51.983333,
        "longitude": 5.916667,
        "zoom_level": 6
    }
}

export function changeCurrencie() {
    return {
        "data": {
            "name": "Bitcoin26"
        }
    }
}

export function updateAccount() {
    return {
        "data": {
            "type": "accounts",
            "id": "20208",
            "attributes": {
                "name": "accountName",
                "iban": "SK7702009456220039898314",
                "bic": "BOFAUS3N",
                "account_number": "5891395668212",
                "opening_balance": "-1012.12",
                "opening_balance_date": "2018-09-17T12:46:47+01:00",
                "virtual_balance": "123.45",
                "currency_id": "11996",
                "currency_code": "6Ze",
                "active": false,
                "order": 1,
                "include_net_worth": true,
                "account_role": "defaultAsset",
                "credit_card_type": "monthlyFull",
                "monthly_payment_date": "2018-09-17T12:46:47+01:00",
                "liability_type": "loan",
                "interest": "5.3",
                "interest_period": "monthly",
                "notes": "Some example notes",
                "latitude": 51.983333,
                "longitude": 5.916667,
                "zoom_level": 6
            }
        }
    }
}

export function createPiggyBankPayload(accountId) {
    return {
        name: makeId(16),
        account_id: accountId,
        accounts: [
            {
                id: accountId,
                name: makeId(8),
                current_amount: "123.45"
            }
        ],
        target_amount: "123.45",
        current_amount: "123.45",
        start_date: "2018-09-17",
        target_date: "2018-09-18",
        order: 5,
        notes: "Some notes",
        object_group_title: "Example Group"
    };
}

export function createNewTransactionPayload() {
    return {
        error_if_duplicate_hash: false,
        apply_rules: false,
        fire_webhooks: true,
        group_title: "Split transaction title.",
        transactions: [
            {
                type: "withdrawal",
                date: "2022-09-17T12:46:47+01:00",
                amount: "1234.45",
                description: "Vegetabless",
                order: 0,
                currency_id: "11996",
                currency_code: "6Ze",
                source_id: "19984",
                source_name: "Initial balance account of 70xtmPGutyaAZAna",
                destination_id: "19978",
                destination_name: "Initial balance account of 7A5GLo50kcAWhm0I",
                reconciled: false,
                tags: null,
                notes: "Some example notes",
                internal_reference: "string",
                external_id: "string",
                external_url: "string",
                bunq_payment_id: "string",
                sepa_cc: "string",
                sepa_ct_op: "string",
                sepa_ct_id: "string",
                sepa_db: "string",
                sepa_country: "string",
                sepa_ep: "string",
                sepa_ci: "string",
                sepa_batch_id: "string",
                interest_date: "2024-10-29T13:14:03.427Z",
                book_date: "2024-10-29T13:14:03.427Z",
                process_date: "2024-10-29T13:14:03.427Z",
                due_date: "2024-10-29T13:14:03.427Z",
                payment_date: "2024-10-29T13:14:03.427Z",
                invoice_date: "2024-10-29T13:14:03.427Z"
            }
        ]
    };
}
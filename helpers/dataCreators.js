export function generateSimplePiggyName() {
  const random = Math.floor(Math.random() * 10000);
  return `MyPiggy_${random}`;
}

export function makeId(length) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join("");
}

export function makeAccNum(length) {
  const digits = "0123456789";
  return Array.from({ length }, () =>
    digits.charAt(Math.floor(Math.random() * digits.length)),
  ).join("");
}

export function mod97(ibanNumeric) {
  let remainder = ibanNumeric;
  while (remainder.length > 2) {
    const block = remainder.slice(0, 9);
    remainder =
      (BigInt(block) % 97n).toString() + remainder.slice(block.length);
  }
  return Number(remainder) % 97;
}

export function generateIBAN() {
  const countryCode = "SK";
  const bankCode = "0200";
  const accountNumber = Math.floor(Math.random() * 1e16)
    .toString()
    .padStart(16, "0");
  const bban = bankCode + accountNumber;

  const charToNumber = (char) => char.codePointAt(0) - 55;
  const countryNumber = `${charToNumber("S")}${charToNumber("K")}`;
  const rearranged = bban + countryNumber + "00";

  let checksum = 98 - mod97(rearranged);
  if (checksum < 10) checksum = "0" + checksum;

  return countryCode + checksum + bban;
}

export function createAccount() {
  return {
    name: makeId(15),
    type: "asset",
    iban: generateIBAN(),
    bic: "BOFAUS3N",
    account_number: makeAccNum(12),
    opening_balance: "0.00",
    opening_balance_date: new Date().toISOString(),
    active: true,
    order: 1,
    include_net_worth: true,
    account_role: "defaultAsset",
    notes: `k6-test-${makeId(6)}`,
  };
}

/**
 * @param {string} name - new account name
 */
export function updateAccountPayload(name) {
  return { name };
}

export function createPiggyBankPayload(accountId) {
  return {
    name: makeId(16),
    account_id: accountId,
    accounts: [{ id: accountId, name: makeId(8), current_amount: "100.00" }],
    target_amount: "500.00",
    current_amount: "100.00",
    start_date: new Date().toISOString().split("T")[0],
    target_date: "2026-12-31",
    order: 1,
    notes: `k6-piggy-${makeId(4)}`,
  };
}

export function createTransactionPayload(sourceId, destinationId) {
  return {
    error_if_duplicate_hash: false,
    apply_rules: false,
    fire_webhooks: false,
    transactions: [
      {
        type: "withdrawal",
        date: new Date().toISOString(),
        amount: (Math.random() * 100 + 1).toFixed(2),
        description: `k6-txn-${makeId(8)}`,
        source_id: String(sourceId),
        destination_id: String(destinationId),
        reconciled: false,
      },
    ],
  };
}

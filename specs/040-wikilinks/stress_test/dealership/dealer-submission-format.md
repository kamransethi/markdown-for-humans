# Dealer Submission Format

#dealership #integration/dealer-api #status/approved #priority/high

All deal submissions to the [[architecture/api-gateway|API Gateway]] must conform to this schema. The [[workflow/transaction-intake|intake service]] validates every payload against these rules.

## Supported Formats

| Format | Content-Type | Endpoint |
|--------|-------------|----------|
| JSON | `application/json` | `POST /v2/applications` |
| XML | `application/xml` | `POST /v2/applications` |
| Flat File | N/A (SFTP) | See [[dealership/flat-file-import]] |

## JSON Schema (v2)

```json
{
  "dealerCode": "DLR-4478",
  "applicant": {
    "firstName": "Sofia",
    "lastName": "Martinez",
    "ssn": "123456789",
    "dob": "1990-03-15",
    "grossMonthlyIncome": 6500.00,
    "employmentStatus": "EMPLOYED",
    "employer": "Acme Corp",
    "yearsEmployed": 4
  },
  "coApplicant": null,
  "vehicle": {
    "year": 2024,
    "make": "Toyota",
    "model": "Camry",
    "vin": "4T1G11AK5RU123456",
    "mileage": 15,
    "condition": "NEW",
    "retailValue": 35280.00,
    "invoicePrice": 33100.00
  },
  "loan": {
    "amountRequested": 32500.00,
    "termMonths": 72,
    "downPayment": 2780.00,
    "tradeIn": {
      "vin": null,
      "value": 0,
      "payoff": 0
    }
  },
  "addOns": [
    {"type": "EXTENDED_WARRANTY", "amount": 1800.00},
    {"type": "GAP_INSURANCE", "amount": 600.00}
  ]
}
```

> A full v3 schema is planned in [[data/schema-v2.json]] *(intentionally broken — this JSON file does not exist in the vault)*.

## Vehicle Data

The vehicle block must include:
- **VIN** — 17 characters, valid NHTSA check digit
- **Year** — Cannot be more than 1 year in the future
- **Retail Value** — NADA or KBB valuation, used for [[credit-policy/ltv-guidelines|LTV calculation]]
- **Condition** — NEW, USED, or CPO (Certified Pre-Owned)

## Validation

The [[workflow/transaction-intake]] service validates every field. Common errors:

| Issue | Error Code | Reference |
|-------|-----------|-----------|
| Missing SSN | `ERR-1001` | [[data/error-codes.txt]] |
| Invalid SSN format | `ERR-1002` | [[data/error-codes.txt]] |
| Missing DOB | `ERR-1003` | [[data/error-codes.txt]] |

## Sample Data

See [[data/sample-transactions.csv]] for 10 example transactions that conform to this schema.

## Related

- [[dealership/dealer-network]]
- [[dealership/flat-file-import]]
- [[workflow/transaction-intake]]
- [[architecture/api-gateway]]

---

#workflow/intake #compliance/tila

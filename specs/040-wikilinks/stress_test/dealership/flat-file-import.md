# Flat-File Import (Legacy)

#dealership #integration/dealer-api #status/deprecated #priority/low

Some dealers in the [[dealership/dealer-network|dealer network]] — particularly long-tenured Tier-2 and Tier-3 dealerships — have not migrated from SFTP-based flat-file submissions to the REST [[architecture/api-gateway|API]].

## File Format

The legacy format is a **fixed-width text file** with one record per line:

```
Pos  Length  Field               Example
1    8       Dealer Code         DLR-4478
9    30      Applicant Last      Martinez
39   20      Applicant First     Sofia
59   9       SSN                 123456789
68   10      DOB (YYYY-MM-DD)    1990-03-15
78   4       Vehicle Year        2024
82   20      Vehicle Make        Toyota
102  20      Vehicle Model       Camry
122  17      VIN                 4T1G11AK5RU123456
139  10      Loan Amount         0032500.00
149  3       Term (months)       072
152  5       Rate Requested      05.49
```

## Processing

1. Dealers upload files to `sftp://intake.alop.internal/incoming/{dealer_code}/`
2. A cron job polls every 15 minutes
3. Each record is parsed, validated, and converted to the standard [[dealership/dealer-submission-format|JSON format]]
4. Converted records are submitted to [[workflow/transaction-intake]] via internal API
5. Processing results are written to `sftp://intake.alop.internal/results/{dealer_code}/`

## Error Handling

Flat-file parsing errors produce a rejection file in the results directory. Error codes from [[data/error-codes.txt]] are included inline.

## Migration Plan

All flat-file dealers are scheduled for migration to the REST API by Q2 2025. The migration involves:
- API key provisioning per [[dealership/dealer-network#onboarding|onboarding process]]
- DMS integration update
- Parallel-run testing (both flat-file and API for 30 days)

## Known Issues

- Fixed-width format cannot represent add-ons (warranty, GAP) — these must be submitted after approval via [[architecture/api-gateway|API]]
- No real-time status tracking — dealers must check results file
- File naming collisions when dealers upload multiple batches per polling interval

## Related

- [[dealership/dealer-network]]
- [[dealership/dealer-submission-format]]
- [[workflow/transaction-intake]]
- [[data/dealer-codes.txt]]
- [[data/sample-transactions.csv]]

---

#auto-lending #workflow/intake

# @opentrade/adapter-mn-dli

Local-file CSV/XLSX adapter for the Minnesota Department of Labor and Industry license and registration data source.

The official DLI source describes a downloadable spreadsheet for licenses, bonds, certifications, and registrations issued by the Construction Codes and Licensing Division. This package parses local CSV or XLSX snapshots and includes tiny hand-authored fixtures for offline tests.

## Current Scope

- Source ID: `us.mn.dli.licenses_registrations`
- Maturity: `local_file_adapter`
- Network behavior: none
- Default tests: local fixture only

The DLI source spans more than contractor licenses. This adapter keeps type labels and caveats attached and maps trade categories conservatively.

## Fixture

```bash
packages/adapter-mn-dli/fixtures/licenses-registrations-sample.csv
```

The fixture is not public bulk data. It is a tiny hand-authored sample for tests and examples.

## Public Imports

```ts
import {
  MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID,
  minnesotaDliLicensesRegistrationsAdapter,
  normalizeMinnesotaDliStatus,
} from "@opentrade/adapter-mn-dli";
```

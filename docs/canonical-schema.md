# Canonical Schema

The canonical schema is the shape adapters produce after reading an official source. It gives developers a consistent record to work with while keeping the original source record close by.

That second part is important. Normalized fields are convenient, but official data can be incomplete, stale, or shaped by agency-specific rules. A canonical record should make the common fields easy to read without hiding where the data came from.

## What A Record Keeps

A canonical trade-license record includes:

- Source identity, source URL, fetched time, caveats, and redistribution status.
- U.S. jurisdiction fields for state, county, and municipality.
- Agency name and URL.
- License number, normalized number, alternate numbers, type, classifications, and trade categories.
- Business name, DBA name, licensee name, and personnel when the source provides them.
- Raw status codes plus a normalized status.
- Important dates such as issue, effective, expiration, and renewal dates.
- Public-record address and contact fields.
- Optional placeholders for bond, insurance, workers' compensation, complaints, and discipline.
- The raw source record and a stable fingerprint.

## Normalized And Raw Together

Adapters should not throw away source fields just because they do not fit the canonical model yet. Preserve the raw record, then map the fields that are understood. Unknown source values can become warnings instead of hard failures when a useful canonical record can still be produced.

## What The Schema Does Not Decide

The schema does not decide whether a person or business should be hired. It records what an official source said, when it was checked, and what caveats came with that source.

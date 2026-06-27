# Arizona ROC Adapter

Source ID: `us.az.roc.contractors`

Package: `@opentrade/adapter-az-roc`

Maturity: `network_opt_in`

Quality: Level 4

Arizona ROC publishes dated CSV posting lists for all current, commercial, dual, and residential contractors. File names change with the posting date, so callers obtain the current URL from the official posting-list page and pass it explicitly with network consent.

The adapter maps license number, business and DBA names, class code/detail/type, address, qualifying party, issue/expiration dates, and status. Trade mapping is conservative and raw rows remain attached.

The current-contractor posting list is not a historical register. Arizona ROC instructs users to confirm posting information before acting because records can change after publication. No match cannot establish that a license never existed or is absent from another official path.

Default tests use a tiny hand-authored fixture and never download the live list.

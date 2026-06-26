import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("source quality report", () => {
  it("summarizes registry quality in JSON form", () => {
    const result = spawnSync(process.execPath, ["scripts/source-quality-report.mjs", "--json"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");

    const report = JSON.parse(result.stdout);
    expect(report.sourceCount).toBe(56);
    expect(report.stateCount).toBe(51);
    expect(report.researchedStateCount).toBe(51);
    expect(report.territoryCount).toBe(5);
    expect(report.researchedTerritoryCount).toBe(5);
    expect(report.coverageByStatus.not_started ?? 0).toBe(0);
    expect(report.territoryCoverageByStatus.registry_entry_added).toBe(5);
    expect(report.sourcesByMaturity.registry_only).toBe(47);
    expect(report.sourcesByMaturity.fixture_adapter).toBe(8);
    expect(report.sourcesByMaturity.local_file_adapter).toBe(1);
    expect(report.sourcesByAdapterQualityLevel["0"]).toBe(47);
    expect(report.sourcesByAdapterQualityLevel["4"]).toBe(9);
    expect(report.sourcesByResearchOutcome).toEqual({
      adapter_candidate: 8,
      blocked_by_access_controls: 1,
      blocked_by_no_stable_source: 1,
      blocked_by_terms: 2,
      implemented_adapter: 9,
      needs_manual_research: 27,
      not_contractor_specific: 8,
    });
    expect(report.metadataCompleteness.requiredFields).toEqual([
      "documentationUrl",
      "updateFrequency",
      "knownExclusions",
      "rateLimitNotes",
      "publicRecordsNotes",
      "officialBulkDownloadNotes",
      "researchNotes",
      "maintainerNotes",
    ]);
    expect(report.metadataCompleteness.missingRequiredMetadataSources).toEqual([]);
    for (const field of report.metadataCompleteness.requiredFields) {
      expect(report.metadataCompleteness.missingRequiredMetadataByField[field], `${field} should be complete`).toEqual([]);
    }
    expect(report.metadataCompleteness.termsUrlMissingSources.map((source: { id: string }) => source.id)).toEqual([
      "us.as.doc.business_licenses",
      "us.mp.bpl.professional_licenses",
      "us.ms.msboc.contractors",
      "us.vi.dlca.contractors_trades",
    ]);
    expect(report.metadataCompleteness.officialLookupUrlMissingSources.map((source: { id: string }) => source.id)).toEqual([
      "us.as.doc.business_licenses",
    ]);
    expect(report.metadataCompleteness.implementedVerificationCaveatsMissingSources).toEqual([]);
    expect(report.metadataCompleteness.sourcesMissingResearchOutcome).toEqual([]);
    expect(report.metadataCompleteness.sourcesMissingNextAction).toEqual([]);
    expect(report.implementedSourcesNeedingLevel4).toEqual([]);
    expect(report.implementedAdapterSources.map((source: { id: string }) => source.id)).toEqual([
      "us.ak.commerce.construction_contractors",
      "us.ca.cslb.contractors",
      "us.fl.dbpr.construction",
      "us.il.idfpr.roofing_contractors",
      "us.in.pla.professional_licenses",
      "us.mn.dli.licenses_registrations",
      "us.or.ccb.active_licenses",
      "us.tx.tdlr.all_licenses",
      "us.wa.lni.contractors",
    ]);
    expect(report.territorySources.map((source: { id: string }) => source.id)).toEqual([
      "us.as.doc.business_licenses",
      "us.gu.clb.contractors",
      "us.mp.bpl.professional_licenses",
      "us.pr.daco.contractors",
      "us.vi.dlca.contractors_trades",
    ]);
    expect(report.manualPublicRecordsSources).toEqual([
      expect.objectContaining({
        id: "us.as.doc.business_licenses",
        sourceType: "manual_public_records_file",
        adapterMaturity: "registry_only",
      }),
    ]);
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.pa.oag.home_improvement_contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.oh.commerce.ocilb_contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.ct.dcp.home_improvement_contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.wv.labor.contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.ak.commerce.construction_contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.de.labor.construction_contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.dc.dlcp.contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.id.dopl.contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.ri.crlb.contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.il.idfpr.roofing_contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.in.pla.professional_licenses");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.ks.ag.roofing_registration");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.ky.dhbc.trades");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.ms.msboc.contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.gu.clb.contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.pr.daco.contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.vi.dlca.contractors_trades");
    expect(report.bulkCandidates.map((source: { id: string }) => source.id)).toContain("us.fl.dbpr.construction");
    expect(report.unimplementedBulkAdapterCandidates.map((source: { id: string }) => source.id)).toEqual([]);
    expect(report.downloadResearchCandidates.map((source: { id: string }) => source.id)).toEqual([
      "us.az.roc.contractors",
      "us.ct.dcp.home_improvement_contractors",
      "us.ma.dol.opsi_construction_supervisors",
      "us.oh.commerce.ocilb_contractors",
      "us.pa.oag.home_improvement_contractors",
      "us.pr.daco.contractors",
      "us.ri.crlb.contractors",
      "us.wv.labor.contractors",
    ]);
    expect(report.lookupAutomationConstraintSources.map((source: { id: string }) => source.id)).toEqual([
      "us.ks.ag.roofing_registration",
      "us.mi.lara.residential_builders",
      "us.mo.pr.professional_licenses",
      "us.nd.sos.contractors",
      "us.oh.commerce.ocilb_contractors",
      "us.pa.oag.home_improvement_contractors",
      "us.vi.dlca.contractors_trades",
      "us.vt.sos.residential_contractors",
      "us.wi.dsps.dwelling_trades",
    ]);
  });

  it("prints territory and manual-source caution sections in human output", () => {
    const result = spawnSync(process.execPath, ["scripts/source-quality-report.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("implemented adapter sources:");
    expect(result.stdout).toContain("- us.ak.commerce.construction_contractors (html_lookup, fixture_adapter)");
    expect(result.stdout).toContain("- us.ca.cslb.contractors (bulk_xlsx, fixture_adapter)");
    expect(result.stdout).toContain("- us.il.idfpr.roofing_contractors (html_lookup, fixture_adapter)");
    expect(result.stdout).toContain("- us.mn.dli.licenses_registrations (bulk_xlsx, fixture_adapter)");
    expect(result.stdout).toContain("- us.tx.tdlr.all_licenses (bulk_csv, fixture_adapter)");
    expect(result.stdout).toContain("territory sources:");
    expect(result.stdout).toContain("- us.pr.daco.contractors (html_lookup, registry_only)");
    expect(result.stdout).toContain("manual public-records-file sources:");
    expect(result.stdout).toContain("- us.as.doc.business_licenses (manual_public_records_file, registry_only)");
    expect(result.stdout).toContain("sources by research outcome:");
    expect(result.stdout).toContain("- adapter_candidate: 8");
    expect(result.stdout).toContain("metadata completeness:");
    expect(result.stdout).toContain("sources missing required metadata:");
    expect(result.stdout).toContain("- none");
    expect(result.stdout).toContain("sources missing research outcome:");
    expect(result.stdout).toContain("sources missing next action:");
    expect(result.stdout).toContain("sources missing terms URL:");
    expect(result.stdout).toContain("unimplemented bulk adapter candidates:");
    expect(result.stdout).toContain("download/export research candidates:");
    expect(result.stdout).toContain("- us.ma.dol.opsi_construction_supervisors (html_lookup, registry_only)");
    expect(result.stdout).toContain("lookup automation constraint sources:");
    expect(result.stdout).toContain("- us.vt.sos.residential_contractors (html_lookup, registry_only)");
    expect(result.stdout).not.toContain("- us.ca.cslb.contractors (bulk_xlsx, registry_only)");
  });

  it("keeps the database source seed synchronized with the file registry", () => {
    const result = spawnSync(process.execPath, ["scripts/generate-registry-source-seed.mjs", "--check"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });
});

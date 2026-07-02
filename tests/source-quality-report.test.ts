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
    expect(report.sourceCount).toBe(77);
    expect(report.stateCount).toBe(51);
    expect(report.researchedStateCount).toBe(51);
    expect(report.territoryCount).toBe(5);
    expect(report.researchedTerritoryCount).toBe(5);
    expect(report.coverageByStatus.not_started ?? 0).toBe(0);
    expect(report.terminalSourceCount).toBe(77);
    expect(report.blockedSourceCount).toBe(68);
    expect(report.territoryCoverageByStatus.blocked).toBe(5);
    expect(report.sourcesByMaturity.blocked).toBe(68);
    expect(report.sourcesByMaturity.local_file_adapter).toBe(2);
    expect(report.sourcesByMaturity.network_opt_in).toBe(7);
    expect(report.sourcesByAdapterQualityLevel["0"]).toBe(68);
    expect(report.sourcesByAdapterQualityLevel["4"]).toBe(9);
    expect(report.sourcesByResearchOutcome).toEqual({
      blocked: 68,
      deprecated: 0,
      local_file_adapter: 2,
      network_opt_in: 7,
      production_ready: 0,
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
      "us.al.aecb.electrical_contractors",
      "us.as.doc.business_licenses",
      "us.mp.bpl.professional_licenses",
      "us.ms.msboc.contractors",
      "us.nc.ncbeec.electrical_contractors",
      "us.nc.nclicensing.plumbing_heating_fire_sprinkler",
      "us.nc.refrigerationboard.refrigeration_contractors",
      "us.vi.dlca.contractors_trades",
    ]);
    expect(report.metadataCompleteness.termsUrlUnreviewedSources).toEqual([]);
    expect(report.metadataCompleteness.officialLookupUrlMissingSources.map((source: { id: string }) => source.id)).toEqual([
      "us.as.doc.business_licenses",
    ]);
    expect(report.metadataCompleteness.officialLookupUrlUnreviewedSources).toEqual([]);
    expect(report.metadataCompleteness.implementedVerificationCaveatsMissingSources).toEqual([]);
    expect(report.metadataCompleteness.sourcesMissingResearchOutcome).toEqual([]);
    expect(report.metadataCompleteness.sourcesMissingNextAction).toEqual([]);
    expect(report.implementedSourcesNeedingLevel4).toEqual([]);
    expect(report.implementedAdapterSources.map((source: { id: string }) => source.id)).toEqual([
      "us.az.roc.contractors",
      "us.ca.cslb.contractors",
      "us.fl.dbpr.asbestos_contractors",
      "us.fl.dbpr.construction",
      "us.fl.dbpr.electrical_contractors",
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
        adapterMaturity: "blocked",
      }),
      expect.objectContaining({
        id: "us.ga.epd.asbestos_contractors",
        sourceType: "manual_public_records_file",
        adapterMaturity: "blocked",
      }),
    ]);
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.pa.oag.home_improvement_contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.oh.commerce.ocilb_contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.ct.dcp.home_improvement_contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.wv.labor.contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.ak.commerce.construction_contractors");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.ak.commerce.electrical_administrators");
    expect(report.lookupOnlySources.map((source: { id: string }) => source.id)).toContain("us.ak.commerce.mechanical_administrators");
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
    expect(report.downloadResearchCandidates).toEqual([]);
    expect(report.lookupAutomationConstraintSources.map((source: { id: string }) => source.id)).toEqual([
      "us.ak.commerce.construction_contractors",
      "us.ak.commerce.electrical_administrators",
      "us.ak.commerce.mechanical_administrators",
      "us.al.hacr.contractors",
      "us.al.pgfb.plumbers_gas_fitters",
      "us.ks.ag.roofing_registration",
      "us.mi.lara.residential_builders",
      "us.mo.pr.professional_licenses",
      "us.nd.sos.contractors",
      "us.oh.commerce.ocilb_contractors",
      "us.pa.oag.home_improvement_contractors",
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
    expect(result.stdout).toContain("- us.ca.cslb.contractors (bulk_csv, local_file_adapter)");
    expect(result.stdout).toContain("- us.mn.dli.licenses_registrations (bulk_csv, local_file_adapter)");
    expect(result.stdout).toContain("- us.tx.tdlr.all_licenses (bulk_csv, network_opt_in)");
    expect(result.stdout).toContain("territory sources:");
    expect(result.stdout).toContain("- us.pr.daco.contractors (html_lookup, blocked)");
    expect(result.stdout).toContain("manual public-records-file sources:");
    expect(result.stdout).toContain("- us.as.doc.business_licenses (manual_public_records_file, blocked)");
    expect(result.stdout).toContain("sources by research outcome:");
    expect(result.stdout).toContain("- blocked: 68");
    expect(result.stdout).toContain("metadata completeness:");
    expect(result.stdout).toContain("sources missing required metadata:");
    expect(result.stdout).toContain("- none");
    expect(result.stdout).toContain("sources missing research outcome:");
    expect(result.stdout).toContain("sources missing next action:");
    expect(result.stdout).toContain("sources missing terms URL:");
    expect(result.stdout).toContain("sources with undocumented missing terms URL:");
    expect(result.stdout).toContain("sources with undocumented missing official lookup URL:");
    expect(result.stdout).toContain("unimplemented bulk adapter candidates:");
    expect(result.stdout).toContain("download/export research candidates:");
    expect(result.stdout).toContain("- none");
    expect(result.stdout).toContain("lookup automation constraint sources:");
    expect(result.stdout).toContain("- us.ak.commerce.construction_contractors (html_lookup, blocked)");
    expect(result.stdout).toContain("- us.vt.sos.residential_contractors (html_lookup, blocked)");
    expect(result.stdout).not.toContain("- us.ca.cslb.contractors (bulk_csv, blocked)");
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

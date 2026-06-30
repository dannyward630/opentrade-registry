import { describe, expect, it } from "vitest";
import { OPENTRADE_CLI_EXIT_CODES } from "@opentrade-registry/cli/exit-codes";

describe("CLI exit code contract", () => {
  it("keeps the v1 and v2 exit meanings stable", () => {
    expect(OPENTRADE_CLI_EXIT_CODES).toEqual({
      success: 0,
      generalError: 1,
      invalidInput: 2,
      sourceUnavailable: 3,
      noMatch: 4,
      ambiguousMatch: 5,
      validationFailed: 6,
    });
  });
});

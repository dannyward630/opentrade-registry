export const OPENTRADE_CLI_EXIT_CODES = Object.freeze({
  success: 0,
  generalError: 1,
  invalidInput: 2,
  sourceUnavailable: 3,
  noMatch: 4,
  ambiguousMatch: 5,
  validationFailed: 6,
} as const);

export type OpenTradeCliExitCode = typeof OPENTRADE_CLI_EXIT_CODES[keyof typeof OPENTRADE_CLI_EXIT_CODES];

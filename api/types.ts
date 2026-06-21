export type ApiRequest = {
  query: Record<string, string | string[] | undefined>;
};

export type ApiResponse = {
  status(code: number): ApiResponse;
  json(body: unknown): ApiResponse;
};

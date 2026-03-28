declare const Bun: {
  serve(options: {
    hostname?: string;
    port?: number;
    fetch: (request: Request, server?: unknown) => Response | Promise<Response>;
  }): {
    stop(): void;
  };
};

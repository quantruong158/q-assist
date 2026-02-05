export default async (req, res) => {
  const { reqHandler } = await import('../dist/q-assist/server/server.mjs');
  return reqHandler(req, res);
};

export default async (req, res) => {
  const { reqHandler } = await import('../dist/angular-chat-template/server/server.mjs');
  return reqHandler(req, res);
};

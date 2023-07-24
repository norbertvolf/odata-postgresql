export function isMetadataRequest(req) {
  return req.method === "GET" && req.path === "/$metadata";
}

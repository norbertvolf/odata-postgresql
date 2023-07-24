import { isMetadataRequest } from "./lib/metadata.mjs";

function handler(settings, req, res, next) {
  debugger;
  if (isMetadataRequest(req)) {
    res.send("<msg>Service metadata handler</msg>");
  } else {
    const err = new Error("Not Found");
    err.status = 404;
    next(err);
  }
  /*
    //Check settings
    pool.connect().then(
        client => {
            debugger;
        }
    ).catch(() => {
        debugger;
    });
    await client.query('SELECT NOW()')
    client.release()
    */
}

export default handler;

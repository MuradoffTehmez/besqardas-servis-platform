import { createServer } from "node:http";
import { getResponse } from "msw";
import { handlers } from "./handlers";
createServer(async (req, res) => {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const request = new Request(`http://localhost:4000${req.url}`, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      ...(chunks.length ? { body: Buffer.concat(chunks) } : {}),
    });
    const response = await getResponse(handlers, request);
    if (!response) {
      res.writeHead(404);
      res.end("{}");
      return;
    }
    res.statusCode = response.status;
    response.headers.forEach((v, k) => {
      if (k !== "set-cookie") res.setHeader(k, v);
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader("set-cookie", cookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    res.end('{"message":"Mock server error"}');
  }
}).listen(4000, "127.0.0.1", () => console.log("Mock API: http://localhost:4000"));

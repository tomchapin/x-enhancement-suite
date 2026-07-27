import { readFile } from "node:fs/promises";

const port = process.env.CDP_PORT ?? "9229";
const urlPrefix = process.env.CDP_URL_PREFIX ?? "https://x.com/";
const expressionFileIndex = process.argv.indexOf("--file");
const expression =
  expressionFileIndex >= 0
    ? await readFile(process.argv[expressionFileIndex + 1], "utf8")
    : process.argv.slice(2).join(" ");

if (!expression) {
  console.error(
    "Usage: npm run cdp -- '<JavaScript expression>' or npm run cdp -- --file probe.js"
  );
  process.exit(1);
}

const targets = await (
  await fetch(`http://127.0.0.1:${port}/json/list`)
).json();
const target = targets.find(
  (candidate) =>
    candidate.type === "page" && candidate.url.startsWith(urlPrefix)
);

if (!target) {
  throw new Error(`No CDP page target starts with ${urlPrefix}`);
}

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

const id = 1;
socket.send(
  JSON.stringify({
    id,
    method: "Runtime.evaluate",
    params: {
      awaitPromise: true,
      expression,
      returnByValue: true
    }
  })
);

const message = await new Promise((resolve) => {
  socket.addEventListener("message", (event) => {
    const candidate = JSON.parse(event.data);
    if (candidate.id === id) {
      resolve(candidate);
    }
  });
});
socket.close();

if (message.error) {
  throw new Error(message.error.message);
}

if (message.result.exceptionDetails) {
  const description =
    message.result.exceptionDetails.exception?.description ??
    message.result.exceptionDetails.text;
  throw new Error(description);
}

const value = message.result.result.value;
console.log(
  typeof value === "string" ? value : JSON.stringify(value, null, 2)
);

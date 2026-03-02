import Docker from "dockerode";

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

const IMAGE = "node:20-alpine";
const TIMEOUT_MS = 2000;
const MAX_OUTPUT_BYTES = 64_000;

function clampOutput(s) {
  if (!s) return "";
  if (s.length > MAX_OUTPUT_BYTES) return s.slice(0, MAX_OUTPUT_BYTES) + "\n...[truncated]";
  return s;
}

export async function runJavaScript(code) {
  const b64 = Buffer.from(code, "utf8").toString("base64");

  await ensureImage(IMAGE);

  const container = await docker.createContainer({
    Image: IMAGE,
    Cmd: ["sh", "-lc", `
      set -e
      echo "${b64}" | base64 -d > /tmp/main.js
      node /tmp/main.js
    `],
    WorkingDir: "/tmp",
    NetworkDisabled: true,
    Tty: false,
    HostConfig: {
      AutoRemove: true,
      ReadonlyRootfs: true,
      Memory: 128 * 1024 * 1024,
      NanoCpus: 500_000_000, // 0.5 CPU
      PidsLimit: 64,
      SecurityOpt: ["no-new-privileges:true"],
      Tmpfs: {
        "/tmp": "rw,noexec,nosuid,size=64m"
      }
    },
    User: "node"
  });

  const startAt = Date.now();
  let timedOut = false;

  await container.start();

  const timeoutHandle = setTimeout(async () => {
    timedOut = true;
    try { await container.kill(); } catch {}
  }, TIMEOUT_MS);

  let exitCode = -1;
  try {
    const waitRes = await container.wait();
    exitCode = waitRes?.StatusCode ?? -1;
  } finally {
    clearTimeout(timeoutHandle);
  }

  let stdout = "";
  let stderr = "";

  try {
    const logs = await container.logs({ stdout: true, stderr: true });
    const buf = Buffer.from(logs);
    ({ stdout, stderr } = demuxDockerLogs(buf));
  } catch (e) {
    stderr = `Could not read logs: ${e?.message ?? e}`;
  }

  const ms = Date.now() - startAt;

  if (timedOut) {
    stderr = (stderr ? stderr + "\n" : "") + `Timed out after ${TIMEOUT_MS}ms`;
    exitCode = 124;
  }

  return {
    stdout: clampOutput(stdout),
    stderr: clampOutput(stderr),
    exitCode,
    ms
  };
}

async function ensureImage(image) {
  const images = await docker.listImages();
  const has = images.some(img => (img.RepoTags || []).includes(image));
  if (has) return;

  await new Promise((resolve, reject) => {
    docker.pull(image, (err, stream) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, (err2) => (err2 ? reject(err2) : resolve()));
    });
  });
}

// Docker logs er multiplexed (8-byte header per chunk)
function demuxDockerLogs(buffer) {
  let i = 0;
  let out = "";
  let err = "";

  while (i + 8 <= buffer.length) {
    const streamType = buffer[i]; // 1=stdout, 2=stderr
    const size = buffer.readUInt32BE(i + 4);
    i += 8;
    const chunk = buffer.slice(i, i + size).toString("utf8");
    i += size;

    if (streamType === 1) out += chunk;
    else if (streamType === 2) err += chunk;
  }

  return { stdout: out, stderr: err };
}
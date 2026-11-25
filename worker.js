import { EmailMessage } from "cloudflare:email";

const KINDS = ["Bug", "Idea", "Flight phase was wrong", "Other"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/feedback") return env.ASSETS.fetch(request);
    if (request.method !== "POST") return reply(405, "Use POST");
    if (request.headers.get("X-App-Key") !== env.APP_KEY) return reply(403, "Forbidden");

    let body;
    try { body = await request.json(); } catch { return reply(400, "Bad JSON"); }
    const clean = (v, n) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
    const message = String(body.message ?? "").trim().slice(0, 5000);
    if (!message) return reply(400, "Empty message");
    const kind = KINDS.includes(body.kind) ? body.kind : "Other";
    const phase = clean(body.phase, 60);
    const route = clean(body.route, 20);
    const contact = clean(body.contact, 200);
    const app = clean(body.app, 40);
    const os = clean(body.os, 40);

    const subject = `Glidepal feedback: ${kind}${route ? ` (${route})` : ""}`.replace(/[^\x20-\x7E]/g, "-");
    const text = [
      message, "",
      "---",
      `Type: ${kind}`,
      route && `Route: ${route}`,
      phase && `Phase: ${phase}`,
      contact && `Contact: ${contact}`,
      `App: ${app}  iOS: ${os}`,
    ].filter(Boolean).join("\n");

    const raw = [
      `From: Glidepal App <feedback@glidepalapp.com>`,
      `To: clive@flyoversolutions.net`,
      `Subject: ${subject}`,
      `Message-ID: <${crypto.randomUUID()}@glidepalapp.com>`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      text,
    ].join("\r\n");

    try {
      await env.FEEDBACK.send(new EmailMessage("feedback@glidepalapp.com", "clive@flyoversolutions.net", raw));
    } catch (e) {
      return reply(502, "Could not send");
    }
    return reply(200, "Thanks");
  },
};

function reply(status, msg) {
  return Response.json({ ok: status === 200, message: msg }, { status });
}

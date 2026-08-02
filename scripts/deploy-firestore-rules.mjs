import { readFile } from "node:fs/promises";
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";

const serviceAccount = JSON.parse(await readFile(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8"));
const rules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");
const app = getApps().length ? getApp() : initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const { access_token: accessToken } = await app.options.credential.getAccessToken();
const headers = { authorization: `Bearer ${accessToken}`, "content-type": "application/json" };
const projectName = `projects/${serviceAccount.project_id}`;

const rulesetResponse = await fetch(`https://firebaserules.googleapis.com/v1/${projectName}/rulesets`, {
  method: "POST", headers,
  body: JSON.stringify({ source: { files: [{ name: "firestore.rules", content: rules }] } }),
});
if (!rulesetResponse.ok) throw new Error(`Create ruleset failed: ${rulesetResponse.status} ${await rulesetResponse.text()}`);
const ruleset = await rulesetResponse.json();

let releaseResponse = await fetch(`https://firebaserules.googleapis.com/v1/${projectName}/releases/cloud.firestore`, {
  method: "PATCH", headers,
  body: JSON.stringify({
    release: { name: `${projectName}/releases/cloud.firestore`, rulesetName: ruleset.name },
    updateMask: "rulesetName",
  }),
});
if (releaseResponse.status === 404) {
  releaseResponse = await fetch(`https://firebaserules.googleapis.com/v1/${projectName}/releases`, {
    method: "POST", headers,
    body: JSON.stringify({ name: `${projectName}/releases/cloud.firestore`, rulesetName: ruleset.name }),
  });
}
if (!releaseResponse.ok) throw new Error(`Release ruleset failed: ${releaseResponse.status} ${await releaseResponse.text()}`);
console.log(`Deployed ${ruleset.name} to cloud.firestore`);

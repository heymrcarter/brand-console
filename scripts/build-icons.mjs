// Builds console/icons.js: the approved icon set, taken from Lucide (ISC license).
// Run: node scripts/build-icons.mjs   (needs lucide-react installed)
import fs from "node:fs";
import path from "node:path";
const dir = "node_modules/lucide-react/dist/esm/icons";
const CATS = [
  ["health", "Health and care", "heart-pulse activity stethoscope pill pill-bottle syringe thermometer hospital ambulance cross bandage heart-handshake brain eye ear bone accessibility microscope test-tube flask-conical dna scan-heart clipboard-plus hand-heart apple salad dumbbell bed-double tablets scale"],
  ["people", "People and account", "user users user-plus user-check user-minus user-round users-round contact id-card circle-user baby hand-helping smile lock lock-open key-round shield shield-check fingerprint-pattern log-in log-out"],
  ["talk", "Talk and messages", "phone phone-call phone-missed phone-incoming mail mail-open message-circle message-square messages-square send inbox at-sign bell bell-off bell-ring video headset voicemail megaphone languages mic mic-off"],
  ["time", "Dates and time", "calendar calendar-days calendar-check calendar-plus calendar-x calendar-clock clock clock-alert timer hourglass alarm-clock history sunrise sunset"],
  ["money", "Money and bills", "credit-card wallet receipt banknote dollar-sign piggy-bank landmark hand-coins calculator badge-dollar-sign circle-dollar-sign percent coins"],
  ["files", "Files and forms", "file file-text file-check file-plus file-x files folder folder-open clipboard clipboard-check clipboard-list notebook-pen book-open paperclip printer download upload share signature scroll-text"],
  ["arrows", "Arrows and moving around", "arrow-left arrow-right arrow-up arrow-down chevron-left chevron-right chevron-up chevron-down chevrons-left chevrons-right move-right undo-2 redo-2 refresh-cw rotate-ccw external-link corner-down-right arrow-up-right"],
  ["actions", "Actions", "plus minus x check pencil trash-2 copy save search filter sliders-horizontal settings ellipsis ellipsis-vertical menu grip-vertical zoom-in zoom-out maximize-2 minimize-2 link unlink eye eye-off star heart bookmark thumbs-up pin"],
  ["status", "Status and alerts", "info circle-alert triangle-alert octagon-alert circle-check circle-x circle-help circle-plus circle-minus badge-check badge-alert loader-circle ban shield-alert flag sparkles"],
  ["places", "Places and travel", "house building building-2 map map-pin navigation locate car bus train-front plane parking-meter store globe compass"],
  ["devices", "Devices and media", "monitor laptop smartphone tablet printer camera image play pause volume-2 volume-x wifi battery bluetooth qr-code"],
  ["data", "Charts and layout", "chart-column chart-line chart-pie trending-up trending-down table layout-grid layout-list list list-checks list-ordered columns-2 panel-left kanban gauge"],
];
const out = {}, cats = [], missing = [];
for (const [id, label, names] of CATS) {
  const list = [];
  for (const asked of names.split(/\s+/)) {
    let n = asked, f = path.join(dir, n + ".mjs");
    if (!fs.existsSync(f)) { missing.push(n); continue; }
    let mod = await import(path.resolve(f));
    // Old names point to a newer icon. Use the icon's own name, so it matches lucide-react.
    if (!mod.__iconData) { const to = fs.readFileSync(f, "utf8").match(/from '\.\/(.+?)\.mjs'/)[1]; n = to; mod = await import(path.resolve(dir, to + ".mjs")); }
    if (list.includes(n)) continue;
    if (!out[n]) out[n] = mod.__iconData.node.map(([tag, a]) => `<${tag} ${Object.entries(a).filter(([k]) => k !== "key").map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join("");
    list.push(n);
  }
  cats.push([id, label, list]);
}
const js = `/* The approved icon set. Built from Lucide (ISC license) by scripts/build-icons.mjs. Do not edit by hand. */\nconst ICON_SET={name:"Lucide",version:${JSON.stringify(JSON.parse(fs.readFileSync("node_modules/lucide-react/package.json", "utf8")).version)},license:"ISC"};\nconst ICON_CATS=${JSON.stringify(cats)};\nconst ICONS=${JSON.stringify(out)};\n`;
fs.writeFileSync("console/icons.js", js);
console.log(`Wrote console/icons.js with ${Object.keys(out).length} icons in ${cats.length} groups.`, missing.length ? "Missing: " + missing.join(", ") : "");

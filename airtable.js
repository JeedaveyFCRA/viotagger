// 🔐 Airtable API Settings (LIVE)
const AIRTABLE_TOKEN = 'Bearer patiiNzMeWbsIHD29.b5c3d562339758fef9d454a5f7b25aa5702f10a8e0d1506d8682de7ddbf80e77';
const AIRTABLE_BASE_ID = 'apppDRYBhN8W65aL5';
const AIRTABLE_TABLE_NAME = 'ExportedViolations';

// 🌐 Airtable Endpoint
const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

// 🚀 Sync Function
async function syncToAirtable(btn) {
  console.log("🔁 syncToAirtable() started");
  btn.classList.add("button-active");

  const mode = document.getElementById("modeSelector")?.value || "unspecified";
  let count = 0;

  try {
    for (const [image, tags] of Object.entries(allImageData)) {
      for (const tag of tags) {
        const record = {
          fields: {
            Image: image,
            Severity: tag.severity,
            Label: tag.label,
            Codes: tag.codes.join("; "),
            X: tag.x,
            Y: tag.y,
            Width: tag.width,
            Height: tag.height,
            Mode: mode,
            SOF: tag.sof === true
          }
        };

        console.log("📡 Syncing tag to Airtable:", record); // ✅ Log per record

        const response = await fetch(AIRTABLE_URL, {
          method: "POST",
          headers: {
            Authorization: AIRTABLE_TOKEN,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(record)
        });

        if (!response.ok) {
          console.error("Airtable error:", await response.text());
          showStatus("❌ Airtable sync failed", 5000);
          return;
        }

        count++;
      }
    }

    showStatus(`✅ Successfully sent ${count} tag(s) to Airtable`, 4000);
  } catch (err) {
    console.error("Airtable sync error:", err);
    showStatus("❌ Airtable sync failed. See console.", 5000);
  } finally {
    console.log("🔁 Resetting button:", btn?.id); // ✅ Confirm cleanup runs
    resetButtonState(btn);
  }
}



// 🖱️ Connect to Top Panel Button
document.getElementById("syncAirtable").addEventListener("click", function () {
  const btn = this;
  openPreviewModal(() => syncToAirtable(btn));
});
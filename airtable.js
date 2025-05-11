// 🔐 Airtable API Settings
const AIRTABLE_TOKEN = 'Bearer pat...'; // your token
const AIRTABLE_BASE_ID = 'apppDRYBhN8W65aL5';
const AIRTABLE_TABLE_NAME = 'ExportedViolations';

// 🌐 Airtable Endpoint
const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

// 🚀 Sync Function
async function syncToAirtable(btn) {
  btn.classList.add("button-active");
  
  try {
    // Check if we have any data to sync
    const hasData = Object.values(allImageData).some(tags => tags.length > 0);
    if (!hasData) {
      showStatus("⚠️ No data to sync", 3000);
      return;
    }

    const mode = document.getElementById("modeSelector")?.value || "unspecified";
    let count = 0;
    let errors = 0;

    // Show progress
    showStatus("🔄 Starting Airtable sync...", 0);

    for (const [image, tags] of Object.entries(allImageData)) {
      for (const tag of tags) {
        try {
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

          const response = await fetch(AIRTABLE_URL, {
            method: "POST",
            headers: {
              Authorization: AIRTABLE_TOKEN,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(record)
          });

          if (!response.ok) {
            const error = await response.text();
            console.error("Airtable error:", error);
            errors++;
            continue;
          }

          count++;
          showStatus(`🔄 Syncing (${count} sent, ${errors} errors)...`, 0);
        } catch (err) {
          console.error("Error sending tag:", err);
          errors++;
        }
      }
    }

    if (errors > 0) {
      showStatus(`⚠️ Sync completed with ${errors} error(s)`, 5000);
    } else {
      showStatus(`✅ Successfully synced ${count} tag(s)`, 4000);
    }
  } catch (err) {
    console.error("Airtable sync error:", err);
    showStatus("❌ Sync failed. Check console.", 5000);
  } finally {
    resetButtonState(btn);
  }
}



// 🖱️ Wire to Sync Button with Preview Modal
document.getElementById("syncAirtable").addEventListener("click", function () {
  const btn = this;
  openPreviewModal(() => syncToAirtable(btn));
});

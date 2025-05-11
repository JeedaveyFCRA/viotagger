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
      throw new Error("No data to sync"); // This will trigger the catch block
    }

    const mode = document.getElementById("modeSelector")?.value || "unspecified";
    let count = 0;
    let errors = 0;

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

          const result = await response.json();
          if (!result.id) {
            throw new Error("No record ID returned from Airtable");
          }

          count++;
          showStatus(`🔄 Synced ${count} tags...`, 0);
        } catch (err) {
          console.error("Error sending tag:", err);
          errors++;
        }
      }
    }

    if (errors > 0) {
      throw new Error(`Completed with ${errors} errors`);
    }

    showStatus(`✅ Successfully synced ${count} tag(s)`, 4000);
  } catch (err) {
    console.error("Airtable sync error:", err);
    showStatus("❌ Sync failed. See console.", 5000);
    // Ensure button resets even on error
    btn.classList.remove("button-active");
    return false; // Return false to indicate failure
  } finally {
    // Always reset button state
    setTimeout(() => {
      btn.classList.remove("button-active");
    }, 1000);
  }
  return true; // Return true on success
}

// 🖱️ Wire to Sync Button with Preview Modal
document.getElementById("syncAirtable").addEventListener("click", function() {
  const btn = this;
  btn.classList.add("button-active");
  
  openPreviewModal(async () => {
    const success = await syncToAirtable(btn);
    if (!success) {
      btn.classList.remove("button-active");
    }
  });
});
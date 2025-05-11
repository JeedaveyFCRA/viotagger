// 🔐 Airtable API Settings
const AIRTABLE_TOKEN = 'Bearer patiiNzMeWbsIHD29.b5c3d562339758fef9d454a5f7b25aa5702f10a8e0d1506d8682de7ddbf80e77';
const AIRTABLE_BASE_ID = 'apppDRYBhN8W65aL5';
const AIRTABLE_TABLE_NAME = 'ExportedViolations';

// 🌐 Airtable Endpoint
const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

async function syncToAirtable(btn) {
  try {
    // Visual feedback
    setButtonState(btn, 'processing');
    showStatus("🔄 Connecting to Airtable...", 2000);

    // Check for data
    if (!Object.values(allImageData).some(tags => tags.length > 0)) {
      showStatus("⚠️ No tags to sync", 3000);
      setButtonState(btn, 'error');
      setTimeout(() => setButtonState(btn, 'default'), 2000);
      return false;
    }

    const mode = document.getElementById("modeSelector")?.value || "unspecified";
    let successCount = 0;
    let errorCount = 0;

    // Process all tags
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
              SOF: tag.sof
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
  const errMsg = `❌ Airtable Error: HTTP ${response.status} — Check API token or base/table config.`;
  console.error(errMsg);
  showStatus(errMsg, 5000);
  throw new Error(errMsg);
}

          successCount++;
          showStatus(`✓ Syncing: ${successCount} sent...`, 1000);
        } catch (err) {
          errorCount++;
          console.error(`Failed to sync tag:`, err);
        }
      }
    }

    // Final status
    if (errorCount > 0) {
      showStatus(`⚠️ Completed with ${errorCount} error(s)`, 4000);
      setButtonState(btn, 'error');
    } else {
      showStatus(`✅ Success! ${successCount} tags synced`, 4000);
      setButtonState(btn, 'success');
    }

    return true;
  } catch (err) {
    console.error("Airtable sync failed:", err);
    showStatus("❌ Sync failed - check console", 4000);
    setButtonState(btn, 'error');
    return false;
  } finally {
    // Always reset after delay
    setTimeout(() => setButtonState(btn, 'default'), 3000);
  }
}

// Update the event listener
document.addEventListener("DOMContentLoaded", () => {
  const syncBtn = document.getElementById("syncAirtable");
  if (syncBtn) {
    syncBtn.addEventListener("click", function () {
      const btn = this;
      openPreviewModal(() => {
        syncToAirtable(btn).catch(err => {
          console.error("Sync error:", err);
          setButtonState(btn, 'error');
        });
      });
    });
  } else {
    console.warn("❌ #syncAirtable button not found in DOM.");
  }
});
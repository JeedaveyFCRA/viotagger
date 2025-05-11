// 🔐 Airtable API Settings (LIVE)
const AIRTABLE_TOKEN = 'Bearer patiiNzMeWbsIHD29.b5c3d562339758fef9d454a5f7b25aa5702f10a8e0d1506d8682de7ddbf80e77';
const AIRTABLE_BASE_ID = 'apppDRYBhN8W65aL5';
const AIRTABLE_TABLE_NAME = 'ExportedViolations';
const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

// 🚀 Airtable Sync Function
async function syncToAirtable() {
  const btn = document.getElementById("syncAirtable");
  btn.classList.add('button-active');

  const mode = document.getElementById("modeSelector")?.value || "unspecified";
  let count = 0;

  try {
    if (typeof allImageData !== 'object' || Object.keys(allImageData).length === 0) {
      showStatus("⚠️ No tag data available to sync", 3000);
      return;
    }

    const tagCount = Object.values(allImageData).reduce((sum, tags) => sum + (Array.isArray(tags) ? tags.length : 0), 0);
    if (tagCount === 0) {
      showStatus("⚠️ No tag boxes found to sync", 3000);
      return;
    }

    openPreviewModal(async () => {
      try {
        for (const [image, tags] of Object.entries(allImageData)) {
          for (const tag of tags) {
            const record = {
              fields: {
                Image: image || "unknown",
                Severity: tag.severity || "unspecified",
                Label: tag.label || "",
                Codes: Array.isArray(tag.codes) ? tag.codes.join("; ") : "",
                X: typeof tag.x === 'number' ? tag.x : 0,
                Y: typeof tag.y === 'number' ? tag.y : 0,
                Width: typeof tag.width === 'number' ? tag.width : 0,
                Height: typeof tag.height === 'number' ? tag.height : 0,
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
              const errorText = await response.text();
              console.error("❌ Airtable sync error:", errorText);
              showStatus(`❌ Airtable sync failed: ${response.status}`, 5000);
              return;
            }

            count++;
          }
        }

        showStatus(`✅ Successfully synced ${count} tag(s) to Airtable`, 4000);
      } catch (syncErr) {
        console.error("❌ Sync execution error:", syncErr);
        showStatus("❌ Sync error occurred. Check console for details.", 5000);
      }
    });
  } catch (prepErr) {
    console.error("❌ Sync preparation error:", prepErr);
    showStatus("❌ Error preparing data for Airtable sync", 5000);
  } finally {
    setTimeout(() => {
      btn.classList.remove('button-active');
      btn.blur();
    }, 200);
  }
}

// 🖱️ Bind Button to Sync Handler
document.getElementById("syncAirtable").addEventListener("click", syncToAirtable);

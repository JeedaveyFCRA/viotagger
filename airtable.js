// 🔐 Airtable API Settings (LIVE)
const AIRTABLE_TOKEN = 'Bearer patiiNzMeWbsIHD29.b5c3d562339758fef9d454a5f7b25aa5702f10a8e0d1506d8682de7ddbf80e77';
const AIRTABLE_BASE_ID = 'apppDRYBhN8W65aL5';
const AIRTABLE_TABLE_NAME = 'ExportedViolations';
const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

// 🚀 Airtable Sync Function
async function syncToAirtable() {
  const btn = document.getElementById("syncAirtable");
  btn.classList.add('button-active');
  
  // Show initial status
  showStatus("⏳ Starting Airtable sync...", 2000);

  const mode = document.getElementById("modeSelector")?.value || "unspecified";
  let count = 0;
  let errorCount = 0;

  try {
    // Validate data exists
    if (typeof allImageData !== 'object' || Object.keys(allImageData).length === 0) {
      showStatus("⚠️ No tag data available to sync", 3000);
      return;
    }

    // Count total tags
    const tagCount = Object.values(allImageData).reduce((sum, tags) => sum + (Array.isArray(tags) ? tags.length : 0), 0);
    if (tagCount === 0) {
      showStatus("⚠️ No tag boxes found to sync", 3000);
      return;
    }

    // Open preview modal
    openPreviewModal(async () => {
      try {
        showStatus(`⏳ Syncing ${tagCount} tags to Airtable...`, 0); // 0 = persistent message
        
        // Process all tags
        for (const [image, tags] of Object.entries(allImageData)) {
          for (const tag of tags) {
            try {
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

              // API request with timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
              
              const response = await fetch(AIRTABLE_URL, {
                method: "POST",
                headers: {
                  Authorization: AIRTABLE_TOKEN,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(record),
                signal: controller.signal
              });
              clearTimeout(timeoutId);

              if (!response.ok) {
                const errorText = await response.text();
                console.error("❌ Airtable sync error:", errorText);
                errorCount++;
                continue; // Skip to next record on failure
              }

              count++;
              
              // Update progress periodically
              if (count % 5 === 0 || count === tagCount) {
                showStatus(`⏳ Synced ${count}/${tagCount} tags (${errorCount} errors)...`, 0);
              }
            } catch (recordError) {
              console.error("❌ Error processing record:", recordError);
              errorCount++;
              showStatus(`⚠️ Error on record ${count + 1}/${tagCount}`, 2000);
            }
          }
        }

        // Final status
        if (errorCount > 0) {
          showStatus(`⚠️ Completed with ${errorCount} errors (${count} successful)`, 5000);
        } else {
          showStatus(`✅ Successfully synced ${count} tags to Airtable`, 5000);
        }
      } catch (syncErr) {
        console.error("❌ Sync execution error:", syncErr);
        showStatus("❌ Sync failed - check console for details", 5000);
      }
    });
  } catch (prepErr) {
    console.error("❌ Sync preparation error:", prepErr);
    showStatus("❌ Error preparing sync data", 5000);
  } finally {
    setTimeout(() => {
      btn.classList.remove('button-active');
      btn.blur();
    }, 200);
  }
}

// 🖱️ Bind Button to Sync Handler
document.getElementById("syncAirtable").addEventListener("click", syncToAirtable);

// Helper function to show status messages
function showStatus(message, duration = 3000) {
  const statusBox = document.getElementById("status-message");
  if (!statusBox) return;
  
  // Clear any existing timeout
  if (statusBox._timeoutId) {
    clearTimeout(statusBox._timeoutId);
  }
  
  // Show message with appropriate styling
  statusBox.textContent = message;
  statusBox.style.opacity = "1";
  
  // Apply color based on message type
  if (message.includes("❌") || message.includes("⚠️")) {
    statusBox.style.backgroundColor = "#f44336"; // Red for errors
  } else if (message.includes("✅")) {
    statusBox.style.backgroundColor = "#4caf50"; // Green for success
  } else {
    statusBox.style.backgroundColor = "#2196f3"; // Blue for info
  }
  
  // Auto-hide if duration is specified
  if (duration > 0) {
    statusBox._timeoutId = setTimeout(() => {
      statusBox.style.opacity = "0";
    }, duration);
  }
}
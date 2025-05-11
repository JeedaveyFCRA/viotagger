// 🚀 Sync Function
async function syncToAirtable() {
  const btn = document.getElementById("syncAirtable");
  btn.classList.add('button-active');
  
  const mode = document.getElementById("modeSelector")?.value || "unspecified";
  let count = 0;
  
  try {
    // Check if we have any data to sync
    const tagCount = Object.values(allImageData).reduce((sum, tags) => sum + tags.length, 0);
    if (tagCount === 0) {
      showStatus("⚠️ No data to sync to Airtable", 3000);
      return;
    }
    
    // Show preview modal before syncing
    openPreviewModal(async () => {
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
                SOF: tag.sof === true // Airtable boolean
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
              console.error("Airtable error", errorText);
              showStatus("❌ Airtable sync failed", 5000);
              return;
            }
            count++;
          }
        }

        showStatus(`✅ Successfully sent ${count} tag(s) to Airtable`, 4000);
      } catch (err) {
        console.error("Airtable sync error", err);
        showStatus("❌ Airtable sync failed. See console.", 5000);
      }
    });
  } catch (err) {
    console.error("Airtable sync preparation error", err);
    showStatus("❌ Error preparing Airtable sync", 5000);
  } finally {
    // Reset button state after short delay
    setTimeout(() => {
      btn.classList.remove('button-active');
      btn.blur();
    }, 200);
  }
}

// 🖱️ Connect to Top Panel Button
document.getElementById("syncAirtable").addEventListener("click", syncToAirtable);
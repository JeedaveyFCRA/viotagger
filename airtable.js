// 🔐 Airtable API Settings (LIVE)
const AIRTABLE_TOKEN = 'Bearer patiiNzMeWbsIHD29.b5c3d562339758fef9d454a5f7b25aa5702f10a8e0d1506d8682de7ddbf80e77';
const AIRTABLE_BASE_ID = 'apppDRYBhN8W65aL5';
const AIRTABLE_TABLE_NAME = 'ExportedViolations';
const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

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

// Function to open preview modal with tag data
function openPreviewModal(callback) {
  const modal = document.getElementById('previewModal');
  const confirmButton = document.getElementById('previewConfirm');
  const cancelButton = document.getElementById('previewCancel');
  const tableBody = document.querySelector('#previewTable tbody');
  
  if (!modal || !tableBody) {
    console.error("❌ Preview modal elements not found");
    if (typeof callback === 'function') callback(); // Call callback anyway to proceed
    return;
  }
  
  // Clear existing rows
  tableBody.innerHTML = '';
  
  // Add rows for each tag
  try {
    const mode = document.getElementById("modeSelector")?.value || "unspecified";
    
    // Standardize mode value to match Airtable's expected values
    const normalizedMode = mode.toLowerCase() === "final mode" ? "final" : 
                           mode.toLowerCase() === "sample mode" ? "sample" : 
                           "sample"; // Default to sample as fallback
    
    // Populate table with tag data
    for (const [image, tags] of Object.entries(allImageData)) {
      if (!Array.isArray(tags)) continue;
      
      for (const tag of tags) {
        const row = document.createElement('tr');
        
        // Create table cells
        const cells = [
          image || "unknown",
          tag.severity || "unspecified",
          tag.label || "",
          Array.isArray(tag.codes) ? tag.codes.join("; ") : "",
          normalizedMode
        ];
        
        // Add cells to row
        cells.forEach(text => {
          const td = document.createElement('td');
          td.textContent = text;
          td.style.padding = '4px';
          td.style.borderBottom = '1px solid #eee';
          row.appendChild(td);
        });
        
        tableBody.appendChild(row);
      }
    }
    
    // Show the modal
    modal.style.display = 'block';
    
    // Setup event handlers
    const handleConfirm = () => {
      modal.style.display = 'none';
      confirmButton.removeEventListener('click', handleConfirm);
      cancelButton.removeEventListener('click', handleCancel);
      if (typeof callback === 'function') callback();
    };
    
    const handleCancel = () => {
      modal.style.display = 'none';
      confirmButton.removeEventListener('click', handleConfirm);
      cancelButton.removeEventListener('click', handleCancel);
    };
    
    confirmButton.addEventListener('click', handleConfirm);
    cancelButton.addEventListener('click', handleCancel);
    
  } catch (e) {
    console.error("❌ Error populating preview modal:", e);
    if (typeof callback === 'function') callback(); // Call callback anyway to proceed
  }
}

// 🚀 Airtable Sync Function
async function syncToAirtable() {
  const btn = document.getElementById("syncAirtable");
  btn.classList.add('button-active');
  
  // Show initial status
  showStatus("⏳ Starting Airtable sync...", 2000);

  // Get mode and normalize it to match Airtable's options
  const modeElement = document.getElementById("modeSelector");
  const modeValue = modeElement?.value || "unspecified";
  
  // Normalize mode to one of the allowed values in Airtable
  // This is critical - using exact strings that match your Airtable's predefined options
  const mode = modeValue.toLowerCase().includes("final") ? "final" :
               modeValue.toLowerCase().includes("sample") ? "sample" : 
               "sample"; // Default to sample as fallback
  
  let count = 0;
  let errorCount = 0;

  try {
    // Validate data exists
    if (typeof allImageData !== 'object' || Object.keys(allImageData).length === 0) {
      showStatus("⚠️ No tag data available to sync", 3000);
      btn.classList.remove('button-active');
      return;
    }

    // Count total tags
    const tagCount = Object.values(allImageData).reduce((sum, tags) => sum + (Array.isArray(tags) ? tags.length : 0), 0);
    if (tagCount === 0) {
      showStatus("⚠️ No tag boxes found to sync", 3000);
      btn.classList.remove('button-active');
      return;
    }

    // Open preview modal
    openPreviewModal(async () => {
      try {
        showStatus(`⏳ Syncing ${tagCount} tags to Airtable...`, 0); // 0 = persistent message
        
        // Process all tags
        for (const [image, tags] of Object.entries(allImageData)) {
          if (!Array.isArray(tags)) continue;
          
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
                  Mode: mode, // Using normalized mode value
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
                const errorData = await response.json();
                console.error("❌ Airtable sync error:", errorData);
                
                // Check for specific error types and provide better feedback
                if (errorData?.error?.type === "INVALID_MULTIPLE_CHOICE_OPTIONS") {
                  showStatus(`❌ Mode "${mode}" not allowed in Airtable - check settings`, 5000);
                  errorCount++;
                  return; // Stop further syncing on field validation errors
                } else {
                  errorCount++;
                }
                continue; // Skip to next record on other failures
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
      } finally {
        btn.classList.remove('button-active');
      }
    });
  } catch (prepErr) {
    console.error("❌ Sync preparation error:", prepErr);
    showStatus("❌ Error preparing sync data", 5000);
    btn.classList.remove('button-active');
  }
}

// 🖱️ Bind Button to Sync Handler
document.getElementById("syncAirtable").addEventListener("click", syncToAirtable);
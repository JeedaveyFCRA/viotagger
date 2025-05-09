// ========== GLOBAL STATE ==========
let isDrawing = false;
let isMultiSelectMode = false;
let startX, startY;
let currentBox = null;
let currentHints = [];
let tagData = [];
let allImageData = {};
let imageName = "";

// ========== DOM ELEMENTS ==========
const imageContainer = document.getElementById("image-container");
const reportImg = document.getElementById("report-img");
const popup = document.getElementById("popup");
const violationPreset = document.getElementById("violationPreset");
const saveTagBtn = document.getElementById("saveTag");
const cancelTagBtn = document.getElementById("cancelTag");
const statusBox = document.getElementById("status-message");

// ========== INITIAL LOAD ==========
loadAllProgress();

// ========== IMAGE DRAWING ==========
imageContainer.addEventListener("mousedown", (e) => {
  e.preventDefault(); // 👈 disables default browser selection behavior (blue box highlight)

  if (e.target.classList.contains("draw-box") || e.target.classList.contains("resize-handle")) return;

  clearSelection();
  isDrawing = true;
  const rect = imageContainer.getBoundingClientRect();
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;

  currentBox = document.createElement("div");
  currentBox.className = "draw-box";
  currentBox.style.left = `${startX}px`;
  currentBox.style.top = `${startY}px`;
  imageContainer.appendChild(currentBox);
});

imageContainer.addEventListener("mousemove", (e) => {
  if (!isDrawing || !currentBox) return;
  const rect = imageContainer.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;
  let width = Math.abs(x - startX);
  let height = Math.abs(y - startY);
  currentBox.style.width = `${width}px`;
  currentBox.style.height = `${height}px`;
  currentBox.style.left = `${Math.min(x, startX)}px`;
  currentBox.style.top = `${Math.min(y, startY)}px`;
});

imageContainer.addEventListener("mouseup", (e) => {
  if (!isDrawing || !currentBox) return;
  isDrawing = false;

  const boxRect = currentBox.getBoundingClientRect();
  if (currentBox.offsetWidth < 10 || currentBox.offsetHeight < 10) {
    imageContainer.removeChild(currentBox);
    currentBox = null;
    return;
  }

  showPopup(e.clientX, e.clientY);
});

// ========== POPUP TAGGING ==========
saveTagBtn.addEventListener("click", () => {
  const selectedIndex = violationPreset.selectedIndex;
  if (selectedIndex <= 0) return showStatus("⚠️ Please select a violation", 4000);

  const hint = currentHints[selectedIndex - 1];
  const rect = currentBox.getBoundingClientRect();
  const parentRect = imageContainer.getBoundingClientRect();

  const x = rect.left - parentRect.left;
  const y = rect.top - parentRect.top;

  const tag = {
    label: hint.label,
    codes: hint.covers,
    severity: hint.severity,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(currentBox.offsetWidth),
    height: Math.round(currentBox.offsetHeight)
  };

  tagData.push(tag);
  if (!allImageData[imageName]) allImageData[imageName] = [];
  allImageData[imageName] = tagData;

  currentBox.classList.add("selected");
  updateTagLog();
  saveAllProgress();
  popup.style.display = "none";
  currentBox = null;
  showStatus("✅ Violation tag added", 3000);
});

cancelTagBtn.addEventListener("click", () => {
  if (currentBox) {
    imageContainer.removeChild(currentBox);
    currentBox = null;
  }
  popup.style.display = "none";
});

// ========== STATUS MESSAGES ==========
function showStatus(msg, duration = 3000) {
  statusBox.textContent = msg;
  statusBox.style.display = "block";
  setTimeout(() => statusBox.style.display = "none", duration);
}

// ========== DROPDOWN CHAIN LOGIC ==========
const bureauSelect = document.getElementById("bureauSelect");
const creditorSelect = document.getElementById("creditorSelect");
const dateSelect = document.getElementById("dateSelect");

bureauSelect.addEventListener("change", function () {
  const bureau = bureauSelect.value;
  creditorSelect.innerHTML = '<option disabled selected>Select Creditor</option>';
  creditorSelect.disabled = false;
  dateSelect.innerHTML = '<option disabled selected>Select Date/Page</option>';
  dateSelect.disabled = true;

  if (imageMap[bureau]) {
    Object.keys(imageMap[bureau]).forEach((creditorCode) => {
      const option = document.createElement("option");
      option.value = creditorCode;
      option.textContent = creditorCode;
      creditorSelect.appendChild(option);
    });
  }
});

creditorSelect.addEventListener("change", function () {
  const bureau = bureauSelect.value;
  const creditor = creditorSelect.value;

  dateSelect.innerHTML = '<option disabled selected>Select Date/Page</option>';
  dateSelect.disabled = false;

  if (imageMap[bureau] && imageMap[bureau][creditor]) {
    imageMap[bureau][creditor].forEach((datePage) => {
      const option = document.createElement("option");
      option.value = datePage;
      option.textContent = datePage;
      dateSelect.appendChild(option);
    });
  }
});

// ========== POPULATE DROPDOWN WITH HINTS ==========
function populateDropdown() {
  violationPreset.innerHTML = '<option disabled selected>Select a violation</option>';
  if (!imageName.includes("-")) return;

  const bureauCode = imageName.includes("-EQ-") ? "EQ" : imageName.includes("-EX-") ? "EX" : "TU";
  currentHints = hintLookup[bureauCode] || [];

  currentHints.forEach((hint) => {
    const option = document.createElement("option");
    option.textContent = `${hint.severity} ${hint.label} (${hint.covers.length} code${hint.covers.length > 1 ? 's' : ''})`;
    violationPreset.appendChild(option);
  });
}

function renderHints() {
  const sidebar = document.getElementById("sidebar-hints");
  sidebar.innerHTML = "";

  const bureauCode = imageName.includes("-EQ-") ? "EQ" :
                     imageName.includes("-EX-") ? "EX" :
                     imageName.includes("-TU-") ? "TU" : null;

  if (!bureauCode || !hintLookup[bureauCode]) return;

  hintLookup[bureauCode].forEach((hint) => {
    const div = document.createElement("div");
    div.className = `hint-box ${hint.severity === '🔴' ? 'severe' :
                                hint.severity === '🟠' ? 'serious' :
                                'minor'}`;
    div.innerHTML = `
      <div class="hint-label">${hint.label}</div>
      <div class="hint-codes">${hint.covers.join(", ")}</div>
      <div class="hint-action">${hint.action}</div>
    `;
    sidebar.appendChild(div);
  });
}


// ========== IMAGE LOADING ==========
document.getElementById("loadRemoteImage").addEventListener("click", () => {
  const bureau = document.getElementById("bureauSelect").value;
  const creditor = document.getElementById("creditorSelect").value;
  const datePage = document.getElementById("dateSelect").value;

  if (!bureau || !creditor || !datePage) {
    alert("Please select Bureau, Creditor, and Date/Page.");
    return;
  }

  const bureauCode = bureau === "Equifax" ? "EQ" : bureau === "Experian" ? "EX" : "TU";
  imageName = `${creditor}-${bureauCode}-${datePage}.png`;

  const imagePath = `/assets/images/${bureau}/${imageName}`;
  reportImg.src = imagePath;

  reportImg.onload = () => {
    clearCanvas();
    popup.style.display = "none";             // 2. Hide any open popup
    clearSelection();                         // 3. Unselect any leftover box
    tagData = allImageData[imageName] || [];
    renderTags();
    updateTagLog();
    populateDropdown();
    renderHints(); // ✅ call the fix for left panel
    showStatus(`✅ Loaded image: ${imageName}`, 3000);
  };

  reportImg.onerror = () => {
    showStatus("❌ Image failed to load: " + imagePath, 4000);
  };
});



// ========== LOCAL STORAGE ==========
function saveAllProgress() {
  try {
    localStorage.setItem("violationTagsAll", JSON.stringify(allImageData));
  } catch (e) {
    console.error("Storage error", e);
    showStatus("⚠️ Error saving data", 4000);
  }
}

function loadAllProgress() {
  try {
    const data = localStorage.getItem("violationTagsAll");
    if (data) allImageData = JSON.parse(data);
  } catch (e) {
    console.error("Load error", e);
    showStatus("⚠️ Error loading saved tags", 4000);
  }
}

// ========== CANVAS / RENDERING HELPERS ==========
function clearCanvas() {
  [...imageContainer.querySelectorAll(".draw-box")].forEach((el) => el.remove());
}

function clearSelection() {
  document.querySelectorAll(".draw-box.selected").forEach(box => box.classList.remove("selected"));
}

function renderTags() {
  clearCanvas();

  tagData.forEach((tag, index) => {
    const box = document.createElement("div");
    box.className = "draw-box";
    box.style.left = `${tag.x}px`;
    box.style.top = `${tag.y}px`;
    box.style.width = `${tag.width}px`;
    box.style.height = `${tag.height}px`;

    // Make box draggable
    let offsetX, offsetY, isDragging = false;
    box.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("resize-handle")) return;
      e.stopPropagation();
      isDragging = true;
      offsetX = e.offsetX;
      offsetY = e.offsetY;
      clearSelection();
      box.classList.add("selected");
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const rect = imageContainer.getBoundingClientRect();
      const newX = e.clientX - rect.left - offsetX;
      const newY = e.clientY - rect.top - offsetY;
      box.style.left = `${newX}px`;
      box.style.top = `${newY}px`;
      tag.x = Math.round(newX);
      tag.y = Math.round(newY);
      updateTagLog();
    });

    window.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        saveAllProgress();
      }
    });

    // Add resize handle
    const handle = document.createElement("div");
    handle.className = "resize-handle br";
    box.appendChild(handle);

    // Resize logic
    let isResizing = false;
    handle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      isResizing = true;
    });

    window.addEventListener("mousemove", (e) => {
      if (!isResizing) return;
      const rect = imageContainer.getBoundingClientRect();
      const startX = parseInt(box.style.left);
      const startY = parseInt(box.style.top);
      const newWidth = e.clientX - rect.left - startX;
      const newHeight = e.clientY - rect.top - startY;
      box.style.width = `${newWidth}px`;
      box.style.height = `${newHeight}px`;
      tag.width = Math.round(newWidth);
      tag.height = Math.round(newHeight);
      updateTagLog();
    });

    window.addEventListener("mouseup", () => {
      if (isResizing) {
        isResizing = false;
        saveAllProgress();
      }
    });

    imageContainer.appendChild(box);
  });
}


function updateTagLog() {
  const log = document.getElementById("tag-log");
  log.innerHTML = "";

  tagData.forEach((tag, index) => {
    const div = document.createElement("div");
    div.className = "tag-entry";

    const severity = tag.severity || "❓";
    const label = tag.label || "(No label)";
    const codes = tag.codes?.join(", ") || "(No codes)";
    const pos = `(${tag.x ?? "?"}, ${tag.y ?? "?"}) | ${tag.width ?? "?"}×${tag.height ?? "?"}`;

    div.innerHTML = `
      <div class="tag-label">${severity} <strong>${label}</strong></div>
      <div class="tag-codes">${codes}</div>
      <div class="tag-position">${pos}</div>
    `;

    log.appendChild(div);
  });
}


function showPopup(x, y) {
  popup.style.left = `${x + 10}px`;
  popup.style.top = `${y + 10}px`;
  popup.style.display = "block";
  populateDropdown();
}

// ========== TOP BUTTON FUNCTIONALITY ==========

// Delete selected box from canvas and data
document.getElementById("deleteSelected").addEventListener("click", () => {
  const selectedBox = imageContainer.querySelector(".draw-box.selected");
  if (!selectedBox) return showStatus("⚠️ No box selected", 3000);

  const x = parseInt(selectedBox.style.left);
  const y = parseInt(selectedBox.style.top);

  // Remove from tagData
  tagData = tagData.filter(tag => tag.x !== x || tag.y !== y);
  allImageData[imageName] = tagData;

  selectedBox.remove();
  updateTagLog();
  saveAllProgress();
  showStatus("🗑️ Tag deleted", 3000);
});

// Clear all boxes for this image
document.getElementById("clearImageData").addEventListener("click", () => {
  if (!confirm("Are you sure you want to delete all tags for this image?")) return;

  tagData = [];
  allImageData[imageName] = [];
  clearCanvas();
  updateTagLog();
  saveAllProgress();
  showStatus("🧹 All tags cleared for this image", 3000);
});

// Manually save all progress
document.getElementById("saveProgress").addEventListener("click", () => {
  saveAllProgress();
  showStatus("💾 Progress saved", 2000);
});

// Export current image's tags to CSV
document.getElementById("exportCSV").addEventListener("click", () => {
  if (!tagData.length) return showStatus("⚠️ No data to export", 3000);

  const rows = [
    ["Image", "Severity", "Label", "Codes", "X", "Y", "Width", "Height"]
  ];

  tagData.forEach(tag => {
    rows.push([
      imageName,
      tag.severity,
      tag.label,
      tag.codes.join("; "),
      tag.x,
      tag.y,
      tag.width,
      tag.height
    ]);
  });

  const csvContent = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${imageName.replace(".png", "")}_tags.csv`;
  link.click();
  URL.revokeObjectURL(url);
});


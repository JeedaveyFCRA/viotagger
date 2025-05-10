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
  e.preventDefault();
  if (e.target.classList.contains("resize-handle")) return;
  if (e.target.classList.contains("draw-box")) {
    clearSelection();
    e.target.classList.add("selected");
    return;
  }

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



// Always update the latest tag log entry (whether selected or not)
const logEntries = document.querySelectorAll(".tag-entry");
if (logEntries.length > 0) {
  const lastEntry = logEntries[logEntries.length - 1];
  const xCoord = Math.round(currentBox.offsetLeft);
  const yCoord = Math.round(currentBox.offsetTop);
  const width = Math.round(currentBox.offsetWidth);
  const height = Math.round(currentBox.offsetHeight);
  const posDiv = lastEntry.querySelector(".tag-position");
  if (posDiv) {
    posDiv.textContent = `(${xCoord}, ${yCoord}) | ${width}×${height}`;
  }
}

});




imageContainer.addEventListener("mouseup", (e) => {
  if (!isDrawing || !currentBox) return;
  isDrawing = false;

  if (currentBox.offsetWidth < 10 || currentBox.offsetHeight < 10) {
    imageContainer.removeChild(currentBox);
    currentBox = null;
    return;
  }

  makeBoxInteractive(currentBox, tagData);
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














// ========== RADIO BUTTON LOGIC (REVISED WITH DATE BUTTONS) ==========

const creditorRadioGroup = document.getElementById("creditorRadioGroup");
const dateGroup = document.getElementById("dateGroup");
const dateButtons = document.getElementById("dateButtons");

// Disable all creditor radios on load
document.querySelectorAll('input[name="creditor"]').forEach(r => r.disabled = true);

// Helper to get the selected radio bureau
function getSelectedBureau() {
  const selected = document.querySelector('input[name="bureau"]:checked');
  return selected ? selected.value : null;
}

// Helper to get selected creditor radio
function getSelectedCreditor() {
  const selected = document.querySelector('input[name="creditor"]:checked');
  return selected ? selected.value : null;
}

// Enable creditor radio buttons when bureau is selected
document.querySelectorAll('input[name="bureau"]').forEach(radio => {
  radio.addEventListener("change", () => {
    const bureau = getSelectedBureau();
    if (!bureau) return;

    console.log("Bureau selected:", bureau);
    console.log("Available creditors for bureau:", imageMap[bureau]);

    // Enable all creditor radios
    creditorRadioGroup.querySelectorAll('input[name="creditor"]').forEach(r => {
      r.disabled = false;
    });

    // Clear any previously selected creditor
    const checkedCreditor = document.querySelector('input[name="creditor"]:checked');
    if (checkedCreditor) checkedCreditor.checked = false;

    // Clear date group
    dateButtons.innerHTML = "";
    dateGroup.style.display = "none";
  });
});

// When a creditor is selected, update the date/page buttons
document.querySelectorAll('input[name="creditor"]').forEach(radio => {
  radio.addEventListener("change", () => {
    const bureau = getSelectedBureau();
    const creditor = radio.value;

    const dateGroup = document.getElementById("dateGroup");
    const dateButtons = document.getElementById("dateButtons");

    // Clear the button area
    dateButtons.innerHTML = "";
    dateGroup.style.display = "none";

    // Populate date buttons if available
    if (imageMap[bureau] && imageMap[bureau][creditor]) {
      const fullNames = imageMap[bureau][creditor];
      if (fullNames.length > 0) {
        fullNames.forEach(fullImageName => {
          const dateMatch = fullImageName.match(/\d{4}-\d{2}-\d{2}/);
          const displayLabel = dateMatch
            ? `${dateMatch[0]} (${fullImageName.split('-').pop().replace('.png', '')})`
            : fullImageName;

          const btn = document.createElement("button");
          btn.className = "date-button";
          btn.textContent = displayLabel;
          btn.addEventListener("click", () => {
            loadRemoteImage(fullImageName, bureau);
          });
          dateButtons.appendChild(btn);
        });
        dateGroup.style.display = "block";
      }
    }
  });
});



function loadRemoteImage(fullImageName, bureau) {
  // Ensure .png is only added once
  imageName = fullImageName.endsWith(".png") ? fullImageName : `${fullImageName}.png`;
  const imagePath = `/assets/images/${bureau}/${imageName}`;

  reportImg.src = imagePath;

  reportImg.onload = () => {
    clearCanvas();
    popup.style.display = "none";
    clearSelection();
    tagData = allImageData[imageName] || [];
    renderTags();
    updateTagLog();
    populateDropdown();
    renderHints();
    showStatus(`✅ Loaded image: ${imageName}`, 3000);
  };

  reportImg.onerror = () => {
    showStatus("❌ Image failed to load: " + imagePath, 4000);
  };
}






// ========== HINTS + POPUP ==========

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
                                hint.severity === '🟠' ? 'serious' : 'minor'}`;
    div.innerHTML = `
      <div class="hint-label">${hint.label}</div>
      <div class="hint-codes">${hint.covers.join(", ")}</div>
      <div class="hint-action">${hint.action}</div>
    `;
    sidebar.appendChild(div);
  });
}

function showPopup(x, y) {
  popup.style.left = `${x + 10}px`;
  popup.style.top = `${y + 10}px`;
  popup.style.display = "block";
  populateDropdown();
}



















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

// ========== CANVAS ==========

function clearCanvas() {
  [...imageContainer.querySelectorAll(".draw-box")].forEach(el => el.remove());
}

function clearSelection() {
  document.querySelectorAll(".draw-box.selected").forEach(box => box.classList.remove("selected"));
}

function renderTags() {
  clearCanvas();

  tagData.forEach((tag) => {
    const box = document.createElement("div");
    box.className = "draw-box";
    box.style.left = `${tag.x}px`;
    box.style.top = `${tag.y}px`;
    box.style.width = `${tag.width}px`;
    box.style.height = `${tag.height}px`;

    // Drag logic
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

    // Add four resize handles
    ["tl", "tr", "bl", "br"].forEach(pos => {
      const handle = document.createElement("div");
      handle.className = `resize-handle ${pos}`;
      box.appendChild(handle);

      let isResizing = false;

      handle.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        isResizing = true;

        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = parseInt(box.style.left);
        const startTop = parseInt(box.style.top);
        const startWidth = parseInt(box.style.width);
        const startHeight = parseInt(box.style.height);

        function doResize(moveEvent) {
          if (!isResizing) return;

          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;

          let newLeft = startLeft;
          let newTop = startTop;
          let newWidth = startWidth;
          let newHeight = startHeight;

          if (pos.includes("l")) {
            newLeft += dx;
            newWidth -= dx;
          }
          if (pos.includes("r")) {
            newWidth += dx;
          }
          if (pos.includes("t")) {
            newTop += dy;
            newHeight -= dy;
          }
          if (pos.includes("b")) {
            newHeight += dy;
          }

          newWidth = Math.max(20, newWidth);
          newHeight = Math.max(20, newHeight);

          box.style.left = `${newLeft}px`;
          box.style.top = `${newTop}px`;
          box.style.width = `${newWidth}px`;
          box.style.height = `${newHeight}px`;

          tag.x = Math.round(newLeft);
          tag.y = Math.round(newTop);
          tag.width = Math.round(newWidth);
          tag.height = Math.round(newHeight);
          updateTagLog();
        }

        function stopResize() {
          isResizing = false;
          saveAllProgress();
          window.removeEventListener("mousemove", doResize);
          window.removeEventListener("mouseup", stopResize);
        }

        window.addEventListener("mousemove", doResize);
        window.addEventListener("mouseup", stopResize);
      });
    });

    imageContainer.appendChild(box);
  });
}


function makeBoxInteractive(box, tagArray) {
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

    const tag = tagArray.find(t =>
      t.x === parseInt(box.dataset.x) &&
      t.y === parseInt(box.dataset.y)
    );

    if (tag) {
      tag.x = Math.round(newX);
      tag.y = Math.round(newY);
      updateTagLog();
    }
  });

  window.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      saveAllProgress();
    }
  });

  // Add resize handles
  ["tl", "tr", "bl", "br"].forEach(pos => {
    const handle = document.createElement("div");
    handle.className = `resize-handle ${pos}`;
    box.appendChild(handle);

    let isResizing = false;

    handle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      isResizing = true;

      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = parseInt(box.style.left);
      const startTop = parseInt(box.style.top);
      const startWidth = parseInt(box.style.width);
      const startHeight = parseInt(box.style.height);

      function doResize(moveEvent) {
        if (!isResizing) return;

        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        let newLeft = startLeft;
        let newTop = startTop;
        let newWidth = startWidth;
        let newHeight = startHeight;

        if (pos.includes("l")) {
          newLeft += dx;
          newWidth -= dx;
        }
        if (pos.includes("r")) {
          newWidth += dx;
        }
        if (pos.includes("t")) {
          newTop += dy;
          newHeight -= dy;
        }
        if (pos.includes("b")) {
          newHeight += dy;
        }

        newWidth = Math.max(20, newWidth);
        newHeight = Math.max(20, newHeight);

        box.style.left = `${newLeft}px`;
        box.style.top = `${newTop}px`;
        box.style.width = `${newWidth}px`;
        box.style.height = `${newHeight}px`;

        const tag = tagArray.find(t =>
          t.x === parseInt(box.dataset.x) &&
          t.y === parseInt(box.dataset.y)
        );

        if (tag) {
          tag.x = Math.round(newLeft);
          tag.y = Math.round(newTop);
          tag.width = Math.round(newWidth);
          tag.height = Math.round(newHeight);
          updateTagLog();
        }
      }

      function stopResize() {
        isResizing = false;
        saveAllProgress();
        window.removeEventListener("mousemove", doResize);
        window.removeEventListener("mouseup", stopResize);
      }

      window.addEventListener("mousemove", doResize);
      window.addEventListener("mouseup", stopResize);
    });
  });
}


function updateTagLog() {
  const log = document.getElementById("tag-log");
  log.innerHTML = "";
  tagData.forEach(tag => {
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

// ========== TOP PANEL BUTTONS ==========
document.getElementById("deleteSelected").addEventListener("click", () => {
  const selectedBox = imageContainer.querySelector(".draw-box.selected");
  if (!selectedBox) return showStatus("⚠️ No box selected", 3000);
  const x = parseInt(selectedBox.style.left);
  const y = parseInt(selectedBox.style.top);
  tagData = tagData.filter(tag => tag.x !== x || tag.y !== y);
  allImageData[imageName] = tagData;
  selectedBox.remove();
  updateTagLog();
  saveAllProgress();
  showStatus("🗑️ Tag deleted", 3000);
});

document.getElementById("clearImageData").addEventListener("click", () => {
  if (!confirm("Are you sure you want to delete all tags for this image?")) return;
  tagData = [];
  allImageData[imageName] = [];
  clearCanvas();
  updateTagLog();
  saveAllProgress();
  showStatus("🧹 All tags cleared", 3000);
});

document.getElementById("saveProgress").addEventListener("click", () => {
  saveAllProgress();
  showStatus("💾 Progress saved", 2000);
});

document.getElementById("exportCSV").addEventListener("click", () => {
  const allTags = Object.entries(allImageData).flatMap(([imgName, tags]) => {
    return tags.map(tag => [
      imgName,
      tag.severity,
      tag.label,
      tag.codes.join("; "),
      tag.x,
      tag.y,
      tag.width,
      tag.height
    ]);
  });

  if (!allTags.length) return showStatus("⚠️ No data to export", 3000);

  const rows = [
    ["Image", "Severity", "Label", "Codes", "X", "Y", "Width", "Height"],
    ...allTags
  ];

  const csvContent = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `violation_tags_export.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

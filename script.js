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

// ========== IMAGE LOADING ==========
document.getElementById("loadRemoteImage").addEventListener("click", () => {
  const bureau = bureauSelect.value;
  const creditor = creditorSelect.value;
  const datePage = dateSelect.value;

  if (!bureau || !creditor || !datePage) return alert("Please select all fields.");

  const bureauCode = bureau === "Equifax" ? "EQ" : bureau === "Experian" ? "EX" : "TU";
  imageName = `${creditor}-${bureauCode}-${datePage}.png`;
  const path = `https://your-github-repo.com/assets/images/${bureau}/${imageName}`;

  reportImg.src = path;
  reportImg.onload = () => {
    clearCanvas();
    tagData = allImageData[imageName] || [];
    renderTags();
    updateTagLog();
    populateDropdown();
    showStatus(`✅ Loaded: ${imageName}`, 3000);
  };
  reportImg.onerror = () => {
    showStatus("❌ Image failed to load.", 4000);
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
  tagData.forEach(tag => {
    const box = document.createElement("div");
    box.className = "draw-box";
    box.style.left = `${tag.x}px`;
    box.style.top = `${tag.y}px`;
    box.style.width = `${tag.width}px`;
    box.style.height = `${tag.height}px`;
    imageContainer.appendChild(box);
  });
}

function updateTagLog() {
  const log = document.getElementById("tag-log");
  log.innerHTML = "";
  tagData.forEach(tag => {
    const div = document.createElement("div");
    div.className = "tag-entry";
    div.innerHTML = `
      <div class="tag-label">${tag.severity} <strong>${tag.label}</strong></div>
      <div class="tag-codes">${tag.codes.join(", ")}</div>
      <div class="tag-position">(${tag.x}, ${tag.y}) | ${tag.width}×${tag.height}</div>
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

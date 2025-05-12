// ========== GLOBAL STATE ==========

let isDrawing = false;
let isMultiSelectMode = false;
let startX, startY;
let currentBox = null;
let currentHints = [];
let tagData = [];
let allImageData = {};
let imageName = "";
let copiedTags = []; // Buffer to store copied tag data
let boxGroups = {}; // For storing groups of boxes
let groupCounter = 0; // For generating unique group IDs
let undoStack = []; // For storing undo history

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


// ========== POPUP CANCEL LOGIC ==========
cancelTagBtn.addEventListener("click", () => {
  if (currentBox && imageContainer.contains(currentBox)) {
    imageContainer.removeChild(currentBox);
  }
  popup.style.display = "none";
  currentBox = null;
});

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
  height: Math.round(currentBox.offsetHeight), // ← ✅ Add comma here
  sof: document.getElementById("sofCheckbox").checked
};

  tagData.push(tag);
  if (!allImageData[imageName]) allImageData[imageName] = [];
  allImageData[imageName] = tagData;

  currentBox.classList.add("selected");
  updateTagLog();
  saveAllProgress();

  // 🔄 Updated box binding with tag index tracking
  const boxToBind = currentBox;
  const tagIndex = tagData.length - 1; // Get index of the newly added tag
  boxToBind.dataset.tagIndex = tagIndex; // Store the index on the box
  setTimeout(() => {
    if (boxToBind) makeBoxInteractive(boxToBind, tagData);
  }, 0);

  popup.style.display = "none";
  currentBox = null;
  showStatus("✅ Violation tag added", 3000);
});


// ========== BOX EDITING FUNCTIONALITY ==========








// ========== BOX EDITING FUNCTIONALITY ==========

function setupBoxEditing() {
  // Double-click handler for boxes
  imageContainer.addEventListener('dblclick', (e) => {
    if (e.target.classList.contains('draw-box')) {
      const box = e.target;
      showEditModal(box);
    }
  });

  // Modal confirm handler
  document.getElementById('editBoxConfirm').addEventListener('click', () => {
    applyBoxEdits();
  });

  // Modal cancel handler
  document.getElementById('editBoxCancel').addEventListener('click', hideEditModal);
  
  // Add Enter key support
  document.getElementById('editBoxModal').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyBoxEdits();
    } else if (e.key === 'Escape') {
      hideEditModal();
    }
  });
  
  // Optional: Close when clicking outside modal
  document.getElementById('editBoxModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('editBoxModal')) {
      hideEditModal();
    }
  });
}



function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Only process if not in a text field or textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }
    
    // Copy selected boxes (Ctrl+C)
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault(); // Prevent browser's copy action
      copySelectedBoxes();
    }
    
    // Paste copied boxes (Ctrl+V)
    if (e.ctrlKey && e.key === 'v') {
      e.preventDefault(); // Prevent browser's paste action
      pasteBoxes();
    }
    
    // Group selected boxes (Ctrl+G)
    if (e.ctrlKey && e.key === 'g') {
      e.preventDefault();
      groupSelectedBoxes();
    }
    
    // Ungroup selected group (Ctrl+U)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      ungroupSelectedBoxes();
    }
    
    // Undo last action (Ctrl+Z)
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      undoLastAction();
    }
  });
}

// Initialize features moved to central location





function showEditModal(box) {
  const modal = document.getElementById('editBoxModal');
  const rect = box.getBoundingClientRect();
  const containerRect = imageContainer.getBoundingClientRect();

  // Calculate relative coordinates
  const x = rect.left - containerRect.left;
  const y = rect.top - containerRect.top;
  const width = rect.width;
  const height = rect.height;

  // Populate coordinate inputs
  document.getElementById('editBoxX').value = Math.round(x);
  document.getElementById('editBoxY').value = Math.round(y);
  document.getElementById('editBoxW').value = Math.round(width);
  document.getElementById('editBoxH').value = Math.round(height);
  
  // Get current tag data
  const tagIndex = parseInt(box.dataset.tagIndex);
  const tag = tagData[tagIndex];
  
  // Populate violation dropdown
  populateViolationDropdown(tag);
  
  // Set sign-off checkbox
  document.getElementById('editBoxSignOff').checked = tag.sof === true;
  
  // Show modal
  modal.style.display = 'block';
  clearSelection();
  box.classList.add('selected');
  
  // Focus first field for immediate keyboard entry
  document.getElementById('editBoxX').focus();
}

function populateViolationDropdown(tag) {
  const dropdown = document.getElementById('editBoxViolation');
  dropdown.innerHTML = '';
  
  // Get current bureauCode from imageName
  const bureauCode = imageName.includes("-EQ-") ? "EQ" : 
                     imageName.includes("-EX-") ? "EX" : 
                     imageName.includes("-TU-") ? "TU" : null;
  
  if (!bureauCode || !hintLookup[bureauCode]) {
    // Fallback if no hints available
    const option = document.createElement('option');
    option.value = tag.label || '';
    option.textContent = tag.label || 'Unknown';
    dropdown.appendChild(option);
    return;
  }
  
  // Add all options from hintLookup
  hintLookup[bureauCode].forEach(hint => {
    const option = document.createElement('option');
    option.value = hint.label;
    option.textContent = `${hint.severity} ${hint.label} (${hint.covers.length} code${hint.covers.length > 1 ? 's' : ''})`;
    
    // Store additional data as attributes for later retrieval
    option.dataset.severity = hint.severity;
    option.dataset.codes = JSON.stringify(hint.covers);
    
    dropdown.appendChild(option);
    
    // Select the current value
    if (hint.label === tag.label) {
      option.selected = true;
    }
  });
}

function applyBoxEdits() {
  const box = document.querySelector('.draw-box.selected');
  if (!box) return;

  // Get values from form
  const newX = parseInt(document.getElementById('editBoxX').value);
  const newY = parseInt(document.getElementById('editBoxY').value);
  const newW = parseInt(document.getElementById('editBoxW').value);
  const newH = parseInt(document.getElementById('editBoxH').value);
  const newViolation = document.getElementById('editBoxViolation').value;
  const newSignOff = document.getElementById('editBoxSignOff').checked;
  
  // Validate coordinate values
  if (isNaN(newX) || isNaN(newY) || isNaN(newW) || isNaN(newH)) {
    showStatus("⚠️ Please enter valid numbers", 3000);
    return;
  }
  
  // Get selected option to access all violation data
  const selectedOption = document.getElementById('editBoxViolation').selectedOptions[0];
  const newSeverity = selectedOption.dataset.severity;
  const newCodes = JSON.parse(selectedOption.dataset.codes || '[]');

  // Update box position and size
  box.style.left = `${newX}px`;
  box.style.top = `${newY}px`;
  box.style.width = `${newW}px`;
  box.style.height = `${newH}px`;

  // Update the associated tag data
  const tagIndex = parseInt(box.dataset.tagIndex);
  if (tagIndex >= 0 && tagData[tagIndex]) {
    const tag = tagData[tagIndex];
    
    // Update position and size
    tag.x = newX;
    tag.y = newY;
    tag.width = newW;
    tag.height = newH;
    
    // Update violation data
    tag.label = newViolation;
    tag.severity = newSeverity;
    tag.codes = newCodes;
    tag.sof = newSignOff;
    
    // Update storage and UI
    allImageData[imageName] = tagData;
    updateTagLog();
    saveAllProgress();
  }

  hideEditModal();
  showStatus("✅ Box updated", 2000);
}

function hideEditModal() {
  document.getElementById('editBoxModal').style.display = 'none';
}

function copySelectedBoxes() {
  const selectedBoxes = document.querySelectorAll('.draw-box.selected');
  if (selectedBoxes.length === 0) {
    showStatus("⚠️ No boxes selected to copy", 3000);
    return;
  }
  
  copiedTags = [];
  
  selectedBoxes.forEach(box => {
    const tagIndex = parseInt(box.dataset.tagIndex);
    if (tagIndex >= 0 && tagData[tagIndex]) {
      // Create a deep copy of the tag
      copiedTags.push(JSON.parse(JSON.stringify(tagData[tagIndex])));
    }
  });
  
  showStatus(`✅ Copied ${copiedTags.length} box(es)`, 3000);
}

function pasteBoxes() {
  if (copiedTags.length === 0) {
    showStatus("⚠️ Nothing to paste", 3000);
    return;
  }
  
  // Clear any current selection
  clearSelection();
  
  // Calculate offset for pasted boxes (20px right and down)
  const OFFSET_X = 20;
  const OFFSET_Y = 20;
  
  // Create new boxes from copied tags
  copiedTags.forEach(originalTag => {
    // Create a new tag with offset position
    const newTag = JSON.parse(JSON.stringify(originalTag));
    newTag.x += OFFSET_X;
    newTag.y += OFFSET_Y;
    
    // Ensure the new box is within bounds
    const containerWidth = imageContainer.clientWidth;
    const containerHeight = imageContainer.clientHeight;
    
    if (newTag.x + newTag.width > containerWidth) {
      newTag.x = containerWidth - newTag.width;
    }
    
    if (newTag.y + newTag.height > containerHeight) {
      newTag.y = containerHeight - newTag.height;
    }
    
    // Add the new tag to the data
    tagData.push(newTag);
    
    // Create and render the new box
    const box = document.createElement("div");
    box.className = "draw-box selected";
    box.style.left = `${newTag.x}px`;
    box.style.top = `${newTag.y}px`;
    box.style.width = `${newTag.width}px`;
    box.style.height = `${newTag.height}px`;
    box.dataset.tagIndex = tagData.length - 1;
    
    // Make the new box interactive
    makeBoxInteractive(box, tagData);
    
    // Add resize handles
    ["tl", "tr", "bl", "br"].forEach(pos => {
      const handle = document.createElement("div");
      handle.className = `resize-handle ${pos}`;
      box.appendChild(handle);
    });
    
    imageContainer.appendChild(box);
  });
  
  // Update storage and UI
  allImageData[imageName] = tagData;
  updateTagLog();
  saveAllProgress();
  
  showStatus(`✅ Pasted ${copiedTags.length} box(es)`, 3000);
}






function groupSelectedBoxes() {
  const selectedBoxes = document.querySelectorAll('.draw-box.selected');
  
  if (selectedBoxes.length < 2) {
    showStatus("⚠️ Select at least 2 boxes to group", 3000);
    return;
  }
  
  // Save current state for undo
  saveToUndoStack();
  
  // Generate a unique group ID
  const groupId = `group_${Date.now()}_${groupCounter++}`;
  
  // Store the indices of the boxes in this group
  boxGroups[groupId] = [];
  
  // Add a data attribute to each box in the group
  selectedBoxes.forEach(box => {
    const tagIndex = parseInt(box.dataset.tagIndex);
    if (tagIndex >= 0) {
      // Store group info on the box element
      box.dataset.groupId = groupId;
      
      // Store group info in our groups tracking object
      boxGroups[groupId].push(tagIndex);
      
      // Add a visual indicator for grouped boxes
      box.classList.add('grouped');
    }
  });
  
  // Store group information in local storage
  saveGroups();
  
  showStatus(`✅ Grouped ${selectedBoxes.length} boxes`, 3000);
}

function ungroupSelectedBoxes() {
  const selectedBoxes = document.querySelectorAll('.draw-box.selected');
  
  if (selectedBoxes.length === 0) {
    showStatus("⚠️ No boxes selected to ungroup", 3000);
    return;
  }
  
  // Check if any selected box is part of a group
  let foundGroup = false;
  let groupsToRemove = new Set();
  
  selectedBoxes.forEach(box => {
    if (box.dataset.groupId) {
      foundGroup = true;
      groupsToRemove.add(box.dataset.groupId);
    }
  });
  
  if (!foundGroup) {
    showStatus("⚠️ Selected boxes are not in a group", 3000);
    return;
  }
  
  // Save current state for undo
  saveToUndoStack();
  
  // Process each group to remove
  groupsToRemove.forEach(groupId => {
    // Get all boxes in this group
    const groupBoxes = document.querySelectorAll(`.draw-box[data-group-id="${groupId}"]`);
    
    // Remove group attributes from each box
    groupBoxes.forEach(box => {
      box.removeAttribute('data-group-id');
      box.classList.remove('grouped');
    });
    
    // Remove the group from our tracking
    delete boxGroups[groupId];
  });
  
  // Update storage
  saveGroups();
  
  showStatus("✅ Boxes ungrouped", 3000);
}

function saveGroups() {
  // Store group information in local storage
  try {
    localStorage.setItem("violationGroups", JSON.stringify(boxGroups));
  } catch (e) {
    console.error("Error saving groups:", e);
  }
}

function loadGroups() {
  // Load group information from local storage
  try {
    const savedGroups = localStorage.getItem("violationGroups");
    if (savedGroups) {
      boxGroups = JSON.parse(savedGroups);
      
      // Apply group attributes to boxes
      Object.entries(boxGroups).forEach(([groupId, tagIndices]) => {
        tagIndices.forEach(tagIndex => {
          const box = document.querySelector(`.draw-box[data-tag-index="${tagIndex}"]`);
          if (box) {
            box.dataset.groupId = groupId;
            box.classList.add('grouped');
          }
        });
      });
    }
  } catch (e) {
    console.error("Error loading groups:", e);
  }
}








function saveToUndoStack() {
  // Save current state to undo stack
  const state = {
    tagData: JSON.parse(JSON.stringify(tagData)),
    boxGroups: JSON.parse(JSON.stringify(boxGroups))
  };
  
  undoStack.push(state);
  
  // Limit undo stack size to prevent memory issues
  if (undoStack.length > 20) {
    undoStack.shift(); // Remove oldest item
  }
}

function undoLastAction() {
  if (undoStack.length === 0) {
    showStatus("⚠️ Nothing to undo", 3000);
    return;
  }
  
  // Get the last saved state
  const lastState = undoStack.pop();
  
  // Restore tag data
  tagData = lastState.tagData;
  
  // Restore groups data
  boxGroups = lastState.boxGroups;
  
  // Update the storage
  allImageData[imageName] = tagData;
  saveAllProgress();
  saveGroups();
  
  // Re-render the boxes
  renderTags();
  updateTagLog();
  
  // Re-apply group classes
  Object.entries(boxGroups).forEach(([groupId, tagIndices]) => {
    tagIndices.forEach(tagIndex => {
      const box = document.querySelector(`.draw-box[data-tag-index="${tagIndex}"]`);
      if (box) {
        box.dataset.groupId = groupId;
        box.classList.add('grouped');
      }
    });
  });
  
  showStatus("↩️ Undo successful", 3000);
}











// Initialize when page loads
document.addEventListener('DOMContentLoaded', setupBoxEditing);

// ========== PREVIEW MODAL LOGIC ==========

// ========== PREVIEW MODAL LOGIC ==========

const previewModal = document.getElementById("previewModal");
const previewTableBody = document.querySelector("#previewTable tbody");
const previewCancel = document.getElementById("previewCancel");
const previewConfirm = document.getElementById("previewConfirm");

let queuedExportFunction = null;

// This function is used by both CSV export and Airtable sync
function openPreviewModal(callback) {
  // Store the function to call after confirmation
  queuedExportFunction = callback;

  // Clear old rows
  previewTableBody.innerHTML = "";

  const mode = document.getElementById("modeSelector")?.value || "unspecified";
  let rowCount = 0;

  Object.entries(allImageData).forEach(([imgName, tags]) => {
    tags.forEach(tag => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${imgName}</td>
        <td>${tag.severity}</td>
        <td>${tag.label}</td>
        <td>${tag.codes.join("; ")}</td>
        <td>${mode}</td>
      `;
      previewTableBody.appendChild(row);
      rowCount++;
    });
  });

  // Only show modal if we have data
  if (rowCount === 0) {
    showStatus("⚠️ No data to preview", 3000);
    return;
  }

  previewModal.style.display = "block";
}

previewCancel.addEventListener("click", () => {
  previewModal.style.display = "none";
  queuedExportFunction = null;
});

previewConfirm.addEventListener("click", () => {
  if (queuedExportFunction) {
    // Execute the callback (either exportCSV or the Airtable sync)
    queuedExportFunction();
  }
  previewModal.style.display = "none";
});




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





document.querySelectorAll('input[name="creditor"]').forEach(radio => {
  radio.addEventListener("change", () => {
    const bureau = getSelectedBureau();
    const creditor = radio.value;

    // 🧪 DEBUG START (Safe version)
    console.log("Selected bureau:", bureau);
    console.log("Selected creditor:", creditor);
    console.log("Matching imageMap entry:", imageMap && imageMap[bureau] && imageMap[bureau][creditor]);
    // 🧪 DEBUG END

    dateButtons.innerHTML = "";
    dateGroup.style.display = "none";

    if (imageMap[bureau] && imageMap[bureau][creditor]) {
      const fullNames = imageMap[bureau][creditor];
      if (fullNames.length > 0) {
        fullNames.forEach(fullImageName => {
          const displayLabel = fullImageName;
          const btn = document.createElement("button");
          btn.className = "date-button";
          btn.textContent = displayLabel;
          btn.addEventListener("click", () => {
            loadRemoteImage(fullImageName, bureau);
          });
          dateButtons.appendChild(btn);
        });
        dateGroup.style.display = "block";
        console.log("✅ Date buttons created:", fullNames.length);
      } else {
        console.warn("⚠️ No images found for that creditor");
      }
    } else {
      console.warn("❌ imageMap match failed — check key names");
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

function selectGroup(groupId) {
  if (!groupId) return false;
  
  // Find all boxes with this group ID
  const groupBoxes = document.querySelectorAll(`.draw-box[data-group-id="${groupId}"]`);
  
  if (groupBoxes.length === 0) return false;
  
  // Select all boxes in the group
  groupBoxes.forEach(box => {
    box.classList.add("selected");
  });
  
  return true;
}




function renderTags() {
  clearCanvas();
  
  // Ensure we're working with fresh data (recommended addition)
  tagData = allImageData[imageName] || [];
  
  // Track index for proper tag association
  tagData.forEach((tag, index) => {
    const box = document.createElement("div");
    box.className = "draw-box";
    box.style.left = `${tag.x}px`;
    box.style.top = `${tag.y}px`;
    box.style.width = `${tag.width}px`;
    box.style.height = `${tag.height}px`;
    box.dataset.tagIndex = index; // Store index on box element

    // Check if this tag is part of a group
    for (const [groupId, tagIndices] of Object.entries(boxGroups)) {
      if (tagIndices.includes(index)) {
        box.dataset.groupId = groupId;
        box.classList.add('grouped');
        break;
      }
    }
    
    // Drag logic - simplified since makeBoxInteractive handles this now
    box.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("resize-handle")) return;
      e.stopPropagation();
      
      // Get the group ID (if any)
      const groupId = box.dataset.groupId;
      
      // If shift is not pressed, clear selection
      if (!e.shiftKey) {
        clearSelection();
        
        // If box is part of a group, select the whole group
        if (groupId) {
          selectGroup(groupId);
          return; // Exit early as we've handled selection
        }
      }
      
      box.classList.add("selected");
    });
    
    // Add four resize handles
    ["tl", "tr", "bl", "br"].forEach(pos => {
      const handle = document.createElement("div");
      handle.className = `resize-handle ${pos}`;
      box.appendChild(handle);
    });
    
    // Make box interactive with proper tag association
    makeBoxInteractive(box, tagData);
    
    imageContainer.appendChild(box);
  });
}

// Add this helper function after the renderTags function
function selectGroup(groupId) {
  if (!groupId) return false;
  
  // Find all boxes with this group ID
  const groupBoxes = document.querySelectorAll(`.draw-box[data-group-id="${groupId}"]`);
  
  if (groupBoxes.length === 0) return false;
  
  // Select all boxes in the group
  groupBoxes.forEach(box => {
    box.classList.add("selected");
  });
  
  return true;
}









function makeBoxInteractive(box, tagArray) {
  let offsetX, offsetY, isDragging = false;

  // Store the tag index on the box when making it interactive
  if (!box.dataset.tagIndex) {
    const x = parseInt(box.style.left);
    const y = parseInt(box.style.top);
    const tagIndex = tagArray.findIndex(t => t.x === x && t.y === y);
    if (tagIndex !== -1) box.dataset.tagIndex = tagIndex;
  }

  // Make box focusable for keyboard interactions
  box.setAttribute('tabindex', '0');
  

  // Mouse drag handling
box.addEventListener("mousedown", (e) => {
  if (e.target.classList.contains("resize-handle")) return;
  e.stopPropagation();
  
  // Check if we're part of a multi-selection
  const selectedBoxes = document.querySelectorAll('.draw-box.selected');
  const isPartOfMultiSelection = selectedBoxes.length > 1 && box.classList.contains('selected');
  
  // If this is part of multi-selection, let the multi-box handler take over
  if (isPartOfMultiSelection) {
    return; // The setupMultiBoxMovement handler will handle this
  }
  
  // Check if this box is part of a group
  const groupId = box.dataset.groupId;
  
  // Otherwise, handle as a single box drag
  isDragging = true;
  offsetX = e.offsetX;
  offsetY = e.offsetY;
  
  // If shift key is pressed, allow multi-select without clearing
  if (!e.shiftKey) {
    clearSelection();
    
    // If box is part of a group and not using shift-select, select the whole group
    if (groupId && !e.shiftKey) {
      selectGroup(groupId);
      return; // Exit early as we've handled selection
    }
  }
  
  // Add selection to the clicked box
  box.classList.add("selected");
  box.focus(); // Focus the box when selected
});




  // Keyboard arrow key movement
  box.addEventListener("keydown", (e) => {
    if (!box.classList.contains("selected")) return;
    
    const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (arrowKeys.includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1; // Larger steps when Shift is held
      const container = imageContainer.getBoundingClientRect();
      let x = parseInt(box.style.left);
      let y = parseInt(box.style.top);
      const width = parseInt(box.style.width);
      const height = parseInt(box.style.height);

      switch(e.key) {
        case 'ArrowUp': y = Math.max(0, y - step); break;
        case 'ArrowDown': y = Math.min(container.height - height, y + step); break;
        case 'ArrowLeft': x = Math.max(0, x - step); break;
        case 'ArrowRight': x = Math.min(container.width - width, x + step); break;
      }

      // Update position
      box.style.left = `${x}px`;
      box.style.top = `${y}px`;

      // Update data model
      if (box.dataset.tagIndex !== undefined) {
        const tag = tagArray[box.dataset.tagIndex];
        if (tag) {
          tag.x = x;
          tag.y = y;
          updateTagLog();
          saveAllProgress();
        }
      }
    }
  });

  // Mouse movement handling
  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const rect = imageContainer.getBoundingClientRect();
    const newX = e.clientX - rect.left - offsetX;
    const newY = e.clientY - rect.top - offsetY;
    box.style.left = `${newX}px`;
    box.style.top = `${newY}px`;

    // Update the associated tag data
    if (box.dataset.tagIndex !== undefined) {
      const tag = tagArray[box.dataset.tagIndex];
      if (tag) {
        tag.x = Math.round(newX);
        tag.y = Math.round(newY);
        tag.width = Math.round(parseInt(box.style.width));
        tag.height = Math.round(parseInt(box.style.height));
        updateTagLog();
      }
    }

    const logEntry = document.querySelector(".tag-entry.selected");
    if (logEntry) {
      const xCoord = Math.round(box.offsetLeft);
      const yCoord = Math.round(box.offsetTop);
      const width = Math.round(box.offsetWidth);
      const height = Math.round(box.offsetHeight);
      logEntry.querySelector(".tag-position").textContent =
        `(${xCoord}, ${yCoord}) | ${width}×${height}`;
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

        // Update the associated tag data
        if (box.dataset.tagIndex !== undefined) {
          const tag = tagArray[box.dataset.tagIndex];
          if (tag) {
            tag.x = Math.round(newLeft);
            tag.y = Math.round(newTop);
            tag.width = Math.round(newWidth);
            tag.height = Math.round(newHeight);
            updateTagLog();
          }
        }

        const logEntry = document.querySelector(".tag-entry.selected");
        if (logEntry) {
          logEntry.querySelector(".tag-position").textContent =
            `(${Math.round(newLeft)}, ${Math.round(newTop)}) | ${Math.round(newWidth)}×${Math.round(newHeight)}`;
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








function setupMultiBoxMovement() {
  let isDraggingMultiple = false;
  let startMouseX, startMouseY;
  let boxStartPositions = [];
  
  // Global mousedown handler for multi-box dragging
  imageContainer.addEventListener("mousedown", (e) => {
    // Skip if we clicked on a resize handle
    if (e.target.classList.contains("resize-handle")) return;
    
    // Clear selection if clicking on the background (not on a box)
    if (!e.target.classList.contains("draw-box")) {
      clearSelection();
    }
  });
  
  // Global handler for starting a multi-box drag
  document.addEventListener("mousedown", (e) => {
    // Only handle box drag starts
    if (!e.target.classList.contains("draw-box")) return;
    
    const selectedBoxes = document.querySelectorAll('.draw-box.selected');
    // If this box is part of a multi-selection
    if (selectedBoxes.length > 1 && e.target.classList.contains('selected')) {
      e.preventDefault();
      e.stopPropagation();
      
      isDraggingMultiple = true;
      startMouseX = e.clientX;
      startMouseY = e.clientY;
      
      // Store the starting positions of all selected boxes
      boxStartPositions = [];
      selectedBoxes.forEach(box => {
        boxStartPositions.push({
          box: box,
          startX: parseInt(box.style.left),
          startY: parseInt(box.style.top),
          tagIndex: parseInt(box.dataset.tagIndex)
        });
      });
      
      // Prevent the individual box handler from taking over
      e.stopImmediatePropagation();
    }
  }, true); // Use capture phase to intercept before individual handlers
  
  // Global mousemove handler for multi-box dragging
  document.addEventListener("mousemove", (e) => {
    if (!isDraggingMultiple) return;
    
    const deltaX = e.clientX - startMouseX;
    const deltaY = e.clientY - startMouseY;
    
    // Move all boxes by the same delta
    boxStartPositions.forEach(item => {
      const newX = item.startX + deltaX;
      const newY = item.startY + deltaY;
      
      item.box.style.left = `${newX}px`;
      item.box.style.top = `${newY}px`;
      
      // Update the data model
      if (item.tagIndex >= 0 && tagData[item.tagIndex]) {
        tagData[item.tagIndex].x = newX;
        tagData[item.tagIndex].y = newY;
      }
    });
    
    // Update the tag log to reflect the new positions
    updateTagLog();
  });
  
  // Global mouseup handler for multi-box dragging
  document.addEventListener("mouseup", (e) => {
    if (isDraggingMultiple) {
      isDraggingMultiple = false;
      
      // Save all changes to storage
      allImageData[imageName] = tagData;
      saveAllProgress();
      
      // Boxes remain selected until user clicks elsewhere
    }
  });
}

// Initialize the multi-box movement functionality
document.addEventListener('DOMContentLoaded', () => {
  setupKeyboardShortcuts();
  setupMultiBoxMovement();
  loadGroups(); // Add this line to load saved groups
});










function updateTagLog() {
  const log = document.getElementById("tag-log");
  log.innerHTML = "";

  const mode = document.getElementById("modeSelector")?.value || "unspecified";

  tagData.forEach(tag => {
    const div = document.createElement("div");
    div.className = "tag-entry";
    const severity = tag.severity || "❓";
    const label = tag.label || "(No label)";
    const codes = tag.codes?.join(", ") || "(No codes)";
    const sofNote = tag.sof ? " [SOF]" : "";
const pos = `(${tag.x ?? "?"}, ${tag.y ?? "?"}) | ${tag.width ?? "?"}×${tag.height ?? "?"} [Mode: ${mode}]${sofNote}`;
    
    div.innerHTML = `
      <div class="tag-label">${severity} <strong>${label}</strong></div>
      <div class="tag-codes">${codes}</div>
      <div class="tag-position">${pos}</div>
    `;
    log.appendChild(div);
  });
}


// ========== STATUS MESSAGES ==========

// Ensure status message function exists and works properly
function showStatus(message, duration = 3000) {
  const statusBox = document.getElementById("status-message");
  if (!statusBox) return; // Guard against missing element
  
  // Clear any existing timeout
  if (statusBox._timeoutId) {
    clearTimeout(statusBox._timeoutId);
  }
  
  // Show the message with appropriate styling
  statusBox.textContent = message;
  statusBox.style.opacity = "1";
  
  // Apply color based on message type
  if (message.includes("❌") || message.includes("⚠️")) {
    statusBox.style.backgroundColor = message.includes("⚠️") ? "#ff9800" : "#f44336";
    statusBox.style.color = "white";
  } else if (message.includes("✅")) {
    statusBox.style.backgroundColor = "#4caf50";
    statusBox.style.color = "white";
  } else {
    statusBox.style.backgroundColor = "#2196f3";
    statusBox.style.color = "white";
  }
  
  // Clear after duration
  statusBox._timeoutId = setTimeout(() => {
    statusBox.style.opacity = "0";
  }, duration);
}


// ========== TOP PANEL BUTTONS ==========

// Helper function to reset button state
function resetButtonState(btn, delay = 200) {
  setTimeout(() => {
    btn.classList.remove('button-active');
    btn.blur();
  }, delay);
}

// Delete Selected Button
document.getElementById("deleteSelected").addEventListener("click", async function() {
  const btn = this;
  btn.classList.add('button-active');
  
  try {
    const selectedBox = imageContainer.querySelector(".draw-box.selected");
    if (!selectedBox) {
      showStatus("⚠️ No box selected", 3000);
      return;
    }

    const x = parseInt(selectedBox.style.left);
    const y = parseInt(selectedBox.style.top);
    tagData = tagData.filter(tag => tag.x !== x || tag.y !== y);
    allImageData[imageName] = tagData;
    selectedBox.remove();
    updateTagLog();
    await saveAllProgress();
    showStatus("🗑️ Tag deleted", 3000);
  } catch (error) {
    console.error("Delete error:", error);
    showStatus("⚠️ Error deleting tag", 3000);
  } finally {
    resetButtonState(btn);
  }
});

// Clear Image Data Button
document.getElementById("clearImageData").addEventListener("click", async function() {
  const btn = this;
  btn.classList.add('button-active');
  
  try {
    if (!confirm("Are you sure you want to delete all tags for this image?")) {
      return;
    }

    tagData = [];
    allImageData[imageName] = [];
    clearCanvas();
    updateTagLog();
    await saveAllProgress();
    showStatus("🧹 All tags cleared", 3000);
  } catch (error) {
    console.error("Clear image error:", error);
    showStatus("⚠️ Error clearing image data", 3000);
  } finally {
    resetButtonState(btn);
  }
});

// Clear All Data Button
document.getElementById("clearAllData").addEventListener("click", async function() {
  const btn = this;
  btn.classList.add('button-active');
  
  try {
    if (!confirm("Are you sure you want to delete ALL tags for EVERY image?")) {
      return;
    }

    tagData = [];
    allImageData = {};
    clearCanvas();
    updateTagLog();
    await saveAllProgress();
    showStatus("🧹 ALL tags cleared from ALL images", 4000);
  } catch (error) {
    console.error("Clear all error:", error);
    showStatus("⚠️ Error clearing all data", 3000);
  } finally {
    resetButtonState(btn);
  }
});

// Save Progress Button
document.getElementById("saveProgress").addEventListener("click", async function() {
  const btn = this;
  btn.classList.add('button-active');
  
  try {
    await saveAllProgress();
    showStatus("💾 Progress saved", 2000);
    
    // Success animation
    setTimeout(() => {
      btn.classList.add('button-success');
      setTimeout(() => btn.classList.remove('button-success'), 1000);
    }, 10);
  } catch (error) {
    console.error("Save error:", error);
    showStatus("⚠️ Error saving progress", 3000);
  } finally {
    resetButtonState(btn);
  }
});

// ✅ Export CSV function (called after preview confirmation)
async function exportCSV() {
  const btn = document.getElementById("exportCSV");
  btn.classList.add('button-active');

  try {
    // Robust CSV escaping function
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      value = String(value);
      if (/[",\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Process all tags with proper escaping
    const mode = document.getElementById("modeSelector")?.value || "unspecified";

    const allTags = Object.entries(allImageData).flatMap(([imgName, tags]) => {
      return tags.map(tag => [
  escapeCSV(imgName),
  escapeCSV(tag.severity),
  escapeCSV(tag.label),
  escapeCSV(tag.codes.join("; ")),
  tag.x,
  tag.y,
  tag.width,
  tag.height,
  escapeCSV(mode),
  tag.sof ? "TRUE" : "FALSE"
 ]);
});

    if (!allTags.length) {
      showStatus("⚠️ No data to export", 3000);
      return;
    }

    // Create header row with proper escaping
    const headers = [
  "Image", "Severity", "Label", "Codes", "X", "Y", "Width", "Height", "Mode", "SOF"
].map(escapeCSV);

    // Build CSV content
    const csvContent = [
      headers.join(","),
      ...allTags.map(row => row.join(","))
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `violation_tags_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showStatus("📤 CSV exported", 3000);
  } catch (error) {
    console.error("Export error:", error);
    showStatus("⚠️ Error exporting CSV", 3000);
  } finally {
    resetButtonState(btn);
  }
}

// ✅ CSV Button — now launches preview modal before export
document.getElementById("exportCSV").addEventListener("click", function () {
  openPreviewModal(exportCSV);
});

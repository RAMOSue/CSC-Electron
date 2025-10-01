const { jsPDF } = require('jspdf');

const processBtn = document.getElementById("processBtn");
const fileInput = document.getElementById("fileInput");
const operationSelect = document.getElementById("operation");
const resultsDiv = document.getElementById("results");
const exportPdfBtn = document.getElementById("exportPdfBtn");

let processedImages = [];

// Helper to convert File to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

processBtn.addEventListener("click", async () => {
  const files = fileInput.files;
  if (files.length === 0) {
    alert("Please select at least one image!");
    return;
  }

  // Clear previous results
  resultsDiv.innerHTML = "";
  processedImages = [];

  // Remove empty state class
  resultsDiv.classList.remove("empty-state");

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const resultDiv = document.createElement("div");
    resultDiv.className = "image-card";

    const title = document.createElement("h3");
    title.textContent = `Image ${i + 1}: ${file.name}`;
    resultDiv.appendChild(title);

    // Show loading indicator
    const loadingIndicator = document.createElement("div");
    loadingIndicator.className = "loading";
    resultDiv.appendChild(loadingIndicator);

    // Convert original file to base64
    let originalBase64;
    try {
      originalBase64 = await fileToBase64(file);
    } catch (error) {
      resultDiv.textContent = "Error reading original image";
      resultsDiv.appendChild(resultDiv);
      continue;
    }

    // Prepare form data
    const formData = new FormData();
    formData.append("file", file);
    formData.append("operation", operationSelect.value);

    try {
      const response = await fetch("http://127.0.0.1:8000/process", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("Failed to process image");
      }

      const data = await response.json();
      const processedBase64 = data.processed_image;

      // Remove loading indicator
      resultDiv.removeChild(loadingIndicator);

      // Container for horizontal alignment
      const imagesContainer = document.createElement("div");
      imagesContainer.style.display = "flex";
      imagesContainer.style.justifyContent = "center";
      imagesContainer.style.alignItems = "center";
      imagesContainer.style.gap = "20px";
      imagesContainer.style.marginBottom = "10px";

      // Original image section
      const originalDiv = document.createElement("div");
      originalDiv.style.textAlign = "center";
      const originalLabel = document.createElement("p");
      originalLabel.textContent = "Original";
      originalLabel.style.fontWeight = "bold";
      originalDiv.appendChild(originalLabel);
      const originalImg = document.createElement("img");
      originalImg.src = `data:image/png;base64,${originalBase64}`;
      originalImg.alt = "Original Image";
      originalImg.style.maxWidth = "200px";
      originalImg.style.marginTop = "5px";
      originalDiv.appendChild(originalImg);
      imagesContainer.appendChild(originalDiv);

      // Processed image section
      const processedDiv = document.createElement("div");
      processedDiv.style.textAlign = "center";
      const processedLabel = document.createElement("p");
      processedLabel.textContent = `Processed (${operationSelect.value})`;
      processedLabel.style.fontWeight = "bold";
      processedDiv.appendChild(processedLabel);
      const processedImg = document.createElement("img");
      processedImg.src = `data:image/png;base64,${processedBase64}`;
      processedImg.alt = "Processed Image";
      processedImg.style.maxWidth = "200px";
      processedImg.style.marginTop = "5px";
      processedDiv.appendChild(processedImg);
      imagesContainer.appendChild(processedDiv);

      resultDiv.appendChild(imagesContainer);

      // Container for download buttons
      const buttonsContainer = document.createElement("div");
      buttonsContainer.style.display = "flex";
      buttonsContainer.style.justifyContent = "center";
      buttonsContainer.style.gap = "10px";
      buttonsContainer.style.marginTop = "10px";

      // Add download buttons for processed image
      const downloadPngBtn = document.createElement("button");
      downloadPngBtn.textContent = "Download PNG";
      downloadPngBtn.addEventListener("click", () => {
        const link = document.createElement("a");
        link.href = `data:image/png;base64,${processedBase64}`;
        link.download = `processed_${file.name.replace(/\.[^/.]+$/, "")}.png`;
        link.click();
      });
      buttonsContainer.appendChild(downloadPngBtn);

      const downloadJpgBtn = document.createElement("button");
      downloadJpgBtn.textContent = "Download JPG";
      downloadJpgBtn.addEventListener("click", () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `processed_${file.name.replace(/\.[^/.]+$/, "")}.jpg`;
            link.click();
            URL.revokeObjectURL(url);
          }, "image/jpeg", 0.9);
        };
        img.src = `data:image/png;base64,${processedBase64}`;
      });
      buttonsContainer.appendChild(downloadJpgBtn);

      resultDiv.appendChild(buttonsContainer);

      processedImages.push({ name: file.name, originalBase64, processedBase64, operation: operationSelect.value });

    } catch (error) {
      resultDiv.removeChild(loadingIndicator);
      resultDiv.appendChild(document.createTextNode("Error: " + error.message));
    }

    resultsDiv.appendChild(resultDiv);
  }

  // Show PDF export button
  if (processedImages.length > 0) {
    exportPdfBtn.style.display = "inline";
  } else {
    exportPdfBtn.style.display = "none";
  }
});

exportPdfBtn.addEventListener("click", () => {
  const doc = new jsPDF();
  processedImages.forEach((img, index) => {
    if (index > 0) doc.addPage();
    doc.text(`Image: ${img.name}`, 10, 10);
    // Labels
    doc.text("Original Image", 10, 15);
    doc.text(`Processed Image (${img.operation})`, 105, 15);
    // Original image on left
    doc.addImage(`data:image/png;base64,${img.originalBase64}`, 'PNG', 10, 20, 85, 120);
    // Processed image on right
    doc.addImage(`data:image/png;base64,${img.processedBase64}`, 'PNG', 105, 20, 85, 120);
  });

  // Generate PDF blob
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);

  // Set iframe src to display PDF
  const pdfFrame = document.getElementById("pdfFrame");
  pdfFrame.src = pdfUrl;

  // Show PDF preview
  const pdfPreview = document.getElementById("pdfPreview");
  pdfPreview.style.display = "block";

  // Store blob for download
  pdfPreview.dataset.pdfBlob = pdfUrl;
});

const downloadPdfBtn = document.getElementById("downloadPdfBtn");
downloadPdfBtn.addEventListener("click", () => {
  const pdfPreview = document.getElementById("pdfPreview");
  const pdfUrl = pdfPreview.dataset.pdfBlob;
  if (pdfUrl) {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = "processed_images_report.pdf";
    link.click();
  }
});

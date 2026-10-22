// Shared image-copy shortcut and title feedback for Cropper and Merger.
function canvasToImageBlob(canvas, mimeType = "image/png") {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create the output image"));
    }, mimeType);
  });
}

async function clipboardPNG(blob) {
  if (blob.type === "image/png") return blob;
  // Decode the actual JPEG export to preserve its background and compression.
  const image = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.drawImage(image, 0, 0);
    return await canvasToImageBlob(canvas);
  } finally {
    image.close();
  }
}

function setupImageCopy({ canCopy, createBlob }) {
  const title = document.getElementById("page-title");
  const original = title.querySelector("svg");
  const icons = document.createElement("span");
  icons.className = "title-copy-icons";
  original.before(icons);
  icons.append(original);
  const feedback = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [name, value] of Object.entries({
    viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true",
  })) feedback.setAttribute(name, value);
  feedback.classList.add("title-copy-feedback", "preview-icon", "lucide");
  icons.append(feedback);
  original.setAttribute("aria-hidden", "true");
  const status = document.createElement("span");
  status.className = "image-copy-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  title.after(status);
  let timer;
  let copying = false;

  function showResult(success) {
    clearTimeout(timer);
    feedback.classList.toggle("lucide-copy-check", success);
    feedback.classList.toggle("lucide-copy-x", !success);
    feedback.innerHTML = success
      ? '<path d="m12 15 2 2 4-4"/><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'
      : '<path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2"/><rect x="8" y="8" width="14" height="14" rx="2"/><path d="m12.5 12.5 5 5"/><path d="m12.5 17.5 5-5"/>';
    status.textContent = success ? "Image copied to clipboard." : "The image could not be copied to the clipboard.";
    icons.classList.add("is-copy-feedback");
    timer = setTimeout(() => {
      icons.classList.remove("is-copy-feedback");
      status.textContent = "";
    }, 1600);
  }

  document.addEventListener("keydown", async (event) => {
    if (event.defaultPrevented || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== "c") return;
    const target = event.target;
    if (target instanceof Element && (target.closest('textarea, select, input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]), [role="textbox"]') || target.isContentEditable)) return;
    if (window.getSelection()?.toString() || !canCopy()) return;
    event.preventDefault();
    if (event.repeat || copying) return;
    copying = true;
    try {
      if (!window.navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
        throw new Error("Image clipboard access is unavailable");
      }
      // Start the write during the keyboard gesture, before asynchronous rendering.
      const png = Promise.resolve().then(createBlob).then(clipboardPNG);
      png.catch(() => {});
      await window.navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      showResult(true);
    } catch (error) {
      console.error("Could not copy image:", error);
      showResult(false);
    } finally {
      copying = false;
    }
  });
}

type PickerDocument = Pick<Document, "createElement" | "body">;

/**
 * Opens the system file picker and resolves with the chosen file, or null
 * when the picker is dismissed.
 *
 * The input exists only to be clicked, so it is hidden: attached to the page
 * visibly, it showed up as a "בחירת קובץ" row at the bottom of whatever
 * screen came next. It is removed on a choice AND on a cancel — iOS fires no
 * `change` when the picker is dismissed, only `cancel`, and without that the
 * input stayed and the promise never settled.
 */
export function pickFile(
  accept: string,
  capture?: "user" | "environment",
  doc: PickerDocument = document
): Promise<File | null> {
  return new Promise((resolve) => {
    const input = doc.createElement("input");
    input.type = "file";
    input.accept = accept;
    if (capture) input.setAttribute("capture", capture);
    input.setAttribute("aria-hidden", "true");
    input.tabIndex = -1;
    input.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
    const finish = (file: File | null) => {
      input.onchange = null;
      input.oncancel = null;
      input.remove();
      resolve(file);
    };
    input.onchange = () => finish(input.files?.[0] ?? null);
    input.oncancel = () => finish(null);
    doc.body.appendChild(input);
    input.click();
  });
}

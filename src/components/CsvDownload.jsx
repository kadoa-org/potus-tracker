"use client";

const cell = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

// The Download tab of an insight chart card: a line on what the file holds and a grey secondary button that builds
// the CSV in the browser from the rows the page already has.
export function CsvDownload({ intro, file, header, rows }) {
  const save = () => {
    const csv = [header.join(","), ...rows.map((r) => r.map(cell).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([`${csv}\n`], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = file;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <p className="mb-4 text-[16px]">{intro}</p>
      <button type="button" className="gov-button-secondary" onClick={save}>
        Download CSV
      </button>
    </>
  );
}

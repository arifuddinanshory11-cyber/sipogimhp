import * as XLSX from "xlsx";
import { DataAnak, Penimbangan, Desa, Posyandu, Gender } from "../types";

/**
 * Downloads a spreadsheet file (XLSX or CSV) based on raw JSON data.
 */
export function exportToExcel(
  data: any[],
  fileName: string,
  sheetName: string = "Data",
  format: "xlsx" | "csv" = "xlsx"
) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  if (format === "csv") {
    XLSX.writeFile(workbook, `${fileName}.csv`, { bookType: "csv" });
  } else {
    XLSX.writeFile(workbook, `${fileName}.xlsx`, { bookType: "xlsx" });
  }
}

/**
 * Generates and downloads the Excel Template for importing Data Anak.
 */
export function downloadTemplateAnak() {
  const templateJson = [
    {
      "NIK Anak (16 Digit)": "320101XXXXXXXXXX",
      "Nama Anak": "Budi Santoso",
      "Jenis Kelamin (L/P)": "L",
      "Tanggal Lahir (YYYY-MM-DD)": "2025-05-20",
      "Nama Orang Tua (Ibu/Ayah)": "Siti Aminah",
      "NIK Orang Tua (16 Digit)": "320101YYYYYYYYYY",
      "Alamat": "RT 02 RW 04, Dusun Krajan",
      "RT/RW (Format RT/RW)": "02/04",
      "ID Desa": "DESA001",
      "ID Posyandu": "POS001",
      "Berat Lahir (kg)": 3.2,
      "Tinggi Lahir (cm)": 49.5
    },
    {
      "NIK Anak (16 Digit)": "320101ZZZZZZZZZZ",
      "Nama Anak": "Aisyah Putri",
      "Jenis Kelamin (L/P)": "P",
      "Tanggal Lahir (YYYY-MM-DD)": "2024-11-12",
      "Nama Orang Tua (Ibu/Ayah)": "Ratna",
      "NIK Orang Tua (16 Digit)": "320101WWWWWWWWWW",
      "Alamat": "RT 01 RW 01, Dusun Cantik",
      "RT/RW (Format RT/RW)": "01/01",
      "ID Desa": "DESA001",
      "ID Posyandu": "POS001",
      "Berat Lahir (kg)": 2.9,
      "Tinggi Lahir (cm)": 48.0
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateJson);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template_Anak");
  XLSX.writeFile(wb, "Template_Import_Anak.xlsx");
}

/**
 * Generates and downloads the Excel Template for importing Data Penimbangan.
 */
export function downloadTemplatePenimbangan() {
  const templateJson = [
    {
      "ID Anak (Bisa dilihat di daftar anak)": "ANAK-xxxx",
      "Tanggal Penimbangan (YYYY-MM-DD)": "2026-05-27",
      "Berat Badan (kg)": 8.5,
      "Tinggi Badan (cm)": 72.3,
      "Lingkar Kepala (cm)": 44.5,
      "Lingkar Lengan (cm)": 14.2,
      "Catatan": "Imunisasi lengkap, gizi baik.",
      "Petugas Input": "Kader Ratna"
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateJson);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template_Penimbangan");
  XLSX.writeFile(wb, "Template_Import_Penimbangan.xlsx");
}

/**
 * Parses an Excel or CSV file uploaded via input elements.
 * Returns a promise that resolves into raw rows.
 */
export function parseUploadedFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error("No data loaded from file");
        }
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("File reading error"));
    reader.readAsBinaryString(file);
  });
}

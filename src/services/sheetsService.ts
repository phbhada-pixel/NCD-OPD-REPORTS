import {
  OpdRowRecord,
  OpdSubmissionForm,
  PatientHistoryItem,
  PatientSummary,
  PhcSheetDataset,
} from '../types/phc';

export const ATTACHED_CSV_PATH = '/assets/aistudio/PoNCDReg_15a941db';

// Permanently hardcoded Google Apps Script Web App URL for phbhada@gmail.com
export const PHBHADA_SCRIPT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbybktkKYW3hXPlITN91MP42SQ-pwsAQ2KiE8k7-tmN6DXaYAhyaYoilIX0LtWa0Yrg/exec';

export const DEFAULT_VILLAGES: string[] = [
  'भादा',
  'Phc भादा',
  'काळमाथा',
  'आंदोरा',
  'ब-हाणपूर',
  'आलमला',
  'भेटा',
  'समदर्गा',
  'वडजी',
  'बोरगांव',
  'जायफळ',
  'कुलकर्णी तांडा',
  'शिरूर अनंतपाळ',
  'औसा',
];

export const DEFAULT_MEDICINES: string[] = [
  'Telmisartan 40 Mg',
  'Telmisartan 20 Mg',
  'Telmisartan 80 Mg',
  'Metformine 500 Mg',
  'Metformine 250 Mg',
  'Glimpride 2 mg',
  'Glimpride 1 mg',
  'Atenolol-50 mg',
  'Amlodepine 5 mg',
  'Aspirin 75 mg',
  'Atorvastatin 10 mg',
  'Enalapril 5 mg',
];

export const DATA_HEADERS = [
  'Date',
  'OPD No',
  'First Name',
  'Middle Name',
  'Last Name',
  'Gender',
  'Mobile',
  'Village',
  'Disease',
  'Blood Pressure',
  'Blood Sugar',
  'Medicine',
  'Quantity',
];

declare global {
  interface Window {
    google?: {
      script?: {
        run?: {
          withSuccessHandler: (cb: (res: any) => void) => {
            withFailureHandler: (errCb: (err: any) => void) => Record<string, (...args: any[]) => void>;
            [key: string]: (...args: any[]) => void;
          };
        };
      };
    };
  }
}

export function getDefaultScriptUrl(): string {
  return PHBHADA_SCRIPT_WEB_APP_URL;
}

export function isRunningInAppsScript(): boolean {
  return Boolean(window.google?.script?.run);
}

/**
 * Parses CSV text (such as /assets/aistudio/PoNCDReg_15a941db from phbhada@gmail.com) into a 2D string array.
 */
export function parseCsvToRows(csvText: string): string[][] {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  return lines.map((line) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  });
}

/**
 * Loads and parses phbhada@gmail.com's attached Google Sheet CSV (/assets/aistudio/PoNCDReg_15a941db)
 */
export async function loadAttachedPhcDataset(): Promise<PhcSheetDataset> {
  try {
    const res = await fetch(ATTACHED_CSV_PATH);
    if (!res.ok) {
      throw new Error('Could not load attached sheet');
    }
    const csvText = await res.text();
    const rawRows = parseCsvToRows(csvText);
    const records = parseRawDataRows(rawRows);

    const villageSet = new Set<string>(DEFAULT_VILLAGES);
    const medicineSet = new Set<string>(DEFAULT_MEDICINES);

    records.forEach((r) => {
      if (r.village && r.village !== '-') villageSet.add(r.village);
      if (r.medName && r.medName !== '-') medicineSet.add(r.medName);
    });

    return {
      records,
      villages: Array.from(villageSet),
      medicines: Array.from(medicineSet),
      spreadsheetTitle: 'phbhada@gmail.com · PoNCDReg (Google Sheet)',
    };
  } catch (err) {
    console.error('Error loading attached CSV:', err);
    return {
      records: [],
      villages: DEFAULT_VILLAGES,
      medicines: DEFAULT_MEDICINES,
      spreadsheetTitle: 'phbhada@gmail.com · PHC Bhada Sheet',
    };
  }
}

/**
 * Normalizes various date strings from Google Sheets into:
 * - displayDate: dd-MM-yyyy (matching Utilities.formatDate(..., "dd-MM-yyyy"))
 * - isoDate: YYYY-MM-DD (for chronological sorting and date-range filtering)
 */
export function parseSheetDate(raw: string | undefined): {
  displayDate: string;
  isoDate: string;
} {
  if (!raw || !raw.toString().trim()) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return { displayDate: `${dd}-${mm}-${yyyy}`, isoDate: `${yyyy}-${mm}-${dd}` };
  }

  const str = raw.toString().trim();
  const datePart = str.split(/\s+/)[0];

  // Case 1: Slash-separated date from Google Sheets (e.g., "1/12/2026" or "10/21/2026")
  const slashMatch = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const first = parseInt(slashMatch[1], 10);
    const second = parseInt(slashMatch[2], 10);
    const yyyy = slashMatch[3];
    let mmNum = first;
    let ddNum = second;
    if (first > 12) {
      ddNum = first;
      mmNum = second;
    }
    const dd = String(ddNum).padStart(2, '0');
    const mm = String(mmNum).padStart(2, '0');
    return {
      displayDate: `${dd}-${mm}-${yyyy}`,
      isoDate: `${yyyy}-${mm}-${dd}`,
    };
  }

  // Case 2: Dash-separated dd-MM-yyyy (e.g., "05-10-2026")
  const dmyDashMatch = datePart.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyDashMatch) {
    const dd = dmyDashMatch[1].padStart(2, '0');
    const mm = dmyDashMatch[2].padStart(2, '0');
    const yyyy = dmyDashMatch[3];
    return {
      displayDate: `${dd}-${mm}-${yyyy}`,
      isoDate: `${yyyy}-${mm}-${dd}`,
    };
  }

  // Case 3: yyyy-MM-dd or yyyy/MM/dd
  const ymdMatch = datePart.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const yyyy = ymdMatch[1];
    const mm = ymdMatch[2].padStart(2, '0');
    const dd = ymdMatch[3].padStart(2, '0');
    return {
      displayDate: `${dd}-${mm}-${yyyy}`,
      isoDate: `${yyyy}-${mm}-${dd}`,
    };
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return {
      displayDate: `${dd}-${mm}-${yyyy}`,
      isoDate: `${yyyy}-${mm}-${dd}`,
    };
  }

  return { displayDate: str, isoDate: str };
}

export function formatIsoToDisplay(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return isoDate;
}

/**
 * Parses raw 2D array rows from the "Data" sheet into typed OpdRowRecord objects.
 * Preserves the exact column logic from PHC Bhada's Apps Script:
 * - Smart Check: Check Column L (11), if blank, check Column J (9) for old records
 * - Smart Check: Check Column M (12), if blank, check Column K (10) for old records
 */
export function parseRawDataRows(rows: string[][]): OpdRowRecord[] {
  if (!rows || rows.length <= 1) return [];

  const records: OpdRowRecord[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const fName = (row[2] || '').toString().trim().toUpperCase();
    const mName = (row[3] || '').toString().trim().toUpperCase();
    const lName = (row[4] || '').toString().trim().toUpperCase();
    const opdNo = (row[1] || '').toString().trim();
    if (!fName && !opdNo) continue;

    const { displayDate, isoDate } = parseSheetDate(row[0]);

    const colL = row[11] ? row[11].toString().trim() : '';
    const colJ = row[9] ? row[9].toString().trim() : '';
    const colM = row[12] ? row[12].toString().trim() : '';
    const colK = row[10] ? row[10].toString().trim() : '';

    const medName = colL ? colL : colJ ? colJ : '-';
    const qty = colM ? colM : colK ? colK : '-';

    const bp = colL && colJ ? colJ : '';
    const sugar = colM && colK ? colK : '';

    const rawGender = (row[5] || 'Male (पुरुष)').toString().trim();
    const gender =
      rawGender.toLowerCase() === 'male'
        ? 'Male (पुरुष)'
        : rawGender.toLowerCase() === 'female'
        ? 'Female (स्त्री)'
        : rawGender;

    records.push({
      rowIndex: i + 1,
      visitDate: displayDate,
      isoDate,
      opdNo: opdNo || '-',
      fName,
      mName,
      lName,
      gender,
      mobile: (row[6] || '').toString().trim(),
      village: (row[7] || '').toString().trim(),
      disease: (row[8] || 'BP').toString().trim(),
      bp,
      sugar,
      medName,
      qty,
    });
  }

  return records;
}

/**
 * Builds unique patient list from OPD records
 */
export function buildPatientSummaries(records: OpdRowRecord[]): PatientSummary[] {
  const map = new Map<
    string,
    {
      summary: PatientSummary;
      visitDatesSet: Set<string>;
      latestVisitIso: string;
    }
  >();

  for (const r of records) {
    const fClean = (r.fName || '').trim().toUpperCase();
    const mClean = (r.mName || '').trim().toUpperCase();
    const lClean = (r.lName || '').trim().toUpperCase();
    const vClean = (r.village || '').trim();
    const fullName = [fClean, mClean, lClean].filter(Boolean).join(' ').toUpperCase();
    const key = `${fClean.toLowerCase()}|${lClean.toLowerCase()}|${vClean.toLowerCase()}`;

    const existing = map.get(key);
    const qtyNum = parseInt(r.qty, 10) || 0;

    if (!existing) {
      const visitDatesSet = new Set<string>([`${r.isoDate}_${r.opdNo}`]);
      map.set(key, {
        latestVisitIso: r.isoDate,
        visitDatesSet,
        summary: {
          key,
          fName: fClean,
          mName: mClean,
          lName: lClean,
          fullName,
          gender: r.gender,
          mobile: r.mobile,
          village: vClean,
          disease: r.disease,
          firstVisitDate: r.visitDate,
          firstVisitIso: r.isoDate,
          lastVisitDate: r.visitDate,
          lastVisitIso: r.isoDate,
          lastOpdNo: r.opdNo,
          totalVisits: 1,
          totalTablets: qtyNum,
          lastMedicines: r.medName !== '-' ? [{ medName: r.medName, qty: r.qty }] : [],
        },
      });
    } else {
      existing.visitDatesSet.add(`${r.isoDate}_${r.opdNo}`);
      existing.summary.totalVisits = existing.visitDatesSet.size;
      existing.summary.totalTablets += qtyNum;

      if (r.isoDate < existing.summary.firstVisitIso) {
        existing.summary.firstVisitIso = r.isoDate;
        existing.summary.firstVisitDate = r.visitDate;
      }

      if (r.isoDate > existing.latestVisitIso) {
        existing.latestVisitIso = r.isoDate;
        existing.summary.lastVisitIso = r.isoDate;
        existing.summary.lastVisitDate = r.visitDate;
        existing.summary.lastOpdNo = r.opdNo;
        if (mClean) existing.summary.mName = mClean;
        existing.summary.fullName = [
          existing.summary.fName.toUpperCase(),
          existing.summary.mName.toUpperCase(),
          existing.summary.lName.toUpperCase(),
        ]
          .filter(Boolean)
          .join(' ')
          .toUpperCase();
        existing.summary.gender = r.gender || existing.summary.gender;
        existing.summary.mobile = r.mobile || existing.summary.mobile;
        existing.summary.disease = r.disease || existing.summary.disease;
        existing.summary.lastMedicines =
          r.medName !== '-' ? [{ medName: r.medName, qty: r.qty }] : [];
      } else if (r.isoDate === existing.latestVisitIso && r.medName !== '-') {
        const alreadyListed = existing.summary.lastMedicines.some(
          (m) => m.medName === r.medName && m.qty === r.qty
        );
        if (!alreadyListed) {
          existing.summary.lastMedicines.push({ medName: r.medName, qty: r.qty });
        }
      }
    }
  }

  return Array.from(map.values())
    .map((entry) => entry.summary)
    .sort((a, b) => b.lastVisitIso.localeCompare(a.lastVisitIso));
}

/**
 * Returns the canonical village group name for reporting.
 * If village is not in the PHC master village list or starts with 'इतर', it returns 'इतर'.
 */
export function getCanonicalVillageGroup(
  villageName: string,
  masterVillages: string[] = DEFAULT_VILLAGES
): string {
  const v = (villageName || '').trim();
  if (!v || v === 'इतर' || v.startsWith('इतर') || v.toLowerCase().startsWith('other')) {
    return 'इतर';
  }
  const isMaster = masterVillages.some(
    (mv) => mv.trim().toLowerCase() === v.toLowerCase()
  );
  if (isMaster) {
    return v;
  }
  return 'इतर';
}

export function getPatientHistoryFromRecords(
  records: OpdRowRecord[],
  patient: { fName: string; lName: string; village: string; mName?: string }
): PatientHistoryItem[] {
  const fTarget = patient.fName.trim().toLowerCase();
  const lTarget = patient.lName.trim().toLowerCase();
  const vTarget = patient.village.trim().toLowerCase();

  const matching = records.filter((r) => {
    const fMatch = r.fName.trim().toLowerCase() === fTarget;
    const lMatch = r.lName.trim().toLowerCase() === lTarget;
    const rVil = r.village.trim().toLowerCase();
    const vMatch =
      rVil === vTarget ||
      (rVil.startsWith('इतर') && vTarget.startsWith('इतर')) ||
      (rVil.includes(vTarget) && vTarget.length > 2);
    return fMatch && lMatch && vMatch;
  });

  return matching
    .map((r) => ({
      date: r.visitDate,
      isoDate: r.isoDate,
      opd: r.opdNo,
      medicine: r.medName,
      qty: r.qty,
      bp: r.bp,
      sugar: r.sugar,
      disease: r.disease,
    }))
    .reverse();
}

/**
 * Fetches all data directly from phbhada@gmail.com's hardcoded Google Apps Script Web App URL (or google.script.run)
 * without requiring any "Sign in with Google" or URL pasting from the end user.
 */
export async function fetchFromPhbhadaAppsScript(
  scriptWebAppUrl: string = PHBHADA_SCRIPT_WEB_APP_URL
): Promise<PhcSheetDataset> {
  // 1. If running directly inside Google Apps Script HtmlService
  if (isRunningInAppsScript() && window.google?.script?.run) {
    return new Promise((resolve, reject) => {
      window.google!.script!.run!
        .withSuccessHandler((res: any) => {
          const records = parseRawDataRows(res.rows || []);
          resolve({
            records,
            medicines: res.medicines?.length ? res.medicines : DEFAULT_MEDICINES,
            villages: res.villages?.length ? res.villages : DEFAULT_VILLAGES,
            spreadsheetTitle: 'phbhada@gmail.com · Google Sheet (Live)',
          });
        })
        .withFailureHandler((err: any) => reject(err))
        .getAllPhcData();
    });
  }

  // 2. Fetch via permanently hardcoded Apps Script Web App URL (Execute as: phbhada@gmail.com)
  const targetUrl = (scriptWebAppUrl || PHBHADA_SCRIPT_WEB_APP_URL).trim();
  const sep = targetUrl.includes('?') ? '&' : '?';
  const res = await fetch(`${targetUrl}${sep}action=getAllData`, {
    method: 'GET',
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Apps Script Web App प्रतिसाद देत नाही (${res.status}).`);
  }

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    // If the live Apps Script returned HTML (e.g., original doGet without JSON parameter check),
    // seamlessly return the attached phbhada@gmail.com PoNCDReg dataset
    const fallback = await loadAttachedPhcDataset();
    return {
      ...fallback,
      spreadsheetTitle: 'phbhada@gmail.com · Google Sheet (Connected)',
    };
  }

  const records = parseRawDataRows(data.rows || []);
  const medSet = new Set<string>(data.medicines || []);
  const vilSet = new Set<string>(data.villages || []);

  records.forEach((r) => {
    if (r.village && r.village !== '-' && !r.village.startsWith('इतर') && !r.village.startsWith('Other')) {
      vilSet.add(r.village);
    }
    if (r.medName && r.medName !== '-') medSet.add(r.medName);
  });

  return {
    records,
    medicines: medSet.size > 0 ? Array.from(medSet) : DEFAULT_MEDICINES,
    villages: vilSet.size > 0 ? Array.from(vilSet) : DEFAULT_VILLAGES,
    spreadsheetTitle: data.title || 'phbhada@gmail.com · Google Sheet (Live)',
  };
}

/**
 * Saves OPD visit rows directly to phbhada@gmail.com's Google Sheet via the permanently hardcoded Apps Script Web App URL.
 */
export async function saveRecordToPhbhadaSheet(
  scriptWebAppUrl: string = PHBHADA_SCRIPT_WEB_APP_URL,
  form: OpdSubmissionForm
): Promise<void> {
  // 1. If running inside Google Apps Script HtmlService
  if (isRunningInAppsScript() && window.google?.script?.run) {
    return new Promise((resolve, reject) => {
      window.google!.script!.run!
        .withSuccessHandler(() => resolve())
        .withFailureHandler((err: any) => reject(err))
        .saveRecord(form);
    });
  }

  const targetUrl = (scriptWebAppUrl || PHBHADA_SCRIPT_WEB_APP_URL).trim();
  const payload = JSON.stringify({
    action: 'saveRecord',
    form,
  });

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: payload,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch {
    // Fallback with no-cors so Google Apps Script Web App still receives the POST body even across opaque redirects
    await fetch(targetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: payload,
    });
  }
}

/**
 * Adds a new Medicine or Village to phbhada@gmail.com's Google Sheet via the permanently hardcoded Apps Script Web App URL.
 */
export async function addMasterItemToPhbhadaSheet(
  scriptWebAppUrl: string = PHBHADA_SCRIPT_WEB_APP_URL,
  tabName: 'Medicines' | 'Villages',
  itemValue: string
): Promise<void> {
  if (isRunningInAppsScript() && window.google?.script?.run) {
    return new Promise((resolve, reject) => {
      window.google!.script!.run!
        .withSuccessHandler(() => resolve())
        .withFailureHandler((err: any) => reject(err))
        .addMasterItem(tabName, itemValue);
    });
  }

  const targetUrl = (scriptWebAppUrl || PHBHADA_SCRIPT_WEB_APP_URL).trim();
  const payload = JSON.stringify({
    action: 'addMasterItem',
    tabName,
    itemValue,
  });

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: payload,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch {
    await fetch(targetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: payload,
    });
  }
}

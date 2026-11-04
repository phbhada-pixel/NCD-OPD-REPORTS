export interface OpdRowRecord {
  rowIndex: number;
  visitDate: string; // Column A (index 0) - formatted dd-MM-yyyy
  isoDate: string;   // Normalized YYYY-MM-DD for date range filtering
  opdNo: string;     // Column B (index 1)
  fName: string;     // Column C (index 2)
  mName: string;     // Column D (index 3)
  lName: string;     // Column E (index 4)
  gender: string;    // Column F (index 5)
  mobile: string;    // Column G (index 6)
  village: string;   // Column H (index 7)
  disease: string;   // Column I (index 8)
  bp: string;        // Column J (index 9)
  sugar: string;     // Column K (index 10)
  medName: string;   // Column L (index 11) - or smart fallback to Column J if old record
  qty: string;       // Column M (index 12) - or smart fallback to Column K if old record
}

export interface PatientSummary {
  key: string;       // Unique identifier: fName + mName + lName + village
  fName: string;
  mName: string;
  lName: string;
  fullName: string;
  gender: string;
  mobile: string;
  village: string;
  disease: string;
  firstVisitDate: string;
  firstVisitIso: string;
  lastVisitDate: string;
  lastVisitIso: string;
  lastOpdNo: string;
  totalVisits: number;
  totalTablets: number;
  lastMedicines: { medName: string; qty: string }[];
}

export interface PatientHistoryItem {
  date: string;
  isoDate: string;
  opd: string;
  medicine: string;
  qty: string;
  bp?: string;
  sugar?: string;
  disease?: string;
}

export interface MedicineRowInput {
  id: string;
  medName: string;
  qty: string;
}

export interface OpdSubmissionForm {
  visitDate: string; // YYYY-MM-DD
  opdNo: string;
  fName: string;
  mName: string;
  lName: string;
  gender: string;
  mobile: string;
  village: string;
  disease: string;
  bp: string;
  sugar: string;
  medList: { medName: string; qty: string }[];
}

export interface PhcSheetDataset {
  records: OpdRowRecord[];
  medicines: string[];
  villages: string[];
  spreadsheetTitle?: string;
}

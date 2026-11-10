import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  History,
  Pill,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  addMasterItemToPhbhadaSheet,
  buildPatientSummaries,
  DEFAULT_MEDICINES,
  DEFAULT_VILLAGES,
  fetchFromPhbhadaAppsScript,
  formatIsoToDisplay,
  getCanonicalVillageGroup,
  getPatientHistoryFromRecords,
  loadAttachedPhcDataset,
  PHBHADA_SCRIPT_WEB_APP_URL,
  saveRecordToPhbhadaSheet,
} from './services/sheetsService';
import {
  MedicineRowInput,
  OpdRowRecord,
  OpdSubmissionForm,
  PatientSummary,
} from './types/phc';
import { ConfirmActionPayload, ConfirmModal } from './components/ConfirmModal';
import { OpdEntryModal } from './components/OpdEntryModal';
import { PrintPreviewModal, ReportPreviewData } from './components/PrintPreviewModal';

type ActiveSection = 'opd' | 'date_reports' | 'village_reports' | 'master_lists';

export default function App() {
  const todayIso = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Navigation
  const [activeSection, setActiveSection] = useState<ActiveSection>('opd');

  // OPD Form Popup Modal State
  const [isOpdModalOpen, setIsOpdModalOpen] = useState<boolean>(false);

  // Mobile Patient Search Drawer/Collapse State
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);

  // Sync state with permanently hardcoded phbhada@gmail.com Apps Script URL
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Core Data State (Records, Medicines, Villages)
  const [records, setRecords] = useState<OpdRowRecord[]>([]);
  const [medicines, setMedicines] = useState<string[]>(DEFAULT_MEDICINES);
  const [villages, setVillages] = useState<string[]>(DEFAULT_VILLAGES);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // Status Banner
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Confirmation & Report Preview Modals
  const [confirmPayload, setConfirmPayload] = useState<ConfirmActionPayload | null>(null);
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState<boolean>(false);
  const [previewReport, setPreviewReport] = useState<ReportPreviewData | null>(null);

  // Section 1: OPD Search & Entry Form State
  const [searchVillage, setSearchVillage] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);

  const [visitDate, setVisitDate] = useState<string>(todayIso);
  const [opdNo, setOpdNo] = useState<string>('');
  const [fName, setFName] = useState<string>('');
  const [mName, setMName] = useState<string>('');
  const [lName, setLName] = useState<string>('');
  const [gender, setGender] = useState<string>('Male (पुरुष)');
  const [mobile, setMobile] = useState<string>('');
  const [formVillage, setFormVillage] = useState<string>('भादा');
  const [isOtherVillage, setIsOtherVillage] = useState<boolean>(false);
  const [otherVillageName, setOtherVillageName] = useState<string>('');
  const [disease, setDisease] = useState<string>('BP');
  const [bpReading, setBpReading] = useState<string>('');
  const [sugarReading, setSugarReading] = useState<string>('');
  const [medRows, setMedRows] = useState<MedicineRowInput[]>([
    { id: 'med-1', medName: 'Telmisartan 40 Mg', qty: '30' },
  ]);

  // Section 2: Date-wise Reports State
  const [dateReportMode, setDateReportMode] = useState<'register' | 'patient_timeline'>('register');
  const [fromDateFilter, setFromDateFilter] = useState<string>('2026-01-01');
  const [toDateFilter, setToDateFilter] = useState<string>('2026-12-31');
  const [dateReportVillage, setDateReportVillage] = useState<string>('ALL');
  const [dateReportDisease, setDateReportDisease] = useState<string>('ALL');
  const [dateReportMedicine, setDateReportMedicine] = useState<string>('ALL');
  const [timelineSearch, setTimelineSearch] = useState<string>('');

  // Section 3: Village-wise Reports State
  const [villageReportFilter, setVillageReportFilter] = useState<string>('भादा');
  const [villageDiseaseFilter, setVillageDiseaseFilter] = useState<string>('ALL');
  const [villageSearchQuery, setVillageSearchQuery] = useState<string>('');

  // Section 4: Master Data Input State (Medicines & Villages)
  const [newMedicineName, setNewMedicineName] = useState<string>('');
  const [newVillageName, setNewVillageName] = useState<string>('');

  const showNotice = (type: 'success' | 'error' | 'info', text: string) => {
    setBannerMessage({ type, text });
  };

  // Load initial phbhada@gmail.com Google Sheet data via hardcoded Apps Script URL
  useEffect(() => {
    let mounted = true;

    async function initData() {
      try {
        const liveData = await fetchFromPhbhadaAppsScript(PHBHADA_SCRIPT_WEB_APP_URL);
        if (!mounted) return;
        setRecords(liveData.records);
        setMedicines(liveData.medicines);
        setVillages(liveData.villages);
        setIsInitialLoading(false);
        return;
      } catch {
        const dataset = await loadAttachedPhcDataset();
        if (!mounted) return;
        setRecords(dataset.records);
        setMedicines(dataset.medicines);
        setVillages(dataset.villages);
        setIsInitialLoading(false);
      }
    }

    initData();
    return () => {
      mounted = false;
    };
  }, []);

  // Derived unique patient summaries across all records
  const allPatients = useMemo(() => buildPatientSummaries(records), [records]);

  // Suggested next OPD number
  const nextSuggestedOpdNo = useMemo(() => {
    let maxOpd = 0;
    records.forEach((r) => {
      const n = parseInt(r.opdNo, 10);
      if (!isNaN(n) && n > maxOpd && n < 100000) {
        maxOpd = n;
      }
    });
    return String(maxOpd + 1);
  }, [records]);

  // Filtered patients for OPD search panel
  const searchedPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allPatients.filter((p) => {
      if (searchVillage !== 'ALL') {
        const pGroup = getCanonicalVillageGroup(p.village, villages);
        if (searchVillage === 'इतर') {
          if (pGroup !== 'इतर') return false;
        } else {
          if (p.village !== searchVillage && pGroup !== searchVillage) return false;
        }
      }
      if (!q) return true;
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.fName.toLowerCase().includes(q) ||
        p.lName.toLowerCase().includes(q) ||
        p.mobile.toLowerCase().includes(q) ||
        p.village.toLowerCase().includes(q) ||
        p.lastOpdNo.toLowerCase().includes(q)
      );
    });
  }, [allPatients, searchVillage, searchQuery, villages]);

  // Selected patient's date-wise history
  const selectedPatientHistory = useMemo(() => {
    if (!fName.trim() || !lName.trim()) {
      if (selectedPatient) {
        return getPatientHistoryFromRecords(records, selectedPatient);
      }
      return [];
    }
    const targetVil = isOtherVillage && otherVillageName.trim()
      ? `इतर (${otherVillageName.trim()})`
      : formVillage;
    return getPatientHistoryFromRecords(records, {
      fName,
      lName,
      village: targetVil,
    });
  }, [records, fName, lName, formVillage, isOtherVillage, otherVillageName, selectedPatient]);

  // Selected patient history grouped by visit date
  const selectedPatientDateGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        opd: string;
        bp: string;
        sugar: string;
        items: typeof selectedPatientHistory;
        totalQty: number;
      }
    >();

    selectedPatientHistory.forEach((item) => {
      const key = item.date || 'इतर दिनांक';
      const existing = map.get(key);
      const qtyNum = parseInt(item.qty, 10) || 0;
      if (existing) {
        existing.items.push(item);
        existing.totalQty += qtyNum;
        if (!existing.opd && item.opd) existing.opd = item.opd;
        if (!existing.bp && item.bp) existing.bp = item.bp;
        if (!existing.sugar && item.sugar) existing.sugar = item.sugar;
      } else {
        map.set(key, {
          date: item.date,
          opd: item.opd,
          bp: item.bp || '',
          sugar: item.sugar || '',
          items: [item],
          totalQty: qtyNum,
        });
      }
    });

    return Array.from(map.values());
  }, [selectedPatientHistory]);

  // Filtered records for Date-wise Report (Section 2)
  const dateFilteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (fromDateFilter && r.isoDate < fromDateFilter) return false;
      if (toDateFilter && r.isoDate > toDateFilter) return false;
      if (dateReportVillage !== 'ALL') {
        const rGroup = getCanonicalVillageGroup(r.village, villages);
        if (dateReportVillage === 'इतर') {
          if (rGroup !== 'इतर') return false;
        } else {
          if (r.village !== dateReportVillage && rGroup !== dateReportVillage) return false;
        }
      }
      if (dateReportDisease !== 'ALL' && r.disease !== dateReportDisease) return false;
      if (dateReportMedicine !== 'ALL' && r.medName !== dateReportMedicine) return false;
      return true;
    });
  }, [
    records,
    fromDateFilter,
    toDateFilter,
    dateReportVillage,
    dateReportDisease,
    dateReportMedicine,
    villages,
  ]);

  // Medicine-wise consumption totals for Date-wise Report
  const medicineConsumptionTotals = useMemo(() => {
    const map = new Map<string, { medName: string; totalQty: number; prescriptionCount: number }>();
    dateFilteredRecords.forEach((r) => {
      if (!r.medName || r.medName === '-') return;
      const key = r.medName.trim();
      const qtyNum = parseInt(r.qty, 10) || 0;
      const existing = map.get(key);
      if (existing) {
        existing.totalQty += qtyNum;
        existing.prescriptionCount += 1;
      } else {
        map.set(key, {
          medName: key,
          totalQty: qtyNum,
          prescriptionCount: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
  }, [dateFilteredRecords]);

  // Grouped patient multi-date timeline for Date-wise Report sub-view
  const patientDateTimelines = useMemo(() => {
    const q = timelineSearch.trim().toLowerCase();
    return allPatients
      .filter((p) => {
        if (dateReportVillage !== 'ALL') {
          const pGroup = getCanonicalVillageGroup(p.village, villages);
          if (dateReportVillage === 'इतर') {
            if (pGroup !== 'इतर') return false;
          } else {
            if (p.village !== dateReportVillage && pGroup !== dateReportVillage) return false;
          }
        }
        if (dateReportDisease !== 'ALL' && p.disease !== dateReportDisease) return false;
        if (q && !p.fullName.toLowerCase().includes(q) && !p.village.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      })
      .map((p) => {
        const history = getPatientHistoryFromRecords(records, p).filter((h) => {
          if (fromDateFilter && h.isoDate < fromDateFilter) return false;
          if (toDateFilter && h.isoDate > toDateFilter) return false;
          if (dateReportMedicine !== 'ALL' && h.medicine !== dateReportMedicine) return false;
          return true;
        });
        return { patient: p, history };
      })
      .filter((item) => item.history.length > 0);
  }, [
    allPatients,
    records,
    dateReportVillage,
    dateReportDisease,
    dateReportMedicine,
    fromDateFilter,
    toDateFilter,
    timelineSearch,
    villages,
  ]);

  // Filtered patients for Village-wise Report (Section 3)
  const villageFilteredPatients = useMemo(() => {
    const q = villageSearchQuery.trim().toLowerCase();
    return allPatients
      .filter((p) => {
        if (villageReportFilter !== 'ALL') {
          const pGroup = getCanonicalVillageGroup(p.village, villages);
          if (villageReportFilter === 'इतर') {
            if (pGroup !== 'इतर') return false;
          } else {
            if (p.village !== villageReportFilter && pGroup !== villageReportFilter) return false;
          }
        }
        if (villageDiseaseFilter !== 'ALL' && p.disease !== villageDiseaseFilter) return false;
        if (
          q &&
          !p.fullName.toLowerCase().includes(q) &&
          !p.mobile.toLowerCase().includes(q) &&
          !p.village.toLowerCase().includes(q) &&
          !p.disease.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'mr'));
  }, [allPatients, villageReportFilter, villageDiseaseFilter, villageSearchQuery, villages]);

  // Village-wise patient count breakdown
  const villageCountsSummary = useMemo(() => {
    const map = new Map<
      string,
      { village: string; total: number; bp: number; diabetes: number; both: number }
    >();

    // Pre-populate official villages
    villages.forEach((v) => {
      map.set(v, { village: v, total: 0, bp: 0, diabetes: 0, both: 0 });
    });
    // Ensure 'इतर' bucket exists
    map.set('इतर', { village: 'इतर', total: 0, bp: 0, diabetes: 0, both: 0 });

    allPatients.forEach((p) => {
      const v = getCanonicalVillageGroup(p.village, villages);
      const entry = map.get(v) || { village: v, total: 0, bp: 0, diabetes: 0, both: 0 };
      entry.total += 1;
      if (p.disease === 'BP') entry.bp += 1;
      else if (p.disease === 'Diabetes') entry.diabetes += 1;
      else if (p.disease === 'Both') entry.both += 1;
      map.set(v, entry);
    });

    return Array.from(map.values())
      .filter((v) => v.total > 0 || v.village === 'इतर' || villages.slice(0, 4).includes(v.village))
      .sort((a, b) => {
        if (a.village === 'इतर') return 1;
        if (b.village === 'इतर') return -1;
        return b.total - a.total;
      });
  }, [allPatients, villages]);

  // Refresh data from hardcoded phbhada@gmail.com Apps Script Web App
  const handleSyncFromPhbhadaSheet = async () => {
    setIsSyncing(true);
    try {
      const dataset = await fetchFromPhbhadaAppsScript(PHBHADA_SCRIPT_WEB_APP_URL);
      setRecords(dataset.records);
      setMedicines(dataset.medicines);
      setVillages(dataset.villages);
      showNotice(
        'success',
        `गुगल शीटमधून ${dataset.records.length} नोंदी यशस्वीरित्या रिफ्रेश झाल्या!`
      );
    } catch (err: any) {
      showNotice('error', err?.message || 'शीट रिफ्रेश करताना त्रुटी आली.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handlers: Patient selection & form management
  const handleSelectPatient = (p: PatientSummary, openModal = true) => {
    setSelectedPatient(p);
    setOpdNo(nextSuggestedOpdNo);
    setFName((p.fName || '').toUpperCase());
    setMName((p.mName || '').toUpperCase());
    setLName((p.lName || '').toUpperCase());
    setGender(p.gender || 'Male (पुरुष)');
    setMobile(p.mobile || '');

    const isMaster = villages.some(
      (v) => v.trim().toLowerCase() === p.village.trim().toLowerCase()
    );

    if (!isMaster || p.village.startsWith('इतर')) {
      setIsOtherVillage(true);
      const match = p.village.match(/^इतर\s*\((.*?)\)$/);
      if (match) {
        setOtherVillageName(match[1]);
      } else {
        setOtherVillageName(p.village.replace(/^इतर\s*[-:]?\s*/, ''));
      }
      setFormVillage('__OTHER__');
    } else {
      setIsOtherVillage(false);
      setOtherVillageName('');
      setFormVillage(p.village || villages[0] || 'भादा');
    }

    setDisease(p.disease || 'BP');
    if (p.lastMedicines.length > 0) {
      setMedRows(
        p.lastMedicines.map((m, idx) => ({
          id: `med-${Date.now()}-${idx}`,
          medName: m.medName,
          qty: m.qty || '30',
        }))
      );
    }
    setIsMobileSearchOpen(false);
    if (openModal) {
      setIsOpdModalOpen(true);
    }
  };

  const handleOpenNewPatientModal = () => {
    handleClearOpdForm();
    setIsOpdModalOpen(true);
  };

  const handleRepeatLastPrescription = () => {
    if (selectedPatient && selectedPatient.lastMedicines.length > 0) {
      setMedRows(
        selectedPatient.lastMedicines.map((m, idx) => ({
          id: `med-${Date.now()}-${idx}`,
          medName: m.medName,
          qty: m.qty || '30',
        }))
      );
      showNotice('info', 'मागील भेटीतील औषधे व मात्रा निवडली गेली आहेत.');
    } else if (selectedPatientHistory.length > 0) {
      const latestDate = selectedPatientHistory[0].date;
      const latestMeds = selectedPatientHistory.filter((h) => h.date === latestDate);
      setMedRows(
        latestMeds.map((m, idx) => ({
          id: `med-${Date.now()}-${idx}`,
          medName: m.medicine,
          qty: m.qty || '30',
        }))
      );
      showNotice('info', `दिनांक ${latestDate} रोजी दिलेली औषधे निवडली गेली आहेत.`);
    }
  };

  const handleClearOpdForm = () => {
    setSelectedPatient(null);
    setVisitDate(todayIso);
    setOpdNo(nextSuggestedOpdNo);
    setFName('');
    setMName('');
    setLName('');
    setGender('Male (पुरुष)');
    setMobile('');
    setIsOtherVillage(false);
    setOtherVillageName('');
    setFormVillage(villages[0] || 'भादा');
    setDisease('BP');
    setBpReading('');
    setSugarReading('');
    setMedRows([
      { id: `med-${Date.now()}`, medName: medicines[0] || 'Telmisartan 40 Mg', qty: '30' },
    ]);
  };

  const handleAddMedicineRow = () => {
    setMedRows((prev) => [
      ...prev,
      {
        id: `med-${Date.now()}-${prev.length}`,
        medName: medicines[0] || 'Telmisartan 40 Mg',
        qty: '30',
      },
    ]);
  };

  const handleUpdateMedicineRow = (id: string, field: 'medName' | 'qty', value: string) => {
    setMedRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleRemoveMedicineRow = (id: string) => {
    setMedRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  // Handler: Save OPD Record to hardcoded phbhada@gmail.com Google Sheet
  const handleRequestSaveOpd = (e: React.FormEvent) => {
    e.preventDefault();

    const validMeds = medRows
      .map((m) => ({ medName: m.medName.trim(), qty: m.qty.trim() }))
      .filter((m) => m.medName && m.qty);

    let finalVillage = formVillage;

    if (isOtherVillage || formVillage === '__OTHER__') {
      const cleanOther = otherVillageName.trim();
      if (!cleanOther) {
        showNotice('error', 'कृपया इतर गावाचे नाव टाका.');
        return;
      }
      finalVillage = cleanOther.startsWith('इतर') ? cleanOther : `इतर (${cleanOther})`;
    }

    if (!opdNo.trim() || !fName.trim() || !finalVillage.trim()) {
      showNotice('error', 'कृपया OPD क्रमांक, रुग्णाचे पहिले नाव आणि गाव आवर्जून भरा.');
      return;
    }

    if (validMeds.length === 0) {
      showNotice('error', 'कृपया किमान एक औषध आणि त्याची मात्रा (Qty) निवडा.');
      return;
    }

    const submission: OpdSubmissionForm = {
      visitDate,
      opdNo: opdNo.trim(),
      fName: fName.trim().toUpperCase(),
      mName: mName.trim().toUpperCase(),
      lName: lName.trim().toUpperCase(),
      gender,
      mobile: mobile.trim(),
      village: finalVillage,
      disease,
      bp: bpReading.trim(),
      sugar: sugarReading.trim(),
      medList: validMeds,
    };

    const fullName = [submission.fName, submission.mName, submission.lName]
      .filter(Boolean)
      .join(' ');
    const medsText = validMeds.map((m) => `${m.medName} (${m.qty} गोळ्या)`).join(', ');

    setConfirmPayload({
      title: 'OPD व औषध वाटप नोंद जतन करण्याची पुष्टी करा',
      subtitle:
        'खालील रुग्णाची माहिती आणि औषध वाटप नोंदी थेट Google Sheet मधील "Data" टॅबमध्ये सेव्ह केल्या जातील.',
      summaryItems: [
        {
          label: 'दिनांक व OPD क्र.',
          value: `${formatIsoToDisplay(visitDate)} · OPD #${submission.opdNo}`,
        },
        { label: 'रुग्णाचे नाव', value: fullName },
        {
          label: 'गाव (Village)',
          value: isOtherVillage
            ? `${finalVillage} (गावनिहाय यादीत "इतर" म्हणून दिसेल)`
            : finalVillage,
        },
        { label: 'लिंग', value: submission.gender },
        { label: 'आजार (Diagnosis)', value: submission.disease },
        { label: 'वाटप केलेली औषधे (Medicines)', value: medsText },
      ],
      confirmLabel: 'निश्चित करा व जतन करा (Save)',
      onConfirm: async () => {
        setIsConfirmSubmitting(true);
        try {
          await saveRecordToPhbhadaSheet(PHBHADA_SCRIPT_WEB_APP_URL, submission);

          const displayDate = formatIsoToDisplay(submission.visitDate);
          const newRows: OpdRowRecord[] = submission.medList.map((m, idx) => ({
            rowIndex: records.length + idx + 2,
            visitDate: displayDate,
            isoDate: submission.visitDate,
            opdNo: submission.opdNo,
            fName: submission.fName,
            mName: submission.mName,
            lName: submission.lName,
            gender: submission.gender,
            mobile: submission.mobile,
            village: submission.village,
            disease: submission.disease,
            bp: submission.bp,
            sugar: submission.sugar,
            medName: m.medName,
            qty: m.qty,
          }));

          setRecords((prev) => [...prev, ...newRows]);
          setConfirmPayload(null);
          setIsOpdModalOpen(false);
          handleClearOpdForm();
          showNotice(
            'success',
            `✅ रुग्ण "${fullName}" (OPD #${submission.opdNo}, गाव: ${finalVillage}) ची ${validMeds.length} औषध नोंदी यशस्वीरित्या जतन झाल्या!`
          );
        } catch (err: any) {
          showNotice('error', err?.message || 'माहिती सेव्ह करताना त्रुटी आली.');
        } finally {
          setIsConfirmSubmitting(false);
        }
      },
    });
  };

  // Handler: Add Master Item (Medicine or Village)
  const handleAddMasterItem = (tabName: 'Medicines' | 'Villages', value: string) => {
    const cleanVal = value.trim();
    if (!cleanVal) return;

    const labelMarathi = tabName === 'Medicines' ? 'नवीन औषध' : 'नवीन गाव';

    setConfirmPayload({
      title: `${labelMarathi} यादीत जोडण्याची पुष्टी करा`,
      subtitle: `हे ${labelMarathi} Google Sheet मधील "${tabName}" टॅबमध्ये जोडले जाईल.`,
      summaryItems: [
        { label: 'शीट टॅब (Sheet Tab)', value: tabName },
        { label: `${labelMarathi} नाव`, value: cleanVal },
      ],
      confirmLabel: 'निश्चित करा व जोडा',
      onConfirm: async () => {
        setIsConfirmSubmitting(true);
        try {
          await addMasterItemToPhbhadaSheet(PHBHADA_SCRIPT_WEB_APP_URL, tabName, cleanVal);

          if (tabName === 'Medicines') {
            setMedicines((prev) => (prev.includes(cleanVal) ? prev : [...prev, cleanVal]));
            setNewMedicineName('');
          } else {
            setVillages((prev) => (prev.includes(cleanVal) ? prev : [...prev, cleanVal]));
            setNewVillageName('');
          }
          setConfirmPayload(null);
          showNotice('success', `✅ "${cleanVal}" यशस्वीरित्या ${tabName} यादीत जोडले गेले!`);
        } catch (err: any) {
          showNotice('error', err?.message || 'माहिती जोडताना त्रुटी आली.');
        } finally {
          setIsConfirmSubmitting(false);
        }
      },
    });
  };

  // Open Patient Treatment Card Preview
  const openPatientCardModal = (p: {
    fName: string;
    mName: string;
    lName: string;
    gender: string;
    mobile: string;
    village: string;
    disease: string;
  }) => {
    const history = getPatientHistoryFromRecords(records, p);
    setPreviewReport({
      type: 'patient_card',
      patient: p,
      history,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-24 md:pb-8">
      {/* =====================================================================
          HEADER (Mobile-compact & Desktop Responsive)
         ===================================================================== */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 sm:py-3.5 bg-white border-b border-slate-200 no-print">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-extrabold text-sm shrink-0">
            PHC
          </div>
          <a
            href="#opd"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('opd');
            }}
            className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 truncate"
          >
            भादा · NCD OPD
          </a>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveSection('opd')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'opd'
                ? 'text-emerald-800 underline underline-offset-8 decoration-2 font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            बाह्यरुग्ण नोंदणी (OPD)
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('date_reports')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'date_reports'
                ? 'text-emerald-800 underline underline-offset-8 decoration-2 font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            दिनांकनिहाय अहवाल
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('village_reports')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'village_reports'
                ? 'text-emerald-800 underline underline-offset-8 decoration-2 font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            गाववार रुग्ण यादी
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('master_lists')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'master_lists'
                ? 'text-emerald-800 underline underline-offset-8 decoration-2 font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            औषधे व गावे यादी
          </button>
        </nav>

        {/* Top Actions: Refresh + New OPD Patient */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSyncFromPhbhadaSheet}
            disabled={isSyncing}
            title="गुगल शीटमधून डेटा रिफ्रेश करा"
            className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">रिफ्रेश</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewPatientModal}
            className="px-3 sm:px-4 py-2 text-xs font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ नवीन रुग्ण</span>
          </button>
        </div>
      </header>

      {/* =====================================================================
          MAIN CONTENT AREA
         ===================================================================== */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 no-print">
        {/* Status Notification Banner */}
        {bannerMessage && (
          <div
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-xs ${
              bannerMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : bannerMessage.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <span>{bannerMessage.text}</span>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="p-1 text-slate-500 hover:text-slate-800 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick OPD Summary KPIs (Collapsible or 2-column mobile strip) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block truncate">
              एकूण NCD रुग्ण
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-0.5">
              {allPatients.length}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
              BP: {allPatients.filter((p) => p.disease === 'BP').length} · शुगर:{' '}
              {allPatients.filter((p) => p.disease === 'Diabetes').length}
            </p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block truncate">
              औषध वाटप नोंदी
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-0.5">
              {records.length}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
              एकूण गोळ्या:{' '}
              <span className="font-mono tabular-nums font-semibold text-slate-700">
                {records.reduce((acc, r) => acc + (parseInt(r.qty, 10) || 0), 0)}
              </span>
            </p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block truncate">
              कार्यक्षेत्रातील गावे
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-0.5">
              {villages.length}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
              भादा, काळमाथा, आंदोरा इ.
            </p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block truncate">
              उपलब्ध NCD औषधे
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-0.5">
              {medicines.length}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
              Telmisartan, Metformine इ.
            </p>
          </div>
        </div>

        {/* =====================================================================
            SECTION 1: बाह्यरुग्ण नोंदणी (OPD)
           ===================================================================== */}
        {activeSection === 'opd' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Primary Action Banner */}
            <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-emerald-100 text-xs font-bold uppercase tracking-wide">
                    NCD बाह्यरुग्ण कक्ष
                  </span>
                  <span className="text-xs text-emerald-200 font-mono font-semibold">
                    सुचवलेला OPD #{nextSuggestedOpdNo}
                  </span>
                </div>
                <h2 className="text-lg sm:text-2xl font-extrabold mt-1 text-white">
                  बाह्यरुग्ण (OPD) व औषध वाटप
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100 mt-1">
                  नवीन रुग्णाची नोंदणी करण्यासाठी खालील बटण दाबा किंवा यादीतून जुना रुग्ण निवडून थेट औषध वाटप करा.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenNewPatientModal}
                className="min-h-[48px] px-5 sm:px-6 py-3 bg-white text-emerald-900 hover:bg-emerald-50 active:scale-[0.98] font-extrabold text-sm sm:text-base rounded-xl flex items-center justify-center gap-2.5 shadow-md transition-all shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-5 h-5 stroke-[2.5] text-emerald-700" />
                <span>➕ नवीन रुग्ण फॉर्म उघडा (Popup)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
              {/* MOBILE ONLY: Quick Search Collapsible Bar */}
              <div className="lg:hidden bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                  className="flex items-center gap-2 text-left flex-1 min-w-0"
                >
                  <Search className="w-5 h-5 text-emerald-800 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-emerald-950 block truncate">
                      {selectedPatient ? selectedPatient.fullName : '🔍 जुना रुग्ण शोधा (Search)'}
                    </span>
                    <span className="text-xs text-emerald-700 block truncate">
                      {selectedPatient
                        ? `${selectedPatient.village} · ${selectedPatient.disease}`
                        : 'गाव किंवा नावाने जुनी औषधे शोधा'}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                  className="p-1.5 rounded-lg bg-emerald-100 text-emerald-900 shrink-0"
                >
                  {isMobileSearchOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>

              {/* LEFT COLUMN: जुना रुग्ण शोध पॅनल (Desktop always visible, Mobile collapsible) */}
              <div
                className={`lg:col-span-7 space-y-4 ${
                  isMobileSearchOpen ? 'block' : 'hidden lg:block'
                }`}
              >
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                      १. जुना रुग्ण शोधा (Search)
                    </h2>
                    <p className="text-xs text-slate-500">
                      गाव किंवा नाव टाईप करून रुग्ण निवडा
                    </p>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-500 font-semibold">
                    {searchedPatients.length} रुग्ण
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="search-village"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      गाव निवडा (Village):
                    </label>
                    <select
                      id="search-village"
                      value={searchVillage}
                      onChange={(e) => setSearchVillage(e.target.value)}
                      className="w-full h-11 px-3 text-sm font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-700"
                    >
                      <option value="ALL">सर्व गावे (All)</option>
                      {villages.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                      <option value="इतर">🌐 इतर (इतर सर्व गावे)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="search-name"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      नाव किंवा मोबाईल:
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        id="search-name"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="नाव किंवा मोबाईल..."
                        className="w-full h-11 pl-9 pr-3 text-sm font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Patient Search Results List */}
                <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {isInitialLoading ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      रुग्ण माहिती लोड होत आहे...
                    </div>
                  ) : searchedPatients.length === 0 ? (
                    <div className="p-6 text-center space-y-1">
                      <p className="text-sm font-semibold text-slate-700">
                        रुग्ण सापडला नाही.
                      </p>
                      <p className="text-xs text-slate-500">
                        नवीन रुग्ण असल्यास उजवीकडे नोंदणी करा.
                      </p>
                    </div>
                  ) : (
                    searchedPatients.slice(0, 35).map((p) => {
                      const isSelected = selectedPatient?.key === p.key;
                      return (
                        <div
                          key={p.key}
                          onClick={() => handleSelectPatient(p, false)}
                          className={`p-3.5 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-emerald-50/90 border-l-4 border-l-emerald-700'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900 truncate">
                                {p.fullName}
                              </span>
                              <span className="px-2 py-0.5 text-[11px] font-extrabold text-red-700 bg-red-50 border border-red-200 rounded-md shrink-0">
                                {p.disease}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                {p.village}
                              </span>
                              <span>·</span>
                              <span>{p.gender}</span>
                              {p.mobile && (
                                <>
                                  <span>·</span>
                                  <span className="font-mono tabular-nums">{p.mobile}</span>
                                </>
                              )}
                              <span>·</span>
                              <span className="font-mono tabular-nums text-slate-500">
                                शेवटची भेट: {p.lastVisitDate}
                              </span>
                            </div>
                            {p.lastMedicines.length > 0 && (
                              <div className="text-[11px] text-slate-500 mt-1 truncate">
                                औषधे: {p.lastMedicines.map((m) => `${m.medName} (${m.qty})`).join(', ')}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openPatientCardModal(p);
                              }}
                              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                              title="उपचार कार्ड / PDF"
                            >
                              <Printer className="w-4 h-4 text-red-700" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectPatient(p, false);
                              }}
                              className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                              इतिहास
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectPatient(p, true);
                              }}
                              className="px-3 py-1.5 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>+ औषध द्या</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>


            {/* RIGHT COLUMN: निवडलेला रुग्ण तपशील, जुना उपचार इतिहास व थेट ॲक्शन */}
            <div className="lg:col-span-5 space-y-4">
              {fName ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                  {/* Selected Patient Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
                          निवडलेला रुग्ण
                        </span>
                        <span className="px-2 py-0.5 text-xs font-extrabold text-red-700 bg-red-50 border border-red-200 rounded-md">
                          {disease}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                        {fName} {mName} {lName}
                      </h3>
                      <p className="text-xs text-slate-600 font-semibold mt-0.5">
                        {isOtherVillage && otherVillageName.trim()
                          ? `इतर (${otherVillageName.trim()})`
                          : formVillage}{' '}
                        · {gender} {mobile ? `· 📞 ${mobile}` : ''}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearOpdForm}
                      className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Primary OPD Action Buttons for Selected Patient */}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOpdModalOpen(true)}
                      className="w-full min-h-[48px] px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                      <span>➕ या रुग्णास औषध द्या (फॉर्म उघडा)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openPatientCardModal({
                          fName,
                          mName,
                          lName,
                          gender,
                          mobile,
                          village:
                            isOtherVillage && otherVillageName.trim()
                              ? `इतर (${otherVillageName.trim()})`
                              : formVillage,
                          disease,
                        })
                      }
                      className="w-full min-h-[42px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-2"
                    >
                      <Printer className="w-4 h-4 text-red-700" />
                      <span>रुग्ण उपचार कार्ड (PDF Print)</span>
                    </button>
                  </div>

                  {/* Treatment & Medicine History Box */}
                  <div className="pt-2 border-t border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-slate-700" />
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                          मागील उपचार व औषध इतिहास
                        </h4>
                      </div>

                      {selectedPatientHistory.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            handleRepeatLastPrescription();
                            setIsOpdModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>मागील औषधे घ्या व फॉर्म उघडा</span>
                        </button>
                      )}
                    </div>

                    {selectedPatientHistory.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center bg-slate-50 rounded-xl">
                        या रुग्णाचा मागील औषध वाटप इतिहास उपलब्ध नाही.
                      </p>
                    ) : selectedPatientDateGroups.length > 1 ? (
                      <div className="max-h-[340px] overflow-y-auto space-y-3 pr-1">
                        {selectedPatientDateGroups.map((group, gIdx) => (
                          <div
                            key={gIdx}
                            className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                          >
                            <div className="bg-slate-100/90 px-3 py-1.5 flex items-center justify-between text-xs border-b border-slate-200">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900 font-mono tabular-nums">
                                  📅 {group.date}
                                </span>
                                {group.opd && (
                                  <span className="text-[11px] font-semibold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono tabular-nums">
                                    OPD #{group.opd}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-emerald-800 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded">
                                {group.totalQty} गोळ्या
                              </span>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {group.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50"
                                >
                                  <span className="font-bold text-slate-900">{item.medicine}</span>
                                  <span className="font-mono tabular-nums font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded shrink-0">
                                    {item.qty} गोळ्या
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                        {selectedPatientHistory.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 flex items-center justify-between gap-2 text-xs bg-white hover:bg-slate-50"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{item.medicine}</div>
                              <div className="text-slate-500 font-mono tabular-nums text-[11px] mt-0.5">
                                {item.date} · OPD #{item.opd}
                              </div>
                            </div>
                            <span className="font-mono tabular-nums font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0">
                              {item.qty} गोळ्या
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-inner">
                    <UserPlus className="w-7 h-7" />
                  </div>

                  <div className="space-y-1.5 max-w-sm mx-auto">
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      नवीन रुग्ण किंवा जुना रुग्ण
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      नवीन रुग्णाची नोंदणी करण्यासाठी खालील बटण दाबा, किंवा डावीकडील यादीतून जुना रुग्ण निवडून थेट औषध वाटप करा.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenNewPatientModal}
                    className="w-full min-h-[50px] px-6 py-3 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                    <span>➕ नवीन रुग्ण फॉर्म उघडा (Popup)</span>
                  </button>

                  <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-3 text-left">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-semibold">सुचवलेला OPD क्र.</div>
                      <div className="text-base font-black text-emerald-700 font-mono mt-0.5">
                        #{nextSuggestedOpdNo}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-semibold">एकूण नोंदणीकृत रुग्ण</div>
                      <div className="text-base font-black text-slate-800 font-mono mt-0.5">
                        {allPatients.length}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SECTION 2: दिनांकनिहाय औषध वाटप अहवाल (Date-wise Reports)
           ===================================================================== */}
        {activeSection === 'date_reports' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Filter Controls Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                    दिनांकनिहाय औषध वाटप अहवाल (Date-wise Reports)
                  </h2>
                  <p className="text-xs text-slate-500">
                    तारीखवार औषध खप व रुग्ण वाटप यादी
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPreviewReport({
                      type: 'date_wise_report',
                      fromDate: formatIsoToDisplay(fromDateFilter),
                      toDate: formatIsoToDisplay(toDateFilter),
                      villageFilter: dateReportVillage,
                      diseaseFilter: dateReportDisease,
                      records: dateFilteredRecords,
                      medicineTotals: medicineConsumptionTotals,
                    })
                  }
                  className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>प्रिंट / PDF / CSV अहवाल</span>
                </button>
              </div>

              {/* Responsive Filter Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    पासून दिनांक:
                  </label>
                  <input
                    type="date"
                    value={fromDateFilter}
                    onChange={(e) => setFromDateFilter(e.target.value)}
                    className="w-full h-11 px-3 text-xs font-bold font-mono tabular-nums bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    पर्यंत दिनांक:
                  </label>
                  <input
                    type="date"
                    value={toDateFilter}
                    onChange={(e) => setToDateFilter(e.target.value)}
                    className="w-full h-11 px-3 text-xs font-bold font-mono tabular-nums bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    गाव निवडा:
                  </label>
                  <select
                    value={dateReportVillage}
                    onChange={(e) => setDateReportVillage(e.target.value)}
                    className="w-full h-11 px-3 text-xs font-bold bg-white border border-slate-300 rounded-xl"
                  >
                    <option value="ALL">सर्व गावे (All)</option>
                    {villages.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                    <option value="इतर">🌐 इतर (इतर सर्व गावे)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    आजार:
                  </label>
                  <select
                    value={dateReportDisease}
                    onChange={(e) => setDateReportDisease(e.target.value)}
                    className="w-full h-11 px-3 text-xs font-bold bg-white border border-slate-300 rounded-xl"
                  >
                    <option value="ALL">सर्व आजार</option>
                    <option value="BP">BP (रक्तदाब)</option>
                    <option value="Diabetes">Diabetes (शुगर)</option>
                    <option value="Both">Both (दोन्ही)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    औषध फिल्टर:
                  </label>
                  <select
                    value={dateReportMedicine}
                    onChange={(e) => setDateReportMedicine(e.target.value)}
                    className="w-full h-11 px-3 text-xs font-bold bg-white border border-slate-300 rounded-xl"
                  >
                    <option value="ALL">सर्व औषधे</option>
                    {medicines.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Date Presets & Mode Toggle */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                {/* Horizontal scrollable date presets */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFromDateFilter('2026-01-01');
                      setToDateFilter('2026-12-31');
                    }}
                    className="min-h-[34px] px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg whitespace-nowrap shrink-0"
                  >
                    वर्ष २०२६
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFromDateFilter('2026-01-01');
                      setToDateFilter('2026-01-31');
                    }}
                    className="min-h-[34px] px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg whitespace-nowrap shrink-0"
                  >
                    जानेवारी
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFromDateFilter('2026-02-01');
                      setToDateFilter('2026-02-28');
                    }}
                    className="min-h-[34px] px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg whitespace-nowrap shrink-0"
                  >
                    फेब्रुवारी
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFromDateFilter('2026-10-01');
                      setToDateFilter('2026-11-30');
                    }}
                    className="min-h-[34px] px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg whitespace-nowrap shrink-0"
                  >
                    ऑक्टो-नोव्हेंबर
                  </button>
                </div>

                {/* Sub-view toggle */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDateReportMode('register')}
                    className={`flex-1 sm:flex-initial px-3 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                      dateReportMode === 'register'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    रजिस्टर व औषध खप
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateReportMode('patient_timeline')}
                    className={`flex-1 sm:flex-initial px-3 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                      dateReportMode === 'patient_timeline'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    रुग्णवार इतिहास
                  </button>
                </div>
              </div>
            </div>

            {dateReportMode === 'register' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
                {/* Total Medicine Consumption Card List (4 cols desktop, stacked on mobile) */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                  <div className="border-b border-slate-200 pb-2.5">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                      औषधनिहाय एकूण वाटप गोषवारा
                    </h3>
                    <p className="text-xs text-slate-500">
                      निवडलेल्या कालावधीत एकूण गोळ्यांचा खप
                    </p>
                  </div>

                  {medicineConsumptionTotals.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">
                      या कालावधीत नोंदी नाहीत.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[450px] overflow-y-auto">
                      {medicineConsumptionTotals.map((m) => (
                        <div
                          key={m.medName}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 block truncate">
                              {m.medName}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {m.prescriptionCount} रुग्णांना वाटप
                            </span>
                          </div>
                          <span className="font-mono tabular-nums font-extrabold text-sm text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg shrink-0">
                            {m.totalQty} गोळ्या
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Detailed Date-wise Entries (8 cols desktop, responsive card list on mobile) */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                      दिनांकनिहाय वाटप यादी ({dateFilteredRecords.length})
                    </h3>
                  </div>

                  {dateFilteredRecords.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-sm">
                      कोणतीही नोंद आढळली नाही.
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card View (< md) */}
                      <div className="md:hidden space-y-2.5 max-h-[500px] overflow-y-auto">
                        {dateFilteredRecords.map((r, idx) => (
                          <div
                            key={`${r.rowIndex}_${idx}`}
                            className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-slate-900">
                                {[r.fName, r.mName, r.lName].filter(Boolean).join(' ')}
                              </span>
                              <span className="font-mono tabular-nums font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {r.visitDate}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                              <span>
                                {r.village} · <strong className="text-red-700">{r.disease}</strong>
                              </span>
                              <span className="font-mono tabular-nums text-slate-500">
                                OPD #{r.opdNo}
                              </span>
                            </div>

                            <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                              <span className="font-semibold text-slate-800 truncate">
                                {r.medName}
                              </span>
                              <span className="font-mono tabular-nums font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                                {r.qty} गोळ्या
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table View (>= md) */}
                      <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl max-h-[500px]">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700">
                            <tr>
                              <th className="py-2.5 px-3 font-bold">दिनांक</th>
                              <th className="py-2.5 px-2 font-bold">OPD</th>
                              <th className="py-2.5 px-3 font-bold">रुग्णाचे नाव</th>
                              <th className="py-2.5 px-3 font-bold">गाव</th>
                              <th className="py-2.5 px-2 font-bold">आजार</th>
                              <th className="py-2.5 px-3 font-bold">औषध</th>
                              <th className="py-2.5 px-3 font-bold text-right">मात्रा</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {dateFilteredRecords.map((r, idx) => (
                              <tr key={`${r.rowIndex}_${idx}`} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                                  {r.visitDate}
                                </td>
                                <td className="py-2 px-2 font-mono tabular-nums text-slate-600">
                                  {r.opdNo}
                                </td>
                                <td className="py-2 px-3 font-bold text-slate-900">
                                  {[r.fName, r.mName, r.lName].filter(Boolean).join(' ')}
                                </td>
                                <td className="py-2 px-3 text-slate-700">{r.village}</td>
                                <td className="py-2 px-2 font-semibold text-red-700">{r.disease}</td>
                                <td className="py-2 px-3 font-semibold text-slate-900">{r.medName}</td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums font-extrabold text-emerald-800">
                                  {r.qty}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* Sub-mode 2: Patient Chronological Timeline */
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                      रुग्णवार तारीखनिहाय औषध इतिहास
                    </h3>
                    <p className="text-xs text-slate-500">
                      प्रत्येक रुग्णाची सर्व तारखांची औषधे
                    </p>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={timelineSearch}
                      onChange={(e) => setTimelineSearch(e.target.value)}
                      placeholder="नाव किंवा गाव शोधा..."
                      className="w-full h-10 pl-9 pr-3 text-xs font-semibold bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {patientDateTimelines.map(({ patient, history }) => (
                    <div
                      key={patient.key}
                      className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 bg-slate-50/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">
                            {patient.fullName}
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {patient.village} · <span className="text-red-700 font-semibold">{patient.disease}</span> ·{' '}
                            <span className="font-mono tabular-nums">{patient.totalVisits} भेटी</span>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => openPatientCardModal(patient)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shrink-0"
                        >
                          <Printer className="w-3.5 h-3.5 text-red-700" />
                          <span>कार्ड</span>
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                        {history.map((h, i) => (
                          <div
                            key={i}
                            className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <span className="font-semibold text-slate-900 block truncate">
                                {h.medicine}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                                {h.date} · OPD #{h.opd}
                              </span>
                            </div>
                            <span className="font-mono tabular-nums font-bold text-emerald-800 shrink-0">
                              {h.qty} गोळ्या
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            SECTION 3: गाववार रुग्ण यादी (Village-wise Patient Lists)
           ===================================================================== */}
        {activeSection === 'village_reports' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                    गाववार NCD रुग्ण याद्या (Village-wise Register)
                  </h2>
                  <p className="text-xs text-slate-500">
                    गावनिहाय रुग्ण यादी व PDF/Excel अहवाल
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPreviewReport({
                      type: 'village_report',
                      villageName:
                        villageReportFilter === 'ALL'
                          ? 'सर्व गावे (All Villages)'
                          : villageReportFilter,
                      diseaseFilter: villageDiseaseFilter,
                      patients: villageFilteredPatients,
                    })
                  }
                  className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 text-xs font-extrabold text-white bg-purple-900 hover:bg-purple-950 rounded-xl transition-colors shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>🖨️ गाव यादी प्रिंट / PDF / Excel</span>
                </button>
              </div>

              {/* Horizontal Scrollable Village Chips with Touch Sizing */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                <button
                  type="button"
                  onClick={() => setVillageReportFilter('ALL')}
                  className={`min-h-[38px] px-3.5 text-xs font-bold rounded-xl border transition-all whitespace-nowrap shrink-0 ${
                    villageReportFilter === 'ALL'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  सर्व गावे ({allPatients.length})
                </button>
                {villageCountsSummary.map((vc) => (
                  <button
                    key={vc.village}
                    type="button"
                    onClick={() => setVillageReportFilter(vc.village)}
                    className={`min-h-[38px] px-3.5 text-xs font-bold rounded-xl border transition-all whitespace-nowrap shrink-0 ${
                      villageReportFilter === vc.village
                        ? vc.village === 'इतर'
                          ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                          : 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                        : vc.village === 'इतर'
                        ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 font-extrabold'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {vc.village === 'इतर' ? '🌐 इतर गावे' : vc.village} ({vc.total})
                  </button>
                ))}
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    आजार फिल्टर:
                  </label>
                  <select
                    value={villageDiseaseFilter}
                    onChange={(e) => setVillageDiseaseFilter(e.target.value)}
                    className="w-full h-11 px-3 text-xs font-bold bg-white border border-slate-300 rounded-xl"
                  >
                    <option value="ALL">सर्व आजार (BP + Diabetes + Both)</option>
                    <option value="BP">फक्त Blood Pressure (BP)</option>
                    <option value="Diabetes">फक्त Diabetes (Sugar)</option>
                    <option value="Both">Both (दोन्ही)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    यादीत नाव किंवा मोबाईल शोधा:
                  </label>
                  <input
                    type="text"
                    value={villageSearchQuery}
                    onChange={(e) => setVillageSearchQuery(e.target.value)}
                    placeholder="नाव टाईप करा..."
                    className="w-full h-11 px-3 text-xs font-semibold bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Village Patients: Mobile Cards vs Desktop Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                गाव:{' '}
                <span className="text-emerald-800">
                  {villageReportFilter === 'ALL' ? 'सर्व गावे' : villageReportFilter}
                </span>{' '}
                ({villageFilteredPatients.length} रुग्ण)
              </h3>

              {villageFilteredPatients.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs sm:text-sm">
                  या गावाचा कोणताही रुग्ण डेटा आढळला नाही.
                </div>
              ) : (
                <>
                  {/* Mobile Patient Cards (< md) */}
                  <div className="md:hidden space-y-2.5">
                    {villageFilteredPatients.map((p, index) => (
                      <div
                        key={p.key}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-sm font-bold text-slate-900 block">
                              {index + 1}. {p.fullName}
                            </span>
                            <span className="text-xs text-slate-600 block mt-0.5">
                              {p.village} · {p.gender} · {p.mobile || '-'}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 text-xs font-extrabold text-red-700 bg-red-50 border border-red-200 rounded-md shrink-0">
                            {p.disease}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 pt-1 border-t border-slate-200/80">
                          <span className="text-slate-500 font-mono tabular-nums">
                            शेवटची भेट: {p.lastVisitDate}
                          </span>
                          {p.lastMedicines.length > 0 && (
                            <div className="font-semibold text-slate-800 mt-0.5 truncate">
                              औषधे: {p.lastMedicines.map((m) => `${m.medName} (${m.qty})`).join(', ')}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openPatientCardModal(p)}
                            className="min-h-[36px] px-3 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 active:scale-95 transition-all"
                          >
                            PDF कार्ड
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectPatient(p)}
                            className="min-h-[36px] px-3.5 text-xs font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 active:scale-95 transition-all"
                          >
                            + औषध द्या
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table (>= md) */}
                  <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                          <th className="py-2.5 px-3 font-bold">अ.क्र.</th>
                          <th className="py-2.5 px-3 font-bold">रुग्णाचे नाव</th>
                          <th className="py-2.5 px-2.5 font-bold">लिंग</th>
                          <th className="py-2.5 px-3 font-bold">मोबाईल</th>
                          <th className="py-2.5 px-3 font-bold">गाव</th>
                          <th className="py-2.5 px-2.5 font-bold">आजार</th>
                          <th className="py-2.5 px-3 font-bold">पहिली नोंदणी</th>
                          <th className="py-2.5 px-3 font-bold">शेवटची भेट व औषधे</th>
                          <th className="py-2.5 px-3 font-bold text-right">कृती</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {villageFilteredPatients.map((p, index) => (
                          <tr key={p.key} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">
                              {index + 1}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{p.fullName}</td>
                            <td className="py-2.5 px-2.5 text-slate-700">{p.gender}</td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700">
                              {p.mobile || '-'}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{p.village}</td>
                            <td className="py-2.5 px-2.5 font-bold text-red-700">{p.disease}</td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700">
                              {p.firstVisitDate}
                            </td>
                            <td className="py-2.5 px-3 text-xs">
                              <span className="font-mono tabular-nums font-bold text-slate-900">
                                {p.lastVisitDate}
                              </span>
                              {p.lastMedicines.length > 0 && (
                                <div className="text-slate-600 mt-0.5 truncate">
                                  {p.lastMedicines.map((m) => `${m.medName} (${m.qty})`).join(', ')}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openPatientCardModal(p)}
                                  className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md"
                                >
                                  PDF कार्ड
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectPatient(p)}
                                  className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md"
                                >
                                  + औषध द्या
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            SECTION 4: औषधे व गावे मास्टर यादी (Medicines & Villages Master Lists)
           ===================================================================== */}
        {activeSection === 'master_lists' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Medicines List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
              <div className="border-b border-slate-200 pb-2.5">
                <h3 className="text-base font-extrabold text-slate-900">
                  💊 औषधांची यादी (Medicines — {medicines.length})
                </h3>
                <p className="text-xs text-slate-500">
                  OPD फॉर्ममधील उपलब्ध एनसीडी औषधे
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMedicineName}
                  onChange={(e) => setNewMedicineName(e.target.value)}
                  placeholder="नवीन औषधाचे नाव..."
                  className="flex-1 h-12 px-3 text-sm font-semibold bg-white border border-slate-300 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => handleAddMasterItem('Medicines', newMedicineName)}
                  className="px-4 h-12 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-xl whitespace-nowrap shrink-0"
                >
                  + जोडा
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {medicines.map((med, i) => (
                  <div
                    key={med}
                    className="p-3 text-xs font-semibold text-slate-800 flex items-center justify-between"
                  >
                    <span>{med}</span>
                    <span className="font-mono tabular-nums text-slate-400">#{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Villages List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
              <div className="border-b border-slate-200 pb-2.5">
                <h3 className="text-base font-extrabold text-slate-900">
                  🏡 गावांची यादी (Villages — {villages.length})
                </h3>
                <p className="text-xs text-slate-500">
                  कार्यक्षेत्रातील सर्व गावे
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newVillageName}
                  onChange={(e) => setNewVillageName(e.target.value)}
                  placeholder="नवीन गावाचे नाव..."
                  className="flex-1 h-12 px-3 text-sm font-semibold bg-white border border-slate-300 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => handleAddMasterItem('Villages', newVillageName)}
                  className="px-4 h-12 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-xl whitespace-nowrap shrink-0"
                >
                  + जोडा
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {villages.map((vil, i) => (
                  <div
                    key={vil}
                    className="p-3 text-xs font-semibold text-slate-800 flex items-center justify-between"
                  >
                    <span>{vil}</span>
                    <span className="font-mono tabular-nums text-slate-400">#{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
          FIXED MOBILE BOTTOM NAVIGATION BAR (Thumb Ergonomics)
         ===================================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe md:hidden no-print shadow-lg">
        <div className="grid grid-cols-4 items-center h-16">
          <button
            type="button"
            onClick={() => {
              setActiveSection('opd');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center h-full transition-colors active:scale-95 ${
              activeSection === 'opd'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className={`w-5 h-5 ${activeSection === 'opd' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight mt-1">OPD नोंदणी</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection('date_reports');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center h-full transition-colors active:scale-95 ${
              activeSection === 'date_reports'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className={`w-5 h-5 ${activeSection === 'date_reports' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight mt-1">दिनांक अहवाल</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection('village_reports');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center h-full transition-colors active:scale-95 ${
              activeSection === 'village_reports'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className={`w-5 h-5 ${activeSection === 'village_reports' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight mt-1">गाव यादी</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection('master_lists');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center h-full transition-colors active:scale-95 ${
              activeSection === 'master_lists'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Pill className={`w-5 h-5 ${activeSection === 'master_lists' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight mt-1">औषधे/गावे</span>
          </button>
        </div>
      </nav>

      {/* OPD Patient & Medicine Dispensing Modal (Popup) */}
      <OpdEntryModal
        isOpen={isOpdModalOpen}
        onClose={() => setIsOpdModalOpen(false)}
        visitDate={visitDate}
        setVisitDate={setVisitDate}
        opdNo={opdNo}
        setOpdNo={setOpdNo}
        nextSuggestedOpdNo={nextSuggestedOpdNo}
        fName={fName}
        setFName={(val) => setFName(val.toUpperCase())}
        mName={mName}
        setMName={(val) => setMName(val.toUpperCase())}
        lName={lName}
        setLName={(val) => setLName(val.toUpperCase())}
        gender={gender}
        setGender={setGender}
        mobile={mobile}
        setMobile={setMobile}
        formVillage={formVillage}
        setFormVillage={setFormVillage}
        isOtherVillage={isOtherVillage}
        setIsOtherVillage={setIsOtherVillage}
        otherVillageName={otherVillageName}
        setOtherVillageName={setOtherVillageName}
        villages={villages}
        disease={disease}
        setDisease={setDisease}
        bpReading={bpReading}
        setBpReading={setBpReading}
        sugarReading={sugarReading}
        setSugarReading={setSugarReading}
        medRows={medRows}
        medicines={medicines}
        onAddMedicineRow={handleAddMedicineRow}
        onUpdateMedicineRow={handleUpdateMedicineRow}
        onRemoveMedicineRow={handleRemoveMedicineRow}
        onRepeatLastPrescription={handleRepeatLastPrescription}
        hasPatientHistory={selectedPatientHistory.length > 0}
        onClearForm={handleClearOpdForm}
        onSubmit={handleRequestSaveOpd}
        onOpenCardModal={
          fName
            ? () =>
                openPatientCardModal({
                  fName,
                  mName,
                  lName,
                  gender,
                  mobile,
                  village:
                    isOtherVillage && otherVillageName.trim()
                      ? `इतर (${otherVillageName.trim()})`
                      : formVillage,
                  disease,
                })
            : undefined
        }
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        payload={confirmPayload}
        isSubmitting={isConfirmSubmitting}
        onClose={() => {
          if (!isConfirmSubmitting) setConfirmPayload(null);
        }}
      />

      {/* Printable Report & Treatment Card Modal */}
      <PrintPreviewModal
        report={previewReport}
        onClose={() => setPreviewReport(null)}
      />
    </div>
  );
}

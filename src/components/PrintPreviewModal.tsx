import React from 'react';
import { Download, FileSpreadsheet, Printer, X } from 'lucide-react';
import { OpdRowRecord, PatientHistoryItem, PatientSummary } from '../types/phc';

export type ReportPreviewData =
  | {
      type: 'patient_card';
      patient: {
        fName: string;
        mName: string;
        lName: string;
        gender: string;
        mobile: string;
        village: string;
        disease: string;
      };
      history: PatientHistoryItem[];
    }
  | {
      type: 'village_report';
      villageName: string;
      diseaseFilter: string;
      patients: PatientSummary[];
    }
  | {
      type: 'date_wise_report';
      fromDate: string;
      toDate: string;
      villageFilter: string;
      diseaseFilter: string;
      records: OpdRowRecord[];
      medicineTotals: { medName: string; totalQty: number; prescriptionCount: number }[];
    };

interface PrintPreviewModalProps {
  report: ReportPreviewData | null;
  onClose: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ report, onClose }) => {
  if (!report) return null;

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Date-wise grouping for Patient Treatment Card
  const patientDateGroups = React.useMemo(() => {
    if (report?.type !== 'patient_card') return [];
    const groupsMap = new Map<
      string,
      {
        date: string;
        isoDate: string;
        opd: string;
        bp: string;
        sugar: string;
        disease: string;
        items: PatientHistoryItem[];
        totalQty: number;
      }
    >();

    report.history.forEach((item) => {
      const dateKey = item.date || item.isoDate || 'इतर दिनांक';
      const existing = groupsMap.get(dateKey);
      const qtyNum = parseInt(item.qty, 10) || 0;
      if (existing) {
        existing.items.push(item);
        existing.totalQty += qtyNum;
        if (!existing.opd && item.opd) existing.opd = item.opd;
        if (!existing.bp && item.bp) existing.bp = item.bp;
        if (!existing.sugar && item.sugar) existing.sugar = item.sugar;
        if (!existing.disease && item.disease) existing.disease = item.disease;
      } else {
        groupsMap.set(dateKey, {
          date: item.date,
          isoDate: item.isoDate,
          opd: item.opd,
          bp: item.bp || '',
          sugar: item.sugar || '',
          disease: item.disease || '',
          items: [item],
          totalQty: qtyNum,
        });
      }
    });

    return Array.from(groupsMap.values());
  }, [report]);

  const totalPatientTablets = React.useMemo(() => {
    if (report?.type !== 'patient_card') return 0;
    return report.history.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0);
  }, [report]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    let csvContent = '\uFEFF'; // UTF-8 BOM for Marathi Devanagari in Excel
    let filename = 'PHC_Bhada_Report.csv';

    if (report.type === 'patient_card') {
      const p = report.patient;
      filename = `${p.fName}_${p.lName}_Treatment_History.csv`;
      csvContent += `प्राथमिक आरोग्य केंद्र भादा - NCD रुग्ण उपचार इतिहास (दिनांकनिहाय वर्गवारी)\n`;
      csvContent += `रुग्णाचे नाव,${p.fName} ${p.mName} ${p.lName},गाव,${p.village},मोबाईल,${p.mobile},आजार,${p.disease}\n`;
      csvContent += `एकूण भेटी/तारखा,${patientDateGroups.length},एकूण गोळ्या वाटप,${totalPatientTablets}\n\n`;

      if (patientDateGroups.length > 1) {
        patientDateGroups.forEach((group, gIdx) => {
          csvContent += `[भेट #${patientDateGroups.length - gIdx} - दिनांक: ${group.date}],OPD क्र.: ${group.opd || '-'},रक्तदाब: ${group.bp || '-'},शुगर: ${group.sugar || '-'}\n`;
          csvContent += `अ.क्र.,दिलेले औषध (Medicine),मात्रा (Qty)\n`;
          group.items.forEach((item, idx) => {
            csvContent += `${idx + 1},"${item.medicine}","${item.qty}"\n`;
          });
          csvContent += `एकूण गोळ्या,,${group.totalQty}\n\n`;
        });
      } else {
        csvContent += `दिनांक (Date),OPD क्र.,रक्तदाब (BP),शुगर (Sugar),दिलेले औषध (Medicine),मात्रा (Qty)\n`;
        report.history.forEach((r) => {
          csvContent += `"${r.date}","${r.opd}","${r.bp || '-'}","${r.sugar || '-'}","${r.medicine}","${r.qty}"\n`;
        });
      }
    } else if (report.type === 'village_report') {
      filename = `PHC_Bhada_Village_${report.villageName}_Patients.csv`;
      csvContent += `प्राथमिक आरोग्य केंद्र भादा - गाववार रुग्ण यादी (${report.villageName})\n`;
      csvContent += `अ.क्र.,रुग्णाचे नाव,लिंग,मोबाईल,गाव,आजार,पहिली नोंदणी दिनांक,शेवटची भेट दिनांक,एकूण भेटी,दिलेली औषधे\n`;
      report.patients.forEach((p, idx) => {
        const meds = p.lastMedicines.map((m) => `${m.medName} (${m.qty})`).join(' | ');
        csvContent += `${idx + 1},"${p.fullName}","${p.gender}","${p.mobile}","${p.village}","${p.disease}","${p.firstVisitDate}","${p.lastVisitDate}",${p.totalVisits},"${meds}"\n`;
      });
    } else if (report.type === 'date_wise_report') {
      filename = `PHC_Bhada_OPD_${report.fromDate}_to_${report.toDate}.csv`;
      csvContent += `प्राथमिक आरोग्य केंद्र भादा - दिनांकनिहाय औषध वाटप अहवाल (${report.fromDate} ते ${report.toDate})\n`;
      csvContent += `अ.क्र.,दिनांक,OPD क्र.,रुग्णाचे नाव,लिंग,मोबाईल,गाव,आजार,दिलेले औषध,मात्रा (Qty)\n`;
      report.records.forEach((r, idx) => {
        const fullName = [r.fName, r.mName, r.lName].filter(Boolean).join(' ');
        csvContent += `${idx + 1},"${r.visitDate}","${r.opdNo}","${fullName}","${r.gender}","${r.mobile}","${r.village}","${r.disease}","${r.medName}","${r.qty}"\n`;
      });
      csvContent += `\nऔषधनिहाय एकूण वाटप गोषवारा\nऔषधाचे नाव,एकूण रुग्ण संख्या,एकूण वाटप मात्रा (गोळ्या)\n`;
      report.medicineTotals.forEach((m) => {
        csvContent += `"${m.medName}",${m.prescriptionCount},${m.totalQty}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPrintableHtml = () => {
    const printEl = document.getElementById('printable-report-area');
    if (!printEl) return;

    let filename = 'PHC_Bhada_Report.html';
    if (report.type === 'patient_card') {
      filename = `${report.patient.fName}_${report.patient.lName}_Treatment_Card.html`;
    } else if (report.type === 'village_report') {
      filename = `PHC_Bhada_Village_${report.villageName}_Report.html`;
    } else if (report.type === 'date_wise_report') {
      filename = `PHC_Bhada_DateWise_${report.fromDate}_to_${report.toDate}.html`;
    }

    const htmlDoc = `<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8" />
  <title>${filename.replace('.html', '')}</title>
  <style>
    body { font-family: 'Noto Sans Devanagari', Arial, sans-serif; padding: 24px; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th, td { border: 1px solid #1e293b; padding: 8px 10px; text-align: left; }
    th { background-color: #f1f5f9; font-weight: 700; }
    h2, h3 { margin: 4px 0; }
  </style>
</head>
<body>
  ${printEl.innerHTML}
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[96vh] sm:max-h-[92vh] flex flex-col">
        {/* Action Header (Hidden when printing) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50 no-print">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {report.type === 'patient_card' && 'NCD रुग्ण उपचार कार्ड व इतिहास (Treatment History Card)'}
                {report.type === 'village_report' && `गाववार रुग्ण यादी रिपोर्ट (${report.villageName})`}
                {report.type === 'date_wise_report' && 'दिनांकनिहाय औषध वाटप व रुग्ण अहवाल'}
              </h3>
              <p className="text-xs text-slate-500 hidden sm:block mt-0.5">
                तुम्ही हा अहवाल थेट प्रिंट / PDF सेव्ह करू शकता किंवा Excel (CSV) मध्ये डाउनलोड करू शकता.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors shrink-0"
              aria-label="बंद करा"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-initial px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap min-h-[40px]"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPrintableHtml}
              className="inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-initial px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap min-h-[40px]"
            >
              <Download className="w-4 h-4 text-blue-700" />
              <span>HTML</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-initial px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap min-h-[40px]"
            >
              <Printer className="w-4 h-4" />
              <span>प्रिंट / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="hidden sm:inline-flex p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors shrink-0"
              aria-label="बंद करा"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-white" id="printable-report-area">
          {/* Official Header */}
          <div className="text-center border-b-2 border-slate-900 pb-3 sm:pb-4 mb-4 sm:mb-6">
            <p className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-600">
              सार्वजनिक आरोग्य विभाग, महाराष्ट्र शासन · जिल्हा परिषद लातूर
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
              प्राथमिक आरोग्य केंद्र, भादा (PHC Bhada)
            </h2>
            <h3 className="text-base font-bold text-slate-700 mt-1">
              {report.type === 'patient_card' &&
                'NCD बाह्यरुग्ण उपचार कार्ड व औषध वाटप इतिहास (Patient Treatment History)'}
              {report.type === 'village_report' &&
                `एनसीडी (NCD) रुग्ण यादी — गाव: ${report.villageName}${
                  report.diseaseFilter !== 'ALL' ? ` · आजार: ${report.diseaseFilter}` : ''
                }`}
              {report.type === 'date_wise_report' &&
                `दिनांकनिहाय बाह्यरुग्ण (OPD) औषध वाटप अहवाल (${report.fromDate} ते ${report.toDate})`}
            </h3>
          </div>

          {/* 1. PATIENT TREATMENT CARD */}
          {report.type === 'patient_card' && (
            <div className="space-y-5">
              {/* Patient Demographics & Summary Box */}
              <div className="border border-slate-800 rounded-lg p-4 bg-slate-50/60 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                <div>
                  <span className="text-slate-600 font-medium">रुग्णाचे पूर्ण नाव: </span>
                  <span className="font-black text-slate-900 uppercase">
                    {report.patient.fName.toUpperCase()} {report.patient.mName.toUpperCase()} {report.patient.lName.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 font-medium">लिंग (Gender): </span>
                  <span className="font-bold text-slate-900">{report.patient.gender}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-medium">गाव (Village): </span>
                  <span className="font-bold text-slate-900">{report.patient.village}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-medium">मोबाईल क्र.: </span>
                  <span className="font-bold text-slate-900 font-mono tabular-nums">
                    {report.patient.mobile || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 font-medium">आजार / निदान (Diagnosis): </span>
                  <span className="font-bold text-red-700">{report.patient.disease}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-medium">उपचार भेटी (एकूण दिवस): </span>
                  <span className="font-black text-emerald-800 font-mono tabular-nums">
                    {patientDateGroups.length} दिवस (भेट तारखा)
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 font-medium">एकूण वाटप गोळ्या संख्या: </span>
                  <span className="font-black text-emerald-800 font-mono tabular-nums">
                    {totalPatientTablets} गोळ्या
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 font-medium">एकूण औषध नोंदी: </span>
                  <span className="font-bold text-slate-900 font-mono tabular-nums">
                    {report.history.length}
                  </span>
                </div>
              </div>

              {/* Informational Banner for Multi-Date Grouping */}
              {patientDateGroups.length > 1 && (
                <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-950 no-print">
                  <span>
                    📅 या रुग्णाच्या <strong>{patientDateGroups.length}</strong> वेगवेगळ्या तारखांच्या नोंदी आहेत. खाली दिनांकनिहाय गट (Date-wise Groups) तयार केले आहेत.
                  </span>
                  <span className="font-mono tabular-nums bg-white border border-emerald-300 px-2 py-0.5 rounded text-emerald-800">
                    {patientDateGroups.length} तारखा
                  </span>
                </div>
              )}

              {/* DATE-WISE GROUPS SECTION */}
              {patientDateGroups.length === 0 ? (
                <div className="border border-slate-800 px-4 py-8 text-center text-slate-500 rounded-lg">
                  कोणताही जुना उपचार इतिहास उपलब्ध नाही.
                </div>
              ) : patientDateGroups.length > 1 ? (
                /* MULTIPLE DATES: Grouped by Visit Date */
                <div className="space-y-4">
                  {patientDateGroups.map((group, gIdx) => (
                    <div
                      key={gIdx}
                      className="border border-slate-800 rounded-lg overflow-hidden break-inside-avoid shadow-2xs"
                    >
                      {/* Date Group Header */}
                      <div className="bg-slate-100 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 text-xs font-black text-white bg-slate-900 rounded">
                            भेट #{patientDateGroups.length - gIdx}
                          </span>
                          <span className="font-extrabold text-slate-900 font-mono tabular-nums">
                            दिनांक (Date): {group.date}
                          </span>
                          {group.opd && (
                            <span className="font-bold text-slate-800 bg-white border border-slate-300 px-2 py-0.5 rounded font-mono tabular-nums">
                              OPD #{group.opd}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-semibold">
                          {(group.bp || (group.sugar && group.sugar !== '-')) && (
                            <span className="bg-white border border-slate-300 px-2 py-0.5 rounded font-mono tabular-nums text-slate-800">
                              {[
                                group.bp ? `BP: ${group.bp}` : '',
                                group.sugar && group.sugar !== '-' ? `BSL: ${group.sugar}` : '',
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          )}
                          <span className="bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded font-bold text-emerald-900">
                            {group.items.length} औषधे ·{' '}
                            <span className="font-mono font-extrabold">{group.totalQty} गोळ्या</span>
                          </span>
                        </div>
                      </div>

                      {/* Medicines Table for this specific date */}
                      <table className="w-full border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-800 text-xs text-slate-700">
                            <th className="px-3 py-2 text-left font-bold w-12 border-r border-slate-300">
                              अ.क्र.
                            </th>
                            <th className="px-3 py-2 text-left font-bold border-r border-slate-300">
                              दिलेले औषध (Medicine Name)
                            </th>
                            <th className="px-3 py-2 text-right font-bold w-36">
                              मात्रा / संख्या (Qty)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {group.items.map((med, mIdx) => (
                            <tr key={mIdx} className="hover:bg-slate-50/70">
                              <td className="px-3 py-2 font-mono tabular-nums text-slate-600 border-r border-slate-200">
                                {mIdx + 1}
                              </td>
                              <td className="px-3 py-2 font-semibold text-slate-900 border-r border-slate-200">
                                {med.medicine || '-'}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums font-bold text-slate-900">
                                {med.qty} गोळ्या
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 border-t border-slate-800 text-xs font-bold">
                            <td colSpan={2} className="px-3 py-2 text-right text-slate-700">
                              या तारखेचे एकूण वाटप:
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-900 font-extrabold">
                              {group.totalQty} गोळ्या
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ))}
                </div>
              ) : (
                /* SINGLE DATE: Single Date Group Table */
                <div className="border border-slate-800 rounded-lg overflow-hidden break-inside-avoid">
                  <div className="bg-slate-100 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 font-mono tabular-nums">
                        दिनांक (Date): {patientDateGroups[0].date}
                      </span>
                      {patientDateGroups[0].opd && (
                        <span className="font-bold text-slate-800 bg-white border border-slate-300 px-2 py-0.5 rounded font-mono tabular-nums">
                          OPD #{patientDateGroups[0].opd}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      {(patientDateGroups[0].bp ||
                        (patientDateGroups[0].sugar && patientDateGroups[0].sugar !== '-')) && (
                        <span className="bg-white border border-slate-300 px-2 py-0.5 rounded font-mono tabular-nums text-slate-800">
                          {[
                            patientDateGroups[0].bp ? `BP: ${patientDateGroups[0].bp}` : '',
                            patientDateGroups[0].sugar && patientDateGroups[0].sugar !== '-'
                              ? `BSL: ${patientDateGroups[0].sugar}`
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      )}
                      <span className="bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded font-bold text-emerald-900">
                        एकूण {patientDateGroups[0].totalQty} गोळ्या
                      </span>
                    </div>
                  </div>

                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-800 text-xs text-slate-700">
                        <th className="px-3 py-2 text-left font-bold w-12 border-r border-slate-300">
                          अ.क्र.
                        </th>
                        <th className="px-3 py-2 text-left font-bold border-r border-slate-300">
                          दिलेले औषध (Medicine Name)
                        </th>
                        <th className="px-3 py-2 text-right font-bold w-36">
                          मात्रा / संख्या (Qty)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {patientDateGroups[0].items.map((med, mIdx) => (
                        <tr key={mIdx} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2 font-mono tabular-nums text-slate-600 border-r border-slate-200">
                            {mIdx + 1}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-900 border-r border-slate-200">
                            {med.medicine || '-'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums font-bold text-slate-900">
                            {med.qty} गोळ्या
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t border-slate-800 text-xs font-bold">
                        <td colSpan={2} className="px-3 py-2 text-right text-slate-700">
                          एकूण वाटप:
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-900 font-extrabold">
                          {patientDateGroups[0].totalQty} गोळ्या
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 2. VILLAGE-WISE PATIENT LIST */}
          {report.type === 'village_report' && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 mb-3">
                <span>
                  एकूण रुग्ण संख्या: <strong className="text-slate-900">{report.patients.length}</strong>
                </span>
                <span>रिपोर्ट दिनांक: {todayFormatted}</span>
              </div>

              <table className="w-full border-collapse border border-slate-800 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-800 px-2.5 py-2 text-left font-bold">
                      अ.क्र.
                    </th>
                    <th className="border border-slate-800 px-2.5 py-2 text-left font-bold">
                      रुग्णाचे नाव
                    </th>
                    <th className="border border-slate-800 px-2.5 py-2 text-left font-bold">
                      लिंग
                    </th>
                    <th className="border border-slate-800 px-2.5 py-2 text-left font-bold">
                      मोबाईल
                    </th>
                    <th className="border border-slate-800 px-2.5 py-2 text-left font-bold">
                      गाव
                    </th>
                    <th className="border border-slate-800 px-2.5 py-2 text-left font-bold">
                      आजार
                    </th>
                    <th className="border border-slate-800 px-2.5 py-2 text-left font-bold">
                      पहिली नोंदणी
                    </th>
                    <th className="border border-slate-800 px-2.5 py-2 text-left font-bold">
                      शेवटची भेट व औषधे
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.patients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="border border-slate-800 px-4 py-6 text-center text-slate-500"
                      >
                        या गावाचा डेटा उपलब्ध नाही.
                      </td>
                    </tr>
                  ) : (
                    report.patients.map((p, idx) => (
                      <tr key={p.key}>
                        <td className="border border-slate-800 px-2.5 py-2 font-mono tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-800 px-2.5 py-2 font-bold uppercase">
                          {(p.fullName || '').toUpperCase()}
                        </td>
                        <td className="border border-slate-800 px-2.5 py-2">{p.gender}</td>
                        <td className="border border-slate-800 px-2.5 py-2 font-mono tabular-nums">
                          {p.mobile || '-'}
                        </td>
                        <td className="border border-slate-800 px-2.5 py-2">{p.village}</td>
                        <td className="border border-slate-800 px-2.5 py-2 font-semibold">
                          {p.disease}
                        </td>
                        <td className="border border-slate-800 px-2.5 py-2 font-mono tabular-nums">
                          {p.firstVisitDate}
                        </td>
                        <td className="border border-slate-800 px-2.5 py-2 text-xs">
                          <span className="font-mono tabular-nums font-semibold">
                            {p.lastVisitDate}
                          </span>
                          {p.lastMedicines.length > 0 && (
                            <div className="text-slate-600 mt-0.5">
                              {p.lastMedicines
                                .map((m) => `${m.medName} (${m.qty})`)
                                .join(', ')}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. DATE-WISE MEDICINE DISTRIBUTION REPORT */}
          {report.type === 'date_wise_report' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span>
                  कालावधी: <strong className="text-slate-900">{report.fromDate}</strong> ते{' '}
                  <strong className="text-slate-900">{report.toDate}</strong> · गाव:{' '}
                  <strong className="text-slate-900">
                    {report.villageFilter === 'ALL' ? 'सर्व गावे' : report.villageFilter}
                  </strong>{' '}
                  · एकूण औषध वाटप नोंदी:{' '}
                  <strong className="text-slate-900">{report.records.length}</strong>
                </span>
                <span>रिपोर्ट दिनांक: {todayFormatted}</span>
              </div>

              {/* Medicine Consumption Summary Table */}
              {report.medicineTotals.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">
                    १. औषधनिहाय एकूण वाटप गोषवारा (Medicine Consumption Summary)
                  </h4>
                  <table className="w-full border-collapse border border-slate-800 text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-800 px-3 py-2 text-left font-bold">
                          अ.क्र.
                        </th>
                        <th className="border border-slate-800 px-3 py-2 text-left font-bold">
                          औषधाचे नाव (Medicine Name)
                        </th>
                        <th className="border border-slate-800 px-3 py-2 text-right font-bold">
                          वाटप रुग्ण संख्या (Prescriptions)
                        </th>
                        <th className="border border-slate-800 px-3 py-2 text-right font-bold">
                          एकूण वाटप मात्रा / गोळ्या (Total Quantity)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.medicineTotals.map((m, i) => (
                        <tr key={m.medName}>
                          <td className="border border-slate-800 px-3 py-1.5 font-mono tabular-nums">
                            {i + 1}
                          </td>
                          <td className="border border-slate-800 px-3 py-1.5 font-semibold">
                            {m.medName}
                          </td>
                          <td className="border border-slate-800 px-3 py-1.5 text-right font-mono tabular-nums">
                            {m.prescriptionCount}
                          </td>
                          <td className="border border-slate-800 px-3 py-1.5 text-right font-mono tabular-nums font-bold">
                            {m.totalQty}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Detailed Date-wise Patient Medicine Rows */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-2">
                  २. दिनांकनिहाय रुग्ण व औषध वाटप सविस्तर यादी (Date-wise OPD Register)
                </h4>
                <table className="w-full border-collapse border border-slate-800 text-xs">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-800 px-2.5 py-2 text-left font-bold">
                        अ.क्र.
                      </th>
                      <th className="border border-slate-800 px-2.5 py-2 text-left font-bold">
                        दिनांक
                      </th>
                      <th className="border border-slate-800 px-2.5 py-2 text-left font-bold">
                        OPD क्र.
                      </th>
                      <th className="border border-slate-800 px-2.5 py-2 text-left font-bold">
                        रुग्णाचे नाव
                      </th>
                      <th className="border border-slate-800 px-2.5 py-2 text-left font-bold">
                        गाव
                      </th>
                      <th className="border border-slate-800 px-2.5 py-2 text-left font-bold">
                        आजार
                      </th>
                      <th className="border border-slate-800 px-2.5 py-2 text-left font-bold">
                        दिलेले औषध (Medicine)
                      </th>
                      <th className="border border-slate-800 px-2.5 py-2 text-right font-bold">
                        मात्रा (Qty)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.records.map((r, idx) => (
                      <tr key={`${r.rowIndex}_${idx}`}>
                        <td className="border border-slate-800 px-2.5 py-1.5 font-mono tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-800 px-2.5 py-1.5 font-mono tabular-nums">
                          {r.visitDate}
                        </td>
                        <td className="border border-slate-800 px-2.5 py-1.5 font-mono tabular-nums">
                          {r.opdNo}
                        </td>
                        <td className="border border-slate-800 px-2.5 py-1.5 font-semibold uppercase">
                          {[r.fName, r.mName, r.lName].filter(Boolean).join(' ').toUpperCase()}
                        </td>
                        <td className="border border-slate-800 px-2.5 py-1.5">{r.village}</td>
                        <td className="border border-slate-800 px-2.5 py-1.5">{r.disease}</td>
                        <td className="border border-slate-800 px-2.5 py-1.5 font-medium">
                          {r.medName}
                        </td>
                        <td className="border border-slate-800 px-2.5 py-1.5 text-right font-mono tabular-nums font-bold">
                          {r.qty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Official Signature Footer */}
          <div className="mt-14 flex items-end justify-between text-xs text-slate-700 pt-6">
            <div>
              <p>ठिकाण: भादा, ता. औसा, जि. लातूर</p>
              <p className="mt-1">दिनांक: {todayFormatted}</p>
            </div>
            <div className="text-right">
              <div className="h-10" />
              <p className="font-bold text-slate-900">वैद्यकीय अधिकारी / औषध निर्माण अधिकारी</p>
              <p>प्राथमिक आरोग्य केंद्र, भादा</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

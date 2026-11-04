import React, { useState } from 'react';
import { Check, Code2, Copy, Download, X } from 'lucide-react';

interface AppsScriptExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UPGRADED_CODE_GS = `/**
 * PHC Bhada - NCD OPD Medicine Distribution & Reporting System
 * Owner Account: phbhada@gmail.com
 *
 * महत्वाची सूचना (Deployment Instructions for phbhada@gmail.com):
 * 1. phbhada@gmail.com च्या Google Sheet मध्ये जा -> Extensions -> Apps Script उघडा.
 * 2. हा संपूर्ण कोड Code.gs मध्ये पेस्ट करा आणि सेव्ह (Ctrl+S) करा.
 * 3. वरच्या उजव्या कोपऱ्यातील "Deploy" -> "New deployment" वर क्लिक करा.
 * 4. Select type: "Web app" निवडा.
 * 5. Execute as: "Me (phbhada@gmail.com)" निवडा (यामुळे कोणाकडूनही "Sign in with Google" मागितले जाणार नाही आणि सर्व डेटा फक्त phbhada@gmail.com च्याच ड्राइव्हवर सेव्ह होईल!).
 * 6. Who has access: "Anyone" निवडा आणि "Deploy" करा.
 * 7. मिळालेली Web App URL (https://script.google.com/macros/s/.../exec) कॉपी करून वेब अ‍ॅपमध्ये पेस्ट करा.
 */

function doGet(e) {
  // JSON API Mode (for GitHub / React Web App direct sync)
  if (e && e.parameter && e.parameter.action === "getAllData") {
    var payload = getAllPhcData();
    return ContentService.createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Standalone HTML Mode
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('PHC Bhada - OPD & Reports')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    if (body.action === "saveRecord") {
      var msg = saveRecord(body.form);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, message: msg }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === "addMasterItem") {
      addMasterItem(body.tabName, body.itemValue);
      return ContentService.createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getAllPhcData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dataSheet = ss.getSheetByName("Data") || ss.getSheets()[0];
  var medSheet = ss.getSheetByName("Medicines");
  var vilSheet = ss.getSheetByName("Villages");

  var rawRows = dataSheet ? dataSheet.getDataRange().getDisplayValues() : [];
  var medicines = medSheet ? medSheet.getRange("A1:A").getDisplayValues().flat().filter(String) : [];
  var villages = vilSheet ? vilSheet.getRange("A1:A").getDisplayValues().flat().filter(String) : [];

  return {
    title: ss.getName(),
    rows: rawRows,
    medicines: medicines,
    villages: villages
  };
}

function getDropdownData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var medSheet = ss.getSheetByName("Medicines");
  var vilSheet = ss.getSheetByName("Villages");
  var medicines = medSheet ? medSheet.getRange("A1:A").getValues().flat().filter(String) : [];
  var villages = vilSheet ? vilSheet.getRange("A1:A").getValues().flat().filter(String) : [];
  return { medicines: medicines, villages: villages };
}

function addMasterItem(tabName, itemValue) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }
  sheet.appendRow([itemValue]);
  return true;
}

function searchPatient(village, nameQuery) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Data");
  var data = sheet.getDataRange().getValues();
  var matches = [];
  var uniqueMap = new Map();
  var searchName = (nameQuery || "").toString().toLowerCase().trim();

  for (var i = data.length - 1; i >= 1; i--) {
    var rowVillage = (data[i][7] || "").toString().trim();
    var fullRowName = (data[i][2] + " " + data[i][3] + " " + data[i][4]).toLowerCase();
    var villageMatch = (!village || village === "ALL" || rowVillage === village);
    if (villageMatch && fullRowName.includes(searchName)) {
      var fullName = data[i][2] + " " + data[i][3] + " " + data[i][4];
      if (!uniqueMap.has(fullName + "|" + rowVillage)) {
        uniqueMap.set(fullName + "|" + rowVillage, true);
        matches.push({
          fName: data[i][2], mName: data[i][3], lName: data[i][4],
          gender: data[i][5], mobile: data[i][6], village: data[i][7], disease: data[i][8]
        });
      }
    }
  }
  return matches;
}

function getPatientHistory(p) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Data");
  var data = sheet.getDataRange().getValues();
  var history = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][2].toString().trim() == p.fName.toString().trim() &&
        data[i][4].toString().trim() == p.lName.toString().trim() &&
        data[i][7].toString().trim() == p.village.toString().trim()) {
      var med = data[i][11] ? data[i][11].toString() : (data[i][9] ? data[i][9].toString() : "-");
      var qty = data[i][12] ? data[i][12].toString() : (data[i][10] ? data[i][10].toString() : "-");
      var opdNo = data[i][1] ? data[i][1].toString() : "-";

      history.push({
        date: Utilities.formatDate(new Date(data[i][0]), "GMT+5:30", "dd-MM-yyyy"),
        opd: opdNo,
        medicine: med,
        qty: qty
      });
    }
  }
  return history.reverse();
}

function saveRecord(form) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Data");
  var date = form.visitDate ? new Date(form.visitDate) : new Date();

  form.medList.forEach(function(m) {
    sheet.appendRow([
      date,
      form.opdNo,
      form.fName,
      form.mName,
      form.lName,
      form.gender,
      form.mobile,
      form.village,
      form.disease,
      form.bp || "",
      form.sugar || "",
      m.medName,
      m.qty
    ]);
  });
  return "✅ माहिती phbhada@gmail.com च्या गुगल शीटमध्ये जतन झाली!";
}

// --- दिनांकनिहाय औषध वाटप व खप अहवाल ---
function generateDateWiseReport(fromDateStr, toDateStr, villageFilter) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Data");
  var data = sheet.getDataRange().getValues();
  var fromTime = fromDateStr ? new Date(fromDateStr + "T00:00:00").getTime() : 0;
  var toTime = toDateStr ? new Date(toDateStr + "T23:59:59").getTime() : Date.now();

  var rows = [];
  var medSummary = {};

  for (var i = 1; i < data.length; i++) {
    var rowDate = new Date(data[i][0]);
    var t = rowDate.getTime();
    var rowVil = (data[i][7] || "").toString().trim();
    if (t >= fromTime && t <= toTime && (!villageFilter || villageFilter === "ALL" || rowVil === villageFilter)) {
      var med = data[i][11] ? data[i][11].toString() : (data[i][9] ? data[i][9].toString() : "-");
      var qty = data[i][12] ? data[i][12].toString() : (data[i][10] ? data[i][10].toString() : "0");
      var qtyNum = parseInt(qty, 10) || 0;
      if (med && med !== "-") {
        medSummary[med] = (medSummary[med] || 0) + qtyNum;
      }
      rows.push({
        date: Utilities.formatDate(rowDate, "GMT+5:30", "dd-MM-yyyy"),
        opd: data[i][1] || "-",
        name: data[i][2] + " " + data[i][3] + " " + data[i][4],
        village: rowVil,
        disease: data[i][8] || "-",
        med: med,
        qty: qty
      });
    }
  }
  return { rows: rows, medSummary: medSummary };
}`;

const GITHUB_README = `# PHC Bhada - NCD OPD Medicine Distribution & Reporting System
प्राथमिक आरोग्य केंद्र, भादा (ता. औसा, जि. लातूर) - बाह्यरुग्ण विभाग (NCD OPD) औषध वाटप, दिनांकनिहाय उपचार अहवाल व गाववार रुग्ण यादी प्रणाली.

## डेटा स्टोरेज (Data Storage — Exclusively on phbhada@gmail.com Drive)
- या प्रोजेक्टमध्ये कोणताही "Sign in with Google" लॉगिन ठेवलेला नाही.
- संपूर्ण डेटा थेट **phbhada@gmail.com** च्या Google Drive मधील Google Sheet (\`Data\`, \`Medicines\`, \`Villages\`) मध्येच Google Apps Script Web App (\`Execute as: phbhada@gmail.com\`) मार्फत साठवला जातो.
- इतर कोणाच्याही गुगल ड्राइव्हवर किंवा बाहेरील डेटाबेसमध्ये डेटा सेव्ह होत नाही.
`;

export const AppsScriptExportModal: React.FC<AppsScriptExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeFile, setActiveFile] = useState<'code_gs' | 'readme'>('code_gs');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentCode = activeFile === 'code_gs' ? UPGRADED_CODE_GS : GITHUB_README;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const filename = activeFile === 'code_gs' ? 'Code.gs' : 'README.md';
    const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8;' });
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 no-print"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-slate-800" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                phbhada@gmail.com · Google Apps Script (Code.gs) &amp; GitHub Setup
              </h3>
              <p className="text-xs text-slate-500">
                हा कोड फक्त phbhada@gmail.com च्या गुगल शीटमधील Apps Script मध्ये टाकल्यास सर्व डेटा विना-लॉगिन थेट phbhada@gmail.com च्याच ड्राइव्हवर सेव्ह होतो.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-200 bg-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveFile('code_gs')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeFile === 'code_gs'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Code.gs (phbhada@gmail.com Sheet Script)
            </button>
            <button
              type="button"
              onClick={() => setActiveFile('readme')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeFile === 'readme'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              README.md (GitHub Documentation)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>कॉपी झाले!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>कोड कॉपी करा</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadFile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>फाईल डाउनलोड</span>
            </button>
          </div>
        </div>

        <pre className="p-6 text-xs font-mono text-slate-800 bg-slate-50 overflow-auto flex-1 leading-relaxed">
          <code>{currentCode}</code>
        </pre>
      </div>
    </div>
  );
};

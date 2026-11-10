import React from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Pill,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { MedicineRowInput } from '../types/phc';

export interface OpdEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitDate: string;
  setVisitDate: (d: string) => void;
  opdNo: string;
  setOpdNo: (n: string) => void;
  nextSuggestedOpdNo: string;
  fName: string;
  setFName: (n: string) => void;
  mName: string;
  setMName: (n: string) => void;
  lName: string;
  setLName: (n: string) => void;
  gender: string;
  setGender: (g: string) => void;
  mobile: string;
  setMobile: (m: string) => void;
  formVillage: string;
  setFormVillage: (v: string) => void;
  isOtherVillage: boolean;
  setIsOtherVillage: (b: boolean) => void;
  otherVillageName: string;
  setOtherVillageName: (n: string) => void;
  villages: string[];
  disease: string;
  setDisease: (d: string) => void;
  bpReading: string;
  setBpReading: (bp: string) => void;
  sugarReading: string;
  setSugarReading: (s: string) => void;
  medRows: MedicineRowInput[];
  medicines: string[];
  onAddMedicineRow: () => void;
  onUpdateMedicineRow: (id: string, field: 'medName' | 'qty', value: string) => void;
  onRemoveMedicineRow: (id: string) => void;
  onRepeatLastPrescription: () => void;
  hasPatientHistory: boolean;
  onClearForm: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onOpenCardModal?: () => void;
}

export const OpdEntryModal: React.FC<OpdEntryModalProps> = ({
  isOpen,
  onClose,
  visitDate,
  setVisitDate,
  opdNo,
  setOpdNo,
  nextSuggestedOpdNo,
  fName,
  setFName,
  mName,
  setMName,
  lName,
  setLName,
  gender,
  setGender,
  mobile,
  setMobile,
  formVillage,
  setFormVillage,
  isOtherVillage,
  setIsOtherVillage,
  otherVillageName,
  setOtherVillageName,
  villages,
  disease,
  setDisease,
  bpReading,
  setBpReading,
  sugarReading,
  setSugarReading,
  medRows,
  medicines,
  onAddMedicineRow,
  onUpdateMedicineRow,
  onRemoveMedicineRow,
  onRepeatLastPrescription,
  hasPatientHistory,
  onClearForm,
  onSubmit,
  onOpenCardModal,
}) => {
  if (!isOpen) return null;

  const fullName = [fName, mName, lName].filter(Boolean).join(' ').toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-print"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-emerald-800 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold flex items-center gap-2 truncate">
              <ClipboardList className="w-5 h-5 shrink-0" />
              <span className="truncate uppercase">
                {fullName ? `OPD व औषध वाटप: ${fullName}` : 'नवीन बाह्यरुग्ण (OPD) नोंदणी फॉर्म'}
              </span>
            </h2>
            <p className="text-xs text-emerald-100 mt-0.5 truncate">
              प्राथमिक आरोग्य केंद्र, भादा · NCD रुग्ण नोंदणी
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onClearForm}
              title="फॉर्म रिकामा करा (Clear Form)"
              className="px-2.5 py-1 text-xs font-bold text-emerald-100 hover:text-white bg-emerald-900/60 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-emerald-100 hover:text-white hover:bg-emerald-700 rounded-lg transition-colors"
              title="बंद करा (Close)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollable Form */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* Row 1: Date & OPD Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label
                  htmlFor="popup-visit-date"
                  className="block text-xs sm:text-sm font-bold text-slate-800 mb-1"
                >
                  दिनांक (Date):
                </label>
                <input
                  id="popup-visit-date"
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  required
                  className="w-full h-12 px-3 text-base font-bold font-mono tabular-nums bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-700 shadow-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="popup-opd-no"
                    className="block text-xs sm:text-sm font-extrabold text-red-700"
                  >
                    OPD क्रमांक: *
                  </label>
                  <button
                    type="button"
                    onClick={() => setOpdNo(nextSuggestedOpdNo)}
                    className="text-xs font-semibold text-emerald-700 hover:underline font-mono tabular-nums"
                  >
                    सुचवलेला: #{nextSuggestedOpdNo}
                  </button>
                </div>
                <input
                  id="popup-opd-no"
                  type="text"
                  inputMode="numeric"
                  value={opdNo}
                  onChange={(e) => setOpdNo(e.target.value)}
                  placeholder="उदा. 105"
                  required
                  className="w-full h-12 px-3 text-lg font-extrabold font-mono tabular-nums bg-white border border-slate-400 rounded-xl focus:outline-none focus:border-emerald-700 shadow-xs"
                />
              </div>
            </div>

            {/* Row 2: First Name, Middle Name, Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label
                  htmlFor="popup-f-name"
                  className="block text-xs sm:text-sm font-bold text-slate-800 mb-1"
                >
                  रुग्णाचे नाव: *
                </label>
                <input
                  id="popup-f-name"
                  type="text"
                  value={fName}
                  onChange={(e) => setFName(e.target.value.toUpperCase())}
                  placeholder="पहिले नाव (उदा. RAMESH)"
                  required
                  className="w-full h-12 px-3 text-base font-bold uppercase bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-700 shadow-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="popup-m-name"
                  className="block text-xs sm:text-sm font-bold text-slate-800 mb-1"
                >
                  मधले नाव:
                </label>
                <input
                  id="popup-m-name"
                  type="text"
                  value={mName}
                  onChange={(e) => setMName(e.target.value.toUpperCase())}
                  placeholder="वडिलांचे/पतीचे नाव (उदा. MARUTI)"
                  className="w-full h-12 px-3 text-base font-bold uppercase bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-700 shadow-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="popup-l-name"
                  className="block text-xs sm:text-sm font-bold text-slate-800 mb-1"
                >
                  आडनाव:
                </label>
                <input
                  id="popup-l-name"
                  type="text"
                  value={lName}
                  onChange={(e) => setLName(e.target.value.toUpperCase())}
                  placeholder="आडनाव (उदा. PAWAR)"
                  className="w-full h-12 px-3 text-base font-bold uppercase bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-700 shadow-xs"
                />
              </div>
            </div>

            {/* Row 3: Gender, Mobile, Village */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label
                  htmlFor="popup-gender"
                  className="block text-xs sm:text-sm font-bold text-slate-800 mb-1"
                >
                  लिंग (Gender):
                </label>
                <select
                  id="popup-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-12 px-3 text-base font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-700 shadow-xs"
                >
                  <option value="Male (पुरुष)">Male (पुरुष)</option>
                  <option value="Female (स्त्री)">Female (स्त्री)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="popup-mobile"
                  className="block text-xs sm:text-sm font-bold text-slate-800 mb-1"
                >
                  मोबाईल:
                </label>
                <input
                  id="popup-mobile"
                  type="tel"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="98XXXXXXXX"
                  className="w-full h-12 px-3 text-base font-bold font-mono tabular-nums bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-700 shadow-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="popup-form-village"
                    className="block text-xs sm:text-sm font-bold text-slate-800"
                  >
                    गाव (Village): *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !isOtherVillage;
                      setIsOtherVillage(nextState);
                      if (nextState) {
                        setFormVillage('__OTHER__');
                      } else {
                        setFormVillage(villages[0] || 'भादा');
                        setOtherVillageName('');
                      }
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1"
                  >
                    {isOtherVillage ? '← यादीतून निवडा' : '➕ इतर गाव'}
                  </button>
                </div>

                {!isOtherVillage ? (
                  <select
                    id="popup-form-village"
                    value={formVillage}
                    onChange={(e) => {
                      if (e.target.value === '__OTHER__') {
                        setIsOtherVillage(true);
                        setFormVillage('__OTHER__');
                      } else {
                        setFormVillage(e.target.value);
                      }
                    }}
                    required
                    className="w-full h-12 px-3 text-base font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-700 shadow-xs"
                  >
                    {villages.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                    <option value="__OTHER__" className="text-emerald-700 font-bold">
                      ➕ इतर गाव (यादीत नसलेले नवीन गाव)
                    </option>
                  </select>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      id="popup-other-village-name"
                      type="text"
                      value={otherVillageName}
                      onChange={(e) => setOtherVillageName(e.target.value)}
                      placeholder="इतर गावाचे नाव टाका (उदा. तांदुळजा, किल्लारी)"
                      autoFocus
                      required
                      className="w-full h-12 px-3 text-base font-bold bg-amber-50/60 border-2 border-emerald-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                    />
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                      <span className="font-semibold">हे गाव गावनिहाय यादीमध्ये "इतर" म्हणून दिसेल.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Row 4: Diagnosis & optional Vitals */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label
                  htmlFor="popup-disease"
                  className="block text-xs sm:text-sm font-extrabold text-red-700 mb-1"
                >
                  आजार (Diagnosis): *
                </label>
                <select
                  id="popup-disease"
                  value={disease}
                  onChange={(e) => setDisease(e.target.value)}
                  className="w-full h-12 px-3 text-base font-extrabold text-red-700 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-700 shadow-xs"
                >
                  <option value="BP">Blood Pressure (BP)</option>
                  <option value="Diabetes">Diabetes (Sugar)</option>
                  <option value="Both">Both (BP + Sugar)</option>
                  <option value="Other">Other (इतर)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="popup-bp-reading"
                  className="block text-xs sm:text-sm font-bold text-slate-700 mb-1"
                >
                  रक्तदाब (BP):
                </label>
                <input
                  id="popup-bp-reading"
                  type="text"
                  value={bpReading}
                  onChange={(e) => setBpReading(e.target.value)}
                  placeholder="उदा. 130/80"
                  className="w-full h-12 px-3 text-base font-semibold font-mono tabular-nums bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-700 shadow-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="popup-sugar-reading"
                  className="block text-xs sm:text-sm font-bold text-slate-700 mb-1"
                >
                  ब्लड शुगर (Sugar/BSL):
                </label>
                <input
                  id="popup-sugar-reading"
                  type="text"
                  value={sugarReading}
                  onChange={(e) => setSugarReading(e.target.value)}
                  placeholder="उदा. 140 (RBS)"
                  className="w-full h-12 px-3 text-base font-semibold font-mono tabular-nums bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-700 shadow-xs"
                />
              </div>
            </div>

            {/* Row 5: Medicine Dispensing Header */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-emerald-700" />
                  <label className="text-sm font-extrabold text-slate-900">
                    वाटप करावयाची NCD औषधे: *
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  {hasPatientHistory && (
                    <button
                      type="button"
                      onClick={onRepeatLastPrescription}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                      <span>मागील औषधे घ्या</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onAddMedicineRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ आणखी औषध जोडा</span>
                  </button>
                </div>
              </div>

              {/* Medicine Inputs List */}
              <div className="space-y-3">
                {medRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-700">
                        औषध #{idx + 1}
                      </span>
                      {medRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveMedicineRow(row.id)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                          title="औषध काढा"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-8">
                        <select
                          value={row.medName}
                          onChange={(e) =>
                            onUpdateMedicineRow(row.id, 'medName', e.target.value)
                          }
                          className="w-full h-11 px-3 text-sm font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-700 shadow-xs"
                        >
                          {medicines.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.qty}
                          onChange={(e) => onUpdateMedicineRow(row.id, 'qty', e.target.value)}
                          placeholder="मात्रा (उदा. 30)"
                          className="w-full h-11 px-3 text-sm font-bold font-mono tabular-nums bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-700 shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Quick Tablet Quantity Preset Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                      <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap shrink-0">
                        मात्रा निवडा:
                      </span>
                      {['15', '30', '60', '90', '120'].map((presetQty) => (
                        <button
                          key={presetQty}
                          type="button"
                          onClick={() => onUpdateMedicineRow(row.id, 'qty', presetQty)}
                          className={`min-h-[32px] px-2.5 text-xs font-mono tabular-nums font-bold rounded-lg border transition-all ${
                            row.qty === presetQty
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100 active:scale-95'
                          }`}
                        >
                          {presetQty}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors"
              >
                बंद करा (Close)
              </button>

              {fName && onOpenCardModal && (
                <button
                  type="button"
                  onClick={onOpenCardModal}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors"
                >
                  <Printer className="w-4 h-4 text-red-700" />
                  <span>उपचार कार्ड (PDF)</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 min-h-[48px] px-7 text-sm sm:text-base font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] rounded-xl shadow-md transition-all whitespace-nowrap"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>💾 माहिती साठवा (SAVE RECORD)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

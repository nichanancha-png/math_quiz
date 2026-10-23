import React, { useState } from 'react';
import { HelpCircle, Sparkles, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { MathText } from '../utils/mathRenderer';

interface MathSymbolPickerProps {
  onInsertSymbol: (snippet: string) => void;
}

interface SymbolItem {
  label: string;
  latex: string;
  preview: string;
  desc: string;
}

export const mathSymbols: SymbolItem[] = [
  { label: 'x²', latex: '$x^2$', preview: '$x^2$', desc: 'เลขยกกำลัง' },
  { label: 'xⁿ', latex: '$x^{n}$', preview: '$x^n$', desc: 'ยกกำลัง n' },
  { label: 'a/b', latex: '$\\frac{a}{b}$', preview: '$\\frac{a}{b}$', desc: 'เศษส่วน' },
  { label: '√x', latex: '$\\sqrt{x}$', preview: '$\\sqrt{x}$', desc: 'สแควรูท' },
  { label: 'ⁿ√x', latex: '$\\sqrt[n]{x}$', preview: '$\\sqrt[n]{x}$', desc: 'รากที่ n' },
  { label: '×', latex: '$\\times$', preview: '$\\times$', desc: 'คูณ' },
  { label: '÷', latex: '$\\div$', preview: '$\\div$', desc: 'หาร' },
  { label: '±', latex: '$\\pm$', preview: '$\\pm$', desc: 'บวกลบ' },
  { label: '≤', latex: '$\\le$', preview: '$\\le$', desc: 'น้อยกว่าหรือเท่ากับ' },
  { label: '≥', latex: '$\\ge$', preview: '$\\ge$', desc: 'มากกว่าหรือเท่ากับ' },
  { label: '≠', latex: '$\\neq$', preview: '$\\neq$', desc: 'ไม่เท่ากับ' },
  { label: 'π', latex: '$\\pi$', preview: '$\\pi$', desc: 'ค่าพาย (pi)' },
  { label: 'θ', latex: '$\\theta$', preview: '$\\theta$', desc: 'มุมเธตา (theta)' },
  { label: '°', latex: '$^\\circ$', preview: '$30^\\circ$', desc: 'องศา' },
  { label: 'sin', latex: '$\\sin(\\theta)$', preview: '$\\sin(\\theta)$', desc: 'ฟังก์ชันไซน์' },
  { label: 'cos', latex: '$\\cos(\\theta)$', preview: '$\\cos(\\theta)$', desc: 'ฟังก์ชันโคไซน์' },
  { label: 'tan', latex: '$\\tan(\\theta)$', preview: '$\\tan(\\theta)$', desc: 'ฟังก์ชันแทนเจนต์' },
  { label: '∑', latex: '$\\sum_{i=1}^{n}$', preview: '$\\sum$', desc: 'ผลรวม ซิกมา' },
  { label: '∫', latex: '$\\int_{a}^{b} f(x)dx$', preview: '$\\int$', desc: 'อินทิกรัล' },
  { label: '∞', latex: '$\\infty$', preview: '$\\infty$', desc: 'อนันต์' },
  { label: 'log', latex: '$\\log_{10}(x)$', preview: '$\\log_{10}(x)$', desc: 'ลอการิทึม' },
  { label: 'α', latex: '$\\alpha$', preview: '$\\alpha$', desc: 'แอลฟา' },
  { label: 'β', latex: '$\\beta$', preview: '$\\beta$', desc: 'บีตา' },
  { label: 'Δ', latex: '$\\Delta$', preview: '$\\Delta$', desc: 'เดลตา' },
];

const formulaGuides = [
  {
    topic: 'เลขยกกำลัง & ราก',
    examples: [
      { code: '$x^2 + y^2 = r^2$', label: 'สมการวงกลม', preview: '$x^2 + y^2 = r^2$' },
      { code: '$2^{3} \\times 2^{4} = 2^{7}$', label: 'คูณเลขยกกำลัง', preview: '$2^3 \\times 2^4 = 2^7$' },
      { code: '$\\sqrt{a^2 + b^2}$', label: 'สแควรูททศนิยม/ตัวแปร', preview: '$\\sqrt{a^2 + b^2}$' },
    ],
  },
  {
    topic: 'เศษส่วน & อัตราส่วน',
    examples: [
      { code: '$\\frac{1}{2} + \\frac{1}{3} = \\frac{5}{6}$', label: 'บวกเศษส่วน', preview: '$\\frac{1}{2} + \\frac{1}{3} = \\frac{5}{6}$' },
      { code: '$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$', label: 'สูตรควอดราติก', preview: '$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$' },
    ],
  },
  {
    topic: 'ตรีโกณมิติ & เรขาคณิต',
    examples: [
      { code: '$\\sin^2(\\theta) + \\cos^2(\\theta) = 1$', label: 'เอกลักษณ์ตรีโกณฯ', preview: '$\\sin^2(\\theta) + \\cos^2(\\theta) = 1$' },
      { code: '$A = \\pi r^2$', label: 'พื้นที่วงกลม', preview: '$A = \\pi r^2$' },
      { code: '$c = \\sqrt{3^2 + 4^2} = 5$', label: 'พีทาโกรัส', preview: '$c = \\sqrt{3^2 + 4^2} = 5$' },
    ],
  },
];

export const MathSymbolPicker: React.FC<MathSymbolPickerProps> = ({ onInsertSymbol }) => {
  const [showGuide, setShowGuide] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>แถบเครื่องหมายคณิตศาสตร์ & สูตรสำเร็จรูป (คลิกแทรกลงในข้อความได้ทันที)</span>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-medium px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 transition"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{showGuide ? 'ซ่อนคู่มือวิธีพิมพ์' : 'ดูตัวอย่างและวิธีพิมพ์สูตร'}</span>
          {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Quick Insert Buttons */}
      <div className="flex flex-wrap gap-1.5 pt-1 max-h-32 overflow-y-auto">
        {mathSymbols.map((s, idx) => (
          <button
            key={idx}
            type="button"
            title={`${s.desc} : ${s.latex}`}
            onClick={() => onInsertSymbol(s.latex)}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-900 font-mono font-bold text-xs transition shadow-2xs active:scale-95"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Instructional Guide & Cheat Sheet */}
      {showGuide && (
        <div className="mt-3 pt-3 border-t border-slate-200 space-y-3 bg-white p-3.5 rounded-lg border">
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-2.5 text-slate-700">
            <span className="font-bold text-indigo-900">💡 เคล็ดลับการพิมพ์สูตรคณิตศาสตร์:</span>
            <ul className="list-disc list-inside mt-1 space-y-1 text-slate-600">
              <li>
                นำสูตรใส่ไว้ระหว่างเครื่องหมายดอลลาร์ <code className="bg-white px-1.5 py-0.5 rounded border font-mono text-indigo-700">$...$</code> สำหรับสูตรในบรรทัด เช่น <code className="bg-white px-1 rounded font-mono text-indigo-700">$2^3 = 8$</code>
              </li>
              <li>
                หรือใส่ <code className="bg-white px-1.5 py-0.5 rounded border font-mono text-indigo-700">$$...$$</code> สำหรับแสดงสูตรตัวโตจัดกึ่งกลาง
              </li>
              <li>สามารถก๊อปปี้ตัวอย่างด้านล่างนี้ไปปรับตัวเลขใช้ได้ทันที</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {formulaGuides.map((cat, cIdx) => (
              <div key={cIdx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-800 mb-1.5 text-xs text-indigo-800">{cat.topic}</div>
                <div className="space-y-2">
                  {cat.examples.map((ex, eIdx) => (
                    <div key={eIdx} className="bg-white p-2 rounded border border-slate-200 space-y-1">
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span>{ex.label}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onInsertSymbol(ex.code)}
                            className="text-indigo-600 hover:text-indigo-800 underline font-semibold cursor-pointer"
                          >
                            +แทรก
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(ex.code)}
                            className="text-slate-400 hover:text-slate-700 p-0.5"
                            title="คัดลอกโค้ด"
                          >
                            {copiedCode === ex.code ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                      <div className="font-mono text-[10px] text-slate-600 bg-slate-50 p-1 rounded overflow-x-auto select-all">
                        {ex.code}
                      </div>
                      <div className="text-slate-900 pt-0.5">
                        <MathText text={ex.preview} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

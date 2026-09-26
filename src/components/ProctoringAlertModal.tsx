import React from 'react';
import { AlertTriangle, ShieldAlert, EyeOff } from 'lucide-react';

interface ProctoringAlertModalProps {
  isOpen: boolean;
  warningNumber: number;
  maxWarnings: number;
  isDisqualified: boolean;
  onAcknowledge: () => void;
}

export const ProctoringAlertModal: React.FC<ProctoringAlertModalProps> = ({
  isOpen,
  warningNumber,
  maxWarnings,
  isDisqualified,
  onAcknowledge,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border-2 border-[#DA627D] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#DA627D]/10 text-[#DA627D] flex items-center justify-center shrink-0">
            {isDisqualified ? <ShieldAlert className="w-6 h-6 text-red-600" /> : <EyeOff className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#A53860]">
              {isDisqualified ? 'Championship Disqualification' : 'Proctoring Focus Alert'}
            </h3>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {isDisqualified ? 'Integrity Threshold Exceeded' : `Warning ${warningNumber} of ${maxWarnings}`}
            </p>
          </div>
        </div>

        <div className={`p-4 rounded-xl text-xs space-y-2 ${isDisqualified ? 'bg-red-50 text-red-900 border border-red-200' : 'bg-[#FCF4EB] text-[#220914] border border-[#FFA5AB]'}`}>
          {isDisqualified ? (
            <p className="font-medium">
              You have exceeded the maximum allowable window focus violations ({warningNumber}/{maxWarnings}). Per official LEXORA competition regulations, your participation for this round has been terminated and access locked.
            </p>
          ) : (
            <>
              <p className="font-semibold text-[#A53860]">
                Window focus loss or tab switching was detected.
              </p>
              <p className="leading-relaxed">
                LEXORA strictly monitors active browser engagement. Please keep this challenge tab open, focused, and visible at all times.
              </p>
              <p className="font-medium text-[#DA627D]">
                Reaching {maxWarnings} violations triggers automatic round disqualification with submission access closed.
              </p>
            </>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onAcknowledge}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isDisqualified
                ? 'bg-gray-800 hover:bg-black text-white'
                : 'bg-[#DA627D] hover:bg-[#A53860] text-white hover:shadow-md'
            }`}
          >
            {isDisqualified ? 'Return to Student Dashboard' : 'I Understand — Resume Challenge'}
          </button>
        </div>
      </div>
    </div>
  );
};

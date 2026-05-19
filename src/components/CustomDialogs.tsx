"use client";
import React from "react";
import { SeatingHook } from "@/app/useSeating";

interface CustomDialogsProps {
  s: SeatingHook;
}

export default function CustomDialogs({ s }: CustomDialogsProps) {
  const { alertMessage, setAlertMessage, confirmConfig, setConfirmConfig } = s;

  return (
    <>
      {/* Custom Alert Dialog */}
      {alertMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 no-print animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-lg rounded p-5 animate-pop-in">
            <div className="flex items-center gap-2 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-sm font-bold text-slate-800">確認が必要です</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-5 whitespace-pre-wrap">{alertMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setAlertMessage(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded transition-all cursor-pointer shadow-xs select-none"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog */}
      {confirmConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 no-print animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-lg rounded p-5 animate-pop-in">
            <div className="flex items-center gap-2 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-sm font-bold text-slate-800">実行の確認</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-5 whitespace-pre-wrap">{confirmConfig.message}</p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => {
                  if (confirmConfig.onCancel) confirmConfig.onCancel();
                  setConfirmConfig(null);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded transition-all cursor-pointer select-none"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  confirmConfig.onConfirm();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded transition-all cursor-pointer shadow-xs select-none"
              >
                実行する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

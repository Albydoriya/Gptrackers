let isPrintingGlobal = false;

export const getPrintingState = (): boolean => {
  return isPrintingGlobal;
};

export const setPrintingState = (state: boolean): void => {
  isPrintingGlobal = state;
};

export const initializePrintListeners = (): (() => void) => {
  const handleBeforePrint = () => {
    setPrintingState(true);
  };

  const handleAfterPrint = () => {
    setPrintingState(false);
  };

  window.addEventListener('beforeprint', handleBeforePrint);
  window.addEventListener('afterprint', handleAfterPrint);

  return () => {
    window.removeEventListener('beforeprint', handleBeforePrint);
    window.removeEventListener('afterprint', handleAfterPrint);
  };
};

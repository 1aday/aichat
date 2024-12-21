const DEBUG = true;

// Add immediate test when the module loads
console.log('Debug utility loaded');

export const debug = {
  log: (...args: any[]) => {
    if (DEBUG) {
      console.log('🔍 DEBUG:', ...args);
    }
  },
  error: (...args: any[]) => {
    if (DEBUG) {
      console.error('❌ ERROR:', ...args);
    }
  },
  group: (label: string) => {
    if (DEBUG) {
      console.group('📦 GROUP: ' + label);
    }
  },
  groupEnd: () => {
    if (DEBUG) {
      console.groupEnd();
    }
  },
  table: (label: string, data: any) => {
    if (DEBUG) {
      console.group('📊 TABLE: ' + label);
      console.table(data);
      console.groupEnd();
    }
  }
};

// Test the utility when it loads
debug.log('Debug utility initialized'); 
export class Logger {
  private prefix: string;

  constructor(options: { prefix: string }) {
    this.prefix = options.prefix;
  }

  debug(...args: any[]) {
    console.log(this.prefix, ...args);
  }

  error(...args: any[]) {
    console.error(this.prefix, ...args);
  }

  group(label: string) {
    console.log(this.prefix, '---', label, '---');
  }

  groupEnd() {
    console.log(this.prefix, '-------------------');
  }
} 
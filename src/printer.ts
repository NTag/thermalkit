/**
 * Thin TCP wrapper around node-thermal-printer, with a few thermal-kit
 * conveniences (density command, raw escape hatch).
 *
 * Imported as `thermalkit/printer` so it's optional — pure image-generation
 * users don't pay for `node-thermal-printer`.
 */
import { printer as ThermalPrinter, types as PrinterTypes } from 'node-thermal-printer';

export interface EpsonPrinterOptions {
  /** Hostname or IP. */
  host: string;
  /** TCP port (default 9100 — the JetDirect/raw port). */
  port?: number;
  /** TCP timeout in milliseconds. Default 15000. */
  timeout?: number;
}

export interface PrintOptions {
  /**
   * Persistent print-density adjustment (-50..+50, percent offset from factory).
   * Sent as `GS | n` (level 0..8). NB: this setting persists in the printer's
   * memory across power cycles until changed again — use `0` to reset.
   */
  density?: number;
  /** Issue a paper cut at the end. Default true. */
  cut?: boolean;
  /** Alignment for the embedded raster. Default 'center'. */
  align?: 'left' | 'center' | 'right';
}

/**
 * Build the ESC/POS bytes for the `GS | n` print-density command.
 *   n=0 → -50%, n=4 → 0% (factory default), n=8 → +50%.
 */
export function setPrintDensityBytes(percent: number): Buffer {
  const clamped = Math.max(-50, Math.min(50, Math.round(percent)));
  const level = Math.round(((clamped + 50) / 100) * 8);
  return Buffer.from([0x1d, 0x7c, level]);
}

/**
 * Epson TM-T88VI and compatible thermal printers over TCP/IP.
 * Reuse one instance across multiple prints if you want.
 */
export class EpsonPrinter {
  readonly host: string;
  readonly port: number;
  readonly timeout: number;

  constructor(opts: EpsonPrinterOptions) {
    this.host = opts.host;
    this.port = opts.port ?? 9100;
    this.timeout = opts.timeout ?? 15000;
  }

  private build(): InstanceType<typeof ThermalPrinter> {
    return new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: `tcp://${this.host}:${this.port}`,
      width: 42,
      options: { timeout: this.timeout },
    });
  }

  /** Probe connectivity (TCP connect). */
  async isReachable(): Promise<boolean> {
    try {
      return await this.build().isPrinterConnected();
    } catch {
      return false;
    }
  }

  /**
   * Send a rasterised PNG to the printer. Optionally adjusts persistent density
   * and / or aligns the image. Always followed by a blank line and (by default)
   * a paper cut.
   */
  async print(png: Buffer, opts: PrintOptions = {}): Promise<void> {
    const printer = this.build();
    if (!(await printer.isPrinterConnected())) {
      throw new Error(`Printer unreachable at ${this.host}:${this.port}`);
    }
    if (opts.density != null) {
      await printer.raw(setPrintDensityBytes(opts.density));
    }
    const align = opts.align ?? 'center';
    if (align === 'left')        printer.alignLeft();
    else if (align === 'right')  printer.alignRight();
    else                         printer.alignCenter();

    await printer.printImageBuffer(png);
    printer.println('');
    if (opts.cut !== false) printer.cut();
    await printer.execute();
  }

  /** Send arbitrary ESC/POS bytes. Useful for one-off commands. */
  async raw(bytes: Buffer): Promise<void> {
    const printer = this.build();
    await printer.raw(bytes);
  }

  /** Convenience: change density without printing anything. Persistent. */
  async setDensity(percent: number): Promise<void> {
    await this.raw(setPrintDensityBytes(percent));
  }
}

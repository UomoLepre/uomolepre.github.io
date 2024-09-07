declare module 'dom-to-image-more' {
    const domtoimage: {
      toJpeg(node: HTMLElement, options?: { quality?: number }): Promise<string>;
      toPng(node: HTMLElement, options?: { quality?: number }): Promise<string>;
      toSvg(node: HTMLElement, options?: { quality?: number }): Promise<string>;
      toPixelData(node: HTMLElement, options?: { quality?: number }): Promise<Uint8Array>;
      toBlob(node: HTMLElement, options?: { quality?: number }): Promise<Blob>;
    };
    export default domtoimage;
  }
  
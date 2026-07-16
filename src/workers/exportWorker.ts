import { strToU8, zlibSync } from 'fflate';

self.onmessage = (event: MessageEvent<{ json: string }>) => {
  const compressed = zlibSync(strToU8(event.data.json));
  (self as unknown as Worker).postMessage(compressed, { transfer: [compressed.buffer] });
};

export {};

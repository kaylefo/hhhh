import { aggregateGamutPoints, type GamutWorkerInput } from './gamutWorker';

self.onmessage = (event: MessageEvent<GamutWorkerInput>) => {
  const points = aggregateGamutPoints(event.data);
  self.postMessage(points);
};

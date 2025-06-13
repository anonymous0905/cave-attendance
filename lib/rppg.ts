import { fft, util as fftUtil } from 'fft-js';

export async function analyzeLiveness(video: HTMLVideoElement, progressCb: (p: number) => void): Promise<boolean> {
  const frameCount = 150; // about 5s at 30fps
  const greens: number[] = [];
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  for (let i = 0; i < frameCount; i++) {
    ctx!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = ctx!.getImageData(0, 0, canvas.width, canvas.height).data;
    let sum = 0;
    for (let j = 0; j < data.length; j += 4) {
      sum += data[j + 1]; // green channel
    }
    greens.push(sum / (data.length / 4));
    progressCb((i + 1) / frameCount);
    await new Promise(r => requestAnimationFrame(r));
  }

  const phasors = fft(greens);
  const frequencies = fftUtil.fftFreq(phasors, 30) as number[]; // approx fps
  const mags = fftUtil.fftMag(phasors) as number[];
  let best = { freq: 0, mag: 0 };
  frequencies.forEach((f: number, idx: number) => {
    const mag = mags[idx];
    if (f > 0.8 && f < 3 && mag > best.mag) {
      best = { freq: f, mag };
    }
  });
  return best.mag > 20; // crude threshold
}

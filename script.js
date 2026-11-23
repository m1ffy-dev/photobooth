// ---------- elements ----------
const video = document.getElementById('video');
const boothEl = document.getElementById('booth');
const countdownEl = document.getElementById('countdown');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('startBtn');
const downloadBtn = document.getElementById('downloadBtn');
const strip = document.getElementById('strip');

const SHOTS = 4;
const SUPPORTS_FILTER = 'filter' in CanvasRenderingContext2D.prototype;
let photos = [];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- leopard print (generated, tiles seamlessly) ----------
function makeLeopard(size = 300) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2a0509';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 28; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 10 + Math.random() * 10;
    const rot = Math.random() * Math.PI * 2;
    // draw at wrapped offsets so the tile repeats without seams
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        ctx.save();
        ctx.translate(x + dx, y + dy);
        ctx.rotate(rot);
        ctx.fillStyle = '#6b0f1a';            // rosette centre
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0d0506';          // black broken ring
        ctx.lineWidth = r * 0.35;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0.4, Math.PI * 1.6);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
  return c;
}

const leopard = makeLeopard();
document.body.style.backgroundImage = `url(${leopard.toDataURL()})`;
document.body.style.backgroundSize = '300px';

// ---------- webcam ----------
async function startCamera() {
  try {
    video.srcObject = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false
    });
  } catch (err) {
    startBtn.disabled = true;
    messageEl.textContent = err.name === 'NotAllowedError'
      ? 'Camera blocked. Allow camera access in your browser settings and refresh.'
      : 'No camera found. Plug one in and refresh.';
  }
}

// ---------- capture one photo (black and white, clean) ----------
function capture() {
  const c = document.createElement('canvas');
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  const ctx = c.getContext('2d');

  ctx.save();
  ctx.translate(c.width, 0);   // mirror so it matches the preview
  ctx.scale(-1, 1);
  ctx.filter = 'grayscale(1) contrast(1.25) brightness(0.95)';
  ctx.drawImage(video, 0, 0);
  ctx.restore();

  // fallback for browsers without ctx.filter (some Safari versions)
  if (!SUPPORTS_FILTER) {
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = g;
    }
    ctx.putImageData(img, 0, 0);
  }
  return c;
}

// ---------- flash + countdown ----------
function flash() {
  boothEl.classList.add('flash');
  setTimeout(() => boothEl.classList.remove('flash'), 150);
}

async function runSession() {
  startBtn.disabled = true;
  downloadBtn.hidden = true;
  strip.hidden = true;
  messageEl.textContent = '';
  photos = [];

  for (let i = 0; i < SHOTS; i++) {
    for (let n = 3; n > 0; n--) {
      countdownEl.textContent = n;
      await sleep(1000);
    }
    countdownEl.textContent = '';
    flash();
    photos.push(capture());
    await sleep(600);
  }

  await buildStrip();
  startBtn.textContent = 'Go again';
  startBtn.disabled = false;
}

// ---------- build the photo strip ----------
// draws a source canvas into a box, cropping to fill (no squishing)
function drawCover(ctx, src, x, y, w, h) {
  const srcRatio = src.width / src.height;
  const boxRatio = w / h;
  let sx = 0, sy = 0, sw = src.width, sh = src.height;
  if (srcRatio > boxRatio) {            // source is wider: crop sides
    sw = src.height * boxRatio;
    sx = (src.width - sw) / 2;
  } else {                              // source is taller: crop top/bottom
    sh = src.width / boxRatio;
    sy = (src.height - sh) / 2;
  }
  ctx.drawImage(src, sx, sy, sw, sh, x, y, w, h);
}

async function buildStrip() {
  await document.fonts.load('italic 22px "Cormorant Garamond"');

  const W = 420;
  const border = 14;                    // leopard border thickness
  const pad = 26;                       // space around photos
  const pw = W - pad * 2;
  const ph = pw * 0.75;                 // 4:3 photos
  const footer = 80;
  const H = pad + photos.length * (ph + pad) + footer;

  strip.width = W;
  strip.height = H;
  const ctx = strip.getContext('2d');

  // leopard border, then dark inner panel
  ctx.fillStyle = ctx.createPattern(leopard, 'repeat');
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0d0506';
  ctx.fillRect(border, border, W - border * 2, H - border * 2);

  // photos
  photos.forEach((p, i) => drawCover(ctx, p, pad, pad + i * (ph + pad), pw, ph));

  // footer text
  ctx.fillStyle = '#e8c9c9';
  ctx.font = 'italic 22px "Cormorant Garamond"';
  ctx.textAlign = 'center';
  ctx.fillText(new Date().toLocaleDateString('en-AU'), W / 2, H - 38);

  strip.hidden = false;
  downloadBtn.hidden = false;
  strip.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ---------- download ----------
downloadBtn.addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = 'photostrip.png';
  a.href = strip.toDataURL('image/png');
  a.click();
});

// ---------- go ----------
startBtn.addEventListener('click', runSession);
startCamera();
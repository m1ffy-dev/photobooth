// ---------- elements ----------
const video = document.getElementById('video');
const boothEl = document.getElementById('booth');
const countdownEl = document.getElementById('countdown');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('startBtn');
const downloadBtn = document.getElementById('downloadBtn');
const strip = document.getElementById('strip');

const SHOTS = 4;
let photos = [];

const sleep = ms => new Promise(r => setTimeout(r, ms));


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

async function drawStrip() {
  await document.fonts.load('italic 22px "Cormorant Garamond"');

  const W = 360;
  const pad = 24;                    
  const gap = 14;                       
  const pw = W - pad * 2;
  const ph = pw ;                 
  const footer = 80;
  const photosEnd = pad + SHOTS * ph + (SHOTS  - 1) * gap;
  const H = photosEnd + 58;

  strip.width = W;
  strip.height = H;
  const ctx = strip.getContext('2d');

  // plain white strip background
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // photo slots (empty ones stay dark until filled)
  for (let i = 0; i < SHOTS; i++) {
    const y = pad + i * (ph + gap);
    if (photos[i]) {
      drawCover(ctx, photos[i], pad, y, pw, ph);
    } else {
      ctx.fillStyle = '#1a0508';
      ctx.fillRect(pad, y, pw, ph);
    }
  }

// date once there's at least one photo
  if (photos.length) {
    ctx.fillStyle = '#1a0508';
    ctx.font = 'italic 22px "Cormorant Garamond"';
    ctx.textAlign = 'center';
    ctx.fillText(new Date().toLocaleDateString('en-AU'), W / 2, photosEnd + 36);
  }
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
drawStrip();          // show the empty strip straight away
startCamera();
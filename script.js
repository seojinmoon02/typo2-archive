const imageContainer = document.getElementById('imageContainer');
const captionBox = document.getElementById('captionBox');
const captionText = document.getElementById('captionText');
const captionSign = document.getElementById('captionSign');
const archiveEl = document.getElementById('archive');
const footLayer = document.getElementById('footstepLayer');

let imageDataGlobal = [];
let loopTimer = null;

// JSON 불러오기
fetch('imageData.json')
  .then(response => response.json())
  .then(imageData => {
    imageDataGlobal = imageData;

    const loadPromises = [];

    imageData.forEach(data => {
      const img = document.createElement('img');
      img.src = `img/${data.file}`;
      img.alt = data.title;

      // ✅ 캡션 기능 그대로
      img.addEventListener('mouseenter', () => {
        captionText.innerText = data.caption;
        captionBox.style.display = 'block';

        // 기존 색상 클래스 초기화
        captionBox.classList.remove('green', 'blue');

        const idx = imageData.indexOf(data); // 0-based index
        const num = idx + 1;                 // 1-based 번호

        // ✅ 번호 구간별 배경색
        if (num >= 1 && num <= 10) {
          captionBox.classList.add('green');
        } else if (num >= 11 && num <= 32) {
          captionBox.classList.add('blue');
        }
        // 33번 이후는 기본 노랑

        // START / END 표지판 로직 (기존 그대로)
        captionSign.classList.remove('show');
        const lastIdx = Math.min(44, imageData.length - 1);

        if (idx === 0) {
          captionSign.textContent = "START";
          captionSign.classList.add('show');
        } else if (idx === lastIdx) {
          captionSign.textContent = "END";
          captionSign.classList.add('show');
        }
      });



      img.addEventListener('mousemove', (e) => {
        captionBox.style.left = `${e.clientX + 10}px`;
        captionBox.style.top = `${e.clientY + 10}px`;
      });

      img.addEventListener('mouseleave', () => {
        captionBox.style.display = 'none';
        captionSign.classList.remove('show');
        captionBox.classList.remove('green', 'blue'); // 🔹 정리
      });



      imageContainer.appendChild(img);

      // 이미지 로드 완료 기다리기(레이아웃 측정 안정화)
      loadPromises.push(new Promise(res => {
        if (img.complete) return res();
        img.addEventListener('load', res, { once: true });
        img.addEventListener('error', res, { once: true });
      }));
    });

    Promise.all(loadPromises).then(() => {
      startFootsteps(); // ✅ 발자국 시작
      // 리사이즈 시 재계산
      window.addEventListener('resize', debounce(() => startFootsteps(), 250));
    });
  })
  .catch(error => console.error('JSON 불러오기 오류:', error));


function startFootsteps() {
  // 기존 루프/발자국 제거
  if (loopTimer) clearTimeout(loopTimer);
  footLayer.innerHTML = '';

  const imgs = Array.from(imageContainer.querySelectorAll('img'));
  if (imgs.length < 2) return;

  // 1~45번까지만 (없으면 가능한 만큼)
  const count = Math.min(45, imgs.length);

  // archive 기준 좌표로 포인트 계산
  const aRect = archiveEl.getBoundingClientRect();
  const points = [];

  for (let i = 0; i < count; i++) {
    const r = imgs[i].getBoundingClientRect();
    // 이미지의 "가운데"를 타겟 포인트로
    points.push({
      x: (r.left + r.width / 2) - aRect.left,
      y: (r.top + r.height / 2) - aRect.top
    });
  }

  // 경로를 따라 발자국 찍기
  let t = 0;
  const stepEveryPx = 34;     // 발자국 간격(작을수록 촘촘)
  const stepDelay = 110;      // 발자국 찍히는 속도(ms)

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);

    // 방향(회전)
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const stepsOnSeg = Math.max(1, Math.floor(dist / stepEveryPx));

    for (let s = 0; s < stepsOnSeg; s++) {
      const u = s / stepsOnSeg;
      const x = p1.x + dx * u;
      const y = p1.y + dy * u;

      // 좌우 발 번갈아 찍히는 느낌(살짝 오프셋)
      const side = (s % 2 === 0) ? 6 : -6;
      const nx = -dy / (dist || 1);
      const ny = dx / (dist || 1);

      const fx = x + nx * side;
      const fy = y + ny * side;

      addFootprint(fx, fy, angle, t * stepDelay);
      t++;
    }
  }

  // 루프(끝나면 다시 처음부터)
  const totalDuration = t * stepDelay + 800;
  loopTimer = setTimeout(() => startFootsteps(), totalDuration);
}

function addFootprint(x, y, angleDeg, delay) {
  const el = document.createElement('div');
  el.className = 'footprint';

  // 발자국 중심 정렬(translate -50 -50은 CSS 애니메이션 안에 포함)
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;

  // 진행 방향과 살짝 비슷하게, 너무 딱딱하지 않게 약간 랜덤 흔들림
  const wobble = (Math.random() * 10) - 5; // -5~+5
  el.style.setProperty('--rot', `${angleDeg + wobble}deg`);

  footLayer.appendChild(el);

  setTimeout(() => {
    el.classList.add('show');
  }, delay);
}

// 유틸: debounce
function debounce(fn, wait = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

// ===== 화면 전환 =====
const mainMenu = document.getElementById("mainMenu");
const gameScreen = document.getElementById("gameScreen");
const btnStart = document.getElementById("btnStart");
const btnHow = document.getElementById("btnHow");
const btnBack = document.getElementById("btnBack");
const hintArea = document.getElementById("hintArea");

function showHint(text) {
  hintArea.hidden = false;
  hintArea.textContent = text;
}

btnHow.addEventListener("click", () => {
  showHint("게임 시작 → 카드 선택 → 레인(1~3) 클릭으로 소환. 프래싱은 1초에 1씩 찹니다.");
});

btnStart.addEventListener("click", () => {
  mainMenu.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  startGame();
});

btnBack.addEventListener("click", () => {
  stopGame();
  gameScreen.classList.add("hidden");
  mainMenu.classList.remove("hidden");
});

// ===== 게임 상태 =====
let pressing = 0;
let pressingMax = 10; // 필요하면 나중에 바꿉니다.
let pressingTimer = null;
let tickTimer = null;

let myTowerHp = 2000;
let enemyTowerHp = 2000;

const pressingText = document.getElementById("pressingText");
const pressingMaxText = document.getElementById("pressingMaxText");
const pressingFill = document.getElementById("pressingFill");

const myHpText = document.getElementById("myHpText");
const enemyHpText = document.getElementById("enemyHpText");

const lanes = [
  document.getElementById("lane0"),
  document.getElementById("lane1"),
  document.getElementById("lane2"),
];

// ===== 덱(10장) & 손패(4장) : 일단 예시 카드 =====
const deckQueue = [
  { id: "c1", name: "스트라이커", cost: 2, dmgToTower: 120, speed: 0.9 },
  { id: "c2", name: "브루트", cost: 4, dmgToTower: 220, speed: 0.6 },
  { id: "c3", name: "스카웃", cost: 1, dmgToTower: 70,  speed: 1.2 },
  { id: "c4", name: "가드", cost: 3, dmgToTower: 140, speed: 0.8 },
  { id: "c5", name: "레이더", cost: 2, dmgToTower: 110, speed: 1.0 },
  { id: "c6", name: "해머", cost: 5, dmgToTower: 280, speed: 0.55 },
  { id: "c7", name: "돌격병", cost: 3, dmgToTower: 160, speed: 0.85 },
  { id: "c8", name: "니들", cost: 1, dmgToTower: 60,  speed: 1.3 },
  { id: "c9", name: "스매셔", cost: 4, dmgToTower: 240, speed: 0.65 },
  { id: "c10", name: "블레이드", cost: 2, dmgToTower: 130, speed: 0.95 },
];

let hand = [];
let selectedIndex = -1;

const handEl = document.getElementById("hand");
const selectedCardText = document.getElementById("selectedCardText");

// ===== 유닛 목록(간단 이동만) =====
let units = []; // { el, laneIndex, y, card }

// ===== 유틸 =====
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function renderPressing(){
  pressingText.textContent = String(pressing);
  pressingMaxText.textContent = String(pressingMax);
  const pct = (pressingMax === 0) ? 0 : (pressing / pressingMax) * 100;
  pressingFill.style.width = `${pct}%`;
}

function renderHp(){
  myHpText.textContent = String(myTowerHp);
  enemyHpText.textContent = String(enemyTowerHp);
}

function drawHand(){
  handEl.innerHTML = "";
  hand.forEach((c, i) => {
    const btn = document.createElement("button");
    btn.className = "cardbtn" + (i === selectedIndex ? " active" : "");
    btn.type = "button";
    btn.innerHTML = `
      <div class="name">${c.name}</div>
      <div class="meta">코스트 ${c.cost} · 타워딜 ${c.dmgToTower}</div>
    `;
    btn.addEventListener("click", () => {
      selectedIndex = i;
      selectedCardText.textContent = `선택: ${hand[i].name} (코스트 ${hand[i].cost})`;
      drawHand();
    });
    handEl.appendChild(btn);
  });

  if (selectedIndex === -1) {
    selectedCardText.textContent = "선택: 없음";
  }
}

function initHand(){
  hand = [];
  for (let i = 0; i < 4; i++) hand.push(deckQueue.shift());
  // 클래시처럼 사용한 카드는 덱 뒤로 간다고 보고, 큐를 계속 돌립니다.
  // (deckQueue는 남은 덱 큐로 유지)
  selectedIndex = -1;
  drawHand();
}

function cycleCardToBack(card){
  deckQueue.push(card);
}

function refillHandSlot(slotIndex){
  // 덱의 맨 앞에서 한 장 가져와 손패 슬롯에 채움
  const next = deckQueue.shift();
  hand[slotIndex] = next;
  drawHand();
}

function clearBoard(){
  lanes.forEach(l => l.innerHTML = "");
  units = [];
}

function stopGame(){
  if (pressingTimer) clearInterval(pressingTimer);
  if (tickTimer) clearInterval(tickTimer);
  pressingTimer = null;
  tickTimer = null;
}

function startGame(){
  stopGame();

  pressing = 0;
  pressingMax = 10;
  myTowerHp = 2000;
  enemyTowerHp = 2000;

  renderPressing();
  renderHp();
  clearBoard();

  // 덱 큐를 초기 상태로 되돌리고 싶으면, 간단히 새로 만드는 방식이 안전합니다.
  // (초보 단계에서는 "리셋은 새로 만들기"가 실수 적습니다.)
  resetDeckAndHand();

  // 프래싱: 1초에 1
  pressingTimer = setInterval(() => {
    pressing = clamp(pressing + 1, 0, pressingMax);
    renderPressing();
  }, 1000);

  // 게임 틱(유닛 이동)
  tickTimer = setInterval(() => {
    tickUnits();
    checkEnd();
  }, 50);
}

function resetDeckAndHand(){
  // deckQueue를 다시 10장으로 복원
  const original = [
    { id: "c1", name: "스트라이커", cost: 2, dmgToTower: 120, speed: 0.9 },
    { id: "c2", name: "브루트", cost: 4, dmgToTower: 220, speed: 0.6 },
    { id: "c3", name: "스카웃", cost: 1, dmgToTower: 70,  speed: 1.2 },
    { id: "c4", name: "가드", cost: 3, dmgToTower: 140, speed: 0.8 },
    { id: "c5", name: "레이더", cost: 2, dmgToTower: 110, speed: 1.0 },
    { id: "c6", name: "해머", cost: 5, dmgToTower: 280, speed: 0.55 },
    { id: "c7", name: "돌격병", cost: 3, dmgToTower: 160, speed: 0.85 },
    { id: "c8", name: "니들", cost: 1, dmgToTower: 60,  speed: 1.3 },
    { id: "c9", name: "스매셔", cost: 4, dmgToTower: 240, speed: 0.65 },
    { id: "c10", name: "블레이드", cost: 2, dmgToTower: 130, speed: 0.95 },
  ];
  deckQueue.length = 0;
  original.forEach(c => deckQueue.push({ ...c }));

  initHand();
}

// ===== 소환 로직: "카드 선택 → 레인 클릭" =====
lanes.forEach((laneEl, laneIndex) => {
  laneEl.addEventListener("click", (e) => {
    if (selectedIndex === -1) return;

    const card = hand[selectedIndex];
    if (pressing < card.cost) {
      // 프래싱 부족: 아무것도 안 함
      return;
    }

    // 프래싱 지불
    pressing -= card.cost;
    renderPressing();

    // 유닛 생성
    spawnUnit(laneIndex, card);

    // 사용 카드: 덱 뒤로 보내고, 손패 슬롯은 덱에서 새 카드로 채우기
    cycleCardToBack(card);
    refillHandSlot(selectedIndex);

    // 선택 유지(다음 카드가 들어오면 그 카드로 계속 소환 가능하게)
    selectedCardText.textContent = `선택: ${hand[selectedIndex].name} (코스트 ${hand[selectedIndex].cost})`;
    drawHand();
  });
});

function spawnUnit(laneIndex, card){
  const u = document.createElement("div");
  u.className = "unit";
  u.innerHTML = `<div class="tag">${card.cost}</div>`;
  lanes[laneIndex].appendChild(u);

  // y=0 (내 쪽 아래) → y=100 (상대 타워 도달)
  units.push({
    el: u,
    laneIndex,
    y: 0,
    card,
  });
}

// ===== 유닛 이동 & 타워딜(초간단 버전) =====
function tickUnits(){
  // lane-field 높이 기준 이동
  const laneHeight = 120; // css와 맞춰둠(모바일은 100이지만, 단순화)
  const travel = laneHeight - 28; // 위쪽 도달 여유

  for (let i = units.length - 1; i >= 0; i--) {
    const unit = units[i];

    // card.speed는 "초당 진행량" 느낌으로 사용 (틱 50ms)
    const dy = unit.card.speed * 1.8; // 숫자는 나중에 조정
    unit.y = clamp(unit.y + dy, 0, travel);

    // 아래에서 위로 올라가게: bottom 기준
    unit.el.style.bottom = `${10 + unit.y}px`;

    // 도달하면 상대 타워 피해 후 제거
    if (unit.y >= travel) {
      enemyTowerHp = clamp(enemyTowerHp - unit.card.dmgToTower, 0, 999999);
      renderHp();

      unit.el.remove();
      units.splice(i, 1);
    }
  }
}

function checkEnd(){
  if (enemyTowerHp <= 0) {
    stopGame();
    alert("승리! (상대 타워 파괴)");
  } else if (myTowerHp <= 0) {
    stopGame();
    alert("패배! (내 타워 파괴)");
  }
}

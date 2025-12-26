const btnStart = document.getElementById("btnStart");
const btnHow = document.getElementById("btnHow");
const hintArea = document.getElementById("hintArea");

function showHint(text) {
  hintArea.hidden = false;
  hintArea.textContent = text;
}

btnStart.addEventListener("click", () => {
  // 다음 단계에서 여기서 "게임 화면"으로 넘어가게 만들 겁니다.
  showHint("다음 단계에서 '게임 화면(3레인 + 타워 + 프래싱)'으로 넘어가게 만들겠습니다.");
});

btnHow.addEventListener("click", () => {
  showHint("카드는 프래싱(코스트)을 사용해 소환합니다. 프래싱은 1초에 1씩 찹니다. (다음 단계에서 UI로 보여드릴게요)");
});


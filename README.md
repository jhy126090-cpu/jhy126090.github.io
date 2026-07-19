# 솔랭내기 스코어보드

리그 오브 레전드 솔로랭크 내기용 스코어보드 웹앱입니다.
참가자 / 팀 / 총판수 / 승 / 패 / 연승 / 승리점수합산 / 연승보너스 / 총점을 자동으로 계산합니다.

## 점수 규칙

- 승리: **+18 ~ +23점 중 랜덤 부여**
- 패배: **-18 ~ -23점 중 랜덤 부여**
- 🌟 **반짝이는 판 보너스**: deeplol.gg 기준으로 해당 경기가 "반짝이는 판(하이라이트)"으로 표시됐다면, 기록할 때 체크박스를 켜면 **+20점**이 별도로 더해집니다. (승/패와 무관하게 적용)
- 연승 보너스 (해당 연승에 도달하는 순간 1회 지급)
  - 3연승: +5
  - 4연승: +15
  - 5연승: +30
  - 6연승: +50
- **총점 = 승리점수합산 + 연승보너스합산 + 하이라이트보너스합산**
- 패배하면 연승 스택은 0으로 초기화됩니다.

> 6연승을 넘어서도 계속 보너스를 받고 싶다면 `script.js` 상단의
> `KEEP_BONUS_AFTER_6` 값을 `true`로 바꾸면 됩니다.
> 하이라이트 보너스 점수는 `HIGHLIGHT_BONUS` 값을 바꾸면 조정됩니다.

## 경기 로그 보는 법

경기 로그 위쪽에 참가자별 탭(전체 / 참가자1 / 참가자2 ...)이 있습니다.
특정 참가자를 클릭하면 그 사람의 경기 기록만 걸러서 보여줘서, 인원이 많아져도
로그가 한꺼번에 뒤섞여 보이지 않습니다. 각 탭 옆 숫자는 그 참가자의 총 기록 개수입니다.

---

## 1. VS Code에서 실행하는 방법

### 준비물
- [Visual Studio Code](https://code.visualstudio.com/) 설치
- (권장) VS Code 확장 **Live Server** 설치

### 실행 순서

1. 이 폴더(`lol-solo-tracker`) 전체를 VS Code로 엽니다.
   - VS Code 실행 → `파일(File) > 폴더 열기(Open Folder)` → 이 폴더 선택
2. 왼쪽 탐색기에 `index.html`, `style.css`, `script.js`가 보이는지 확인합니다.
3. **Live Server로 실행하기 (권장)**
   - 확장 마켓플레이스(`Ctrl+Shift+X` / `Cmd+Shift+X`)에서 `Live Server` (Ritwick Dey) 검색 후 설치
   - `index.html` 파일을 열고, 우측 하단의 **Go Live** 버튼 클릭
   - 자동으로 브라우저가 열리며 `http://127.0.0.1:5500` 같은 주소로 사이트가 뜹니다
   - 코드를 수정하면 브라우저가 자동으로 새로고침됩니다
4. **Live Server 없이 실행하기**
   - `index.html` 파일을 우클릭 → "코드로 열기" 대신 그냥 브라우저(Chrome 등)로 더블클릭해서 열어도 됩니다
   - 단, 일부 브라우저는 로컬 파일에서 `crypto.randomUUID()` 등을 제한할 수 있어 Live Server 사용을 권장합니다

### 데이터 저장
- 모든 기록은 브라우저의 `localStorage`에 저장됩니다. 같은 브라우저·같은 주소로 다시 접속하면 기록이 유지됩니다.
- 다른 사람과 데이터를 공유하려면 별도의 서버/DB 연동이 필요합니다 (아래 "더 발전시키고 싶다면" 참고).

---

## 2. deeplol.gg 연동에 대해

결론부터 말씀드리면, **deeplol.gg를 브라우저 자바스크립트에서 직접 호출해서 데이터를 가져오는 것은 안 됩니다.**

이유는 두 가지입니다.

1. **공식 API가 없음**: deeplol.gg는 라이엇 공식 파트너가 아닌 개인/비공식 통계 사이트로, 외부에서 쓸 수 있는 공개 API를 제공하지 않습니다.
2. **CORS 차단**: 설령 페이지 내용을 가져오려 해도, 브라우저 보안 정책(CORS) 때문에 다른 도메인의 HTML을 `fetch`로 긁어오는 것 자체가 브라우저에서 차단됩니다. 이를 우회하려면 서버를 거쳐 스크래핑해야 하는데, 이는 해당 사이트 이용약관을 위반할 소지가 있어 권장하지 않습니다.

### 대안: 라이엇 공식 API 사용

같은 목적(승리한 경기에서 어떤 챔피언을 썼는지 자동 표시)을 이루고 싶다면, **라이엇 게임즈 공식 Developer API**를 쓰는 것이 정석입니다.

1. https://developer.riotgames.com 에서 라이엇 계정으로 로그인 후 **Development API Key** 발급 (24시간마다 재발급 필요, 개인 프로젝트용으로 충분)
2. 필요한 API
   - `ACCOUNT-V1`: 소환사명(Riot ID) → PUUID 조회
   - `MATCH-V5`: PUUID → 최근 매치 목록 → 매치 상세(플레이한 챔피언, 승패 등)
3. API 키는 **절대 브라우저(프론트엔드) 코드에 노출하면 안 됩니다.** 반드시 아주 작은 백엔드 서버(Node.js 등)를 하나 두고, 프론트엔드는 그 서버에만 요청하도록 구성해야 합니다.

간단한 백엔드 예시(Node.js + Express, 참고용 스텁 코드):

```js
// server.js (참고용 - 실제 배포 시 API 키는 .env로 분리하세요)
import express from "express";
import fetch from "node-fetch";

const app = express();
const RIOT_API_KEY = process.env.RIOT_API_KEY; // 코드에 직접 쓰지 말 것

app.get("/api/last-match", async (req, res) => {
  const { gameName, tagLine, region } = req.query; // 예: region=asia (계정 조회용)

  const accRes = await fetch(
    `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    { headers: { "X-Riot-Token": RIOT_API_KEY } }
  );
  const acc = await accRes.json();

  const matchListRes = await fetch(
    `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${acc.puuid}/ids?count=1`,
    { headers: { "X-Riot-Token": RIOT_API_KEY } }
  );
  const [matchId] = await matchListRes.json();

  const matchRes = await fetch(
    `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}`,
    { headers: { "X-Riot-Token": RIOT_API_KEY } }
  );
  const match = await matchRes.json();

  const participant = match.info.participants.find(p => p.puuid === acc.puuid);
  res.json({ champion: participant.championName, win: participant.win });
});

app.listen(3000, () => console.log("http://localhost:3000"));
```

이 서버를 띄운 뒤, 프론트엔드(`script.js`)에서 `fetch("/api/last-match?...")`로 호출해서 받아온 `champion` 값을 `championInput`에 자동으로 채워 넣는 식으로 확장할 수 있습니다.

**지금 버전에서는** 이 자동 연동 대신, 경기 기록 폼에 있는 "사용 챔피언" 입력칸에 직접 챔피언 이름을 적도록 되어 있습니다. 소규모 내기에서는 이 방식이 훨씬 간단하고 안정적입니다.

---

## 3. 파일 구조

```
lol-solo-tracker/
├── index.html    화면 구조
├── style.css     디자인 (다크 테마, Summoner's Rift 컨셉)
├── script.js     상태 관리 + 점수 계산 로직
└── README.md     이 문서
```

## 4. 더 발전시키고 싶다면

- 여러 사람이 같은 데이터를 실시간으로 보게 하려면: localStorage 대신 Firebase(Firestore), Supabase 같은 백엔드 DB 연동
- 배포해서 링크로 공유하려면: GitHub Pages, Vercel, Netlify 등에 정적 사이트로 배포 (지금 구조 그대로 올리면 됩니다)
- 라이엇 API로 챔피언/승패 자동 채우기: 위 2번 항목 참고

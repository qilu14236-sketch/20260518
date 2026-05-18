let capture;
let handResults = null;

// 遊戲相關變數
let gamePhase = 'waiting'; // 'waiting', 'countdown', 'result'
let countdown = 3;
let countdownStartTime = 0;
let lastResultTime = 0; // 用來計時結果顯示畫面
let playerChoice = "";
let computerChoice = "";
let resultMessage = "";
let resultState = "";
let playerWins = 0; // 記錄玩家獲勝次數
let computerWins = 0; // 記錄電腦獲勝次數
const CHOICES = ["石頭", "布", "剪刀"];

function setup() {
  // 建立全螢幕畫布
  createCanvas(windowWidth, windowHeight);
  
  capture = createCapture(VIDEO);
  capture.hide(); // 隱藏 p5 原生的 HTML 影片元素，由我們自行畫在畫布上
  
  imageMode(CENTER); // 將圖片繪製的基準點設定為中心

  // 初始化 MediaPipe Hands 模型
  const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }});
  
  hands.setOptions({
    maxNumHands: 2, // 最多偵測幾隻手
    modelComplexity: 1,
    minDetectionConfidence: 0.7, // 提高偵測的門檻，減少把背景誤認為手的情況
    minTrackingConfidence: 0.7   // 提高追蹤的門檻，讓移動時的節點更精準
  });
  
  hands.onResults(onResults);
  
  // 使用 MediaPipe Camera Utils 擷取影像並傳遞給 Hands 模型
  const camera = new Camera(capture.elt, {
    onFrame: async () => {
      await hands.send({image: capture.elt});
    },
    width: 640,
    height: 480
  });
  camera.start();
}

// 當 MediaPipe 辨識完成並回傳結果時，會呼叫此函式
function onResults(results) {
  handResults = results;
}

function draw() {
  // 設定畫布背景顏色為 #e7c6ff
  background('#e7c6ff');
  
  // 計算影像的寬高 (全螢幕畫面寬高的 50%)
  let imgW = width * 0.5;
  let imgH = height * 0.5;
  
  let detectedGesture = "未辨識"; // 用來記錄當前畫面偵測到的手勢
  
  push();
  // 將畫布的座標原點移動到視窗正中心，並左右顛倒
  translate(width / 2, height / 2);
  scale(-1, 1);
  
  // 繪製攝影機影像
  if (capture && capture.loadedmetadata) {
    image(capture, 0, 0, imgW, imgH);
  }
  
  // 如果有偵測到手部節點，進行繪製
  if (handResults && handResults.multiHandLandmarks) {
    for (let i = 0; i < handResults.multiHandLandmarks.length; i++) {
      let landmarks = handResults.multiHandLandmarks[i];
      
      // 判斷手勢 (為了簡單起見，只看第一隻手)
      if (i === 0) {
        // 藉由判斷指尖(8,12,16,20)的y座標是否低於下一個關節(6,10,14,18)的y座標，來判定手指是否有伸直 (越上面 y 越小)
        let indexUp = landmarks[8].y < landmarks[6].y;
        let middleUp = landmarks[12].y < landmarks[10].y;
        let ringUp = landmarks[16].y < landmarks[14].y;
        let pinkyUp = landmarks[20].y < landmarks[18].y;

        // 計算大拇指(4)與食指(8)指尖的距離 (MediaPipe 的標準化座標為 0~1)
        let pinchDist = dist(landmarks[4].x, landmarks[4].y, landmarks[8].x, landmarks[8].y);
        
        if (pinchDist < 0.05 && !middleUp && !ringUp && !pinkyUp) {
          detectedGesture = "愛心";
        } else if (indexUp && middleUp && !ringUp && !pinkyUp) {
          detectedGesture = "剪刀";
        } else if (!indexUp && !middleUp && !ringUp && !pinkyUp) {
          detectedGesture = "石頭";
        } else if (indexUp && middleUp && ringUp && pinkyUp) {
          detectedGesture = "布";
        }
      }
      
      // 畫出白色的骨架線條
      stroke(255);     // 白色線條
      strokeWeight(2); // 線條粗細
      
      // 定義手指各個關節的連接順序 (MediaPipe Hands 的骨架結構)
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],          // 拇指
        [0, 5], [5, 6], [6, 7], [7, 8],          // 食指
        [5, 9], [9, 10], [10, 11], [11, 12],     // 中指
        [9, 13], [13, 14], [14, 15], [15, 16],   // 無名指
        [13, 17], [17, 18], [18, 19], [19, 20],  // 小指
        [0, 17]                                  // 連接手掌邊緣
      ];
      
      for (let j = 0; j < connections.length; j++) {
        let pA = landmarks[connections[j][0]];
        let pB = landmarks[connections[j][1]];
        
        let xA = (pA.x * imgW) - (imgW / 2);
        let yA = (pA.y * imgH) - (imgH / 2);
        let xB = (pB.x * imgW) - (imgW / 2);
        let yB = (pB.y * imgH) - (imgH / 2);
        line(xA, yA, xB, yB);
      }
      
      fill(255, 0, 0); // 設定節點顏色為紅色
      noStroke();
      
      // 畫出每隻手的 21 個關節點
      for (let j = 0; j < landmarks.length; j++) {
        // MediaPipe 回傳的座標是 0~1 的標準化比例。
        // 因為 imageMode 為 CENTER，影像的左上角實際上是在 (-imgW/2, -imgH/2)
        // 需依照此邏輯去偏移並縮放關節點，使之對齊攝影機影像
        let x = (landmarks[j].x * imgW) - (imgW / 2);
        let y = (landmarks[j].y * imgH) - (imgH / 2);
        circle(x, y, 10);
      }
    }
  }
  pop();
  
  // 繪製計分板 (畫在 pop 之後確保不會左右顛倒)
  fill(50);
  noStroke();
  textSize(28);
  textAlign(LEFT, TOP);
  text(`玩家獲勝: ${playerWins}`, 20, 20);
  textAlign(RIGHT, TOP);
  text(`電腦獲勝: ${computerWins}`, width - 20, 20);

  // --- 遊戲狀態機 (繪製在 pop() 之後，文字才不會左右顛倒) ---

  // 1. 等待階段：偵測到手勢就開始倒數
  if (gamePhase === 'waiting') {
    if (detectedGesture === "愛心") {
      // 在等待階段比出愛心，可以將分數歸零
      playerWins = 0;
      computerWins = 0;
    } else if (["剪刀", "石頭", "布"].includes(detectedGesture)) {
      gamePhase = 'countdown';
      countdownStartTime = millis();
    }
  }

  // 2. 倒數階段：顯示倒數，並在結束時結算勝負
  if (gamePhase === 'countdown') {
    let elapsed = millis() - countdownStartTime;
    countdown = 3 - floor(elapsed / 1000);

    // 顯示倒數數字
    if (countdown > 0) {
      fill(0, 0, 0, 150);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(250);
      text(countdown, width / 2, 180);
    } else { // 倒數結束
      gamePhase = 'result';
      lastResultTime = millis();

      // 捕捉倒數結束瞬間的手勢
      playerChoice = detectedGesture;

      // 如果沒偵測到手勢，算輸
      if (playerChoice === '未辨識') {
        resultState = "LOSE";
        resultMessage = "沒看到你的手！";
        computerChoice = "---";
      } else {
        // 電腦出拳
        computerChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)];
        // 判斷勝負
        if (playerChoice === computerChoice) {
          resultState = "DRAW";
          resultMessage = "平手";
        } else if (
          (playerChoice === "石頭" && computerChoice === "剪刀") ||
          (playerChoice === "布" && computerChoice === "石頭") ||
          (playerChoice === "剪刀" && computerChoice === "布")
        ) {
          resultState = "WIN";
          resultMessage = "你贏了！";
          playerWins++; // 玩家獲勝次數 +1
        } else {
          resultState = "LOSE";
          resultMessage = "你輸了";
          computerWins++; // 電腦獲勝次數 +1
        }
      }
    }
  }

  // 3. 結果階段：顯示結果幾秒後，重置遊戲
  if (gamePhase === 'result') {
    fill(0);
    noStroke();
    textAlign(CENTER, CENTER);
    
    // 顯示雙方出拳
    textSize(32);
    text(`你出：${playerChoice}`, width / 4, height - 80);
    text(`電腦出：${computerChoice}`, 3 * width / 4, height - 80);
    
    // 根據勝負決定字體大小和動畫特效
    if (resultState === "WIN") {
      let bounce = sin(frameCount * 0.15) * 20; // 透過 sin() 函式製造彈跳的偏移量
      // 將字體改小，並使用 min() 確保在手機小螢幕上自動縮小以防超出邊界
      textSize(min(120, width * 0.2)); 
      fill(255, 50, 50); // 顯眼的紅色
      text(resultMessage, width / 2, 150 + bounce); // 加上彈跳偏移
    } else if (resultState === "LOSE") {
      textSize(32); // 普通大小的字
      fill(50);
      text(resultMessage, width / 2, 150);
    } else {
      textSize(48); // 平手用中等大小
      fill(100);
      text(resultMessage, width / 2, 150);
    }

    // 顯示提示文字
    textSize(24);
    fill(100);
    text("比出「手指愛心」來重置分數並馬上重新開始", width / 2, height - 30);

    // 顯示結果 3 秒後自動回到等待階段，或偵測到「愛心」時立刻重置並重新開始
    if (millis() - lastResultTime > 3000 || detectedGesture === "愛心") {
      if (detectedGesture === "愛心") {
        playerWins = 0;
        computerWins = 0;
      }
      gamePhase = 'waiting';
      playerChoice = '';
    }
  }
}

// 當瀏覽器視窗大小改變時，動態調整畫布大小以維持全螢幕
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

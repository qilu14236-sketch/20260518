let capture;
let handResults = null;

// 遊戲相關變數
let playerChoice = "";
let computerChoice = "";
let resultMessage = "";
let resultState = "";
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

        if (indexUp && middleUp && !ringUp && !pinkyUp) {
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
  
  // 遊戲邏輯與文字顯示 (必須寫在 pop() 之後，文字才不會跟著畫面左右顛倒)
  if (detectedGesture !== "未辨識") {
    // 如果偵測到新動作，立刻更新結果
    if (playerChoice !== detectedGesture) {
      playerChoice = detectedGesture;
      // 電腦隨機出拳
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
      } else {
        resultState = "LOSE";
        resultMessage = "你輸了";
      }
    }
  }

  // 繪製遊戲結果介面
  if (playerChoice !== "") {
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
      textSize(120); // 大大的字
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
  }
}

// 當瀏覽器視窗大小改變時，動態調整畫布大小以維持全螢幕
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

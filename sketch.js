let capture;
let handResults = null;

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
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
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
}

// 當瀏覽器視窗大小改變時，動態調整畫布大小以維持全螢幕
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

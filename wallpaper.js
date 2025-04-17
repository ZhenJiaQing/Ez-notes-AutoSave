const toolbar = document.getElementById('toolbar')
const colorPickerButton = document.getElementById('color-picker-button')
const colorPickerContainer = document.getElementById('color-picker-container')
const redSlider = document.getElementById('red-slider')
const greenSlider = document.getElementById('green-slider')
const blueSlider = document.getElementById('blue-slider')
const colorRedValue = document.getElementById('color-red-value')
const colorGreenValue = document.getElementById('color-green-value')
const colorBlueValue = document.getElementById('color-blue-value')
const toggleTheme = document.getElementById('toggle-theme')
const customEraserCursor = document.getElementById('custom-eraser-cursor')
const penLock = document.getElementById('pen-lock')
const pageNumber = document.getElementById('page-number')
const inputColor = document.getElementById('input-color')
const sliderPen = document.getElementById('slider-pen')
const sliderEraser = document.getElementById('slider-eraser')
const undo = document.getElementById('undo')
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

canvas.width = window.innerWidth
canvas.height = window.innerHeight
const baseHeight = canvas.height
let cW = canvas.width
let cH = canvas.height

//  不允许在工具栏区域绘图
let minX = toolbar.offsetLeft - toolbar.offsetWidth / 2
let maxX = toolbar.offsetLeft + toolbar.offsetWidth / 2
//  20是工具栏的上边距
let minY = toolbar.offsetTop - toolbar.offsetHeight / 2 + 20
let maxY = toolbar.offsetTop + toolbar.offsetHeight / 2 + 20

//  颜色选择器弹窗
let isPopUpHidden = true
//  根据屏幕大小和工具栏设置位置
colorPickerContainer.style.width = '285px'
colorPickerContainer.style.height = '68px'
colorPickerContainer.style.left = minX + 'px'

let popUpMinX = minX
let popUpMaxX = minX + 285
let popUpMinY = 83
let popUpMaxY = 83 + 68

const colors = {
  background: 'rgb(40,44,52)',
  customColor: 'rgb(255,255,255)',
  purple: 'rgb(198,120,221)',
  darkPurple: 'rgb(150, 72, 173)',
  red: 'rgb(224, 108, 117)',
  darkRed: 'rgb(176, 60, 69)',
  green: 'rgb(152, 195, 121)',
  darkGreen: 'rgb(104, 147, 73)',
  blue: 'rgb(0, 194, 182)',
  darkBlue: 'rgb(0, 146, 134)',
  yellow: 'rgb(229, 192, 123)',
  darkYellow: 'rgb(191, 154, 85)'
}
let currentColor = colors.purple
let previousButton
let thickness = sliderPen.value
let eraserThickness = sliderEraser.value
let currentPageIndex = 0
let currentPageNum = 1
let totalPages = 1

let isPenLocked = false
let usingSelectorTool = false
let usingEraser = false
let isMouseDown = false
let movingSelectedArea = false
let hasMovedSelectedArea = false

let pos = { x: 0, y: 0 }
let previousPos = { x: 0, y: 0 }
let selectorStartPoint
let selectorEndPoint
let lastSelectedPoints

//  存储画布状态用于撤销按钮
let canvasPointStates = []
//  创建一个较小的数组添加到总画布状态数组
let currentPointState = []
//  包含每页canvasPointStates的数组
let pagePointStates = []
// 选中线条的数组
let selectedLines = []
//  键值数组：键=canvasPointStates中初始位置的索引，
//  值=选择并移动后在canvasPointStates中新位置的索引
let movedLinesMapping = []

let minSelectedX, maxSelectedX, minSelectedY, maxSelectedY

//  自定义动态橡皮擦光标
let cursorEraserWidth = eraserThickness
let cursorEraserHeight = eraserThickness
customEraserCursor.style.width = eraserThickness
customEraserCursor.style.height = eraserThickness

window.onresize = () => {
  canvas.width = window.innerWidth
  cW = canvas.width
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, cW, cH)

  ctx.lineWidth = thickness
  minX = toolbar.offsetLeft - toolbar.offsetWidth / 2
  maxX = toolbar.offsetLeft + toolbar.offsetWidth / 2
  minY = toolbar.offsetTop - toolbar.offsetHeight / 2
  maxY = toolbar.offsetTop + toolbar.offsetHeight

  colorPickerContainer.style.left = minX + 'px'
  popUpMinX = minX
  popUpMaxX = minX + 285
  popUpMinY = 83
  popUpMaxY = 83 + 68
}

const update = () => {
  const diffx = pos.x - previousPos.x
  const diffy = pos.y - previousPos.y
  const diffsq = diffx * diffx + diffy * diffy

  if (isMouseDown && diffsq >= 16) {
    if (!usingEraser) {
      //  在previousPos和currentPos之间添加点，
      //  如果用户快速绘制线条，点之间会相距较远

      //  最少5个子点
      const numSubpoints = Math.max(5, diffsq / 2950)
      ctx.strokeStyle = currentColor
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.lineWidth = thickness
      for (let i = 1; i < numSubpoints; i++) {
        //  不需要更新相同位置
        if (
          i * (diffx / numSubpoints) === previousPos.x &&
          i * (diffy / numSubpoints === previousPos.y)
        )
          break
        currentPointState.push({
          x: previousPos.x + i * (diffx / numSubpoints),
          y: previousPos.y + i * (diffy / numSubpoints),
          currentColor,
          thick: thickness
        })
        ctx.beginPath()
        ctx.moveTo(previousPos.x + diffx / i, previousPos.y + diffy / i)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
      }
    } else {
      //  搜索擦除半径内的点并移除它们
      deletePointsInEraserRadius(pos.x, pos.y)
    }

    previousPos.x = pos.x
    previousPos.y = pos.y
  }
}

const setCustomColor = () => {
  colorRedValue.innerText = 'R: ' + redSlider.value
  colorGreenValue.innerText = 'G: ' + greenSlider.value
  colorBlueValue.innerText = 'B: ' + blueSlider.value

  colors.customColor = `rgb(${redSlider.value},${greenSlider.value}, ${blueSlider.value})`
  currentColor = colors.customColor
  colorPickerButton.style.backgroundColor = colors.customColor
}

colorPickerButton.addEventListener('click', () => {
  isPopUpHidden = !isPopUpHidden

  if (isPopUpHidden) colorPickerContainer.style.display = 'none'
  else colorPickerContainer.style.display = 'inherit'
})

//  不希望在容器后面绘图，所以可以撤销绘制的线条
colorPickerContainer.addEventListener('click', () => {})

redSlider.addEventListener('input', () => {
  setCustomColor()
})

greenSlider.addEventListener('input', () => {
  setCustomColor()
})

blueSlider.addEventListener('input', () => {
  setCustomColor()
})

sliderPen.addEventListener('input', () => {
  thickness = sliderPen.value
  if (!usingEraser) {
    ctx.lineWidth = thickness
  }
})

sliderEraser.addEventListener('input', () => {
  eraserThickness = sliderEraser.value
  if (usingEraser) {
    ctx.lineWidth = eraserThickness
  }
  handleEraserCursorThickness()
})

const handlePreviousPage = () => {
  //  检查前一页是否存在
  if (currentPageIndex === 0) return

  clearPage()
  pagePointStates[currentPageIndex] = [...canvasPointStates]
  currentPageIndex--

  drawPoints(pagePointStates[currentPageIndex])
  canvasPointStates = pagePointStates[currentPageIndex]
  currentPageNum--
  pageNumber.innerText = `${currentPageNum} of ${totalPages}`
  saveCanvasData()
}

const handleNextPage = () => {
  clearPage()
  pagePointStates[currentPageIndex] = [...canvasPointStates]
  currentPageIndex++

  if (pagePointStates[currentPageIndex]) {
    drawPoints(pagePointStates[currentPageIndex])
    canvasPointStates = pagePointStates[currentPageIndex]
  } else {
    totalPages++
    canvasPointStates = []
  }
  currentPageNum++
  pageNumber.innerText = `${currentPageNum} of ${totalPages}`
  saveCanvasData()
}

const handleToggleTheme = () => {
  // 检查当前背景颜色是否接近白色
  const isLightTheme = colors.background.includes('255,255,255') || 
                      (colors.background.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/) && 
                       parseInt(RegExp.$1) > 200 && 
                       parseInt(RegExp.$2) > 200 && 
                       parseInt(RegExp.$3) > 200);
  
  if (isLightTheme) {
    // 切换到暗色主题
    toggleTheme.style.background = `url('./assets/moon.png')`
    toggleTheme.style.backgroundRepeat = 'no-repeat'
    colors.background = 'rgb(40,44,52)'
  } else {
    // 切换到亮色主题
    toggleTheme.style.background = `url('./assets/sun1.png')`
    toggleTheme.style.backgroundRepeat = 'no-repeat'
    colors.background = 'rgb(255,255,255)'
  }
  clearPage()
  drawPoints(canvasPointStates)
  saveCanvasData()
}

const handlePenLocked = () => {
  isPenLocked = !isPenLocked

  if (isPenLocked) {
    penLock.style.background = `url('./assets/padlock.png')`
    penLock.style.backgroundRepeat = 'no-repeat'
  } else {
    penLock.style.background = `url('./assets/open-padlock.png')`
    penLock.style.backgroundRepeat = 'no-repeat'
  }
}

const handleUndo = () => {
  canvasPointStates.pop()
  clearPage()
  drawPoints(canvasPointStates)
  saveCanvasData()
}

const handleSelector = () => {
  //  获取左上角和右下角之间的所有点
  minSelectedX = Math.min(selectorStartPoint.x, selectorEndPoint.x)
  maxSelectedX = Math.max(selectorStartPoint.x, selectorEndPoint.x)
  minSelectedY = Math.min(selectorStartPoint.y, selectorEndPoint.y)
  maxSelectedY = Math.max(selectorStartPoint.y, selectorEndPoint.y)

  //  保存选中区域中的所有点
  let numSelectionsCount = 0
  for (let i = 0; i < canvasPointStates.length; i++) {
    for (let point of canvasPointStates[i]) {
      if (
        point.x >= minSelectedX &&
        point.x <= maxSelectedX &&
        point.y >= minSelectedY &&
        point.y <= maxSelectedY
      ) {
        //  如果线条包含选定区域中的点，将其添加到selectedLines数组
        //  我们必须检查selectedLines是否已包含canvasPointStates[i]，否则会出现错误
        //  其中有重复的线条，导致每次选择时selectedLines的大小加倍
        if (
          !selectedLines.some(
            (line) =>
              JSON.stringify(line) === JSON.stringify(canvasPointStates[i])
          )
        ) {
          selectedLines.push([...canvasPointStates[i]])
        }
        movedLinesMapping.push({
          originalLine: i,
          movedLine: canvasPointStates.length + numSelectionsCount
        })
        numSelectionsCount++
        break //目前如果任何像素接触选定区域
      }
    }
  }
}

const handleEraserCursorThickness = () => {
  cursorEraserWidth = eraserThickness
  cursorEraserHeight = eraserThickness
  customEraserCursor.style.width = eraserThickness
  customEraserCursor.style.height = eraserThickness
}

const drawPoints = (cPoints) => {
  for (let i = 0; i < cPoints.length; i++) {
    if (cPoints[i].length > 0) {
      ctx.strokeStyle = cPoints[i][0].currentColor
      ctx.lineWidth = cPoints[i][0].thick
    }

    //  如果线条被选中并移动，不绘制原始线条
    movedLinesMapping = []
    /*
    for (let lineMap of movedLinesMapping) {
      if (lineMap.originalLine === i) lineMoved = true
    }
    if (lineMoved) continue
    */
    for (let pointIdx = 0; pointIdx < cPoints[i].length - 1; pointIdx++) {
      //  连接两点
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(cPoints[i][pointIdx].x, cPoints[i][pointIdx].y)
      ctx.lineTo(cPoints[i][pointIdx + 1].x, cPoints[i][pointIdx + 1].y)
      ctx.stroke()
    }
  }
  //  drawPoints改变线宽为前一点的线宽，必须将thickness改回当前点
  ctx.lineWidth = thickness
}

const clearPage = () => {
  ctx.fillStyle = colors.background
  ctx.clearRect(0, 0, cW, cH)
  ctx.fillRect(0, 0, cW, cH)
}

//  为画笔颜色div添加事件监听器和背景颜色
document.querySelectorAll('.pen-color').forEach((colorButton) => {
  colorButton.addEventListener('click', () => {
    //  锁定屏幕时不应该能做任何事情，除了解锁屏幕
    if (isPenLocked && colorButton.id !== 'pen-lock') return

    usingEraser = false
    usingSelectorTool = false

    customEraserCursor.style.display = 'none'

    if (previousButton) {
      switch (previousButton.id) {
        case 'color-picker-button':
          previousButton.style.backgroundColor = colors.customColor
          break
        case 'pen-purple':
          previousButton.style.backgroundColor = colors.purple
          break
        case 'pen-red':
          previousButton.style.backgroundColor = colors.red
          break
        case 'pen-blue':
          previousButton.style.backgroundColor = colors.blue
          break
        case 'pen-green':
          previousButton.style.backgroundColor = colors.green
          break
        case 'pen-yellow':
          previousButton.style.backgroundColor = colors.yellow
          break
      }
    }

    switch (colorButton.id) {
      case 'color-picker-button':
        colorButton.style.backgroundColor = colors.customColor
        currentColor = colors.customColor
        break
      case 'pen-purple':
        colorButton.style.backgroundColor = colors.darkPurple
        currentColor = colors.purple
        break
      case 'pen-red':
        colorButton.style.backgroundColor = colors.darkRed
        currentColor = colors.red
        break
      case 'pen-blue':
        colorButton.style.backgroundColor = colors.darkBlue
        currentColor = colors.blue
        break
      case 'pen-green':
        colorButton.style.backgroundColor = colors.darkGreen
        currentColor = colors.green
        break
      case 'pen-yellow':
        colorButton.style.backgroundColor = colors.darkYellow
        currentColor = colors.yellow
        break
      case 'eraser':
        usingEraser = true
        customEraserCursor.style.display = 'initial'
        handleEraserCursorThickness()
        break

      case 'selector':
        usingSelectorTool = true
        break
      case 'undo':
        handleUndo()
        break
      case 'reset':
        canvasPointStates = []
        clearPage()
        // 清除保存的数据
        localStorage.removeItem('ez-notes-data')
        // 清除所有数据块cookie
        for (let i = 0; i <= 20; i++) {
          document.cookie = `ez_data_${i}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        }
        document.cookie = `ez_data_chunks=0; path=/; max-age=31536000`
        break
      case 'previous-page':
        handlePreviousPage()
        break
      case 'next-page':
        handleNextPage()
        break
      case 'toggle-theme':
        handleToggleTheme()
        break
      case 'pen-lock':
        handlePenLocked()
        break
    }
    ctx.lineWidth = colorButton.id === 'eraser' ? eraserThickness : thickness
    previousButton = colorButton
  })
})

const deletePointsInEraserRadius = (x, y) => {
  for (let i = 0; i < canvasPointStates.length; i++) {
    for (
      let pointIdx = 0;
      pointIdx < canvasPointStates[i].length - 1;
      pointIdx++
    ) {
      //  连接两点
      const radius = eraserThickness / 2
      let xDist = canvasPointStates[i][pointIdx].x - x
      let yDist = canvasPointStates[i][pointIdx].y - y
      if (xDist * xDist + yDist * yDist <= radius * radius) {
        //  如果在中间擦除，必须将一条线变成两条
        //  否则线条将无法正确渲染

        //  第二条线，在i+1处插入新元素
        canvasPointStates.splice(
          i + 1,
          0,
          [...canvasPointStates[i]].slice(
            pointIdx + 1,
            canvasPointStates[i].length
          )
        )
        //  第一条线
        canvasPointStates[i] = canvasPointStates[i].slice(0, pointIdx)

        //  如果不包含点，则过滤掉线条
        canvasPointStates = canvasPointStates.filter((line) => line.length > 1)
        pointIdx--
      }
    }
  }
  clearPage()
  drawPoints(canvasPointStates)
}

window.addEventListener('mousedown', (e) => {
  if (isPenLocked) return

  const x = e.clientX
  const y = e.clientY

  if (
    (y >= minY && y <= maxY && x >= minX && x <= maxX) ||
    (!isPopUpHidden &&
      y >= popUpMinY &&
      y <= popUpMaxY &&
      x >= popUpMinX &&
      x <= popUpMaxX)
  )
    return

  if (
    !isPopUpHidden &&
    !(y >= popUpMinY && y <= popUpMaxY && x >= popUpMinX && x <= popUpMaxX)
  ) {
    isPopUpHidden = true
    colorPickerContainer.style.display = 'none'
  }

  // //  移除选择器的轮廓
  if (selectorStartPoint) {
    clearPage()
    drawPoints(canvasPointStates)
  }

  isMouseDown = true

  if (!usingSelectorTool) {
    currentPointState = []
    if (previousPos.x !== x && previousPos.y !== y) {
      if (usingEraser) {
        //  搜索橡皮擦半径内的点并删除它们
        deletePointsInEraserRadius(x, y)
      } else {
        currentPointState.push({
          x: pos.x,
          y: pos.y,
          currentColor,
          thick: thickness
        })
      }
    }

    //  如果壁纸在多个显示器上，鼠标坐标可能超出边界
    if (x < 1 || x >= cW - 1) return
    if (usingEraser) return

    previousPos.x = x
    previousPos.y = y

    //  绘制单点
    ctx.strokeStyle = currentColor
    ctx.beginPath()
    ctx.moveTo(x - 1, y - 1)
    ctx.lineTo(x + 1, y + 1)
    currentPointState.push({
      x: x - 1,
      y: y - 1,
      currentColor,
      thick: thickness
    })
    ctx.stroke()
  } else {
    selectorStartPoint = { x, y }
    lastSelectedPoints = { x, y }
  }

  //  如果已选择网格并且用户点击它
  if (
    selectedLines.length > 0 &&
    x >= minSelectedX &&
    x <= maxSelectedX &&
    y >= minSelectedY &&
    y <= maxSelectedY
  ) {
    movingSelectedArea = true
  } else {
    selectedLines = []
  }
})

window.addEventListener('mousemove', (e) => {
  if (isPenLocked) return

  const x = e.clientX
  const y = e.clientY

  if (usingEraser) {
    customEraserCursor.style.left = `${x - eraserThickness / 2}px`
    customEraserCursor.style.top = `${y - eraserThickness / 2}px`
  }

  if (
    selectorStartPoint &&
    usingSelectorTool &&
    isMouseDown &&
    canvasPointStates.length > 0
  ) {
    //  清除画布并重绘最后状态（移除之前的选择器轮廓）
    clearPage()
    drawPoints(canvasPointStates)
    ctx.lineWidth = '2'
    ctx.setLineDash([10])
    ctx.strokeStyle = 'GRAY'
    ctx.rect(
      selectorStartPoint.x,
      selectorStartPoint.y,
      x - selectorStartPoint.x,
      y - selectorStartPoint.y
    )
    ctx.stroke()
    ctx.setLineDash([0])
  }

  if (!usingSelectorTool) {
    pos.x = x
    pos.y = y
  }

  if (movingSelectedArea) {
    const distX = x - lastSelectedPoints.x
    const distY = y - lastSelectedPoints.y
    hasMovedSelectedArea = true

    lastSelectedPoints.x = x
    lastSelectedPoints.y = y

    //  更新selectedLines点
    const tempLines = [...canvasPointStates]
    for (let line of selectedLines) {
      for (let point of line) {
        point.x += distX
        point.y += distY
      }
      tempLines.push(line)
    }

    clearPage()
    drawPoints(tempLines)
  }
})

window.addEventListener('mouseup', (e) => {
  if (isPenLocked) return

  const x = e.clientX
  const y = e.clientY

  isMouseDown = false

  if (hasMovedSelectedArea && movingSelectedArea) {
    clearPage()
    drawPoints(canvasPointStates)

    movingSelectedArea = false
    hasMovedSelectedArea = false
  }

  if (!usingSelectorTool) {
    //  添加到总状态并清除当前点状态
    //  如果在工具栏或颜色工具弹出窗口内，不注册
    if (
      (y >= minY && y <= maxY && x >= minX && x <= maxX) ||
      (!isPopUpHidden &&
        y >= popUpMinY &&
        y <= popUpMaxY &&
        x >= popUpMinX &&
        x <= popUpMaxX)
    )
      return

    if (!usingEraser) canvasPointStates.push([...currentPointState])

    currentPointState = []
  } else {
    selectorEndPoint = { x: e.clientX, y: e.clientY }
    handleSelector()
  }

  clearPage()
  drawPoints(canvasPointStates)
  saveCanvasData()
})

const init = () => {
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, cW, cH)
  ctx.lineWidth = 4

  // 默认启用自动保存
  window.autoSaveEnabled = true
  
  // 加载保存的数据
  loadCanvasData()
  
  // 设置自动保存（每30秒）
  setInterval(saveCanvasData, 30000)
  
  // 页面关闭前保存
  window.addEventListener('beforeunload', saveCanvasData)
  
  setInterval(update, 0)
}

// 压缩画布数据以减少存储大小
const compressCanvasData = (data) => {
  // 简化的压缩算法 - 减少精度和删除不必要的属性
  return data.map(page => 
    page.map(line => 
      line.map(point => ({
        x: Math.round(point.x), // 取整
        y: Math.round(point.y), // 取整
        c: point.currentColor, // 缩短属性名
        t: point.thick // 缩短属性名
      }))
    )
  );
};

// 解压缩画布数据
const decompressCanvasData = (compressedData) => {
  if (!compressedData) return [];
  
  return compressedData.map(page => 
    page.map(line => 
      line.map(point => ({
        x: point.x,
        y: point.y,
        currentColor: point.c, // 恢复原属性名
        thick: point.t // 恢复原属性名
      }))
    )
  );
};

// 从Cookie获取数据
const getDataFromCookies = () => {
  const cookies = document.cookie.split(';').map(c => c.trim());
  const chunkCountCookie = cookies.find(c => c.startsWith('ez_data_chunks='));
  
  if (!chunkCountCookie) return null;
  
  const chunks = parseInt(chunkCountCookie.split('=')[1]);
  const dataChunks = [];
  
  for (let i = 0; i < chunks; i++) {
    const chunkCookie = cookies.find(c => c.startsWith(`ez_data_${i}=`));
    if (chunkCookie) {
      const chunk = decodeURIComponent(chunkCookie.split('=')[1]);
      dataChunks.push(chunk);
    }
  }
  
  if (dataChunks.length === chunks) {
    return dataChunks.join('');
  }
  
  return null;
};

// 保存画布数据
const saveCanvasData = () => {
  try {
    // 如果自动保存被禁用，则不执行保存操作
    if (window.autoSaveEnabled === false) {
      return;
    }
    
    // 保存当前页面数据到pagePointStates
    if (pagePointStates[currentPageIndex] !== canvasPointStates) {
      pagePointStates[currentPageIndex] = [...canvasPointStates];
    }
    
    // 将数据存储为JSON字符串，并使用简化格式减小大小
    const compressedData = compressCanvasData(pagePointStates);
    const savedData = {
      pages: compressedData,
      currentPage: currentPageIndex,
      totalPages: totalPages,
      theme: colors.background
    };
    
    const dataString = JSON.stringify(savedData);
    
    let saveSuccess = false;
    
    try {
      // 使用localStorage作为主要存储
      localStorage.setItem('ez-notes-data', dataString);
      saveSuccess = true;
    } catch (storageError) {
      console.error("localStorage保存失败：", storageError);
    }
    
    // 如果localStorage失败，尝试使用cookie
    if (!saveSuccess) {
      try {
        // 将数据分成较小的块存储在多个cookie中
        const chunkSize = 4000; // 单个cookie的最大大小接近4KB
        const chunks = Math.ceil(dataString.length / chunkSize);
        
        // 清除所有现有的数据块cookie
        for (let i = 0; i <= 20; i++) {
          document.cookie = `ez_data_${i}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
        
        // 存储新的数据块
        for (let i = 0; i < chunks; i++) {
          const chunk = dataString.substring(i * chunkSize, (i + 1) * chunkSize);
          document.cookie = `ez_data_${i}=${encodeURIComponent(chunk)}; path=/; max-age=31536000`;
        }
        
        // 存储块数量信息
        document.cookie = `ez_data_chunks=${chunks}; path=/; max-age=31536000`;
      } catch (cookieError) {
        console.error("Cookie保存失败：", cookieError);
      }
    }
  } catch (e) {
    console.error('保存数据失败:', e);
  }
};

// 从存储中加载画板数据
const loadCanvasData = () => {
  try {
    console.log("尝试加载保存的数据...");
    
    // 尝试从多个存储位置读取数据
    let savedDataStr = null;
    
    // 首先尝试从localStorage读取
    savedDataStr = localStorage.getItem('ez-notes-data');
    
    // 如果localStorage失败，尝试从cookie读取
    if (!savedDataStr) {
      console.log("从localStorage加载失败，尝试从cookie加载");
      savedDataStr = getDataFromCookies();
    }
    
    // 处理数据（如果找到）
    if (savedDataStr) {
      console.log("找到保存的数据，长度: " + savedDataStr.length);
      const savedData = JSON.parse(savedDataStr);
      
      if (savedData && savedData.pages) {
        // 解压缩数据
        pagePointStates = decompressCanvasData(savedData.pages);
        currentPageIndex = savedData.currentPage || 0;
        totalPages = savedData.totalPages || 1;
        currentPageNum = currentPageIndex + 1;
        
        if (savedData.theme) {
          colors.background = savedData.theme;
        }
        
        canvasPointStates = pagePointStates[currentPageIndex] || [];
        pageNumber.innerText = `${currentPageNum} of ${totalPages}`;
        clearPage();
        drawPoints(canvasPointStates);
        console.log("数据加载成功，页面数: " + pagePointStates.length);
      }
    } else {
      console.log("未找到保存的数据");
    }
  } catch (e) {
    console.error('加载数据失败:', e);
  }
};

// Wallpaper Engine 属性监听器
window.wallpaperPropertyListener = {
  applyUserProperties: function(properties) {
    // 处理自动保存设置
    if (properties.autoSave !== undefined) {
      // 更新自动保存设置
      window.autoSaveEnabled = properties.autoSave.value;
      console.log("自动保存设置: " + window.autoSaveEnabled);
    }
    
    // 处理主题颜色变更
    if (properties.schemeColor) {
      // 可以应用主题颜色
      const color = properties.schemeColor.value.split(' ');
      const r = Math.ceil(color[0] * 255);
      const g = Math.ceil(color[1] * 255);
      const b = Math.ceil(color[2] * 255);
      const customColor = `rgb(${r}, ${g}, ${b})`;
      colors.background = customColor;
      
      clearPage();
      drawPoints(canvasPointStates);
    }
  }
};

init()

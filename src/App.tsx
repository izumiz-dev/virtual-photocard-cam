import { useState, useRef, useEffect, useCallback, useMemo, type ChangeEvent, type MouseEvent, type TouchEvent } from 'react';

import { Upload, Camera, Image } from 'lucide-react';

const App = () => {
  // タブの状態管理
  const [activeTab, setActiveTab] = useState<'setup' | 'edit'>('setup');
  
  // 状態管理
  const [mainImage, setMainImage] = useState<HTMLImageElement | null>(null);
  const [photocardImage, setPhotocardImage] = useState<HTMLImageElement | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState('');
  const [photocardPreview, setPhotocardPreview] = useState('');
  const [zoomValue, setZoomValue] = useState(55);
  const [isComposed, setIsComposed] = useState(false);
  
  // Canvas関連の状態
  const [bgImagePos, setBgImagePos] = useState({ x: 0, y: 0 });
  const [bgImageSize, setBgImageSize] = useState({ width: 0, height: 0 });
  const [cardPos, setCardPos] = useState({ x: 0, y: 0 });
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const [cardScale, setCardScale] = useState(0.55);
  
  // ドラッグ関連の状態
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragTarget, setDragTarget] = useState('none');
  const [bgDragAxis, setBgDragAxis] = useState('none');
  
  // ピンチ関連の状態
  const [isPinching, setIsPinching] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [initialPinchScale, setInitialPinchScale] = useState(0);
  const [pinchCenter, setPinchCenter] = useState({ x: 0, y: 0 });
  
  
  // アスペクト比選択状態
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('4:5');

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const mainImageInputRef = useRef<HTMLInputElement | null>(null);
  const mainImageCameraRef = useRef<HTMLInputElement | null>(null);

  // アスペクト比オプション
  const aspectRatioOptions = useMemo(() => [
    { value: '4:5', label: '4:5', ratio: 4/5 },
    { value: '1:1', label: '1:1', ratio: 1/1 },
    { value: '4:3', label: '4:3', ratio: 4/3 },
    { value: '16:9', label: '16:9', ratio: 16/9 },
    { value: '9:16', label: '9:16', ratio: 9/16 },
    { value: '21:9', label: '21:9', ratio: 21/9 }
  ], []);

  // 選択されたアスペクト比を取得
  const getCurrentAspectRatio = useCallback(() => {
    const selected = aspectRatioOptions.find(option => option.value === selectedAspectRatio);
    return selected ? selected.ratio : 4/5;
  }, [selectedAspectRatio, aspectRatioOptions]);

  // 画像アップロード処理
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, callback: (img: HTMLImageElement, src: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = document.createElement('img') as HTMLImageElement;
        img.onload = () => callback(img, event.target?.result as string);
        img.onerror = () => alert('画像の読み込みに失敗しました。');
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // 背景画像選択（ファイル選択）
  const handleMainImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    handleImageUpload(e, (img, src) => {
      setMainImage(img);
      setMainImagePreview(src);
    });
  };

  // 背景画像撮影（カメラ）
  const handleMainImageCamera = (e: ChangeEvent<HTMLInputElement>) => {
    handleImageUpload(e, (img, src) => {
      setMainImage(img);
      setMainImagePreview(src);
    });
  };

  // ファイル選択ボタンクリック
  const handleSelectImageClick = () => {
    mainImageInputRef.current?.click();
  };

  // カメラボタンクリック
  const handleCameraClick = () => {
    mainImageCameraRef.current?.click();
  };

  // フォトカード画像選択
  const handlePhotocardUpload = (e: ChangeEvent<HTMLInputElement>) => {
    handleImageUpload(e, (img, src) => {
      setPhotocardImage(img);
      setPhotocardPreview(src);
    });
  };

  // キャンバスセットアップ
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) return;
    
    // コンテナの実際のサイズを取得（パディングを考慮）
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    const aspectRatio = getCurrentAspectRatio();
    
    // 最小サイズを保証
    const minSize = 200;
    const maxWidth = Math.max(containerWidth, minSize);
    const maxHeight = Math.max(containerHeight, minSize);
    
    // アスペクト比を維持しながら最適なサイズを計算
    let displayWidth, displayHeight;
    const targetWidth = maxWidth;
    const targetHeight = targetWidth / aspectRatio;
    
    if (targetHeight <= maxHeight) {
      // 幅基準でサイズを決定
      displayWidth = targetWidth;
      displayHeight = targetHeight;
    } else {
      // 高さ基準でサイズを決定
      displayHeight = maxHeight;
      displayWidth = displayHeight * aspectRatio;
    }
    
    // キャンバスの内部解像度設定（固定解像度で安定性を優先）
    const baseWidth = 1080;
    canvas.width = baseWidth;
    canvas.height = Math.round(baseWidth / aspectRatio);
    
    // キャンバスの表示サイズ設定
    canvas.style.width = `${Math.floor(displayWidth)}px`;
    canvas.style.height = `${Math.floor(displayHeight)}px`;
    
    // デバッグ用ログ（開発時のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log('Canvas setup:', {
        containerSize: { width: containerWidth, height: containerHeight },
        displaySize: { width: displayWidth, height: displayHeight },
        canvasSize: { width: canvas.width, height: canvas.height },
        aspectRatio
      });
    }
  }, [getCurrentAspectRatio]);

  // 背景画像の初期状態計算
  const calculateInitialBgState = useCallback(() => {
    if (!mainImage) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasRatio = canvas.width / canvas.height;
    const mainImageRatio = mainImage.width / mainImage.height;

    if (mainImageRatio > canvasRatio) {
      setBgDragAxis('horizontal');
      const height = canvas.height;
      const width = height * mainImageRatio;
      setBgImageSize({ width, height });
      setBgImagePos({ x: (canvas.width - width) / 2, y: 0 });
    } else {
      setBgDragAxis('vertical');
      const width = canvas.width;
      const height = width / mainImageRatio;
      setBgImageSize({ width, height });
      setBgImagePos({ x: 0, y: (canvas.height - height) / 2 });
    }
  }, [mainImage]);

  // カードサイズ更新
  const updateCardSize = useCallback(() => {
    if (!photocardImage) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width * cardScale;
    const height = width * (photocardImage.height / photocardImage.width);
    setCardSize({ width, height });
  }, [photocardImage, cardScale]);

  // フォトカードの初期状態計算
  const calculateInitialCardState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const newCardScale = 0.55;
    setCardScale(newCardScale);
    setZoomValue(55);
    
    const width = canvas.width * newCardScale;
    const height = photocardImage ? width * (photocardImage.height / photocardImage.width) : width;
    setCardSize({ width, height });
    
    const xMargin = canvas.width * 0.02;
    const yMargin = canvas.width * -0.04;
    setCardPos({
      x: xMargin,
      y: canvas.height - height - yMargin
    });
  }, [photocardImage]);

  // 画像合成処理
  const composeImages = useCallback(() => {
    if (!mainImage || !photocardImage) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d'); 
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 背景画像の描画
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(mainImage, bgImagePos.x, bgImagePos.y, bgImageSize.width, bgImageSize.height);

    // 2. フォトカードの描画
    const centerX = cardPos.x + cardSize.width / 2;
    const centerY = cardPos.y + cardSize.height / 2;
    const angleInRad = 12 * Math.PI / 180;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angleInRad);
    
    // === 基本スタイル（元の実装）===
    // ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    // ctx.shadowBlur = 25;
    // ctx.shadowOffsetX = 10;
    // ctx.shadowOffsetY = 10;
    // 
    // ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    // ctx.lineWidth = 20;
    // ctx.strokeRect(-cardSize.width / 2, -cardSize.height / 2, cardSize.width, cardSize.height);
    // ctx.drawImage(photocardImage, -cardSize.width / 2, -cardSize.height / 2, cardSize.width, cardSize.height);
    // 
    // // 3. 透明フィルムの光沢（グレア）を追加
    // ctx.shadowColor = 'transparent';
    // const gradient = ctx.createLinearGradient(-cardSize.width / 2, -cardSize.height / 2, cardSize.width / 2, cardSize.height / 2);
    // gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.0)');
    // gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.4)');
    // gradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.4)');
    // gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.0)');
    // ctx.fillStyle = gradient;
    // ctx.fillRect(-cardSize.width / 2, -cardSize.height / 2, cardSize.width, cardSize.height);

    // === 超リアル！角丸フォトカード in 四角いスリーブ ===
    
    // 角丸を描画するヘルパー関数
    const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };
    
    // 1. スリーブのドロップシャドウ（四角いスリーブの影）
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 6;
    ctx.shadowOffsetY = 8;
    
    // 2. 四角いビニールスリーブ（角は四角いまま・透明度を下げる）
    const sleeveMargin = 10;
    ctx.fillStyle = 'rgba(240, 248, 255, 0.15)';
    ctx.fillRect(-cardSize.width / 2 - sleeveMargin, -cardSize.height / 2 - sleeveMargin, 
                 cardSize.width + sleeveMargin * 2, cardSize.height + sleeveMargin * 2);
    
    // 3. スリーブの縁（四角いプラスチックの厚み）
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(200, 220, 240, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-cardSize.width / 2 - sleeveMargin, -cardSize.height / 2 - sleeveMargin, 
                   cardSize.width + sleeveMargin * 2, cardSize.height + sleeveMargin * 2);
    
    // 4. 角丸フォトカード本体（カードは角丸・拡大率に応じて計算）
    const baseCardRadius = 80; // 基準となる角丸サイズ（さらに増加）
    const cardRadius = baseCardRadius * cardScale;
    drawRoundedRect(-cardSize.width / 2, -cardSize.height / 2, cardSize.width, cardSize.height, cardRadius);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.fill();
    
    // 5. 角丸フォトカード画像（角丸でクリップ）
    ctx.save();
    drawRoundedRect(-cardSize.width / 2, -cardSize.height / 2, cardSize.width, cardSize.height, cardRadius);
    ctx.clip();
    ctx.drawImage(photocardImage, -cardSize.width / 2, -cardSize.height / 2, cardSize.width, cardSize.height);
    ctx.restore();
    
    // 6. スリーブ内の空気感（四角いスリーブ内の微妙な隙間・透明度を下げる）
    const airGap = ctx.createLinearGradient(-cardSize.width / 2 - sleeveMargin, -cardSize.height / 2, 
                                           cardSize.width / 2 + sleeveMargin, cardSize.height / 2);
    airGap.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    airGap.addColorStop(0.5, 'rgba(240, 248, 255, 0.06)');
    airGap.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
    ctx.fillStyle = airGap;
    ctx.fillRect(-cardSize.width / 2 - sleeveMargin, -cardSize.height / 2 - sleeveMargin, 
                 cardSize.width + sleeveMargin * 2, cardSize.height + sleeveMargin * 2);
    
    // 7. ビニールスリーブの光沢（四角いプラスチック表面の反射）
    const sleeveGloss = ctx.createLinearGradient(-cardSize.width / 2 - sleeveMargin, -cardSize.height / 2 - sleeveMargin, 
                                                cardSize.width / 2 + sleeveMargin, cardSize.height / 4);
    sleeveGloss.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    sleeveGloss.addColorStop(0.3, 'rgba(255, 255, 255, 0.1)');
    sleeveGloss.addColorStop(0.6, 'rgba(255, 255, 255, 0.05)');
    sleeveGloss.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
    ctx.fillStyle = sleeveGloss;
    ctx.fillRect(-cardSize.width / 2 - sleeveMargin, -cardSize.height / 2 - sleeveMargin, 
                 cardSize.width + sleeveMargin * 2, cardSize.height + sleeveMargin * 2);
    
    // 8. 斜めの光沢ストライプ（透明度ありで自然に）
    const diagonalGlare = ctx.createLinearGradient(-cardSize.width / 3, -cardSize.height / 3, 
                                                  cardSize.width / 2, cardSize.height / 4);
    diagonalGlare.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
    diagonalGlare.addColorStop(0.4, 'rgba(255, 255, 255, 0.0)');
    diagonalGlare.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
    diagonalGlare.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)');
    diagonalGlare.addColorStop(0.7, 'rgba(255, 255, 255, 0.0)');
    diagonalGlare.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = diagonalGlare;
    ctx.fillRect(-cardSize.width / 2 - sleeveMargin, -cardSize.height / 2 - sleeveMargin, 
                 cardSize.width + sleeveMargin * 2, cardSize.height + sleeveMargin * 2);
    
    // 9. スリーブの開口部の影（上部の微妙な影）
    const openingShadow = ctx.createLinearGradient(-cardSize.width / 2 - sleeveMargin, -cardSize.height / 2 - sleeveMargin, 
                                                  cardSize.width / 2 + sleeveMargin, -cardSize.height / 2 - sleeveMargin + 4);
    openingShadow.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
    openingShadow.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = openingShadow;
    ctx.fillRect(-cardSize.width / 2 - sleeveMargin, -cardSize.height / 2 - sleeveMargin, 
                 cardSize.width + sleeveMargin * 2, 4);
    
    ctx.restore();
  }, [mainImage, photocardImage, bgImagePos, bgImageSize, cardPos, cardSize, cardScale]);

  // ズームスライダー処理
  const handleZoomChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!photocardImage) return;
    
    const newScale = Number(e.target.value) / 100;
    setZoomValue(Number(e.target.value));

    // 拡大縮小の中心を維持
    const oldCenterX = cardPos.x + cardSize.width / 2;
    const oldCenterY = cardPos.y + cardSize.height / 2;

    setCardScale(newScale);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width * newScale;
    const height = width * (photocardImage.height / photocardImage.width);
    setCardSize({ width, height });
    
    setCardPos({
      x: oldCenterX - width / 2,
      y: oldCenterY - height / 2
    });
  };

  // 合成ボタン処理
  const handleCompose = () => {
    if (mainImage && photocardImage) {
      setIsComposed(true);
      setActiveTab('edit'); // 合成後に編集タブに切り替え
      // requestAnimationFrameでタイミングを改善
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setupCanvas();
          calculateInitialBgState();
          calculateInitialCardState();
        });
      });
    }
  };

  // ダウンロード処理
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'composite-image.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Canvas座標変換
  const getCanvasRelativeCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  // フォトカード内の点判定
  const isPointInPhotocard = (point: {x: number, y: number}) => {
    const centerX = cardPos.x + cardSize.width / 2;
    const centerY = cardPos.y + cardSize.height / 2;
    const angleInRad = 12 * Math.PI / 180;
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    const cosAngle = Math.cos(-angleInRad);
    const sinAngle = Math.sin(-angleInRad);
    const rotatedX = dx * cosAngle - dy * sinAngle;
    const rotatedY = dx * sinAngle + dy * cosAngle;
    return Math.abs(rotatedX) <= cardSize.width / 2 && Math.abs(rotatedY) <= cardSize.height / 2;
  };

  // ピンチの距離計算
  const getPinchDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // ピンチの中心点計算
  const getPinchCenter = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  // ドラッグ開始
  const handleDragStart = (clientX: number, clientY: number) => {
    if (!mainImage || !photocardImage || !isComposed || isPinching) return;
    
    const coords = getCanvasRelativeCoords(clientX, clientY);
    if (isPointInPhotocard(coords)) {
      setDragTarget('photocard');
      setDragStart({ x: coords.x - cardPos.x, y: coords.y - cardPos.y });
    } else {
      setDragTarget('background');
      setDragStart({ x: coords.x - bgImagePos.x, y: coords.y - bgImagePos.y });
    }
    setIsDragging(true);
  };

  // ドラッグ移動
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || isPinching) return;
    
    const coords = getCanvasRelativeCoords(clientX, clientY);
    if (dragTarget === 'photocard') {
      setCardPos({
        x: coords.x - dragStart.x,
        y: coords.y - dragStart.y
      });
    } else if (dragTarget === 'background') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (bgDragAxis === 'horizontal') {
        const newX = coords.x - dragStart.x;
        setBgImagePos(prev => ({
          ...prev,
          x: Math.min(0, Math.max(canvas.width - bgImageSize.width, newX))
        }));
      } else if (bgDragAxis === 'vertical') {
        const newY = coords.y - dragStart.y;
        setBgImagePos(prev => ({
          ...prev,
          y: Math.min(0, Math.max(canvas.height - bgImageSize.height, newY))
        }));
      }
    }
  }, [isDragging, isPinching, dragTarget, bgDragAxis, dragStart, bgImageSize]);

  // ドラッグ終了
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragTarget('none');
  }, []);

  // ピンチ開始
  const handlePinchStart = (touch1: React.Touch, touch2: React.Touch) => {
    if (!mainImage || !photocardImage || !isComposed) return;
    
    const center = getPinchCenter(touch1, touch2);
    const canvasCenter = getCanvasRelativeCoords(center.x, center.y);
    
    // フォトカード上でピンチが開始されたかチェック
    if (isPointInPhotocard(canvasCenter)) {
      setIsPinching(true);
      setInitialPinchDistance(getPinchDistance(touch1, touch2));
      setInitialPinchScale(cardScale);
      setPinchCenter(canvasCenter);
      setDragTarget('pinch');
    }
  };

  // ピンチ移動
  const handlePinchMove = useCallback((touch1: React.Touch, touch2: React.Touch) => {
    if (!isPinching) return;
    
    const currentDistance = getPinchDistance(touch1, touch2);
    const scale = currentDistance / initialPinchDistance;
    const newScale = Math.min(1.0, Math.max(0.2, initialPinchScale * scale));
    
    // スケールを更新
    setCardScale(newScale);
    setZoomValue(Math.round(newScale * 100));
    
    // フォトカードの中心を維持
    const canvas = canvasRef.current;
    if (!canvas || !photocardImage) return;
    const width = canvas.width * newScale;
    const height = width * (photocardImage.height / photocardImage.width);
    setCardSize({ width, height });
    
    // ピンチ開始時の中心点を維持
    setCardPos({
      x: pinchCenter.x - width / 2,
      y: pinchCenter.y - height / 2
    });
  }, [isPinching, initialPinchDistance, initialPinchScale, pinchCenter, photocardImage]);

  // ピンチ終了
  const handlePinchEnd = useCallback(() => {
    setIsPinching(false);
    setDragTarget('none');
  }, []);

  // マウスイベント
  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => handleDragStart(e.clientX, e.clientY);
  const handleMouseUp = useCallback(() => handleDragEnd(), [handleDragEnd]);

  // Window event handlers
  const handleWindowMouseMove = useCallback((e: globalThis.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  }, [handleDragMove]);

  const handleWindowTouchMove = useCallback((e: globalThis.TouchEvent) => {
    if (isDragging || isPinching) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (e.touches.length === 2 && isPinching) {
      handlePinchMove(e.touches[0] as React.Touch, e.touches[1] as React.Touch);
    } else if (e.touches.length === 1 && isDragging && !isPinching) {
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [isPinching, isDragging, handlePinchMove, handleDragMove]);

  const handleWindowTouchEnd = useCallback(() => {
    if (isPinching) {
      handlePinchEnd();
    } else {
      handleDragEnd();
    }
  }, [isPinching, handlePinchEnd, handleDragEnd]);

  // タッチイベント
  const handleTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.touches.length === 2) {
      // 2本指のタッチ = ピンチ開始
      handlePinchStart(e.touches[0], e.touches[1]);
    } else if (e.touches.length === 1 && !isPinching) {
      // 1本指のタッチ = ドラッグ開始
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // エフェクトフック

  useEffect(() => {
    if (isComposed) {
      composeImages();
    }
  }, [isComposed, composeImages]);

  useEffect(() => {
    if (isComposed && photocardImage) {
      updateCardSize();
    }
  }, [cardScale, updateCardSize, isComposed, photocardImage]);

  useEffect(() => {
    if (isComposed) {
      composeImages();
    }
  }, [bgImagePos, cardPos, cardSize, composeImages, isComposed]);

  // アスペクト比変更時にキャンバスを再セットアップ
  useEffect(() => {
    if (isComposed && mainImage && photocardImage) {
      // アスペクト比変更もデバウンス
      clearTimeout(window.aspectRatioTimeout);
      window.aspectRatioTimeout = setTimeout(() => {
        setupCanvas();
        calculateInitialBgState();
        calculateInitialCardState();
      }, 100);
    }
    
    return () => {
      if (window.aspectRatioTimeout) {
        clearTimeout(window.aspectRatioTimeout);
      }
    };
  }, [selectedAspectRatio, isComposed, mainImage, photocardImage, setupCanvas, calculateInitialBgState, calculateInitialCardState]);

  // 編集タブに切り替わったときにキャンバスを再セットアップ
  useEffect(() => {
    if (activeTab === 'edit' && isComposed && mainImage && photocardImage) {
      requestAnimationFrame(() => {
        setupCanvas();
        calculateInitialBgState();
        calculateInitialCardState();
      });
    }
  }, [activeTab, isComposed, mainImage, photocardImage, setupCanvas, calculateInitialBgState, calculateInitialCardState]);

  // ドラッグ中のボディスクロールを防ぐ
  useEffect(() => {
    if (isDragging || isPinching) {
      // スクロールを無効化
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      
      // iOSの慣性スクロールも無効化
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      // スクロールを有効化
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    
    // クリーンアップ
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isDragging, isPinching]);

  useEffect(() => {
    const handleWindowResize = () => {
      if (mainImage && photocardImage && isComposed) {
        // デバウンスでリサイズ処理を実行
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(() => {
          setupCanvas();
          calculateInitialBgState();
          calculateInitialCardState();
        }, 250); // デバウンス時間を延長
      }
    };

    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleWindowTouchMove);
    window.addEventListener('touchend', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      
      // タイマーのクリーンアップ
      if (window.resizeTimeout) {
        clearTimeout(window.resizeTimeout);
      }
    };
  }, [mainImage, photocardImage, isComposed, isDragging, isPinching, dragTarget, bgDragAxis, dragStart, cardPos, bgImagePos, bgImageSize, cardSize, initialPinchDistance, initialPinchScale, pinchCenter, calculateInitialBgState, calculateInitialCardState, setupCanvas, handleMouseUp, handleWindowMouseMove, handleWindowTouchEnd, handleWindowTouchMove]);

  return (
    <div className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 h-screen overflow-hidden flex flex-col">
      {/* ヘッダー - デスクトップのみ表示 */}
      <header className="hidden md:block text-center py-4 px-4">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
          Virtual Photocard Cam
        </h1>
      </header>
      
      {/* モバイル向けタイトル */}
      <header className="md:hidden text-center py-3 px-4 bg-white dark:bg-gray-800 shadow-sm">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
          VirtualPC
        </h1>
      </header>
      
      {/* タブナビゲーション */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('setup')}
            className={`flex-1 py-3 px-4 text-center font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'setup'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            画像設定
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            disabled={!isComposed}
            className={`flex-1 py-3 px-4 text-center font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'edit'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                : isComposed
                ? 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                : 'border-transparent text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}
          >
            編集・調整
          </button>
        </nav>
      </div>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-hidden">
        {/* 画像設定タブ */}
        {activeTab === 'setup' && (
          <div className="h-full overflow-y-auto p-4 bg-white dark:bg-gray-800">
            <div className="max-w-lg mx-auto space-y-6">
              <div>
                <label className="block text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">
                  1. 背景画像を選択
                </label>
                
                {/* 隠しファイル入力 */}
                <input
                  ref={mainImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleMainImageUpload}
                  className="hidden"
                />
                <input
                  ref={mainImageCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleMainImageCamera}
                  className="hidden"
                />
                
                {/* ボタンコンテナ */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={handleSelectImageClick}
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-indigo-300 dark:border-indigo-600 rounded-lg hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200 group"
                  >
                    <Upload className="w-8 h-8 text-indigo-500 dark:text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                      画像を選択
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                      ギャラリーから
                    </span>
                  </button>
                  
                  <button
                    onClick={handleCameraClick}
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-green-300 dark:border-green-600 rounded-lg hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 group"
                  >
                    <Camera className="w-8 h-8 text-green-500 dark:text-green-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                      画像を撮影
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                      カメラで撮影
                    </span>
                  </button>
                </div>
                
                {/* プレビュー画像 */}
                {mainImagePreview && (
                  <div className="flex items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Image className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400 mr-3">選択済み:</span>
                    <img
                      src={mainImagePreview}
                      className="w-16 h-16 object-cover rounded-md shadow-sm"
                      alt="背景画像のプレビュー"
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
                  2. フォトカードを選択
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotocardUpload}
                    className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800 transition-colors"
                  />
                  {photocardPreview && (
                    <img
                      src={photocardPreview}
                      className="w-16 h-16 object-cover rounded-md bg-gray-200 dark:bg-gray-700"
                      alt="フォトカードのプレビュー"
                    />
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
                  3. アスペクト比を選択
                </label>
                <select
                  value={selectedAspectRatio}
                  onChange={(e) => setSelectedAspectRatio(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {aspectRatioOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  生成される画像のアスペクト比を選択してください
                </p>
              </div>
              
              <div className="pt-4">
                <button
                  onClick={handleCompose}
                  disabled={!mainImage || !photocardImage}
                  className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105"
                >
                  画像を合成する
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 編集・調整タブ */}
        {activeTab === 'edit' && (
          <div className="h-full flex flex-col bg-white dark:bg-gray-800">
            {/* プレビューエリア */}
            <div className="flex-1 flex items-center justify-center p-4" style={{ minHeight: 0 }}>
              <div
                ref={canvasContainerRef}
                className="bg-gray-200 dark:bg-gray-700 rounded-lg shadow-inner flex items-center justify-center w-full h-full"
                style={{ 
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                  minWidth: '200px',
                  minHeight: '200px'
                }}
              >
                <canvas
                  ref={canvasRef}
                  className={`rounded-lg ${isComposed ? '' : 'hidden'} ${isDragging || isPinching ? 'cursor-grabbing' : 'cursor-grab'}`}
                  style={{
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none'
                  }}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  onMouseLeave={handleDragEnd}
                />
                {!isComposed && (
                  <div className="text-gray-500 dark:text-gray-400 text-center p-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"></path>
                    </svg>
                    <p>合成された画像がここに表示されます</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* コントロールエリア */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-lg mx-auto space-y-4">
                {/* フォトカードサイズスライダー - デスクトップのみ表示 */}
                <div className="hidden md:block">
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    フォトカードサイズ: {zoomValue}%
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={zoomValue}
                    onChange={handleZoomChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                </div>
                
                {isComposed && (
                  <button
                    onClick={handleDownload}
                    className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 ease-in-out transform hover:scale-105"
                  >
                    画像を保存
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

    </div>
  );
};

export default App

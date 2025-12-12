import React, { useState, useEffect, useRef } from 'react';
import { X, Image as ImageIcon, Upload, Search } from 'lucide-react';
import { textureLoader, TextureInfo } from '../utils/textureLoader';
import { NEW_TILES_IMAGE_OBJECTS } from '../utils/newTilesData';

// Кэш для обработанных изображений
const processedImageCache = new Map<string, string>();

// Функция для удаления черного фона из изображения
const removeBlackBackground = (imageSrc: string): Promise<string> => {
  // Проверяем кэш
  if (processedImageCache.has(imageSrc)) {
    return Promise.resolve(processedImageCache.get(imageSrc)!);
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Устанавливаем crossOrigin только для внешних ресурсов
    if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Порог для определения черного цвета (можно настроить)
      // Увеличиваем порог, чтобы захватить больше оттенков черного
      const threshold = 40; // Пиксели темнее этого значения будут считаться черными
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        // Если пиксель черный или очень темный (все каналы ниже порога), делаем его прозрачным
        // Также проверяем, что альфа-канал не равен 0 (пиксель видимый)
        if (r <= threshold && g <= threshold && b <= threshold && a > 0) {
          data[i + 3] = 0; // Устанавливаем альфа-канал в 0 (прозрачный)
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      const processedDataUrl = canvas.toDataURL();
      processedImageCache.set(imageSrc, processedDataUrl);
      resolve(processedDataUrl);
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
};

// Компонент для отображения текстуры с прозрачным фоном
const TextureThumbnail: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    removeBlackBackground(src)
      .then(processed => {
        setProcessedSrc(processed);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Failed to process texture:', error);
        setProcessedSrc(src); // Fallback to original
        setIsLoading(false);
      });
  }, [src]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-transparent">
        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <img
      src={processedSrc || src}
      alt={alt}
      className="w-full h-full object-contain"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};

interface TextureEditorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedObject: SelectedObject | null;
  onTextureChange: (objectId: string, objectType: string, texturePath: string, textureWidth?: number, textureHeight?: number) => void;
}

export interface SelectedObject {
  id: string;
  type: 'TILE' | 'NPC' | 'ENEMY' | 'BUILDING' | 'ANIMAL';
  x: number;
  y: number;
  currentTexture?: string;
  metadata?: any;
}

const TextureEditor: React.FC<TextureEditorProps> = ({
  isOpen,
  onClose,
  selectedObject,
  onTextureChange
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'newTextures' | 'custom'>('newTextures');
  const [searchQuery, setSearchQuery] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [textureWidth, setTextureWidth] = useState<number>(32);
  const [textureHeight, setTextureHeight] = useState<number>(32);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const texturesListRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Фильтрация текстур по поисковому запросу
  const filteredTextures = NEW_TILES_IMAGE_OBJECTS.filter(obj =>
    obj.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    obj.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Загрузка превью при выборе текстуры
  const handleTextureSelect = async (texturePath: string) => {
    try {
      const img = await textureLoader.loadTexture(texturePath);
      // Обрабатываем изображение для удаления черного фона
      try {
        const processedDataUrl = await removeBlackBackground(texturePath);
        const processedImg = new Image();
        processedImg.src = processedDataUrl;
        await new Promise((resolve, reject) => {
          processedImg.onload = resolve;
          processedImg.onerror = reject;
        });
        setPreviewImage(processedImg);
      } catch (processError) {
        // Если обработка не удалась, используем оригинал
        console.warn('Failed to process preview image, using original:', processError);
        setPreviewImage(img);
      }
      setCustomPath(texturePath);
    } catch (error) {
      console.error('Failed to load texture preview:', error);
      setPreviewImage(null);
    }
  };

  // Применение текстуры к выбранному объекту
  const handleApplyTexture = () => {
    try {
      if (selectedObject && customPath) {
        onTextureChange(selectedObject.id, selectedObject.type, customPath, textureWidth, textureHeight);
        // Предзагружаем текстуру
        textureLoader.loadTexture(customPath).catch(console.error);
      }
    } catch (error) {
      console.error('Error applying texture:', error);
    }
  };

  // Загрузка пользовательской текстуры
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        setCustomPath(dataUrl);
        
        // Обрабатываем изображение для удаления черного фона
        try {
          const processedDataUrl = await removeBlackBackground(dataUrl);
          const img = new Image();
          img.onload = () => setPreviewImage(img);
          img.src = processedDataUrl;
        } catch (error) {
          // Если обработка не удалась, используем оригинал
          console.warn('Failed to process uploaded image, using original:', error);
          const img = new Image();
          img.onload = () => setPreviewImage(img);
          img.src = dataUrl;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Сброс текстуры
  const handleClearTexture = () => {
    if (selectedObject) {
      onTextureChange(selectedObject.id, selectedObject.type, '');
      setCustomPath('');
      setPreviewImage(null);
    }
  };

  useEffect(() => {
    try {
      if (selectedObject?.currentTexture) {
        setCustomPath(selectedObject.currentTexture);
        // Загружаем сохраненные размеры если есть
        const savedWidth = (selectedObject.metadata as any)?.textureWidth;
        const savedHeight = (selectedObject.metadata as any)?.textureHeight;
        if (savedWidth) setTextureWidth(savedWidth);
        if (savedHeight) setTextureHeight(savedHeight);
        
        const cachedImg = textureLoader.getTexture(selectedObject.currentTexture);
        if (cachedImg) {
          // Обрабатываем кэшированное изображение
          removeBlackBackground(selectedObject.currentTexture)
            .then(processedDataUrl => {
              const processedImg = new Image();
              processedImg.src = processedDataUrl;
              processedImg.onload = () => setPreviewImage(processedImg);
              processedImg.onerror = () => setPreviewImage(cachedImg); // Fallback
            })
            .catch(() => setPreviewImage(cachedImg)); // Fallback
        } else {
          textureLoader.loadTexture(selectedObject.currentTexture)
            .then(async img => {
              // Обрабатываем загруженное изображение
              try {
                const processedDataUrl = await removeBlackBackground(selectedObject.currentTexture);
                const processedImg = new Image();
                processedImg.src = processedDataUrl;
                await new Promise((resolve, reject) => {
                  processedImg.onload = resolve;
                  processedImg.onerror = reject;
                });
                setPreviewImage(processedImg);
              } catch (error) {
                console.warn('Failed to process current texture, using original:', error);
                setPreviewImage(img);
              }
            })
            .catch((error) => {
              console.error('Failed to load texture:', error);
              setPreviewImage(null);
            });
        }
      } else {
        setCustomPath('');
        setPreviewImage(null);
        setTextureWidth(32);
        setTextureHeight(32);
      }
    } catch (error) {
      console.error('Error in texture loading useEffect:', error);
      setCustomPath('');
      setPreviewImage(null);
      setTextureWidth(32);
      setTextureHeight(32);
    }
  }, [selectedObject]);

  // Обработка прокрутки колесиком мыши для списка текстур
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (texturesListRef.current) {
        const rect = texturesListRef.current.getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // Проверяем, находится ли курсор над списком текстур
        if (
          mouseX >= rect.left &&
          mouseX <= rect.right &&
          mouseY >= rect.top &&
          mouseY <= rect.bottom
        ) {
          // Прокручиваем список текстур
          texturesListRef.current.scrollBy({
            top: e.deltaY,
            behavior: 'auto'
          });
        }
      }
    };

    if (isOpen) {
      window.addEventListener('wheel', handleWheel, { passive: true });
      return () => window.removeEventListener('wheel', handleWheel);
    }
  }, [isOpen]);

  // Закрытие меню действий при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };

    if (showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showActionsMenu]);

  // Изменяем z-index меню редактора при открытии
  useEffect(() => {
    if (isOpen) {
      try {
        const editorPanel = document.querySelector('[data-editor-panel]') as HTMLElement;
        if (editorPanel) {
          editorPanel.style.zIndex = '100';
        }
      } catch (error) {
        console.warn('Failed to update editor panel z-index:', error);
      }
      return () => {
        try {
          const editorPanel = document.querySelector('[data-editor-panel]') as HTMLElement;
          if (editorPanel) {
            editorPanel.style.zIndex = '1000';
          }
        } catch (error) {
          console.warn('Failed to restore editor panel z-index:', error);
        }
      };
    }
  }, [isOpen]);

  if (!isOpen || !selectedObject) return null;

  return (
    <div 
      className="absolute inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-md"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="bg-gray-900 border-2 border-purple-600 w-[95vw] h-[90vh] max-w-[1600px] max-h-[1000px] flex flex-col shadow-[0_0_50px_rgba(147,51,234,0.3)] relative">
        {/* Заголовок */}
        <div className="bg-purple-900 bg-opacity-50 p-4 border-b border-purple-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ImageIcon size={28} className="text-purple-400" />
            <h2 className="text-2xl font-bold text-purple-300">
              Редактор текстур
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={32} />
          </button>
        </div>

        {/* Информация о выбранном объекте */}
        <div className="p-4 bg-gray-800 border-b border-gray-700">
          <div className="text-sm text-gray-300">
            <span className="font-bold text-purple-400">Объект:</span> {selectedObject.type} (ID: {selectedObject.id})
            {selectedObject.currentTexture && (
              <span className="ml-4 text-gray-400">
                Текущая текстура: {selectedObject.currentTexture.split('/').pop()}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Левая панель - выбор текстуры */}
          <div className="w-1/2 border-r border-gray-700 flex flex-col">
            {/* Категории */}
            <div className="p-4 border-b border-gray-700 flex gap-2">
              <button
                onClick={() => setSelectedCategory('newTextures')}
                className={`px-4 py-2 rounded ${
                  selectedCategory === 'newTextures'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Новые текстуры
              </button>
              <button
                onClick={() => setSelectedCategory('custom')}
                className={`px-4 py-2 rounded ${
                  selectedCategory === 'custom'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Загрузить
              </button>
            </div>

            {/* Поиск */}
            {selectedCategory === 'newTextures' && (
              <div className="p-4 border-b border-gray-700">
                <div className="relative">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск текстур..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Список текстур или загрузка файла */}
            <div ref={texturesListRef} className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#6b21a8 #1f2937' }}>
              {selectedCategory === 'newTextures' ? (
                <div className="grid grid-cols-4 gap-3">
                  {filteredTextures.map((texture) => (
                    <button
                      key={texture.value}
                      onClick={() => handleTextureSelect(texture.path)}
                      className={`p-2 border-2 rounded transition-all ${
                        customPath === texture.path
                          ? 'border-purple-500 bg-purple-900 bg-opacity-30'
                          : 'border-gray-600 hover:border-purple-400 bg-gray-800'
                      }`}
                      title={texture.label}
                    >
                      <div className="aspect-square bg-transparent rounded mb-2 flex items-center justify-center overflow-hidden">
                        <TextureThumbnail src={texture.path} alt={texture.label} />
                      </div>
                      <div className="text-xs text-gray-300 truncate">
                        {texture.label}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <Upload size={64} className="text-gray-500" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                  >
                    Загрузить изображение
                  </button>
                  <p className="text-gray-400 text-sm text-center">
                    Поддерживаются форматы: PNG, JPG, JPEG, WEBP
                  </p>
                  {customPath && (
                    <div className="mt-4">
                      <input
                        type="text"
                        value={customPath}
                        onChange={(e) => setCustomPath(e.target.value)}
                        placeholder="Или введите путь к файлу..."
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Правая панель - превью и действия */}
          <div className="w-1/2 flex flex-col">
            {/* Превью */}
            <div className="flex-1 p-4 flex flex-col items-center justify-center bg-gray-800" style={{
              backgroundImage: 'linear-gradient(45deg, #1f2937 25%, transparent 25%), linear-gradient(-45deg, #1f2937 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1f2937 75%), linear-gradient(-45deg, transparent 75%, #1f2937 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
            }}>
              {previewImage ? (
                <div className="relative flex flex-col items-center">
                  <img
                    src={previewImage.src}
                    alt="Preview"
                    className="max-w-full max-h-[60%] border-2 border-purple-600 rounded"
                    style={{ 
                      imageRendering: 'pixelated',
                      width: `${textureWidth}px`,
                      height: `${textureHeight}px`,
                      objectFit: 'contain'
                    }}
                  />
                  <div className="mt-2 text-sm text-gray-400 text-center">
                    Оригинал: {previewImage.width} × {previewImage.height}px
                  </div>
                  
                  {/* Управление размером */}
                  <div className="mt-4 w-full max-w-md bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <div className="text-sm text-purple-400 font-bold mb-3 text-center">Размер текстуры</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Ширина (px)</label>
                        <input
                          type="number"
                          min="1"
                          max="512"
                          value={textureWidth}
                          onChange={(e) => {
                            try {
                              if (!isOpen || !selectedObject) return;
                              const newWidth = Math.max(1, Math.min(512, parseInt(e.target.value) || 32));
                              setTextureWidth(newWidth);
                              // Автоматически применяем изменения
                              if (customPath) {
                                onTextureChange(selectedObject.id, selectedObject.type, customPath, newWidth, textureHeight);
                              }
                            } catch (error) {
                              console.error('Error updating texture width:', error);
                            }
                          }}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Высота (px)</label>
                        <input
                          type="number"
                          min="1"
                          max="512"
                          value={textureHeight}
                          onChange={(e) => {
                            try {
                              if (!isOpen || !selectedObject) return;
                              const newHeight = Math.max(1, Math.min(512, parseInt(e.target.value) || 32));
                              setTextureHeight(newHeight);
                              // Автоматически применяем изменения
                              if (customPath) {
                                onTextureChange(selectedObject.id, selectedObject.type, customPath, textureWidth, newHeight);
                              }
                            } catch (error) {
                              console.error('Error updating texture height:', error);
                            }
                          }}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500 text-center">
                      Применяется: {textureWidth} × {textureHeight}px
                    </div>
                    <button
                      onClick={() => {
                        try {
                          if (previewImage && selectedObject && customPath) {
                            const originalWidth = previewImage.width;
                            const originalHeight = previewImage.height;
                            setTextureWidth(originalWidth);
                            setTextureHeight(originalHeight);
                            // Автоматически применяем изменения
                            onTextureChange(selectedObject.id, selectedObject.type, customPath, originalWidth, originalHeight);
                          }
                        } catch (error) {
                          console.error('Error resetting texture size:', error);
                        }
                      }}
                      className="mt-2 w-full px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                    >
                      Сбросить к оригиналу
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center">
                  <ImageIcon size={64} className="mx-auto mb-4 opacity-50" />
                  <p>Выберите текстуру для предпросмотра</p>
                </div>
              )}
            </div>

            {/* Действия - выпадающее меню */}
            <div className="p-4 border-t border-gray-700 relative">
              <div ref={actionsMenuRef} className="relative inline-block w-full">
                <button
                  onMouseEnter={() => setShowActionsMenu(true)}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <span>Действия</span>
                  <svg className={`w-4 h-4 transition-transform ${showActionsMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showActionsMenu && (
                  <div 
                    className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg overflow-hidden z-10"
                    onMouseLeave={() => setShowActionsMenu(false)}
                  >
                    <button
                      onClick={() => {
                        handleApplyTexture();
                        setShowActionsMenu(false);
                      }}
                      disabled={!customPath}
                      className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-left font-bold transition-colors flex items-center gap-3"
                    >
                      <span className="w-2 h-2 bg-white rounded-full"></span>
                      Применить текстуру (автоматически применяется)
                    </button>
                    <button
                      onClick={() => {
                        handleClearTexture();
                        setShowActionsMenu(false);
                      }}
                      className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-left font-bold transition-colors flex items-center gap-3 border-t border-gray-600"
                    >
                      <span className="w-2 h-2 bg-white rounded-full"></span>
                      Сбросить текстуру
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        setShowActionsMenu(false);
                      }}
                      className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white text-left font-bold transition-colors flex items-center gap-3 border-t border-gray-600"
                    >
                      <span className="w-2 h-2 bg-white rounded-full"></span>
                      Закрыть редактор
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextureEditor;

/*
 * ИСПОЛЬЗОВАНИЕ:
 * 
 * 1. В игре нажмите Ctrl+Click (или Cmd+Click на Mac) на любом объекте:
 *    - Тайл с кастомной текстурой
 *    - NPC
 *    - Враг
 *    - Здание
 *    - Животное
 * 
 * 2. Откроется редактор текстур где вы можете:
 *    - Выбрать текстуру из библиотеки (468+ текстур)
 *    - Загрузить свою текстуру (PNG, JPG, JPEG, WEBP)
 *    - Ввести путь к файлу
 *    - Предпросмотреть текстуру
 *    - Применить или сбросить
 * 
 * 3. Текстуры автоматически загружаются и кэшируются
 * 
 * 4. Изменения сохраняются автоматически
 */


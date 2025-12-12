// Утилита для динамической загрузки текстур внутри игры

export interface TextureInfo {
  path: string;
  type?: string;
  width?: number;
  height?: number;
}

class TextureLoader {
  private cache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();
  private onLoadCallbacks: Map<string, Array<(img: HTMLImageElement) => void>> = new Map();

  /**
   * Загружает текстуру по пути
   * @param path Путь к текстуре
   * @returns Promise с загруженным изображением
   */
  async loadTexture(path: string): Promise<HTMLImageElement> {
    // Если уже в кэше, возвращаем сразу
    const cached = this.cache.get(path);
    if (cached && cached.complete) {
      return cached;
    }

    // Если уже загружается, возвращаем существующий промис
    const existingPromise = this.loadingPromises.get(path);
    if (existingPromise) {
      return existingPromise;
    }

    // Создаем новый промис для загрузки
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.cache.set(path, img);
        this.loadingPromises.delete(path);
        
        // Вызываем все колбэки для этого пути
        const callbacks = this.onLoadCallbacks.get(path);
        if (callbacks) {
          callbacks.forEach(cb => cb(img));
          this.onLoadCallbacks.delete(path);
        }
        
        resolve(img);
      };
      
      img.onerror = (error) => {
        this.loadingPromises.delete(path);
        console.error(`Failed to load texture: ${path}`, error);
        reject(new Error(`Failed to load texture: ${path}`));
      };
      
      img.src = path;
    });

    this.loadingPromises.set(path, promise);
    return promise;
  }

  /**
   * Предзагружает несколько текстур
   * @param paths Массив путей к текстурам
   * @returns Promise, который разрешится когда все текстуры загрузятся
   */
  async preloadTextures(paths: string[]): Promise<HTMLImageElement[]> {
    const promises = paths.map(path => this.loadTexture(path));
    return Promise.all(promises);
  }

  /**
   * Получает текстуру из кэша (без загрузки)
   * @param path Путь к текстуре
   * @returns Изображение или null если не загружено
   */
  getTexture(path: string): HTMLImageElement | null {
    const img = this.cache.get(path);
    if (img && img.complete) {
      return img;
    }
    return null;
  }

  /**
   * Проверяет, загружена ли текстура
   * @param path Путь к текстуре
   * @returns true если загружена
   */
  isTextureLoaded(path: string): boolean {
    const img = this.cache.get(path);
    return img !== undefined && img.complete;
  }

  /**
   * Подписывается на загрузку текстуры
   * @param path Путь к текстуре
   * @param callback Функция, которая будет вызвана при загрузке
   */
  onTextureLoaded(path: string, callback: (img: HTMLImageElement) => void): void {
    const cached = this.cache.get(path);
    if (cached && cached.complete) {
      callback(cached);
      return;
    }

    let callbacks = this.onLoadCallbacks.get(path);
    if (!callbacks) {
      callbacks = [];
      this.onLoadCallbacks.set(path, callbacks);
    }
    callbacks.push(callback);
  }

  /**
   * Очищает кэш текстур
   * @param path Опциональный путь - если указан, удаляет только эту текстуру
   */
  clearCache(path?: string): void {
    if (path) {
      this.cache.delete(path);
      this.loadingPromises.delete(path);
      this.onLoadCallbacks.delete(path);
    } else {
      this.cache.clear();
      this.loadingPromises.clear();
      this.onLoadCallbacks.clear();
    }
  }

  /**
   * Получает все загруженные текстуры
   * @returns Map с путями и изображениями
   */
  getAllTextures(): Map<string, HTMLImageElement> {
    return new Map(this.cache);
  }

  /**
   * Получает размер кэша
   * @returns Количество загруженных текстур
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// Экспортируем единственный экземпляр
export const textureLoader = new TextureLoader();


// Image loader utility for game sprites

export interface SpriteMap {
  // Characters
  skeleton: HTMLImageElement | null;
  goblin: HTMLImageElement | null;
  golem_idle: HTMLImageElement | null;
  golem_walk: HTMLImageElement | null;
  golem_attack: HTMLImageElement | null;
  golem_hurt: HTMLImageElement | null;
  golem_death: HTMLImageElement | null;
  goblin_boss: HTMLImageElement | null;
  warrior_idle: HTMLImageElement | null;
  warrior_walk: HTMLImageElement | null;
  warrior_attack: HTMLImageElement | null;
  warrior_hurt: HTMLImageElement | null;
  homeless_idle: HTMLImageElement | null;
  homeless_walk: HTMLImageElement | null;
  homeless_attack: HTMLImageElement | null;
  homeless_hurt: HTMLImageElement | null;
  elder_idle: HTMLImageElement | null;
  elder_walk: HTMLImageElement | null;
  elder_attack: HTMLImageElement | null;
  elder_hurt: HTMLImageElement | null;
  citizen_idle: HTMLImageElement | null;
  citizen_walk: HTMLImageElement | null;
  citizen_attack: HTMLImageElement | null;
  citizen_hurt: HTMLImageElement | null;
  trainer_idle: HTMLImageElement | null;
  trainer_walk: HTMLImageElement | null;
  trainer_attack: HTMLImageElement | null;
  trainer_hurt: HTMLImageElement | null;
  mage: HTMLImageElement | null;
  merchant: HTMLImageElement | null;
  merchant_idle: HTMLImageElement | null;
  merchant_walk: HTMLImageElement | null;
  merchant_attack: HTMLImageElement | null;
  merchant_hurt: HTMLImageElement | null;
  
  // Tiles / Terrain
  tile_grass: HTMLImageElement | null;
  tile_grass2: HTMLImageElement | null;
  tile_grass3: HTMLImageElement | null;
  tile_dirt: HTMLImageElement | null;
  tile_path: HTMLImageElement | null;
  tileset: HTMLImageElement | null;
  exterior_tileset: HTMLImageElement | null; // New exterior tileset from Tiles/5
  
  // Houses / Buildings
  house1: HTMLImageElement | null;
  house2: HTMLImageElement | null;
  house3: HTMLImageElement | null;
  house4: HTMLImageElement | null;
  
  // Decorations
  decor1: HTMLImageElement | null;
  decor2: HTMLImageElement | null;
  decor3: HTMLImageElement | null;
  decor4: HTMLImageElement | null;
  decor5: HTMLImageElement | null;
  decor6: HTMLImageElement | null;
  decor7: HTMLImageElement | null;
  decor8: HTMLImageElement | null;
  decor9: HTMLImageElement | null;
  decor10: HTMLImageElement | null;
  decor11: HTMLImageElement | null;
  decor12: HTMLImageElement | null;
  decor13: HTMLImageElement | null;
  decor14: HTMLImageElement | null;
  decor15: HTMLImageElement | null;
  decor16: HTMLImageElement | null;
  decor17: HTMLImageElement | null;
  
  // Stones
  stone1: HTMLImageElement | null;
  stone2: HTMLImageElement | null;
  stone3: HTMLImageElement | null;
  stone4: HTMLImageElement | null;
  stone5: HTMLImageElement | null;
  stone6: HTMLImageElement | null;
  
  // Grass decorations
  grass1: HTMLImageElement | null;
  grass2: HTMLImageElement | null;
  grass3: HTMLImageElement | null;
  grass4: HTMLImageElement | null;
  grass5: HTMLImageElement | null;
  grass6: HTMLImageElement | null;
  
  // Boxes / Crates
  box1: HTMLImageElement | null;
  box2: HTMLImageElement | null;
  box3: HTMLImageElement | null;
  box4: HTMLImageElement | null;
  box5: HTMLImageElement | null;

  // Animals
  animal_dog1: HTMLImageElement | null;
  animal_cat1: HTMLImageElement | null;
  animal_rat1: HTMLImageElement | null;
  animal_bird1: HTMLImageElement | null;

  // Portal
  portal_texture: HTMLImageElement | null;
  fence_texture: HTMLImageElement | null;
}

class ImageLoader {
  private sprites: SpriteMap = {
    // Characters
  skeleton: null,
  goblin: null,
  golem_idle: null,
  golem_walk: null,
  golem_attack: null,
  golem_hurt: null,
  golem_death: null,
  goblin_boss: null,
  warrior_idle: null,
  warrior_walk: null,
  warrior_attack: null,
  warrior_hurt: null,
  homeless_idle: null,
  homeless_walk: null,
  homeless_attack: null,
  homeless_hurt: null,
  elder_idle: null,
  elder_walk: null,
  elder_attack: null,
  elder_hurt: null,
    citizen_idle: null,
    citizen_walk: null,
    citizen_attack: null,
    citizen_hurt: null,
    trainer_idle: null,
    trainer_walk: null,
    trainer_attack: null,
    trainer_hurt: null,
    mage: null,
    merchant: null,
    merchant_idle: null,
    merchant_walk: null,
    merchant_attack: null,
    merchant_hurt: null,
    
    // Tiles
    tile_grass: null,
    tile_grass2: null,
    tile_grass3: null,
    tile_dirt: null,
    tile_path: null,
    tileset: null,
    exterior_tileset: null,
    
    // Houses
    house1: null,
    house2: null,
    house3: null,
    house4: null,
    
    // Decorations
    decor1: null,
    decor2: null,
    decor3: null,
    decor4: null,
    decor5: null,
    decor6: null,
    decor7: null,
    decor8: null,
    decor9: null,
    decor10: null,
    decor11: null,
    decor12: null,
    decor13: null,
    decor14: null,
    decor15: null,
    decor16: null,
    decor17: null,
    
    // Stones
    stone1: null,
    stone2: null,
    stone3: null,
    stone4: null,
    stone5: null,
    stone6: null,
    
    // Grass
    grass1: null,
    grass2: null,
    grass3: null,
    grass4: null,
    grass5: null,
    grass6: null,
    
    // Boxes
    box1: null,
    box2: null,
    box3: null,
    box4: null,
    box5: null,

    // Animals
    animal_dog1: null,
    animal_cat1: null,
    animal_rat1: null,
    animal_bird1: null,

    // Portal
    portal_texture: null,
    fence_texture: null
  };

  private loaded = false;
  private loading = false;
  private loadPromise: Promise<void> | null = null;

  async loadAll(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (this.loading && this.loadPromise) return this.loadPromise;

    this.loading = true;
    this.loadPromise = this._loadImages();
    await this.loadPromise;
    this.loaded = true;
    this.loading = false;
  }

  private _loadImages(): Promise<void> {
    const imagePaths: Record<keyof SpriteMap, string> = {
      // Characters
      skeleton: '', // Skeleton sprite sheet not available, will use placeholder
      goblin: '/Images/Гоблин_(Goblin).png',
      // Use Orc2 (With_shadow) sheets for goblin enemy (same format as hero)
      golem_idle: new URL('../Images/Goblin/PNG/Orc2/With_shadow/orc2_idle_with_shadow.png', import.meta.url).href,
      golem_walk: new URL('../Images/Goblin/PNG/Orc2/With_shadow/orc2_walk_with_shadow.png', import.meta.url).href,
      golem_attack: new URL('../Images/Goblin/PNG/Orc2/With_shadow/orc2_attack_with_shadow.png', import.meta.url).href,
      golem_hurt: new URL('../Images/Goblin/PNG/Orc2/With_shadow/orc2_hurt_with_shadow.png', import.meta.url).href,
      golem_death: new URL('../Images/Goblin/PNG/Orc2/With_shadow/orc2_death_with_shadow.png', import.meta.url).href,
      goblin_boss: '/Images/Гоблин_Босс_(Goblin_Boss).png',
      warrior_idle: '/Images/Hero/PNG/Swordsman_lvl1/With_shadow/Swordsman_lvl1_Idle_with_shadow.png',
      warrior_walk: '/Images/Hero/PNG/Swordsman_lvl1/With_shadow/Swordsman_lvl1_Walk_with_shadow.png',
      warrior_attack: '/Images/Hero/PNG/Swordsman_lvl1/With_shadow/Swordsman_lvl1_attack_with_shadow.png',
      warrior_hurt: '/Images/Hero/PNG/Swordsman_lvl1/With_shadow/Swordsman_lvl1_Hurt_with_shadow.png',
      homeless_idle: new URL('../Images/HEROBOMZH/Homeless_1/Idle.png', import.meta.url).href,
      homeless_walk: new URL('../Images/HEROBOMZH/Homeless_1/Walk.png', import.meta.url).href,
      homeless_attack: new URL('../Images/HEROBOMZH/Homeless_1/Attack_1.png', import.meta.url).href,
      homeless_hurt: new URL('../Images/HEROBOMZH/Homeless_1/Hurt.png', import.meta.url).href,
      elder_idle: new URL('../Images/starets/Satyr_1/Idle.png', import.meta.url).href,
      elder_walk: new URL('../Images/starets/Satyr_1/Walk.png', import.meta.url).href,
      elder_attack: new URL('../Images/starets/Satyr_1/Attack.png', import.meta.url).href,
      elder_hurt: new URL('../Images/starets/Satyr_1/Hurt.png', import.meta.url).href,
      citizen_idle: new URL('../Images/Gorozhanin/Warrior_1/Idle.png', import.meta.url).href,
      citizen_walk: new URL('../Images/Gorozhanin/Warrior_1/Walk.png', import.meta.url).href,
      citizen_attack: new URL('../Images/Gorozhanin/Warrior_1/Attack_1.png', import.meta.url).href,
      citizen_hurt: new URL('../Images/Gorozhanin/Warrior_1/Hurt.png', import.meta.url).href,
      trainer_idle: new URL('../Images/master/Knight_1/Idle.png', import.meta.url).href,
      trainer_walk: new URL('../Images/master/Knight_1/Walk.png', import.meta.url).href,
      trainer_attack: new URL('../Images/master/Knight_1/Attack 1.png', import.meta.url).href,
      trainer_hurt: new URL('../Images/master/Knight_1/Hurt.png', import.meta.url).href,
      mage: '/Images/Мудрец_Маг_(Sage_Mage).png',
      merchant: '/Images/Торговец_(Merchant).png',
      merchant_idle: new URL('../Images/Torgovets/Trader_1/Idle.png', import.meta.url).href,
      merchant_walk: new URL('../Images/Torgovets/Trader_1/Approval.png', import.meta.url).href,
      merchant_attack: new URL('../Images/Torgovets/Trader_1/Dialogue.png', import.meta.url).href,
      merchant_hurt: new URL('../Images/Torgovets/Trader_1/Idle_2.png', import.meta.url).href,
      
      // Tiles
      tile_grass: '/Images/tiles/FieldsTile_01.png',
      tile_grass2: '/Images/tiles/FieldsTile_02.png',
      tile_grass3: '/Images/tiles/FieldsTile_03.png',
      tile_dirt: '/Images/tiles/FieldsTile_04.png',
      tile_path: '/Images/tiles/FieldsTile_05.png',
      tileset: '/Images/tiles/FieldsTileset.png',
      exterior_tileset: '/Images/Tiles/5/PNG/exterior.png',
      
      // Houses
      house1: '/Images/houses/1.png',
      house2: '/Images/houses/2.png',
      house3: '/Images/houses/3.png',
      house4: '/Images/houses/4.png',
      
      // Decorations
      decor1: '/Images/decor/1.png',
      decor2: '/Images/decor/2.png',
      decor3: '/Images/decor/3.png',
      decor4: '/Images/decor/4.png',
      decor5: '/Images/decor/5.png',
      decor6: '/Images/decor/6.png',
      decor7: '/Images/decor/7.png',
      decor8: '/Images/decor/8.png',
      decor9: '/Images/decor/9.png',
      decor10: '/Images/decor/10.png',
      decor11: '/Images/decor/11.png',
      decor12: '/Images/decor/12.png',
      decor13: '/Images/decor/13.png',
      decor14: '/Images/decor/14.png',
      decor15: '/Images/decor/15.png',
      decor16: '/Images/decor/16.png',
      decor17: '/Images/decor/17.png',
      
      // Stones
      stone1: '/Images/stones/1.png',
      stone2: '/Images/stones/2.png',
      stone3: '/Images/stones/3.png',
      stone4: '/Images/stones/4.png',
      stone5: '/Images/stones/5.png',
      stone6: '/Images/stones/6.png',
      
      // Grass
      grass1: '/Images/grass/1.png',
      grass2: '/Images/grass/2.png',
      grass3: '/Images/grass/3.png',
      grass4: '/Images/grass/4.png',
      grass5: '/Images/grass/5.png',
      grass6: '/Images/grass/6.png',
      
      // Boxes
      box1: '/Images/boxes/1.png',
      box2: '/Images/boxes/2.png',
      box3: '/Images/boxes/3.png',
      box4: '/Images/boxes/4.png',
      box5: '/Images/boxes/5.png',

      // Animals (idle frames)
      animal_dog1: '/Images/Animals/1 Dog/Idle.png',
      animal_cat1: '/Images/Animals/3 Cat/Idle.png',
      animal_rat1: '/Images/Animals/5 Rat/Idle.png',
      animal_bird1: '/Images/Animals/7 Bird/Idle.png',

      // Portal - use generated sprite if file doesn't exist, otherwise use file
      portal_texture: '', // Will be generated programmatically if file fails to load
      // Fence (generated)
      fence_texture: ''
    };

    const placeholder = (color: string) => {
      const c = document.createElement('canvas');
      c.width = 48; c.height = 48;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(8, 8, c.width - 16, c.height - 16);
      }
      return c;
    };

    const fallbackColor: Record<string, string> = {
      skeleton: '#e5e5e5',
      goblin: '#22c55e',
      golem_idle: '#6b7280',
      golem_walk: '#6b7280',
      golem_attack: '#6b7280',
      golem_hurt: '#6b7280',
      golem_death: '#6b7280',
      goblin_boss: '#f97316'
    };

    const makePortalSprite = () => {
      const c = document.createElement('canvas');
      c.width = 64; c.height = 64;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.translate(32, 32);
      // Outer ring
      const outer = ctx.createRadialGradient(0, 0, 8, 0, 0, 30);
      outer.addColorStop(0, 'rgba(124,58,237,0.8)');
      outer.addColorStop(0.6, 'rgba(59,130,246,0.4)');
      outer.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = outer;
      ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI*2); ctx.fill();
      // Inner core
      const inner = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
      inner.addColorStop(0, '#ffffff');
      inner.addColorStop(0.4, '#c084fc');
      inner.addColorStop(1, '#312e81');
      ctx.fillStyle = inner;
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();
      // Sigils
      ctx.strokeStyle = '#e0e7ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const r = 12;
        ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a + 0.3) * (r + 6), Math.sin(a + 0.3) * (r + 6));
      }
      ctx.stroke();
      const img = new Image();
      img.src = c.toDataURL();
      return img;
    };

    const makeFenceSprite = () => {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 32;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 10, 32, 14);
      ctx.fillStyle = '#9ca3af';
      for (let x = 2; x < 32; x += 6) {
        ctx.fillRect(x, 6, 3, 22);
      }
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 12); ctx.lineTo(32, 12);
      ctx.moveTo(0, 20); ctx.lineTo(32, 20);
      ctx.stroke();
      const img = new Image();
      img.src = c.toDataURL();
      return img;
    };

    const loadPromises = Object.entries(imagePaths).map(([key, path]) => {
      return new Promise<void>((resolve) => {
        // Skip loading if path is empty
        if (!path || path === '') {
          // For portal/fence we generate sprites
          if (key === 'portal_texture') {
            const generated = makePortalSprite();
            if (generated) {
              this.sprites[key as keyof SpriteMap] = generated as any;
            } else {
              this.sprites[key as keyof SpriteMap] = placeholder('#8b5cf6') as any;
            }
            resolve();
            return;
          }
          if (key === 'fence_texture') {
            const generated = makeFenceSprite();
            if (generated) this.sprites[key as keyof SpriteMap] = generated as any;
            else this.sprites[key as keyof SpriteMap] = placeholder('#9ca3af') as any;
            resolve();
            return;
          }
          const color = fallbackColor[key] || '#9ca3af';
          this.sprites[key as keyof SpriteMap] = placeholder(color) as any;
          resolve();
          return;
        }
        // For portal_texture, always try to load file first, but generate if it fails
        if (key === 'portal_texture') {
          const img = new Image();
          img.onload = () => {
            this.sprites[key as keyof SpriteMap] = img;
            resolve();
          };
          img.onerror = () => {
            console.warn(`Failed to load portal.png, generating sprite programmatically`);
            // Always generate sprite if file fails to load
            const generated = makePortalSprite();
            if (generated) {
              this.sprites[key as keyof SpriteMap] = generated as any;
            } else {
              this.sprites[key as keyof SpriteMap] = placeholder('#8b5cf6') as any;
            }
            resolve();
          };
          img.src = path;
        } else {
          const img = new Image();
          img.onload = () => {
            this.sprites[key as keyof SpriteMap] = img;
            resolve();
          };
          img.onerror = () => {
            console.warn(`Failed to load image: ${path}`);
            const color = fallbackColor[key] || '#9ca3af';
            this.sprites[key as keyof SpriteMap] = placeholder(color) as any;
            resolve();
          };
          img.src = path;
        }
      });
    });

    return Promise.all(loadPromises).then(() => {});
  }

  getSprite(name: keyof SpriteMap): HTMLImageElement | null {
    return this.sprites[name];
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

export const imageLoader = new ImageLoader();


import { Item, ItemRarity } from '../types';
import { imageLoader } from './imageLoader';
import { drawAnimatedSingleSprite, drawAnimatedSprite, AnimationState } from './spriteAnimation';

export const drawHumanoid = (
    ctx: CanvasRenderingContext2D, 
    x: number, y: number, 
    color: string, 
    type: 'warrior'|'rogue'|'mage'|'homeless'|'elder'|'citizen'|'skeleton'|'golem'|'boss'|'merchant'|'trainer', 
    facingLeft: boolean, 
    isMoving: boolean,
    attackProgress: number,
    time: number,
    weapon?: Item | null,
    equippedCosmeticId?: string,
    skipShadow?: boolean,
    traderVariant?: 1 | 2 | 3,
    trainerVariant?: 1 | 2 | 3,
    citizenVariant?: 1 | 2 | 3,
    elderVariant?: 1 | 2 | 3,
    homelessVariant?: 1 | 2 | 3
) => {
    // Ground shadow anchored near the feet; negative offset lifts shadow upward
    const drawGroundShadow = (offsetY = -3) => {
        if (skipShadow) return;
        const shadowY = y + offsetY;
        const shadowGrad = ctx.createRadialGradient(x, shadowY, 0, x, shadowY, 15);
        shadowGrad.addColorStop(0, 'rgba(0,0,0,0.8)');
        shadowGrad.addColorStop(0.7, 'rgba(0,0,0,0.4)');
        shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.ellipse(x, shadowY, 13, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    };

    // Determine animation state
    const animState: AnimationState = attackProgress < 1 ? 'attack' : (isMoving ? 'walk' : 'idle');
    const animTime = time * 0.15;
    
    // Try to use sprite images for enemies
    if (type === 'skeleton') {
        const sprite = imageLoader.getSprite('skeleton');
        if (sprite && sprite.complete) {
            const spriteCenterY = y - sprite.height * 0.5;
            
            // Skeleton aura effect (always active)
            ctx.fillStyle = '#e5e5e5';
            ctx.globalAlpha = 0.15;
            ctx.shadowColor = '#e5e5e5';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(x, spriteCenterY, 18, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            
            // Draw animated sprite with skeleton-specific animation (shadow included in function)
            drawAnimatedSingleSprite(ctx, sprite, x, y, animState, animTime, 1.0, facingLeft, 'skeleton');
            
            // Enhanced attack flash effect
            if (attackProgress < 1) {
                const attackIntensity = 1 - attackProgress;
                ctx.globalAlpha = 0.5 * attackIntensity;
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.arc(x, spriteCenterY, 22 * attackIntensity, 0, Math.PI*2);
                ctx.fill();
                
                // Attack trail
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 15;
                ctx.globalAlpha = 0.6 * attackIntensity;
                const angle = facingLeft ? Math.PI : 0;
                ctx.beginPath();
                ctx.moveTo(x, spriteCenterY);
                ctx.lineTo(x + Math.cos(angle) * 25 * attackIntensity, spriteCenterY);
                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
            }
            
            return;
        }
    }
    
    if (type === 'golem') {
        const spriteByState: Record<AnimationState, HTMLImageElement | null> = {
            idle: imageLoader.getSprite('golem_idle'),
            walk: imageLoader.getSprite('golem_walk'),
            attack: imageLoader.getSprite('golem_attack'),
            hurt: imageLoader.getSprite('golem_hurt')
        };
        const sprite = spriteByState[animState] ?? spriteByState.idle;
        if (sprite && sprite.complete) {
            // Orc2 sheets: 4 directional rows, square frames (same format as hero)
            const SHEET_ROWS = 4;
            const ROW_SIDE_LEFT = 1; // use left-facing row and mirror when needed
            
            const frameH = sprite.height / SHEET_ROWS;
            const frameW = frameH; // frames are square
            const maxFrames = Math.max(1, Math.floor(sprite.width / frameW)); // varies per sheet
            const row = ROW_SIDE_LEFT; // single side row; mirror for facingRight
            const scale = 1.05; // slightly larger for golem
            let frameIndex = 0;
            if (animState === 'attack' && attackProgress < 1) {
                frameIndex = Math.min(maxFrames - 1, Math.floor((1 - attackProgress) * maxFrames));
            } else {
                frameIndex = Math.floor(animTime * 6) % maxFrames;
            }

            const sx = frameIndex * frameW;
            const sy = row * frameH;
            
            const spriteCenterY = y - frameH * 0.5;
            
            // Goblin aura tint
            ctx.fillStyle = '#22c55e';
            ctx.globalAlpha = 0.18;
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(x, spriteCenterY, 18, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;

            // Draw sprite frame from sheet (same as hero)
            ctx.save();
            ctx.translate(x, y);
            if (facingLeft) ctx.scale(-1, 1);
            ctx.drawImage(
                sprite,
                sx, sy, frameW, frameH,
                -(frameW * scale) / 2, -frameH * scale, // draw with feet at y
                frameW * scale, frameH * scale
            );
            ctx.restore();
            
            return;
        }
    }
    
    if (type === 'boss') {
        const sprite = imageLoader.getSprite('goblin_boss');
        if (sprite && sprite.complete) {
            // Draw animated sprite with pulsing effect for boss (shadow and glow included)
            const pulse = Math.sin(animTime * 0.1) * 0.05 + 1;
            drawAnimatedSingleSprite(ctx, sprite, x, y, animState, animTime, 1.3 * pulse, facingLeft, 'boss');
            
            // Enhanced boss attack effects with animation
            if (attackProgress < 1) {
                const attackIntensity = 1 - attackProgress;
                const spriteCenterY = y - sprite.height * 1.3 * 0.5;
                
                // Powerful attack flash with pulsing
                ctx.globalAlpha = 0.5 * attackIntensity;
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 25;
                ctx.beginPath();
                ctx.arc(x, spriteCenterY, 30 * attackIntensity, 0, Math.PI*2);
                ctx.fill();
                
                // Enhanced shockwave effect with multiple rings
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 4;
                ctx.shadowBlur = 20;
                ctx.globalAlpha = 0.7 * attackIntensity;
                for (let i = 0; i < 4; i++) {
                    const waveRadius = 20 + i * 12;
                    const waveAlpha = 1 - (i * 0.25);
                    ctx.globalAlpha = 0.7 * attackIntensity * waveAlpha;
                    ctx.beginPath();
                    ctx.arc(x, spriteCenterY, waveRadius * attackIntensity, 0, Math.PI*2);
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
            }
            
            // Enhanced boss aura effect (always active) with animation
            const auraPulse = Math.sin(animTime * 0.15) * 0.1 + 1;
            const spriteCenterY = y - sprite.height * 1.3 * 0.5;
            ctx.fillStyle = '#ef4444';
            ctx.globalAlpha = 0.15 * auraPulse;
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 25 * auraPulse;
            ctx.beginPath();
            ctx.arc(x, spriteCenterY, 25 * auraPulse, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            
            return;
        }
    }
    
    // Try to use sprite images for player characters
    if (type === 'warrior') {
        // Raise shadow closer to feet
        drawGroundShadow(-5);
        const warriorSprites = {
            idle: imageLoader.getSprite('warrior_idle'),
            walk: imageLoader.getSprite('warrior_walk'),
            attack: imageLoader.getSprite('warrior_attack'),
            hurt: imageLoader.getSprite('warrior_hurt')
        } satisfies Record<AnimationState, HTMLImageElement | null | undefined>;

        // Craftpix Swordsman sheets: 4 directional rows, square frames (64px).
        // Some sheets have different column counts per action (idle 12, walk 6, attack 8, hurt 5).
        const SHEET_ROWS = 4;
        const ROW_SIDE_LEFT = 1; // use left-facing row and mirror when needed

        // Pick sprite by current state; fallback to idle if missing
        const sprite = warriorSprites[animState] ?? warriorSprites.idle;

        if (sprite && sprite.complete) {
            const frameH = sprite.height / SHEET_ROWS;
            const frameW = frameH; // frames are square
            const maxFrames = Math.max(1, Math.floor(sprite.width / frameW)); // varies per sheet
            const row = ROW_SIDE_LEFT; // single side row; mirror for facingRight
            const scale = 1.5; // enlarge hero so it reads clearly on the map
            let frameIndex = 0;
            if (animState === 'attack' && attackProgress < 1) {
                frameIndex = Math.min(maxFrames - 1, Math.floor((1 - attackProgress) * maxFrames));
            } else {
                frameIndex = Math.floor(animTime * 6) % maxFrames;
            }

            const sx = frameIndex * frameW;
            const sy = row * frameH;
            ctx.save();
            ctx.translate(x, y);
            if (facingLeft) ctx.scale(-1, 1);
            ctx.drawImage(
                sprite,
                sx, sy, frameW, frameH,
                -(frameW * scale) / 2, -frameH * scale, // draw with feet at y
                frameW * scale, frameH * scale
            );
            ctx.restore();
            
            // Cosmetic aura effect (drawn after sprite for proper layering)
            if (equippedCosmeticId === 'w_flame_aura') {
                const auraPulse = Math.sin(animTime * 0.3) * 0.1 + 1;
                const spriteCenterY = y - frameH * 0.5;
                ctx.fillStyle = '#ef4444';
                ctx.globalAlpha = 0.2;
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 20 * auraPulse;
                ctx.beginPath();
                ctx.arc(x, spriteCenterY, 18 * auraPulse, 0, Math.PI*2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
            }
            
            // Enhanced attack effects
            if (attackProgress < 1) {
                const attackIntensity = 1 - attackProgress;
                const spriteCenterY = y - sprite.height * 0.5;
                
                // Attack flash effect
                ctx.globalAlpha = 0.3 * attackIntensity;
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(x, spriteCenterY, 20 * attackIntensity, 0, Math.PI*2);
                ctx.fill();
                
                // Weapon trail effect with motion blur
                if (weapon) {
                    ctx.strokeStyle = weapon.color;
                    ctx.lineWidth = 3 + attackIntensity * 2;
                    ctx.shadowColor = weapon.color;
                    ctx.shadowBlur = 10 + attackIntensity * 10;
                    ctx.globalAlpha = 0.6 * attackIntensity;
                    const angle = facingLeft ? Math.PI : 0;
                    
                    // Multiple trail lines for motion blur effect
                    for (let i = 0; i < 3; i++) {
                        const trailOffset = i * 2;
                        ctx.beginPath();
                        ctx.moveTo(x, spriteCenterY);
                        ctx.lineTo(
                            x + Math.cos(angle) * (30 + trailOffset) * attackIntensity,
                            spriteCenterY + Math.sin(angle) * (30 + trailOffset) * attackIntensity
                        );
                        ctx.stroke();
                    }
                    ctx.shadowBlur = 0;
                }
                
                // Impact particles
                ctx.fillStyle = '#ef4444';
                ctx.globalAlpha = attackIntensity;
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2;
                    const dist = 15 * attackIntensity;
                    ctx.beginPath();
                    ctx.arc(
                        x + Math.cos(angle) * dist,
                        spriteCenterY + Math.sin(angle) * dist,
                        2, 0, Math.PI*2
                    );
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
            
            return;
        }
    }
    
    if (type === 'elder') {
        // Raise shadow closer to feet
        drawGroundShadow(-5);
        // Use specific variant if provided, otherwise default to variant 1
        const variant = elderVariant ?? 1;
        const elderSprites: Record<AnimationState, HTMLImageElement | null | undefined> = {
            idle: imageLoader.getSprite(`elder_${variant}_idle` as any),
            walk: imageLoader.getSprite(`elder_${variant}_walk` as any),
            attack: imageLoader.getSprite(`elder_${variant}_attack` as any),
            hurt: imageLoader.getSprite(`elder_${variant}_hurt` as any)
        };

        // Pick sprite by current state; fallback to idle if missing
        const sprite = elderSprites[animState] ?? elderSprites.idle;

        if (sprite && sprite.complete) {
            // Check if sprite is a sprite sheet (4 directional rows like warrior) or horizontal frames
            const isSpriteSheet = sprite.width > sprite.height * 2;
            const scale = 0.75; // Reduced by 2x (was 1.5, now 0.75)
            let frameW = sprite.width;
            let frameH = sprite.height;
            let sourceX = 0;
            let sourceY = 0;
            
            if (isSpriteSheet && sprite.height > sprite.width / 4) {
                // 4 directional rows format (like warrior)
                const SHEET_ROWS = 4;
                const ROW_SIDE_LEFT = 1;
                frameH = sprite.height / SHEET_ROWS;
                frameW = frameH; // frames are square
                const maxFrames = Math.max(1, Math.floor(sprite.width / frameW));
                const row = ROW_SIDE_LEFT;
                let frameIndex = 0;
                if (animState === 'attack' && attackProgress < 1) {
                    frameIndex = Math.min(maxFrames - 1, Math.floor((1 - attackProgress) * maxFrames));
                } else {
                    frameIndex = Math.floor(animTime * 6) % maxFrames;
                }
                sourceX = frameIndex * frameW;
                sourceY = row * frameH;
            } else {
                // Horizontal frames format (like homeless)
                const framesPerRow = Math.max(1, Math.floor(sprite.width / sprite.height));
                frameW = sprite.width / framesPerRow;
                frameH = sprite.height;
                let frameIndex = 0;
                if (animState === 'walk') {
                    frameIndex = Math.floor(animTime * 6) % framesPerRow;
                } else if (animState === 'attack' && attackProgress < 1) {
                    frameIndex = Math.min(framesPerRow - 1, Math.floor((1 - attackProgress) * framesPerRow));
                } else {
                    // idle
                    frameIndex = Math.floor(animTime * 4) % framesPerRow;
                }
                sourceX = frameIndex * frameW;
            }
            
            // Draw sprite frame with feet at y position (same as warrior)
            ctx.save();
            ctx.translate(x, y);
            if (facingLeft) ctx.scale(-1, 1);
            ctx.drawImage(
                sprite,
                sourceX, sourceY, frameW, frameH,
                -(frameW * scale) / 2, -frameH * scale, // draw with feet at y
                frameW * scale, frameH * scale
            );
            ctx.restore();
            
            return;
        }
    }
    
    if (type === 'citizen') {
        // Raise shadow closer to feet
        drawGroundShadow(-5);
        const citizenSprites = {
            idle: imageLoader.getSprite('citizen_idle'),
            walk: imageLoader.getSprite('citizen_walk'),
            attack: imageLoader.getSprite('citizen_attack'),
            hurt: imageLoader.getSprite('citizen_hurt')
        } satisfies Record<AnimationState, HTMLImageElement | null | undefined>;

        // Pick sprite by current state; fallback to idle if missing
        const sprite = citizenSprites[animState] ?? citizenSprites.idle;

        if (sprite && sprite.complete) {
            // Check if sprite is a sprite sheet (4 directional rows like warrior) or horizontal frames
            const isSpriteSheet = sprite.width > sprite.height * 2;
            const scale = 0.75; // Same scale as elder
            let frameW = sprite.width;
            let frameH = sprite.height;
            let sourceX = 0;
            let sourceY = 0;
            
            if (isSpriteSheet && sprite.height > sprite.width / 4) {
                // 4 directional rows format (like warrior)
                const SHEET_ROWS = 4;
                const ROW_SIDE_LEFT = 1;
                frameH = sprite.height / SHEET_ROWS;
                frameW = frameH; // frames are square
                const maxFrames = Math.max(1, Math.floor(sprite.width / frameW));
                const row = ROW_SIDE_LEFT;
                let frameIndex = 0;
                if (animState === 'attack' && attackProgress < 1) {
                    frameIndex = Math.min(maxFrames - 1, Math.floor((1 - attackProgress) * maxFrames));
                } else {
                    frameIndex = Math.floor(animTime * 6) % maxFrames;
                }
                sourceX = frameIndex * frameW;
                sourceY = row * frameH;
            } else {
                // Horizontal frames format (like homeless)
                const framesPerRow = Math.max(1, Math.floor(sprite.width / sprite.height));
                frameW = sprite.width / framesPerRow;
                frameH = sprite.height;
                let frameIndex = 0;
                if (animState === 'walk') {
                    frameIndex = Math.floor(animTime * 6) % framesPerRow;
                } else if (animState === 'attack' && attackProgress < 1) {
                    frameIndex = Math.min(framesPerRow - 1, Math.floor((1 - attackProgress) * framesPerRow));
                } else {
                    // idle
                    frameIndex = Math.floor(animTime * 4) % framesPerRow;
                }
                sourceX = frameIndex * frameW;
            }
            
            // Draw sprite frame with feet at y position (same as warrior)
            ctx.save();
            ctx.translate(x, y);
            if (facingLeft) ctx.scale(-1, 1);
            ctx.drawImage(
                sprite,
                sourceX, sourceY, frameW, frameH,
                -(frameW * scale) / 2, -frameH * scale, // draw with feet at y
                frameW * scale, frameH * scale
            );
            ctx.restore();
            
            return;
        }
    }
    
    if (type === 'homeless') {
        const homelessSprites = {
            idle: imageLoader.getSprite('homeless_idle'),
            walk: imageLoader.getSprite('homeless_walk'),
            attack: imageLoader.getSprite('homeless_attack'),
            hurt: imageLoader.getSprite('homeless_hurt')
        } satisfies Record<AnimationState, HTMLImageElement | null | undefined>;

        // Raise shadow closer to feet
        drawGroundShadow(-5);
        const sprite = homelessSprites[animState] ?? homelessSprites.idle;

        if (sprite && sprite.complete) {
            // Check if sprite is a sprite sheet (width > height suggests multiple frames)
            const isSpriteSheet = sprite.width > sprite.height * 2;
            const scale = 0.75; // Reduced by 2x (was 1.5, now 0.75)
            let frameW = sprite.width;
            let frameH = sprite.height;
            let sourceX = 0;
            let sourceY = 0;
            
            if (isSpriteSheet) {
                // Sprite sheet: assume horizontal frames, calculate frame count
                const framesPerRow = Math.max(1, Math.floor(sprite.width / sprite.height));
                frameW = sprite.width / framesPerRow;
                frameH = sprite.height;
                
                // Calculate frame index based on state and time
                let frameIndex = 0;
                if (animState === 'walk') {
                    frameIndex = Math.floor(animTime * 6) % framesPerRow;
                } else if (animState === 'attack' && attackProgress < 1) {
                    frameIndex = Math.min(framesPerRow - 1, Math.floor((1 - attackProgress) * framesPerRow));
                } else {
                    // idle
                    frameIndex = Math.floor(animTime * 4) % framesPerRow;
                }
                
                sourceX = frameIndex * frameW;
            }
            
            // Draw sprite frame with feet at y position (same as warrior)
            ctx.save();
            ctx.translate(x, y);
            if (facingLeft) ctx.scale(-1, 1);
            ctx.drawImage(
                sprite,
                sourceX, sourceY, frameW, frameH,
                -(frameW * scale) / 2, -frameH * scale, // draw with feet at y
                frameW * scale, frameH * scale
            );
            ctx.restore();
            
            // Enhanced attack effects (bottle throw)
            if (attackProgress < 1) {
                const attackIntensity = 1 - attackProgress;
                const spriteCenterY = y - frameH * 0.5;
                
                // Attack flash effect
                ctx.globalAlpha = 0.3 * attackIntensity;
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(x, spriteCenterY, 20 * attackIntensity, 0, Math.PI*2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            
            return;
        }
    }
    
    if (type === 'mage') {
        const sprite = imageLoader.getSprite('mage');
        if (sprite && sprite.complete) {
            // Draw animated sprite with mage-specific animation (shadow included)
            drawAnimatedSingleSprite(ctx, sprite, x, y, animState, animTime, 1.0, facingLeft, 'mage');
            
            // Cosmetic aura effect (drawn after sprite)
            if (equippedCosmeticId === 'm_void_orb') {
                const auraPulse = Math.sin(animTime * 0.3) * 0.1 + 1;
                const spriteCenterY = y - sprite.height * 0.5;
                ctx.fillStyle = '#7e22ce';
                ctx.globalAlpha = 0.25;
                ctx.shadowColor = '#7e22ce';
                ctx.shadowBlur = 18 * auraPulse;
                ctx.beginPath();
                ctx.arc(x, spriteCenterY, 20 * auraPulse, 0, Math.PI*2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
            }
            
            // Enhanced magic effects for mage
            if (animState === 'attack' && attackProgress < 1) {
                const attackIntensity = 1 - attackProgress;
                const spriteCenterY = y - sprite.height * 0.5;
                
                // Magic flash effect
                ctx.globalAlpha = 0.3 * attackIntensity;
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(x, spriteCenterY, 20 * attackIntensity, 0, Math.PI*2);
                ctx.fill();
                
                // Enhanced magic swirl effect
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 10 + attackIntensity * 10;
                ctx.globalAlpha = 0.6 * attackIntensity;
                
                // Multiple swirling orbs
                for (let i = 0; i < 5; i++) {
                    const angle = (animTime * 2 + i * Math.PI * 2 / 5) % (Math.PI * 2);
                    const radius = 15 + Math.sin(animTime * 3 + i) * 5;
                    ctx.beginPath();
                    ctx.arc(
                        x + Math.cos(angle) * radius,
                        spriteCenterY + Math.sin(angle) * radius,
                        4 + attackIntensity * 2, 0, Math.PI * 2
                    );
                    ctx.fill();
                }
                
                // Central magic core
                ctx.fillStyle = '#fff';
                ctx.globalAlpha = attackIntensity;
                ctx.beginPath();
                ctx.arc(x, spriteCenterY, 6 * attackIntensity, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
            }
            
            // Idle magic particles for mage
            if (animState === 'idle') {
                const spriteCenterY = y - sprite.height * 0.5;
                ctx.fillStyle = '#f59e0b';
                ctx.globalAlpha = 0.3;
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 5;
                for (let i = 0; i < 2; i++) {
                    const angle = (animTime * 0.5 + i * Math.PI) % (Math.PI * 2);
                    const radius = 8 + Math.sin(animTime + i) * 3;
                    ctx.beginPath();
                    ctx.arc(
                        x + Math.cos(angle) * radius,
                        spriteCenterY + Math.sin(angle) * radius,
                        2, 0, Math.PI * 2
                    );
                    ctx.fill();
                }
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
            }
            
            return;
        }
    }
    
    if (type === 'merchant') {
        // Raise shadow closer to feet
        drawGroundShadow(-5);
        // Use specific variant if provided, otherwise default to variant 1
        const variant = traderVariant ?? 1;
        const merchantSprites: Record<AnimationState, HTMLImageElement | null | undefined> = {
            idle: imageLoader.getSprite(`merchant_${variant}_idle` as any),
            walk: imageLoader.getSprite(`merchant_${variant}_walk` as any),
            attack: imageLoader.getSprite(`merchant_${variant}_attack` as any),
            hurt: imageLoader.getSprite(`merchant_${variant}_hurt` as any)
        };

        // Pick sprite by current state; fallback to idle if missing
        const sprite = merchantSprites[animState] ?? merchantSprites.idle;

        if (sprite && sprite.complete) {
            // Check if sprite is a sprite sheet (4 directional rows like warrior) or horizontal frames
            const isSpriteSheet = sprite.width > sprite.height * 2;
            const scale = 0.75; // Same scale as citizen/elder
            let frameW = sprite.width;
            let frameH = sprite.height;
            let sourceX = 0;
            let sourceY = 0;
            
            if (isSpriteSheet && sprite.height > sprite.width / 4) {
                // 4 directional rows format (like warrior)
                const SHEET_ROWS = 4;
                const ROW_SIDE_LEFT = 1;
                frameH = sprite.height / SHEET_ROWS;
                frameW = frameH; // frames are square
                const maxFrames = Math.max(1, Math.floor(sprite.width / frameW));
                const row = ROW_SIDE_LEFT;
                let frameIndex = 0;
                if (animState === 'attack' && attackProgress < 1) {
                    frameIndex = Math.min(maxFrames - 1, Math.floor((1 - attackProgress) * maxFrames));
                } else {
                    frameIndex = Math.floor(animTime * 6) % maxFrames;
                }
                sourceX = frameIndex * frameW;
                sourceY = row * frameH;
            } else {
                // Horizontal frames format (like homeless/citizen)
                const framesPerRow = Math.max(1, Math.floor(sprite.width / sprite.height));
                frameW = sprite.width / framesPerRow;
                frameH = sprite.height;
                let frameIndex = 0;
                if (animState === 'walk') {
                    frameIndex = Math.floor(animTime * 6) % framesPerRow;
                } else if (animState === 'attack' && attackProgress < 1) {
                    frameIndex = Math.min(framesPerRow - 1, Math.floor((1 - attackProgress) * framesPerRow));
                } else {
                    // idle
                    frameIndex = Math.floor(animTime * 4) % framesPerRow;
                }
                sourceX = frameIndex * frameW;
            }
            
            // Draw sprite frame with feet at y position (same as citizen)
            ctx.save();
            ctx.translate(x, y);
            if (facingLeft) ctx.scale(-1, 1);
            ctx.drawImage(
                sprite,
                sourceX, sourceY, frameW, frameH,
                -(frameW * scale) / 2, -frameH * scale, // draw with feet at y
                frameW * scale, frameH * scale
            );
            ctx.restore();
            
            return;
        }
        
        // Fallback to old programmatic drawing if sprite not loaded
        // Draw shadow first
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(x, y, 14, 6, 0, 0, Math.PI*2);
        ctx.fill();
        
        ctx.save();
        ctx.translate(x, y);
        
        // Gentle floating animation
        const floatY = Math.sin(animTime * 0.1) * 2;
        const floatX = Math.sin(animTime * 0.15) * 0.5;
        ctx.translate(floatX, floatY - 28);
        
        // === BACK SACK (drawn first, behind character) ===
        const sackY = -8;
        // Main sack body - green with patches
        ctx.fillStyle = '#22c55e'; // Green
        ctx.beginPath();
        ctx.moveTo(-18, sackY);
        ctx.lineTo(-12, sackY + 20);
        ctx.lineTo(12, sackY + 20);
        ctx.lineTo(18, sackY);
        ctx.lineTo(15, sackY - 5);
        ctx.lineTo(-15, sackY - 5);
        ctx.closePath();
        ctx.fill();
        
        // Sack patches (darker green and orange-brown)
        ctx.fillStyle = '#16a34a'; // Darker green patch
        ctx.fillRect(-10, sackY + 5, 8, 6);
        ctx.fillRect(5, sackY + 10, 6, 5);
        
        ctx.fillStyle = '#d97706'; // Orange-brown patch
        ctx.fillRect(-15, sackY + 8, 6, 4);
        ctx.fillRect(8, sackY + 3, 5, 7);
        
        // Sack straps
        ctx.fillStyle = '#451a03'; // Brown straps
        ctx.fillRect(-20, sackY - 3, 3, 8);
        ctx.fillRect(17, sackY - 3, 3, 8);
        
        // === SACK CONTENTS ===
        // Scrolls/maps (light brown)
        ctx.fillStyle = '#a78bfa'; // Light brown/beige
        ctx.fillRect(-14, sackY + 2, 4, 12);
        ctx.fillRect(-8, sackY + 4, 3, 10);
        ctx.fillRect(10, sackY + 3, 4, 11);
        
        // Gold coins spilling out
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 3;
        for (let i = 0; i < 8; i++) {
            const coinX = -12 + (i % 4) * 6 + Math.sin(animTime * 0.3 + i) * 1;
            const coinY = sackY + 2 + Math.floor(i / 4) * 4 + Math.cos(animTime * 0.3 + i) * 1;
            ctx.beginPath();
            ctx.arc(coinX, coinY, 1.5, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        
        // Small barrel/crate (dark brown)
        ctx.fillStyle = '#451a03';
        ctx.fillRect(-6, sackY + 8, 4, 5);
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 1;
        ctx.strokeRect(-6, sackY + 8, 4, 5);
        
        // Gift box (blue top, red ribbon)
        ctx.fillStyle = '#3b82f6'; // Blue top
        ctx.fillRect(2, sackY + 6, 5, 4);
        ctx.fillStyle = '#ef4444'; // Red ribbon
        ctx.fillRect(2, sackY + 8, 5, 1);
        ctx.fillRect(4, sackY + 6, 1, 4);
        
        // Potion bottle (clear with red and blue liquid)
        ctx.fillStyle = '#dbeafe'; // Clear bottle
        ctx.fillRect(-2, sackY + 10, 2, 4);
        ctx.fillStyle = '#ef4444'; // Red liquid
        ctx.fillRect(-2, sackY + 12, 2, 1);
        ctx.fillStyle = '#3b82f6'; // Blue liquid
        ctx.fillRect(-2, sackY + 13, 2, 1);
        
        // Large purple diamond/gem
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(12, sackY + 2);
        ctx.lineTo(15, sackY + 5);
        ctx.lineTo(12, sackY + 8);
        ctx.lineTo(9, sackY + 5);
        ctx.closePath();
        ctx.fill();
        // Diamond shine
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.moveTo(12, sackY + 3);
        ctx.lineTo(13.5, sackY + 5);
        ctx.lineTo(12, sackY + 7);
        ctx.lineTo(10.5, sackY + 5);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // === CHARACTER BODY ===
        // Red tunic/coat with gold trim
        ctx.fillStyle = '#dc2626'; // Red
        ctx.beginPath();
        ctx.moveTo(-12, 8);
        ctx.lineTo(12, 8);
        ctx.lineTo(10, -8);
        ctx.lineTo(-10, -8);
        ctx.closePath();
        ctx.fill();
        
        // Gold trim on tunic (cuffs and hem)
        ctx.fillStyle = '#fbbf24'; // Gold
        ctx.fillRect(-12, 6, 24, 2); // Bottom hem
        ctx.fillRect(-12, -8, 24, 2); // Top collar area
        ctx.fillRect(-12, 2, 3, 4); // Left cuff
        ctx.fillRect(9, 2, 3, 4); // Right cuff
        
        // Gold buttons
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, -2 + i * 3, 1, 0, Math.PI*2);
            ctx.fill();
        }
        
        // Brown belt with gold buckle
        ctx.fillStyle = '#451a03'; // Brown
        ctx.fillRect(-12, 4, 24, 2);
        ctx.fillStyle = '#fbbf24'; // Gold buckle
        ctx.fillRect(-3, 3.5, 6, 3);
        ctx.fillStyle = '#f59e0b'; // Buckle highlight
        ctx.fillRect(-2, 4, 4, 1);
        
        // Small pouch on belt
        ctx.fillStyle = '#451a03';
        ctx.fillRect(-14, 3, 4, 5);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-13, 2, 2, 1); // Buckle
        
        // Gold wristbands/cuffs
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-14, 0, 3, 2);
        ctx.fillRect(11, 0, 3, 2);
        
        // === HEAD ===
        // Face/head circle
        ctx.fillStyle = '#fca5a5'; // Light skin
        ctx.beginPath();
        ctx.arc(0, -18, 10, 0, Math.PI*2);
        ctx.fill();
        
        // Brown beard
        ctx.fillStyle = '#78350f'; // Brown
        ctx.beginPath();
        ctx.ellipse(0, -12, 8, 6, 0, 0, Math.PI*2);
        ctx.fill();
        
        // Mustache
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-6, -16, 12, 2);
        ctx.beginPath();
        ctx.ellipse(-4, -15, 3, 2, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(4, -15, 3, 2, 0, 0, Math.PI*2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(-4, -20, 2, 2);
        ctx.fillRect(2, -20, 2, 2);
        
        // Eyebrows
        ctx.fillStyle = '#000';
        ctx.fillRect(-5, -22, 3, 1);
        ctx.fillRect(2, -22, 3, 1);
        
        // Wide smile
        ctx.fillStyle = '#fff';
        ctx.fillRect(-4, -14, 8, 2);
        ctx.fillStyle = '#000';
        ctx.fillRect(-3, -13, 6, 1);
        
        // Ears
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath();
        ctx.arc(-10, -18, 2, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(10, -18, 2, 0, Math.PI*2);
        ctx.fill();
        
        // === BLUE CAP WITH YELLOW PATTERN ===
        ctx.fillStyle = '#3b82f6'; // Blue
        ctx.beginPath();
        ctx.moveTo(-10, -28);
        ctx.lineTo(10, -28);
        ctx.lineTo(8, -20);
        ctx.lineTo(-8, -20);
        ctx.closePath();
        ctx.fill();
        
        // Yellow pattern on cap
        ctx.fillStyle = '#fbbf24'; // Yellow
        // Pattern lines
        ctx.fillRect(-8, -26, 16, 1);
        ctx.fillRect(-8, -24, 16, 1);
        ctx.fillRect(-8, -22, 16, 1);
        // Pattern dots
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(-6 + i * 3, -25, 0.8, 0, Math.PI*2);
            ctx.fill();
        }
        
        // Cap pompom/fold
        ctx.fillStyle = '#2563eb'; // Darker blue
        ctx.beginPath();
        ctx.arc(0, -28, 2, 0, Math.PI*2);
        ctx.fill();
        
        // === LEGS (just bottom visible) ===
        ctx.fillStyle = '#dc2626'; // Red trousers
        ctx.fillRect(-8, 8, 16, 4);
        ctx.fillStyle = '#fbbf24'; // Gold trim
        ctx.fillRect(-8, 8, 16, 1);
        
        // Boots
        ctx.fillStyle = '#451a03'; // Brown
        ctx.fillRect(-8, 12, 6, 2);
        ctx.fillRect(2, 12, 6, 2);
        
        ctx.restore();
        
        // === FLOATING COINS AROUND MERCHANT ===
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 6;
        for (let i = 0; i < 6; i++) {
            const coinAngle = (animTime * 0.4 + i * Math.PI * 2 / 6) % (Math.PI * 2);
            const coinRadius = 18 + Math.sin(animTime * 0.6 + i * 0.5) * 4;
            const coinY = y - 28 + Math.sin(coinAngle * 2) * 2;
            const coinSize = 2 + Math.sin(animTime * 0.8 + i) * 0.5;
            
            ctx.globalAlpha = 0.8 + Math.sin(animTime * 0.5 + i) * 0.2;
            ctx.beginPath();
            ctx.arc(
                x + Math.cos(coinAngle) * coinRadius,
                coinY,
                coinSize, 0, Math.PI*2
            );
            ctx.fill();
            
            // Coin shine
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(
                x + Math.cos(coinAngle) * coinRadius - 0.5,
                coinY - 0.5,
                coinSize * 0.4, 0, Math.PI*2
            );
            ctx.fill();
            ctx.fillStyle = '#fbbf24';
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        
        // === GOLDEN GLOW EFFECT ===
        const glowPulse = Math.sin(animTime * 0.2) * 0.15 + 1;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 15 + glowPulse * 5;
        ctx.globalAlpha = 0.3 * glowPulse;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(x, y - 28, 20 * glowPulse, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        
        return;
    }
    
    // Fallback to programmatic rendering for rogue and other types
    drawGroundShadow(-5);
    ctx.save();
    ctx.translate(x, y); 
    if (facingLeft) ctx.scale(-1, 1);

    const t = time * 0.15;
    const breathe = Math.sin(t) * 1.5;
    
    let armorColor = type === 'warrior' ? '#94a3b8' : type === 'mage' ? '#4c1d95' : '#7e22ce';
    let effectColor = '';

    if (type === 'warrior' && equippedCosmeticId === 'w_gold_armor') armorColor = '#f59e0b';
    if (type === 'rogue' && equippedCosmeticId === 'r_shadow_suit') armorColor = '#171717';
    if (type === 'mage' && equippedCosmeticId === 'm_archmage') armorColor = '#1e3a8a';

    if (type === 'warrior' && equippedCosmeticId === 'w_flame_aura') effectColor = '#ef4444';
    if (type === 'rogue' && equippedCosmeticId === 'r_toxin_glow') effectColor = '#22c55e';
    if (type === 'mage' && equippedCosmeticId === 'm_void_orb') effectColor = '#7e22ce';

    if (effectColor) {
         ctx.shadowColor = effectColor;
         ctx.shadowBlur = 10 + Math.sin(t*2) * 5;
         ctx.fillStyle = effectColor;
         ctx.globalAlpha = 0.2;
         ctx.beginPath(); ctx.arc(0, -10, 20, 0, Math.PI*2); ctx.fill();
         ctx.globalAlpha = 1;
    }
    
    if (type === 'rogue') {
        const skinColor = '#e9d5ff'; 
        const hairColor = '#1e1b4b'; 
        const armorFinal = armorColor; 
        const cyanGlow = '#22d3ee';
        const capeColor = '#0f172a';
        ctx.fillStyle = capeColor; ctx.beginPath(); ctx.moveTo(-6, -15); ctx.lineTo(-10, 12 + Math.sin(t*1.2)*2); ctx.lineTo(10, 12 + Math.sin(t*1.2 + 1)*2); ctx.lineTo(6, -15); ctx.fill();
        const legOffset = isMoving ? Math.sin(t*2) * 3 : 0;
        ctx.fillStyle = '#171717'; ctx.fillRect(-6, 0, 5, 12 + legOffset); ctx.fillRect(1, 0, 5, 12 - legOffset);
        ctx.fillStyle = '#404040'; ctx.fillRect(-6, 10 + legOffset, 5, 4); ctx.fillRect(1, 10 - legOffset, 5, 4);
        ctx.translate(0, breathe);
        ctx.fillStyle = armorFinal; ctx.fillRect(-7, -14, 14, 14);
        ctx.fillStyle = cyanGlow; ctx.fillRect(-2, -10, 4, 4); 
        ctx.globalAlpha = 0.5; ctx.fillStyle = cyanGlow; ctx.beginPath(); ctx.arc(0, -8, 4, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = '#404040'; ctx.beginPath(); ctx.moveTo(-7, -14); ctx.lineTo(-11, -16); ctx.lineTo(-7, -10); ctx.fill(); ctx.beginPath(); ctx.moveTo(7, -14); ctx.lineTo(11, -16); ctx.lineTo(7, -10); ctx.fill();
        ctx.fillStyle = skinColor; ctx.fillRect(-5, -24, 10, 10);
        ctx.fillStyle = hairColor; ctx.beginPath(); ctx.moveTo(-6, -26); ctx.lineTo(6, -26); ctx.lineTo(8, -14); ctx.lineTo(9, -8); ctx.lineTo(4, -14); ctx.lineTo(-4, -14); ctx.lineTo(-9, -8); ctx.lineTo(-8, -14); ctx.lineTo(-6, -26); ctx.fill();
        ctx.fillStyle = '#404040'; ctx.fillRect(-5, -18, 10, 4);
        ctx.fillStyle = cyanGlow; ctx.shadowColor = cyanGlow; ctx.shadowBlur = 5; ctx.fillRect(-3, -21, 2, 2); ctx.fillRect(2, -21, 2, 2); ctx.shadowBlur = 0;
        ctx.fillStyle = skinColor; ctx.save(); ctx.translate(6, -12); ctx.rotate(isMoving ? -Math.sin(t*2)*0.5 : 0); ctx.fillRect(-2, 0, 4, 10); ctx.restore();
        ctx.save(); ctx.translate(-6, -12); const bowAngle = isMoving ? Math.sin(t*2)*0.2 : 0; ctx.rotate(bowAngle); ctx.fillStyle = skinColor; ctx.fillRect(-2, 0, 4, 8); 
        ctx.translate(0, 8); ctx.shadowColor = cyanGlow; ctx.shadowBlur = 10; ctx.strokeStyle = cyanGlow; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 14, Math.PI * 0.5, Math.PI * 1.5, true); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 14); ctx.stroke(); ctx.shadowBlur = 0;
        if (attackProgress < 1) { const pull = attackProgress * 10; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-pull, 0); ctx.lineTo(10, 0); ctx.stroke(); }
        ctx.restore(); ctx.restore(); return;
    }
    
    if (type === 'mage') {
        const hairColor = '#fcd34d'; const skinColor = '#ffedd5'; const robeInner = armorColor; const robeOuter = '#f3f4f6'; const goldTrim = '#fbbf24'; const capeColor = '#fffbeb'; 
        ctx.fillStyle = capeColor; ctx.beginPath(); ctx.moveTo(-8, -18); ctx.lineTo(-14, 15 + Math.sin(t*1.5)*3); ctx.lineTo(14, 15 + Math.cos(t*1.5)*3); ctx.lineTo(8, -18); ctx.fill();
        ctx.strokeStyle = goldTrim; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, -18); ctx.lineTo(-14, 15 + Math.sin(t*1.5)*3); ctx.lineTo(14, 15 + Math.cos(t*1.5)*3); ctx.lineTo(8, -18); ctx.stroke();
        const legOffset = isMoving ? Math.sin(t*2) * 2 : 0;
        ctx.fillStyle = robeInner; ctx.fillRect(-5, 0, 10, 14); 
        ctx.fillStyle = robeOuter; ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(6, -5); ctx.lineTo(5, 12 - legOffset); ctx.lineTo(0, 14 - legOffset); ctx.lineTo(-5, 12 - legOffset); ctx.fill();
        ctx.fillStyle = goldTrim; ctx.fillRect(-2, 2 - legOffset, 4, 8); ctx.fillRect(-4, 4 - legOffset, 8, 2);
        ctx.translate(0, breathe); ctx.fillStyle = robeInner; ctx.fillRect(-7, -16, 14, 16);
        ctx.fillStyle = goldTrim; ctx.fillRect(-3, -14, 6, 2); ctx.fillRect(-3, -10, 6, 2);
        ctx.fillStyle = robeInner; ctx.beginPath(); ctx.moveTo(-8, -16); ctx.lineTo(-12, -22); ctx.lineTo(-5, -16); ctx.fill(); ctx.beginPath(); ctx.moveTo(8, -16); ctx.lineTo(12, -22); ctx.lineTo(5, -16); ctx.fill();
        ctx.fillStyle = robeOuter; ctx.fillRect(-10, -18, 5, 6); ctx.fillRect(5, -18, 5, 6);
        ctx.fillStyle = skinColor; ctx.fillRect(-5, -24, 10, 10);
        ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 5; ctx.fillRect(-3, -21, 2, 2); ctx.fillRect(2, -21, 2, 2); ctx.shadowBlur = 0;
        ctx.fillStyle = hairColor; ctx.beginPath(); ctx.moveTo(-6, -24); ctx.lineTo(-8, -32); ctx.lineTo(-3, -28); ctx.lineTo(0, -35); ctx.lineTo(3, -28); ctx.lineTo(8, -32); ctx.lineTo(6, -24); ctx.fill();
        ctx.fillStyle = skinColor; ctx.save(); ctx.translate(8, -14); ctx.rotate(isMoving ? -Math.sin(t*2)*0.5 : 0.2); ctx.fillRect(-2, 0, 4, 10); ctx.fillStyle = goldTrim; ctx.fillRect(-2, 8, 4, 2); ctx.restore();
        ctx.save(); ctx.translate(-8, -14); ctx.rotate(isMoving ? Math.sin(t*2)*0.5 : -0.2); ctx.fillStyle = skinColor; ctx.fillRect(-2, 0, 4, 10); ctx.fillStyle = goldTrim; ctx.fillRect(-2, 8, 4, 2); ctx.restore();
        const orbRadius = 24; const orbSpeed = time * 0.05;
        const orbs = [ { color: '#3b82f6', offset: 0 }, { color: '#ec4899', offset: (Math.PI * 2)/3 }, { color: '#f59e0b', offset: (Math.PI * 4)/3 } ];
        orbs.forEach(orb => {
            const ox = Math.cos(orbSpeed + orb.offset) * orbRadius; const oy = Math.sin(orbSpeed + orb.offset) * 8 - 12; 
            ctx.fillStyle = orb.color; ctx.shadowColor = orb.color; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(ox - Math.cos(orbSpeed+orb.offset)*4, oy - Math.sin(orbSpeed+orb.offset)*2, 3, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        });
        ctx.restore(); return;
    }

    if (type === 'trainer') {
        // Raise shadow closer to feet
        drawGroundShadow(-5);
        // Use specific variant if provided, otherwise default to variant 1
        let variant = trainerVariant ?? 1;
        
        // Try to get sprites for the variant, fallback to variant 1 if not loaded
        let trainerSprites: Record<AnimationState, HTMLImageElement | null | undefined> = {
            idle: imageLoader.getSprite(`trainer_${variant}_idle` as any),
            walk: imageLoader.getSprite(`trainer_${variant}_walk` as any),
            attack: imageLoader.getSprite(`trainer_${variant}_attack` as any),
            hurt: imageLoader.getSprite(`trainer_${variant}_hurt` as any)
        };
        
        // If sprites are not loaded, fallback to variant 1
        if (!trainerSprites.idle || (trainerSprites.idle && !trainerSprites.idle.complete)) {
            variant = 1;
            const fallback1 = imageLoader.getSprite('trainer_1_idle' as any);
            const fallback2 = imageLoader.getSprite('trainer_idle');
            trainerSprites = {
                idle: (fallback1 && fallback1.complete) ? fallback1 : (fallback2 && fallback2.complete ? fallback2 : null),
                walk: imageLoader.getSprite('trainer_1_walk' as any) ?? imageLoader.getSprite('trainer_walk'),
                attack: imageLoader.getSprite('trainer_1_attack' as any) ?? imageLoader.getSprite('trainer_attack'),
                hurt: imageLoader.getSprite('trainer_1_hurt' as any) ?? imageLoader.getSprite('trainer_hurt')
            };
        }

        // Pick sprite by current state; fallback to idle if missing
        let sprite = trainerSprites[animState] ?? trainerSprites.idle;
        
        // Final fallback: if sprite is not available, try default trainer sprites
        if (!sprite || !sprite.complete) {
            sprite = imageLoader.getSprite('trainer_idle');
        }

        if (sprite && sprite.complete && sprite.width > 0 && sprite.height > 0) {
            // Check if sprite is a sprite sheet (4 directional rows like warrior) or horizontal frames
            // Knight textures have 4 directional rows format (like warrior)
            const isSpriteSheet = sprite.width > sprite.height * 2;
            const scale = 0.75; // Same scale as elder/citizen
            let frameW = sprite.width;
            let frameH = sprite.height;
            let sourceX = 0;
            let sourceY = 0;
            
            if (isSpriteSheet && sprite.height > sprite.width / 4) {
                // 4 directional rows format (like warrior/knight)
                const SHEET_ROWS = 4;
                const ROW_SIDE_LEFT = 1;
                frameH = sprite.height / SHEET_ROWS;
                frameW = frameH; // frames are square
                const maxFrames = Math.max(1, Math.floor(sprite.width / frameW));
                const row = ROW_SIDE_LEFT;
                let frameIndex = 0;
                if (animState === 'attack' && attackProgress < 1) {
                    frameIndex = Math.min(maxFrames - 1, Math.floor((1 - attackProgress) * maxFrames));
                } else {
                    frameIndex = Math.floor(animTime * 6) % maxFrames;
                }
                sourceX = frameIndex * frameW;
                sourceY = row * frameH;
            } else {
                // Horizontal frames format (like homeless/citizen)
                const framesPerRow = Math.max(1, Math.floor(sprite.width / sprite.height));
                frameW = sprite.width / framesPerRow;
                frameH = sprite.height;
                let frameIndex = 0;
                if (animState === 'walk') {
                    frameIndex = Math.floor(animTime * 6) % framesPerRow;
                } else if (animState === 'attack' && attackProgress < 1) {
                    frameIndex = Math.min(framesPerRow - 1, Math.floor((1 - attackProgress) * framesPerRow));
                } else {
                    // idle
                    frameIndex = Math.floor(animTime * 4) % framesPerRow;
                }
                sourceX = frameIndex * frameW;
            }
            
            // Draw sprite frame with feet at y position (same as warrior)
            ctx.save();
            ctx.translate(x, y);
            if (facingLeft) ctx.scale(-1, 1);
            ctx.drawImage(
                sprite,
                sourceX, sourceY, frameW, frameH,
                -(frameW * scale) / 2, -frameH * scale, // draw with feet at y
                frameW * scale, frameH * scale
            );
            ctx.restore();
            
            return;
        }
    }

    const isMob = type === 'skeleton' || type === 'golem' || type === 'boss';
    const legL_A = isMoving ? Math.sin(t*2) * 0.5 : 0;
    const legR_A = isMoving ? -Math.sin(t*2) * 0.5 : 0;
    const primary = color;
    const secondary = type === 'warrior' ? armorColor : '#525252'; 
    const skin = type === 'skeleton' ? '#e5e5e5' : (type === 'golem' ? '#57534e' : '#fca5a5');

    // Enhanced legs with gradient
    const legGrad = ctx.createLinearGradient(0, 0, 0, 14);
    legGrad.addColorStop(0, isMob ? secondary : '#1a1a1a');
    legGrad.addColorStop(1, isMob ? '#404040' : '#0a0a0a');
    ctx.fillStyle = legGrad;
    ctx.save(); 
    ctx.translate(-4, 0); 
    ctx.rotate(legL_A); 
    ctx.fillRect(-3, 0, 6, 14);
    // Leg highlight
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(-3, 0, 2, 14);
    ctx.restore();
    
    ctx.save(); 
    ctx.translate(4, 0); 
    ctx.rotate(legR_A); 
    ctx.fillStyle = legGrad;
    ctx.fillRect(-3, 0, 6, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(1, 0, 2, 14);
    ctx.restore();

    ctx.translate(0, -14 + breathe);
    
    // Enhanced body with gradient
    const bodyGrad = ctx.createLinearGradient(-8, -14, -8, 0);
    bodyGrad.addColorStop(0, primary);
    bodyGrad.addColorStop(1, type === 'warrior' || type === 'boss' ? '#7f1d1d' : '#404040');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-8, -14, 16, 14);
    
    // Body highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-8, -14, 16, 4);
    
    if (type === 'warrior' || type === 'boss') { 
        // Enhanced armor pieces
        const armorGrad = ctx.createLinearGradient(-9, -16, -9, -10);
        armorGrad.addColorStop(0, secondary);
        armorGrad.addColorStop(1, '#64748b');
        ctx.fillStyle = armorGrad;
        ctx.fillRect(-9, -16, 18, 6);
        ctx.fillRect(-4, -10, 8, 8);
        // Armor shine
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(-9, -16, 18, 2);
    } 
    
    ctx.translate(0, -14);
    
    // Enhanced head with gradient
    const headGrad = ctx.createLinearGradient(-6, -10, -6, 0);
    headGrad.addColorStop(0, skin);
    headGrad.addColorStop(1, type === 'skeleton' ? '#d1d5db' : (type === 'golem' ? '#44403c' : '#f87171'));
    ctx.fillStyle = headGrad;
    ctx.fillRect(-6, -10, 12, 10);
    
    if (type === 'warrior' || type === 'boss') { 
        // Enhanced helmet
        const helmGrad = ctx.createLinearGradient(-7, -12, -7, -6);
        helmGrad.addColorStop(0, secondary);
        helmGrad.addColorStop(1, '#64748b');
        ctx.fillStyle = helmGrad;
        ctx.fillRect(-7, -12, 14, 6);
        ctx.fillRect(-2, -6, 4, 6);
        // Helmet shine
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(-7, -12, 14, 2);
    } 
    else if (type === 'skeleton') { 
        // Enhanced skeleton eyes with glow
        ctx.fillStyle = '#000';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.fillRect(-4, -6, 3, 3);
        ctx.fillRect(1, -6, 3, 3);
        ctx.shadowBlur = 0;
        // Eye glow
        ctx.fillStyle = '#ef4444';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(-3, -5, 1, 1);
        ctx.fillRect(2, -5, 1, 1);
        ctx.globalAlpha = 1;
    } 
    else if (type === 'golem') { 
        // Enhanced golem with texture
        const golemGrad = ctx.createLinearGradient(-8, -12, -8, 0);
        golemGrad.addColorStop(0, secondary);
        golemGrad.addColorStop(1, '#44403c');
        ctx.fillStyle = golemGrad;
        ctx.fillRect(-8, -12, 16, 12);
        // Golem eyes with glow
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.fillRect(-4, -6, 3, 2);
        ctx.fillRect(1, -6, 3, 2);
        ctx.shadowBlur = 0;
        // Stone texture lines
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, -8);
        ctx.lineTo(6, -8);
        ctx.moveTo(-6, -4);
        ctx.lineTo(6, -4);
        ctx.stroke();
    }

    ctx.translate(8, 6);
    ctx.rotate(isMoving ? -Math.sin(t*2) * 0.5 : 0.2);
    if (attackProgress < 1) {
        ctx.rotate(-(1-attackProgress) * 2);
        // Attack trail effect
        ctx.strokeStyle = primary;
        ctx.lineWidth = 2;
        ctx.shadowColor = primary;
        ctx.shadowBlur = 15;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-10, -20);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    if (type === 'warrior' || type === 'boss') { 
        if (weapon) {
            // Enhanced rarity glow with pulse
            const glowPulse = Math.sin(time * 0.2) * 0.1 + 1;
            ctx.shadowBlur = 20 * glowPulse;
            ctx.shadowColor = weapon.rarity === ItemRarity.COMMON ? '#9ca3af' :
                              weapon.rarity === ItemRarity.UNCOMMON ? '#22c55e' :
                              weapon.rarity === ItemRarity.RARE ? '#3b82f6' : '#f59e0b';
        }
        
        // Enhanced sword with gradient
        const swordGrad = ctx.createLinearGradient(-2, 0, -2, -30);
        swordGrad.addColorStop(0, '#e2e8f0');
        swordGrad.addColorStop(0.5, '#cbd5e1');
        swordGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = swordGrad;
        ctx.beginPath(); 
        ctx.moveTo(-2, 0); 
        ctx.lineTo(-2, -25); 
        ctx.lineTo(0, -30); 
        ctx.lineTo(2, -25); 
        ctx.lineTo(2, 0); 
        ctx.fill();
        
        // Sword edge highlight
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-2, 0);
        ctx.lineTo(0, -30);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        
        // Enhanced hilt
        const hiltGrad = ctx.createLinearGradient(-6, -4, -6, 0);
        hiltGrad.addColorStop(0, '#334155');
        hiltGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = hiltGrad;
        ctx.fillRect(-6, -4, 12, 4);
        // Hilt decoration
        ctx.fillStyle = '#475569';
        ctx.fillRect(-4, -4, 8, 2);
    } 

    ctx.restore(); 
};

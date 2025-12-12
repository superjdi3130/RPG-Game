// Sprite animation system for character sprites

export type AnimationState = 'idle' | 'walk' | 'attack' | 'hurt';

export interface AnimationConfig {
  frameCount: number; // Number of frames in animation
  frameDuration: number; // Frames per animation frame (60fps = 1 second = 60 frames)
  loop: boolean; // Whether animation loops
}

export const ANIMATION_CONFIGS: Record<AnimationState, AnimationConfig> = {
  idle: { frameCount: 4, frameDuration: 15, loop: true }, // 4 frames, 15 ticks each = 1 second loop
  walk: { frameCount: 6, frameDuration: 8, loop: true }, // 6 frames, 8 ticks each = fast walk cycle
  attack: { frameCount: 4, frameDuration: 5, loop: false }, // 4 frames, 5 ticks each = quick attack
  hurt: { frameCount: 2, frameDuration: 3, loop: false } // 2 frames, 3 ticks each = quick hurt flash
};

export class SpriteAnimator {
  private frameIndex: number = 0;
  private currentState: AnimationState = 'idle';
  private stateTime: number = 0;
  private lastState: AnimationState = 'idle';

  getCurrentFrame(state: AnimationState, globalTime: number, isMoving: boolean, attackProgress: number): number {
    // Determine animation state
    let targetState: AnimationState = 'idle';
    
    if (attackProgress < 1) {
      targetState = 'attack';
    } else if (isMoving) {
      targetState = 'walk';
    } else {
      targetState = 'idle';
    }

    // Reset frame index if state changed
    if (targetState !== this.currentState) {
      this.currentState = targetState;
      this.stateTime = 0;
      this.frameIndex = 0;
    }

    const config = ANIMATION_CONFIGS[targetState];
    this.stateTime++;

    // Calculate frame based on time
    if (targetState === 'attack' && attackProgress < 1) {
      // Attack animation based on progress
      this.frameIndex = Math.floor(attackProgress * config.frameCount);
    } else {
      // Normal animation cycling
      const cycleLength = config.frameCount * config.frameDuration;
      const cyclePosition = this.stateTime % cycleLength;
      this.frameIndex = Math.floor(cyclePosition / config.frameDuration);
    }

    // Clamp frame index
    this.frameIndex = Math.min(this.frameIndex, config.frameCount - 1);

    return this.frameIndex;
  }

  // Get animation state for effects
  getCurrentState(): AnimationState {
    return this.currentState;
  }

  reset() {
    this.frameIndex = 0;
    this.stateTime = 0;
    this.currentState = 'idle';
  }
}

// Helper function to draw animated sprite from sprite sheet
export const drawAnimatedSprite = (
  ctx: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  x: number,
  y: number,
  frameIndex: number,
  frameCount: number,
  scale: number = 1.0,
  facingLeft: boolean = false
) => {
  // If sprite is a single image, treat it as a sprite sheet
  // Calculate frame dimensions (assuming horizontal sprite sheet)
  const frameWidth = sprite.width / frameCount;
  const frameHeight = sprite.height;
  
  const sourceX = frameIndex * frameWidth;
  const sourceY = 0;
  
  ctx.save();
  ctx.translate(x, y);
  if (facingLeft) ctx.scale(-1, 1);
  
  ctx.drawImage(
    sprite,
    sourceX, sourceY, frameWidth, frameHeight, // Source rectangle
    -frameWidth / 2 * scale, -frameHeight * scale, // Destination position
    frameWidth * scale, frameHeight * scale // Destination size
  );
  
  ctx.restore();
};

// Helper for single image with enhanced animation effects
// y parameter is the ground position (feet), sprite will be drawn above it
export const drawAnimatedSingleSprite = (
  ctx: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  x: number,
  y: number, // Ground position (feet)
  state: AnimationState,
  time: number,
  scale: number = 1.0,
  facingLeft: boolean = false,
  characterType?: string // Optional character type for unique animations
) => {
  ctx.save();
  // Calculate sprite center position (sprite is drawn above ground)
  const spriteY = y - sprite.height * scale * 0.5; // Center sprite above ground
  ctx.translate(x, spriteY);
  if (facingLeft) ctx.scale(-1, 1);
  
  let offsetX = 0;
  let offsetY = 0;
  let rotation = 0;
  let scaleModifier = 1.0;
  let opacity = 1.0;
  let shadowOffset = 0;
  
  // Enhanced animation effects based on state with character-specific variations
  if (state === 'walk') {
    // Walking animation - enhanced bounce and dynamic movement
    const walkCycle = time * 0.6; // Faster, more dynamic walk cycle
    const walkPhase = Math.sin(walkCycle);
    const walkPhase2 = Math.sin(walkCycle * 2);
    const walkPhase3 = Math.sin(walkCycle * 0.5);
    
    // Vertical bounce - more pronounced for heavier characters, smoother for lighter
    const bounceAmount = characterType === 'boss' ? 4.0 : 
                        (characterType === 'golem' ? 3.5 : 
                        (characterType === 'warrior' ? 3.0 : 2.5));
    offsetY = walkPhase * bounceAmount;
    
    // Side-to-side sway - creates walking motion with more variation
    offsetX = walkPhase2 * 2.5 + walkPhase3 * 0.5;
    
    // Dynamic rotation for walking feel - more pronounced
    rotation = walkPhase * 0.12 + walkPhase3 * 0.03;
    
    // Scale variation - creates weight and impact with more variation
    scaleModifier = 1.0 + Math.abs(walkPhase) * 0.08 + Math.sin(walkCycle * 1.5) * 0.02;
    
    // Subtle opacity for depth with more variation
    opacity = 0.96 + Math.sin(walkCycle * 0.4) * 0.04;
    
    // Shadow offset for walking - more dynamic
    shadowOffset = walkPhase * 2.0 + walkPhase2 * 0.5;
    
  } else if (state === 'attack') {
    // Enhanced attack animation - powerful and impactful
    const attackCycle = time * 1.2; // Fast, aggressive attack
    const attackPhase = Math.sin(attackCycle);
    const attackIntensity = Math.abs(attackPhase);
    
    // Forward lunge - more aggressive for warriors
    const lungeAmount = characterType === 'warrior' || characterType === 'boss' ? 6 : 4;
    offsetX = attackPhase * lungeAmount;
    
    // Upward movement on impact
    offsetY = -attackIntensity * 2.5;
    
    // Rotation for impact - more dramatic for melee
    rotation = attackPhase * (characterType === 'warrior' ? 0.15 : 0.12);
    
    // Scale pulse for impact effect
    scaleModifier = 1.0 + attackIntensity * 0.2;
    
    // Flash effect on impact
    opacity = 0.85 + attackIntensity * 0.15;
    
    // Shadow compression on impact
    shadowOffset = -attackIntensity * 2;
    
  } else if (state === 'idle') {
    // Enhanced idle animation - more alive and breathing with character-specific variations
    const idleCycle = time * 0.12; // Slow, calm breathing
    const breathePhase = Math.sin(idleCycle);
    const breathePhase2 = Math.sin(idleCycle * 0.7);
    const breathePhase3 = Math.sin(idleCycle * 0.3);
    
    // Character-specific idle animations
    if (characterType === 'merchant') {
      // Merchant: gentle floating with slight rotation
      offsetY = breathePhase * 2.5 + breathePhase3 * 0.5;
      offsetX = breathePhase2 * 1.2;
      rotation = breathePhase3 * 0.05;
      scaleModifier = 1.0 + breathePhase * 0.08;
    } else if (characterType === 'boss') {
      // Boss: more menacing idle with pulsing
      offsetY = breathePhase * 2.0;
      offsetX = breathePhase2 * 0.5;
      rotation = breathePhase * 0.02;
      scaleModifier = 1.0 + breathePhase * 0.05 + Math.sin(time * 0.1) * 0.03;
    } else {
      // Default: gentle breathing - more pronounced
      offsetY = breathePhase * 2.2;
      offsetX = breathePhase2 * 1.0;
      rotation = breathePhase2 * 0.04;
      scaleModifier = 1.0 + breathePhase * 0.08;
    }
    
    // Full opacity for idle
    opacity = 1.0;
    
  } else if (state === 'hurt') {
    // Enhanced hurt animation - dramatic shake and flash
    const hurtCycle = time * 2.0; // Fast, dramatic shake
    const shakeX = Math.sin(hurtCycle * 4) * 4;
    const shakeY = Math.sin(hurtCycle * 3.5) * 3;
    
    offsetX = shakeX;
    offsetY = shakeY;
    
    // Disorientation rotation
    rotation = Math.sin(hurtCycle * 5) * 0.15;
    
    // Red flash effect
    opacity = 0.6 + Math.sin(hurtCycle * 2) * 0.4;
    
    // Scale variation for impact
    scaleModifier = 1.0 + Math.sin(hurtCycle * 3) * 0.1;
  }
  
  // Draw enhanced isometric shadow on ground (below sprite)
  // Isometric shadows are elliptical and offset for 2.5D effect.
  // Lift shadow slightly so it hugs the character feet better.
  const shadowY = sprite.height * scale * 0.5 - 6;
  const shadowAlpha = state === 'attack' ? 0.6 : (state === 'walk' ? 0.5 : 0.4);
  const shadowScale = state === 'attack' ? 0.9 : 1.0; // Compressed shadow on attack
  
  // Enhanced isometric shadow with gradient for depth
  const shadowGrad = ctx.createRadialGradient(
    shadowOffset, shadowY, 0,
    shadowOffset, shadowY, 12 * scaleModifier * shadowScale
  );
  shadowGrad.addColorStop(0, `rgba(0,0,0,${shadowAlpha * 0.8})`);
  shadowGrad.addColorStop(0.5, `rgba(0,0,0,${shadowAlpha * 0.6})`);
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  // Isometric shadow: wider on X, narrower on Y with slight rotation
  ctx.ellipse(
    shadowOffset, 
    shadowY, 
    14 * scaleModifier * shadowScale, // Wider for isometric
    6 * scaleModifier * shadowScale, // Narrower for isometric
    rotation * 0.3 + 0.3, // Slight rotation for isometric perspective
    0, Math.PI*2
  );
  ctx.fill();
  
  // Additional soft shadow layer for depth
  ctx.fillStyle = `rgba(0,0,0,${shadowAlpha * 0.2})`;
  ctx.beginPath();
  ctx.ellipse(
    shadowOffset + 2, 
    shadowY + 1, 
    16 * scaleModifier * shadowScale, 
    7 * scaleModifier * shadowScale, 
    rotation * 0.3 + 0.3, 0, Math.PI*2
  );
  ctx.fill();
  
  // Apply transformations with smooth interpolation
  ctx.scale(scaleModifier, scaleModifier);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;
  
  // Add enhanced glow effects based on state and character type
  if (state === 'attack') {
    // Attack glow - more intense
    ctx.shadowColor = characterType === 'warrior' ? 'rgba(239,68,68,0.5)' : 
                      characterType === 'mage' ? 'rgba(245,158,11,0.5)' : 
                      'rgba(255,255,255,0.4)';
    ctx.shadowBlur = 8;
  } else if (state === 'walk') {
    // Walking glow - subtle motion blur
    ctx.shadowColor = 'rgba(255,255,255,0.2)';
    ctx.shadowBlur = 4;
  } else if (characterType === 'boss') {
    // Boss always has a subtle glow
    ctx.shadowColor = 'rgba(239,68,68,0.3)';
    ctx.shadowBlur = 6;
  }
  
  // Draw sprite with all animation effects
  ctx.drawImage(
    sprite,
    -sprite.width / 2 * scale + offsetX,
    -sprite.height * scale + offsetY,
    sprite.width * scale,
    sprite.height * scale
  );
  
  // Add motion trail for fast movements
  if (state === 'walk' && Math.abs(offsetX) > 1) {
    ctx.globalAlpha = 0.2;
    ctx.drawImage(
      sprite,
      -sprite.width / 2 * scale + offsetX * 0.5 - 2,
      -sprite.height * scale + offsetY * 0.5,
      sprite.width * scale * 0.95,
      sprite.height * scale * 0.95
    );
  }
  
  // Reset effects
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1.0;
  ctx.restore();
};


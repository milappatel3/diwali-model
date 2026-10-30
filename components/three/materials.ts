'use client';
import * as THREE from 'three';
import type { MatKey } from '@/lib/types';
import { carpetTex, woodTex, plywoodTex, ceilingTex, wallTex, houseWallTex, limeWashTex } from './textures';

export const FTm = 0.3048;
/** hall feet (x east, y north, z up) -> three metres (X east, Y up, Z south) */
export const W = (x: number, y: number, z = 0) => new THREE.Vector3(x * FTm, z * FTm, -y * FTm);
export const yawRad = (deg: number) => (deg * Math.PI) / 180;

let MATS: Record<string, THREE.Material> | null = null;
export function mats(): Record<MatKey | 'wall' | 'ceiling' | 'studs' | 'tile' | 'door' | 'velourIvory' | 'skin' | 'hair' | 'cloth1' | 'cloth2' | 'cloth3' | 'stageDeck', THREE.Material> {
  if (MATS) return MATS as any;
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
  const ply = plywoodTex();
  MATS = {
    drapeBlack: new THREE.MeshPhysicalMaterial({ color: '#0f0d0d', roughness: 1, sheen: 1, sheenColor: new THREE.Color('#3a3535'), sheenRoughness: 0.45, side: THREE.DoubleSide }),
    drapeIvory: new THREE.MeshPhysicalMaterial({ color: '#e6d8c2', roughness: 0.95, sheen: 0.6, sheenColor: new THREE.Color('#fff4e0'), sheenRoughness: 0.6, side: THREE.DoubleSide }),
    drapeMaroon: new THREE.MeshPhysicalMaterial({ color: '#5c1419', roughness: 1, sheen: 1, sheenColor: new THREE.Color('#a03040'), sheenRoughness: 0.5, side: THREE.DoubleSide }),
    plywood: std({ map: ply, color: '#e8d0aa' }),
    mdf: std({ color: '#b48b5e', roughness: 0.8 }),
    mdfPainted: std({ color: '#eae2d4' }),
    wood: std({ map: woodTex('#8c5b2e', 'woodmid'), color: '#ffffff', roughness: 0.6 }),
    woodDark: std({ map: woodTex('#4a2c16', 'wooddark'), color: '#ffffff', roughness: 0.55 }),
    drywall: std({ color: '#efeae2', roughness: 0.95 }),
    fabricSheer: new THREE.MeshPhysicalMaterial({ color: '#efe2c8', roughness: 1, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, emissive: new THREE.Color('#ffe9c4'), emissiveIntensity: 0 }),
    poster: std({ color: '#f4ead6', roughness: 0.7 }),
    banner: std({ color: '#e7a24f', roughness: 0.75 }),
    metal: std({ color: '#7b7b7b', metalness: 0.8, roughness: 0.4 }),
    chrome: std({ color: '#e6e6e6', metalness: 1, roughness: 0.18 }),
    black: std({ color: '#0b0b0b', roughness: 0.6 }),
    mirror: std({ color: '#ffffff', metalness: 1, roughness: 0.03 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#cfe8ee', roughness: 0.05, transmission: 0.9, transparent: true, opacity: 0.25, thickness: 0.01 }),
    carpet: std({ map: carpetTex(), color: '#ffffff', roughness: 1 }),
    plant: std({ color: '#2f6a2c', roughness: 0.8 }),
    cushion: std({ color: '#8c4a36', roughness: 0.95 }),
    gold: std({ color: '#c9a24a', metalness: 0.75, roughness: 0.32 }),
    screen: std({ color: '#050505', roughness: 0.2 }),
    stone: std({ color: '#cdb89c', roughness: 0.9 }),
    acrylic: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.02, transmission: 0.95, transparent: true, opacity: 0.12, depthWrite: false }),
    paper: std({ color: '#f5f0e6' }),
    white: std({ color: '#f5f5f5' }),
    wall: std({ map: wallTex(), color: '#ffffff', roughness: 0.95 }),
    ceiling: std({ map: ceilingTex(), color: '#ffffff', roughness: 1 }),
    studs: std({ map: houseWallTex(), color: '#ffffff', roughness: 0.85 }),
    tile: std({ color: '#b9ada0', roughness: 0.35 }),
    door: std({ color: '#5b4a3c', roughness: 0.55 }),
    velourIvory: std({ color: '#e6d8c2' }),
    skin: std({ color: '#b07a55', roughness: 0.6 }),
    hair: std({ color: '#1a1412', roughness: 0.7 }),
    cloth1: std({ color: '#8a2a2a', roughness: 0.9 }),
    cloth2: std({ color: '#2d4a6b', roughness: 0.9 }),
    cloth3: std({ color: '#d8c8a8', roughness: 0.9 }),
    stageDeck: std({ color: '#2a211b', roughness: 0.7 }),
    // exhibit-house finishes (lime-wash / matte emulsion colours of an Indian home)
    paintOchre: std({ map: limeWashTex('#c98a4b', 'ochre'), color: '#ffffff', roughness: 0.92 }),
    paintPeach: std({ map: limeWashTex('#e6a985', 'peach'), color: '#ffffff', roughness: 0.9 }),
    paintSaffron: std({ map: limeWashTex('#e3a640', 'saffron'), color: '#ffffff', roughness: 0.9 }),
    paintSage: std({ map: limeWashTex('#9fb38d', 'sage'), color: '#ffffff', roughness: 0.9 }),
    paintCream: std({ map: limeWashTex('#e9d6b4', 'cream'), color: '#ffffff', roughness: 0.9 }),
    couchTeal: std({ color: '#1f5d5e', roughness: 0.95 }),
    granite: std({ color: '#2b2522', roughness: 0.25, metalness: 0.05 }),
    terracotta: std({ color: '#a4532f', roughness: 0.9 }),
  } as any;
  return MATS as any;
}

export function luminanceY(c: [number, number, number]) {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] || 1;
}

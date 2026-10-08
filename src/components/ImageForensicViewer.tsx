/**
 * MorphGuard AI — Interactive Forensic Visualizer & Region Inspector
 * Provides overlay blending, layer switching (Noise, ELA, FFT, Edges),
 * landmark toggles, zoom levels, and real-time pixel coordinate inspection.
 */

import React, { useState, useRef } from 'react';
import { Layers, Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Crosshair, SplitSquareVertical } from 'lucide-react';
import { ForensicCase } from '../types.js';

interface ImageForensicViewerProps {
  currentCase: ForensicCase;
}

export type ForensicMapLayer = 'heatmap' | 'noise' | 'frequency' | 'compression' | 'edge' | 'none';

export const ImageForensicViewer: React.FC<ImageForensicViewerProps> = ({ currentCase }) => {
  const [activeLayer, setActiveLayer] = useState<ForensicMapLayer>('heatmap');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(65);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [showBoundingBox, setShowBoundingBox] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [splitView, setSplitView] = useState<boolean>(false);
  const [inspectCoord, setInspectCoord] = useState<{ x: number; y: number } | null>(null);

  const imgContainerRef = useRef<HTMLDivElement>(null);
  const res = currentCase.results;
  const face = res?.faceDetection;
  const dims = currentCase.imageDimensions;

  // Selected Overlay Image
  let overlayImageUrl: string | undefined;
  if (activeLayer === 'heatmap') {
    overlayImageUrl = res?.anomalyHeatmapDataUrl;
  } else if (activeLayer === 'noise') {
    overlayImageUrl = res?.noise.residualMapDataUrl;
  } else if (activeLayer === 'frequency') {
    overlayImageUrl = res?.frequency.fftSpectrumDataUrl;
  } else if (activeLayer === 'compression') {
    overlayImageUrl = res?.compression.elaMapDataUrl;
  } else if (activeLayer === 'edge') {
    overlayImageUrl = res?.edge.edgeMapDataUrl;
  }

  // Handle Mouse Move for Pixel Inspector
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgContainerRef.current) return;
    const rect = imgContainerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const naturalX = Math.round((clientX / rect.width) * dims.width);
    const naturalY = Math.round((clientY / rect.height) * dims.height);

    if (naturalX >= 0 && naturalX < dims.width && naturalY >= 0 && naturalY < dims.height) {
      setInspectCoord({ x: naturalX, y: naturalY });
    }
  };

  const handleMouseLeave = () => {
    setInspectCoord(null);
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-sm flex flex-col space-y-3">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        {/* Layer Selector */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            id="layer-btn-heatmap"
            onClick={() => setActiveLayer('heatmap')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              activeLayer === 'heatmap' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Anomaly Heatmap
          </button>
          <button
            id="layer-btn-noise"
            onClick={() => setActiveLayer('noise')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              activeLayer === 'noise' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Noise Residual
          </button>
          <button
            id="layer-btn-fft"
            onClick={() => setActiveLayer('frequency')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              activeLayer === 'frequency' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2D FFT Spectrum
          </button>
          <button
            id="layer-btn-ela"
            onClick={() => setActiveLayer('compression')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              activeLayer === 'compression' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            JPEG ELA Map
          </button>
          <button
            id="layer-btn-edge"
            onClick={() => setActiveLayer('edge')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              activeLayer === 'edge' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Edge Gradient
          </button>
          <button
            id="layer-btn-none"
            onClick={() => setActiveLayer('none')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              activeLayer === 'none' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Clean Original
          </button>
        </div>

        {/* View Controls & Toggles */}
        <div className="flex items-center space-x-2">
          {/* Opacity Slider */}
          {activeLayer !== 'none' && !splitView && (
            <div className="flex items-center space-x-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs text-slate-300">
              <span className="text-[11px] text-slate-400">Overlay:</span>
              <input
                id="overlay-opacity-range"
                type="range"
                min="0"
                max="100"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="w-7 text-right font-mono text-[11px]">{overlayOpacity}%</span>
            </div>
          )}

          {/* Landmarks Toggle */}
          <button
            id="toggle-landmarks-btn"
            onClick={() => setShowLandmarks(!showLandmarks)}
            title="Toggle Facial Biometric Landmarks"
            className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
              showLandmarks
                ? 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* Split View Toggle */}
          <button
            id="toggle-split-btn"
            onClick={() => setSplitView(!splitView)}
            title="Side-by-Side Comparison Mode"
            className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
              splitView
                ? 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <SplitSquareVertical className="w-4 h-4" />
          </button>

          {/* Zoom Buttons */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setZoomLevel((z) => Math.max(1.0, parseFloat((z - 0.25).toFixed(2))))}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1 text-slate-300 min-w-[32px] text-center">{zoomLevel}x</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, parseFloat((z + 0.25).toFixed(2))))}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel > 1.0 && (
              <button
                onClick={() => setZoomLevel(1.0)}
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Visual Display Stage */}
      <div className="relative w-full min-h-[380px] max-h-[540px] bg-slate-950 rounded-lg overflow-auto flex items-center justify-center border border-slate-800/80 p-4">
        {splitView ? (
          /* Side-by-Side Split View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full items-center justify-center">
            {/* Left: Original */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Original Query Frame
              </span>
              <div className="relative rounded border border-slate-800 overflow-hidden max-h-[460px] flex items-center justify-center">
                <img
                  src={currentCase.imageUrl}
                  alt="Original facial evidence"
                  className="max-h-[440px] object-contain select-none"
                />
              </div>
            </div>

            {/* Right: Active Forensic Map */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 mb-1.5 flex items-center gap-1">
                Forensic Map: {activeLayer.toUpperCase()}
              </span>
              <div className="relative rounded border border-slate-800 overflow-hidden max-h-[460px] flex items-center justify-center bg-black">
                {overlayImageUrl ? (
                  <img
                    src={overlayImageUrl}
                    alt="Forensic layer visualization"
                    className="max-h-[440px] object-contain select-none"
                  />
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No visual layer generated for this modality or format.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Single Interactive Canvas with Layer Overlay */
          <div
            ref={imgContainerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            className="relative cursor-crosshair transition-transform duration-150 inline-block max-h-[480px] max-w-full"
          >
            {/* Base Image */}
            <img
              src={currentCase.imageUrl}
              alt="Facial evidence query"
              className="max-h-[480px] w-auto object-contain block select-none rounded"
            />

            {/* Forensic Overlay Layer */}
            {activeLayer !== 'none' && overlayImageUrl && (
              <img
                src={overlayImageUrl}
                alt="Forensic layer overlay"
                style={{ opacity: overlayOpacity / 100 }}
                className="absolute inset-0 w-full h-full object-fill pointer-events-none mix-blend-screen transition-opacity rounded"
              />
            )}

            {/* SVG Biometric Landmark Overlays */}
            {showLandmarks && face && face.detected && face.boundingBox && (
              <svg
                viewBox={`0 0 ${dims.width} ${dims.height}`}
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                {/* Face Bounding Box */}
                {showBoundingBox && (
                  <rect
                    x={face.boundingBox.x}
                    y={face.boundingBox.y}
                    width={face.boundingBox.width}
                    height={face.boundingBox.height}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth={Math.max(2, dims.width / 250)}
                    strokeDasharray="4 3"
                    className="opacity-80"
                  />
                )}

                {/* Landmarks */}
                {face.landmarks && (
                  <g className="opacity-90">
                    {/* Inter-ocular line */}
                    <line
                      x1={face.landmarks.leftEye.x}
                      y1={face.landmarks.leftEye.y}
                      x2={face.landmarks.rightEye.x}
                      y2={face.landmarks.rightEye.y}
                      stroke="#22c55e"
                      strokeWidth={Math.max(1.5, dims.width / 350)}
                      strokeDasharray="2 2"
                    />

                    {/* Central Vertical Midline (from eye center through nose, mouth to chin) */}
                    <line
                      x1={(face.landmarks.leftEye.x + face.landmarks.rightEye.x) / 2}
                      y1={(face.landmarks.leftEye.y + face.landmarks.rightEye.y) / 2}
                      x2={face.landmarks.chin.x}
                      y2={face.landmarks.chin.y}
                      stroke="#38bdf8"
                      strokeWidth={Math.max(1.5, dims.width / 350)}
                      strokeDasharray="3 3"
                    />

                    {/* Left Eye */}
                    <circle
                      cx={face.landmarks.leftEye.x}
                      cy={face.landmarks.leftEye.y}
                      r={Math.max(3, dims.width / 120)}
                      fill="#22c55e"
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                    {/* Right Eye */}
                    <circle
                      cx={face.landmarks.rightEye.x}
                      cy={face.landmarks.rightEye.y}
                      r={Math.max(3, dims.width / 120)}
                      fill="#22c55e"
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                    {/* Nose */}
                    <circle
                      cx={face.landmarks.noseTip.x}
                      cy={face.landmarks.noseTip.y}
                      r={Math.max(3, dims.width / 120)}
                      fill="#eab308"
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                    {/* Mouth Center */}
                    <circle
                      cx={face.landmarks.mouthCenter.x}
                      cy={face.landmarks.mouthCenter.y}
                      r={Math.max(3, dims.width / 120)}
                      fill="#f43f5e"
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                    {/* Mouth Corners */}
                    <circle
                      cx={face.landmarks.leftMouthCorner.x}
                      cy={face.landmarks.leftMouthCorner.y}
                      r={Math.max(2.5, dims.width / 140)}
                      fill="#f43f5e"
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                    <circle
                      cx={face.landmarks.rightMouthCorner.x}
                      cy={face.landmarks.rightMouthCorner.y}
                      r={Math.max(2.5, dims.width / 140)}
                      fill="#f43f5e"
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                    {/* Chin */}
                    <circle
                      cx={face.landmarks.chin.x}
                      cy={face.landmarks.chin.y}
                      r={Math.max(3, dims.width / 120)}
                      fill="#38bdf8"
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                  </g>
                )}
              </svg>
            )}
          </div>
        )}

        {/* Live Coordinate Inspector Overlay */}
        {inspectCoord && (
          <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-md text-[11px] font-mono text-slate-300 shadow-md pointer-events-none flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Crosshair className="w-3 h-3 text-indigo-400" />
              <span>X: {inspectCoord.x}px, Y: {inspectCoord.y}px</span>
            </div>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Total: {dims.width}x{dims.height}px</span>
          </div>
        )}
      </div>

      {/* Legend & Modality Explanation Bar */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1">
        <div className="flex items-center space-x-4">
          <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">Map Legend:</span>
          {activeLayer === 'heatmap' && (
            <div className="flex items-center space-x-2">
              <div className="w-24 h-2 rounded bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600" />
              <span className="text-[10px] font-mono">Cold (Organic) → Hot (Composite Anomaly)</span>
            </div>
          )}
          {activeLayer === 'noise' && (
            <span className="text-[11px]">Laplacian 3x3 High-Pass Noise Residual (amplified sensor grain)</span>
          )}
          {activeLayer === 'frequency' && (
            <span className="text-[11px]">2D FFT Log Magnitude Centered Spectrum (radial harmonics)</span>
          )}
          {activeLayer === 'compression' && (
            <span className="text-[11px]">Error Level Analysis (ELA) 90% recompression delta map</span>
          )}
          {activeLayer === 'edge' && (
            <span className="text-[11px]">Sobel Gradient Transition Magnitudes (boundary splice checks)</span>
          )}
          {activeLayer === 'none' && (
            <span className="text-[11px]">Direct camera source pixels without algorithmic filter overlay</span>
          )}
        </div>

        {face && face.detected && (
          <div className="text-[11px] text-slate-400 flex items-center space-x-2 font-mono">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Biometric Face Box: [{face.boundingBox?.x}, {face.boundingBox?.y}, {face.boundingBox?.width}x{face.boundingBox?.height}]</span>
          </div>
        )}
      </div>
    </div>
  );
};

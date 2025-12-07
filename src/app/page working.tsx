"use client"

import Image from "next/image";
import { useState, useRef } from "react";
import { DrawingCanvas } from "../components/DrawingCanvas";

// Custom color palette
const customColors = [
  { name: "Ocean Blue", value: "#0077BE" },
  { name: "Forest Green", value: "#228B22" },
  { name: "Sunset Orange", value: "#FF6B35" },
  { name: "Royal Purple", value: "#663399" },
  { name: "Hot Pink", value: "#FF69B4" },
  { name: "Golden Yellow", value: "#FFD700" },
];


// Video recorder using MediaRecorder and canvas.captureStream
class CanvasVideoRecorder {
  private canvas: HTMLCanvasElement | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = false;
  private stream: MediaStream | null = null;
  private mimeType: string = "video/webm";

  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  start(fps: number = 30) {
    if (this.isRecording || !this.canvas) return;
    this.stream = this.canvas.captureStream(fps);
    this.recordedChunks = [];
    this.isRecording = true;
    try {
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: this.mimeType });
    } catch (err) {
      console.error("Failed to create MediaRecorder:", err);
      this.isRecording = false;
      return;
    }
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };
    this.mediaRecorder.start();
    console.log("Video recording started");
  }

  async stop(): Promise<Blob | null> {
    if (!this.isRecording || !this.mediaRecorder) return null;
    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: this.mimeType });
        resolve(blob);
      };
      this.isRecording = false;
      this.mediaRecorder!.stop();
    });
  }
}

export default function Home() {
  const [activeExample, setActiveExample] = useState<
    "basic" | "custom" | "recording" | "streaming"
  >("streaming");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedSize, setRecordedSize] = useState<number | null>(null);
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef(new CanvasVideoRecorder());
  
  // Basic example stream handler
  const handleBasicStreamReady = (stream: MediaStream) => {
    console.log("Basic stream ready:", stream);
  };

  // Streaming example handler
  const handleStreamingReady = (stream: MediaStream) => {
    setLocalStream(stream);
    console.log("Streaming ready with tracks:", {
      video: stream.getVideoTracks()[0]?.getSettings(),
      audio: stream.getAudioTracks()[0]
        ? "Silent audio track included"
        : "No audio",
    });
  };

  // Recording example handler
  const handleRecordingStreamReady = () => {
    console.log("Recording stream ready, finding canvas...");

    // Find the largest visible canvas on the page
    const allCanvases = document.querySelectorAll('canvas');
    let largestCanvas: HTMLCanvasElement | null = null;
    let maxArea = 0;

    allCanvases.forEach((canvas) => {
      const rect = canvas.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > maxArea && rect.width > 0 && rect.height > 0) {
        maxArea = area;
        largestCanvas = canvas as HTMLCanvasElement;
      }
    });

    if (largestCanvas) {
      recordingCanvasRef.current = largestCanvas;
      const canvas = largestCanvas as HTMLCanvasElement;
      console.log(`Canvas found: ${canvas.width}x${canvas.height}`);
    } else {
      console.warn("No suitable canvas found for recording");
    }
  };

  const toggleRecording = async () => {
    if (!recordingCanvasRef.current) {
      console.warn("No canvas available for recording");
      return;
    }

    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      const blob = await recorderRef.current.stop();
      if (blob && blob.size > 0) {
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        setRecordedSize(blob.size);
        console.log("Recording saved:", { size: blob.size, type: blob.type });
        // Auto-download
        try {
          const a = document.createElement("a");
          a.href = url;
          a.download = `drawing-${Date.now()}.webm`;
          a.click();
        } catch (err) {
          console.warn("Auto-download failed:", err);
        }
      } else {
        console.error("Failed to create recording blob");
      }
    } else {
      // Start recording
      setIsRecording(true);
      // Clear previous recording
      if (recordedUrl) {
        try {
          URL.revokeObjectURL(recordedUrl);
        } catch {
          /* ignore */
        }
        setRecordedUrl(null);
      }
      recorderRef.current = new CanvasVideoRecorder();
      recorderRef.current.setCanvas(recordingCanvasRef.current);
      recorderRef.current.start(30); // 30 FPS
      console.log("Recording started");
    }
  };
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Drawing Canvas Examples</h1>
        <p>Explore different features of the DrawingCanvas component</p>
      </header>

      <nav className="example-nav">
        <button
          className={`nav-button ${activeExample === "basic" ? "active" : ""}`}
          onClick={() => setActiveExample("basic")}
        >
          Basic Canvas
        </button>
        <button
          className={`nav-button ${activeExample === "custom" ? "active" : ""}`}
          onClick={() => setActiveExample("custom")}
        >
          Custom Colors
        </button>
        <button
          className={`nav-button ${
            activeExample === "recording" ? "active" : ""
          }`}
          onClick={() => setActiveExample("recording")}
        >
          Recording
        </button>
        <button
          className={`nav-button ${
            activeExample === "streaming" ? "active" : ""
          }`}
          onClick={() => setActiveExample("streaming")}
        >
          Live Stream
        </button>
      </nav>

      <main className="example-content">
        {/* Basic Example */}
        {activeExample === "basic" && (
          <div className="example-section">
            <h2>Basic Drawing Canvas</h2>
            <p>
              A simple drawing canvas with default settings. Try drawing with
              different tools!
            </p>
            <div className="canvas-wrapper">
              <DrawingCanvas
                onStreamReady={handleBasicStreamReady}
                initialColor="#000000"
                initialBrushSize={15}
                className="drawing-canvas-container"
                canvasClassName="custom-canvas"
              />
            </div>
          </div>
        )}

        {/* Custom Colors Example */}
        {activeExample === "custom" && (
          <div className="example-section">
            <h2>Custom Color Palette</h2>
            <p>
              Drawing canvas with a custom color palette. Choose from our
              curated colors!
            </p>
            <div className="canvas-wrapper">
              <DrawingCanvas
                customColors={customColors}
                initialColor="#0077BE"
                initialBrushSize={20}
                width={600}
                height={400}
                className="drawing-canvas-container"
                canvasClassName="custom-canvas"
              />
            </div>
          </div>
        )}

        {/* Recording Example */}
        {activeExample === "recording" && (
          <div className="example-section">
            <h2>Canvas Recording</h2>
            <p>Record your drawing session and download it as a video file.</p>
            <div className="recording-controls">
              <button
                onClick={toggleRecording}
                className={`record-button ${isRecording ? "recording" : ""}`}
              >
                {isRecording ? "⏹ Stop Recording" : "⏺ Start Recording"}
              </button>
              {isRecording && (
                <span className="recording-indicator">Recording...</span>
              )}
              {recordedUrl && (
                <span style={{ marginLeft: "auto", color: "#dc3545", fontWeight: "500" }}>
                  Video Recording
                </span>
              )}
            </div>
            <div className="streaming-layout">
              <div className="canvas-wrapper">
                <DrawingCanvas
                  onStreamReady={handleRecordingStreamReady}
                  fps={60}
                  initialColor="#FF0000"
                  className="drawing-canvas-container"
                  canvasClassName="custom-canvas"
                />
              </div>

              {recordedUrl && (
                <div className="stream-preview">
                  <video
                    src={recordedUrl}
                    controls
                    width={512}
                    height={512}
                    className="preview-recording"
                    style={{ maxWidth: "100%", border: "1px solid #ccc" }}
                  />
                  {recordedSize !== null && (
                    <div style={{ marginTop: 12, fontSize: 14, color: "#333" }}>
                      <strong>File size:</strong> {recordedSize} bytes ({(recordedSize / 1024).toFixed(2)} KB)
                    </div>
                  )}
                  <p className="stream-info">Click Download below or the file will auto-download.</p>
                  <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
                    <a
                      href={recordedUrl}
                      download={`drawing-${Date.now()}.webm`}
                      className="text-sm text-blue-600"
                      style={{ fontWeight: "bold" }}
                    >
                      ⬇ Download
                    </a>
                    <button
                      onClick={() => {
                        try {
                          URL.revokeObjectURL(recordedUrl);
                        } catch {
                          /* ignore */
                        }
                        setRecordedUrl(null);
                      }}
                      className="text-sm text-gray-600"
                      style={{ cursor: "pointer" }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Streaming Example */}
        {activeExample === "streaming" && (
          <div className="example-section">
            <h2>Live Stream Preview</h2>
            <p>
              See your canvas as a live video stream. This demonstrates WebRTC
              integration capabilities.
            </p>
            <div className="streaming-layout">
              <div className="canvas-wrapper">
                <DrawingCanvas
                  onStreamReady={handleStreamingReady}
                  fps={30}
                  enableStreaming={true}
                  enableBackgroundStreaming={true}
                  initialColor="#663399"
                  className="drawing-canvas-container"
                  canvasClassName="custom-canvas"
                />
              </div>
              {localStream && (
                <div className="stream-preview">
                  <h3>Live Stream Preview</h3>
                  <video
                    autoPlay
                    muted
                    width={512}
                    height={512}
                    ref={(video) => {
                      if (video && localStream) {
                        video.srcObject = localStream;
                      }
                    }}
                    className="preview-video"
                  />
                  <p className="stream-info">
                    This video element shows the canvas content as a
                    MediaStream, ready for WebRTC transmission or local
                    recording.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="features-list">
          <h3>Component Features:</h3>
          <ul>
            <li>🎨 Multiple drawing tools (brush, line, circle, fill)</li>
            <li>🎭 Optional fading effect while drawing</li>
            <li>↩️ Undo/Redo functionality</li>
            <li>🎥 WebRTC streaming support</li>
            <li>📱 Touch device support</li>
            <li>🎯 Fully typed with TypeScript</li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
